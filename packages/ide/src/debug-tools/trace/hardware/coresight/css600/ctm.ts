/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {
  CtiTriggerPair,
  SoCTraceComponent,
  SoCTraceComponentConnection,
} from "../../../trace-types";
import type { SocTraceComponentInfo } from "cfs-types";
import {
  channelIntersection,
  channelsUsedByStatuses,
  channelsToBitmask,
  CtiNoCapacityError,
  Css600Cti,
  type CtiDataModelInfo,
  isBitSet,
} from "./cti";
import type { SessionResolver } from "../coresight";

export type CtmDataModelInfo = SocTraceComponentInfo & {
  ChannelCount: number;
  Ctis: Record<string, CtiDataModelInfo>;
};

type CtiStatus = {
  input: Record<number, number[]>;
  output: Record<number, number[]>;
  /** Raw CTIGATEEN bitmask: a set bit means the channel propagates to the CTM fabric. */
  gate: number;
  /** True when CTICONTROL.CTIEN is set; mappings are only effective when enabled. */
  enabled: boolean;
};

/**
 * Enables a CTI if it is not already enabled.
 *
 * @param cti The CTI instance to enable.
 */
async function ensureEnabled(cti: Css600Cti): Promise<void> {
  if (!(await cti.isEnabled())) {
    await cti.enable();
  }
}

/**
 * This class represent ARM Coresight Cross Trigger Matrix (CTM),
 * which allows to interconnect multiple CTIs for trigger routing.
 *
 * Note that CTM does not have any configuration so this class is only a spetialization
 * of SoCTraceComponent to model the CTI interconnection.
 *
 * DISCLAIMER: This class is still under development with limited logic implemented.
 *
 * More information can be found on:
 * - ARM® CoreSight™ System-on-Chip SoC-600 Technical Reference Manual:
 *   https://developer.arm.com/documentation/100806/latest/
 *
 */
export class Css600Ctm implements SoCTraceComponent {
  readonly type: string;
  readonly channelCount: number;
  private ctis: Css600Cti[] = [];

  /**
   *
   * @param name Unique name to identify the component in the system.
   *             This is currently only used on error messages with no logic associated.
   * @param socTraceInfo Record containing information from the data model.
   * @param resolveSession Function to resolve the current debug session.
   */
  constructor(
    public name: string,
    socTraceInfo: CtmDataModelInfo,
    resolveSession: SessionResolver,
  ) {
    this.type = socTraceInfo.Type as string;
    this.channelCount = socTraceInfo.ChannelCount;
    this.ctis.push(
      ...Object.entries(socTraceInfo.Ctis ?? {}).map(
        ([ctiName, ctiInfo]) => new Css600Cti(ctiName, ctiInfo, resolveSession),
      ),
    );
    for (const cti of this.ctis) {
      if (cti.channelCount !== this.channelCount) {
        throw new Error(
          `CTI ${cti.name} has ${cti.channelCount} channels, but CTM ${this.name} has ${this.channelCount}.`,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Returns the CTI with the given name, or throws.
   * @param name The name of the CTI to retrieve.
   * @returns The CTI instance with the given name.
   */
  private ctiByName(name: string): Css600Cti {
    const found = this.ctis.find((c) => c.name === name);
    if (!found)
      throw new Error(`Cannot resolve CTI "${name}" in CTM ${this.name}.`);
    return found;
  }

  /**
   * Parses a CTM-scoped signal string `"<ctiName>.<direction>.<index>"`,
   * resolves the CTI instance, and returns `{ cti, triggerIndex }`.
   * Throws a descriptive error when the format, direction, or index is invalid.
   * @param signal The CTM-scoped signal string to parse.
   * @param expectedDir The expected direction of the trigger ("InputTriggers" or "OutputTriggers").
   * @returns An object containing the resolved CTI instance and the trigger index.
   */
  private parseCTMSignal(
    signal: string,
    expectedDir: "InputTriggers" | "OutputTriggers",
  ): { cti: Css600Cti; triggerIndex: number } {
    const [ctiName, dir, idxStr] = signal.split(".");
    if (dir !== expectedDir)
      throw new Error(`Expected a ${expectedDir} signal (got "${signal}").`);
    const cti = this.ctiByName(ctiName);
    const triggers =
      expectedDir === "InputTriggers" ? cti.InputTriggers : cti.OutputTriggers;
    const index = parseInt(idxStr, 10);
    if (isNaN(index) || !(index in triggers))
      throw new Error(
        `Invalid ${expectedDir} index in "${signal}" for CTM ${this.name}.`,
      );
    return { cti, triggerIndex: index };
  }

  /**
   * Returns the set of all trigger keys (e.g. `"ctiA.InputTriggers.2"`) that
   * are currently mapped to the specified channel across all CTIs in allCtisStatus
   * @param channel The channel number to check for membership.
   * @returns A set of trigger keys that the specified channel is a member of.
   */
  private channelMembershipCTM(
    allCtisStatus: Map<string, CtiStatus>,
    channel: number,
  ): Set<string> {
    const members = new Set<string>();
    for (const [ctiName, status] of allCtisStatus) {
      for (const [index, channels] of Object.entries(status.input))
        if (channels.includes(channel))
          members.add(`${ctiName}.InputTriggers.${index}`);
      for (const [index, channels] of Object.entries(status.output))
        if (channels.includes(channel))
          members.add(`${ctiName}.OutputTriggers.${index}`);
    }
    return members;
  }

  /**
   * Returns the first channel in candidates whose complete hardware membership
   * equals `requestedSet` exactly, or `undefined` if none matches.
   * @param allCtisStatus Live status map returned by readCtisStatus.
   * @param candidates The set of candidate channel indices to check.
   * @param requestedSet The exact set of trigger keys that the channel must match.
   */
  private exactMatchChannelCTM(
    allCtisStatus: Map<string, CtiStatus>,
    candidates: Iterable<number>,
    requestedSet: Set<string>,
  ): number | undefined {
    for (const channel of candidates) {
      // Use the full status map so that any trigger mapped to this channel on
      // any CTI — including closed-gate CTIs that still receive incoming fabric
      // signals (CTIGATE only blocks the CTI→fabric path) — is included in the
      // membership set. A channel is only reused when every mapped trigger
      // belongs exclusively to the requested group; any stray mapping causes the
      // check to fail and a new channel to be allocated instead.
      const members = this.channelMembershipCTM(allCtisStatus, channel);
      if (
        members.size === requestedSet.size &&
        [...requestedSet].every((elem) => members.has(elem))
      )
        return channel;
    }
    return undefined;
  }

  /**
   * Returns every channel in `candidates` whose complete hardware membership
   * equals `requestedSet` exactly. Used by {@link disconnectGroup} to remove all
   * duplicate channels that carry the same trigger group.
   * @param allCtisStatus Live status map returned by readCtisStatus.
   * @param candidates The set of candidate channel indices to check.
   * @param requestedSet The exact set of trigger keys that the channel must match.
   * @returns All matching channel indices (empty when none match).
   */
  private allExactMatchChannelsCTM(
    allCtisStatus: Map<string, CtiStatus>,
    candidates: Iterable<number>,
    requestedSet: Set<string>,
  ): number[] {
    const matches: number[] = [];
    for (const channel of candidates) {
      const members = this.channelMembershipCTM(allCtisStatus, channel);
      if (
        members.size === requestedSet.size &&
        [...requestedSet].every((elem) => members.has(elem))
      )
        matches.push(channel);
    }
    return matches;
  }

  // ---------------------------------------------------------------------------
  // Status readers
  // ---------------------------------------------------------------------------

  /**
   * Reads the current trigger channel mappings and gate state from all CTIs in
   * this CTM directly from hardware with no caching.
   *
   * @returns A map where each key is a CTI name and the value contains the
   *          input/output trigger-to-channel-mask mappings and the raw CTIGATEEN
   *          bitmask for that CTI.
   */
  async readCtisStatus(): Promise<Map<string, CtiStatus>> {
    const entries: [string, CtiStatus][] = [];
    for (const ctiInstance of this.ctis) {
      const status = await ctiInstance.readTriggerStatus();
      const gate = await ctiInstance.readGateStatus();
      const enabled = await ctiInstance.isEnabled();
      entries.push([ctiInstance.name, { ...status, gate, enabled }]);
    }
    return new Map(entries);
  }

  /**
   * Acknowledges all active trigger outputs on all CTIs within this CTM.
   * This clears the corresponding trigger output status bits.
   */
  public async cleanACKTriggerOutputs(): Promise<void> {
    for (const ctiInstance of this.ctis) {
      await ctiInstance.cleanACKTriggerOutputs();
    }
  }

  /**
   * Returns the set of channel indices that are currently active on the CTM fabric.
   * A channel is fabric-active when at least one CTI both uses it in a trigger mapping
   * and has its CTIGATE bit open for that channel. Locally-gated channels (CTIGATE bit
   * cleared) are not visible on the fabric and are not included in this set.
   *
   * @param allStatus Live status map returned by {@link readCtisStatus}.
   * @returns A set of 0-based channel indices visible on the CTM fabric.
   */
  private computeFabricActiveChannels(
    allCtisStatus: Map<string, CtiStatus>,
  ): Set<number> {
    const fabricActive = new Set<number>();
    for (const { input, gate } of allCtisStatus.values()) {
      for (const channel of channelsUsedByStatuses({ input, output: {} })) {
        if (isBitSet(gate, channel)) fabricActive.add(channel);
      }
    }
    return fabricActive;
  }

  /**
   * Builds the CTM-scoped signal key `"<ctiName>.<direction>.<origIndex>"` for a
   * CTI trigger within this CTM. This string is used as the signal identifier
   * in returned connections.
   *
   * @param ctiName   Name of the CTI that owns the trigger.
   * @param direction Either `"InputTriggers"` or `"OutputTriggers"`.
   * @param origIndex   0-based trigger index within that CTI.
   * @returns The signal path string `"<ctiName>.<direction>.<origIndex>"`.
   */
  private resolveCTMScopedSignal(
    ctiName: string,
    direction: string,
    origIndex: number,
  ): string {
    return `${ctiName}.${direction}.${origIndex}`;
  }

  // ---------------------------------------------------------------------------
  // Online getConnections helpers
  // ---------------------------------------------------------------------------

  /**
   * Collects active connections for a source trigger that is already mapped to
   * at least one channel.  Enumerates all channels of the source, finds every
   * destination trigger that shares any of those channels, and computes the
   * `isActive` flag from gate and enable state.
   *
   * The gate formula is asymmetric: the CTI that holds InputTriggers is the
   * "propagator" (must have its gate open to drive the fabric); the CTI that
   * holds OutputTriggers is the "receiver" (always accepts fabric signals —
   * CTIGATE only blocks the CTI→fabric path, never the fabric→output path).
   *
   * @param sourceCtiName   Name of the source CTI.
   * @param sourceSignal    Display-name of the source trigger.
   * @param componentSource CTM-scoped path of the source signal.
   * @param channelArray    Channels the source trigger is currently mapped to.
   * @param allStatus       Live status for all CTIs.
   * @param isInput         True when the source is an InputTriggers trigger.
   */
  private collectOnlineConnections(
    sourceCtiName: string,
    sourceSignal: string,
    componentSource: string,
    channelArray: number[],
    allStatus: Map<string, CtiStatus>,
    isInput: boolean,
  ): SoCTraceComponentConnection[] {
    const sourceStatus = allStatus.get(sourceCtiName);
    const sourceGate = sourceStatus?.gate ?? 0;
    const sourceEnabled = sourceStatus?.enabled ?? false;

    const connections: SoCTraceComponentConnection[] = [];
    // Maps destKey → the emitted entry so a duplicate hit on a later channel
    // can OR its isActive onto the existing entry rather than push a second row.
    const emitted = new Map<string, SoCTraceComponentConnection>();

    for (const channel of channelArray) {
      for (const cti of this.ctis) {
        const ctiStatus = allStatus.get(cti.name);
        const destTriggers = isInput ? cti.OutputTriggers : cti.InputTriggers;
        const destDir = isInput ? "OutputTriggers" : "InputTriggers";

        for (const key of Object.keys(destTriggers)) {
          const destIdx = parseInt(key, 10);
          const destKey = `${cti.name}.${destDir}.${destIdx}`;
          const destChannels = isInput
            ? (ctiStatus?.output[destIdx] ?? [])
            : (ctiStatus?.input[destIdx] ?? []);
          if (!destChannels.includes(channel)) continue;

          const isCrossCti = cti.name !== sourceCtiName;
          const destGate = ctiStatus?.gate ?? 0;
          const destEnabled = ctiStatus?.enabled ?? false;

          // propagator = the InputTriggers-side CTI. CTIGATE only controls the
          // CTI→fabric path, so only the propagator's gate needs to be open.
          const propagatorGate = isInput ? sourceGate : destGate;
          const gateOk = !isCrossCti || isBitSet(propagatorGate, channel);

          const isActive = gateOk && sourceEnabled && destEnabled;

          const existing = emitted.get(destKey);
          if (existing) {
            // Overlapping groups can place the same source/destination pair on
            // multiple channels. OR activity across all shared channels so a
            // gated channel cannot shadow an open channel on another.
            if (isActive) existing.isActive = true;
            continue;
          }

          const destSig = this.resolveCTMScopedSignal(
            cti.name,
            destDir,
            destIdx,
          );
          const entry: SoCTraceComponentConnection = {
            sourceSignal,
            componentSourceSignal: componentSource,
            componentDestinationSignal: destSig,
            destinationSignal: isInput
              ? cti.OutputTriggers[destIdx]
              : cti.InputTriggers[destIdx],
            isActive,
          };
          connections.push(entry);
          emitted.set(destKey, entry);
        }
      }
    }
    return connections;
  }

  /**
   * Returns available destination triggers when the source trigger is not yet
   * mapped to any channel. Both unmapped and already-mapped destinations are
   * included: connectGroup allocates a separate free channel for each new group,
   * so a destination already in use on one channel can participate in a fan-in
   * route on another. A destination is included only when a usable channel
   * exists (locally free for same-CTI pairings, globally free for cross-CTI).
   *
   * @param sourceCtiName   Name of the source CTI.
   * @param sourceSignal    Display-name of the source trigger.
   * @param componentSource CTM-scoped path of the source signal.
   * @param allStatus       Live status for all CTIs.
   * @param isInput         True when the source is an InputTriggers trigger.
   */
  private collectFreeConnections(
    sourceCtiName: string,
    sourceSignal: string,
    componentSource: string,
    allStatus: Map<string, CtiStatus>,
    isInput: boolean,
  ): SoCTraceComponentConnection[] {
    // A channel is globally available when it is not two-sided globally.
    // One-sided channels (stale partial cross-CTI writes) are reclaimable by
    // findFreeChannelCTM and must not be treated as fully occupied here.
    const globalInputChannels = new Set<number>();
    const globalOutputChannels = new Set<number>();
    for (const { input, output } of allStatus.values()) {
      for (const chs of Object.values(input))
        for (const ch of chs) globalInputChannels.add(ch);
      for (const chs of Object.values(output))
        for (const ch of chs) globalOutputChannels.add(ch);
    }
    let hasGlobalFreeChannel = false;
    for (let ch = 0; ch < this.channelCount; ch++) {
      if (!globalInputChannels.has(ch) || !globalOutputChannels.has(ch)) {
        hasGlobalFreeChannel = true;
        break;
      }
    }

    const sourceLocalStatus = allStatus.get(sourceCtiName);
    const localInput = new Set(
      Object.values(sourceLocalStatus?.input ?? {}).flat(),
    );
    const localOutput = new Set(
      Object.values(sourceLocalStatus?.output ?? {}).flat(),
    );
    const fabricActive = this.computeFabricActiveChannels(allStatus);

    // A local channel is usable when it is not two-sided locally
    // (one-sided stale mappings are cleared by clearChannelMappingsCTM before use)
    // and fabric-inactive (CTIGATE does not block the fabric→output path, so a
    // fabric-active channel would fire the local CTI's outputs unexpectedly).
    const locallyReclaimable: number[] = [];
    for (let ch = 0; ch < this.channelCount; ch++) {
      if (!localInput.has(ch) || !localOutput.has(ch))
        locallyReclaimable.push(ch);
    }
    const hasUsableLocalChannel = locallyReclaimable.some(
      (ch) => !fabricActive.has(ch),
    );

    const connections: SoCTraceComponentConnection[] = [];
    for (const cti of this.ctis) {
      const isLocal = cti.name === sourceCtiName;
      if (isLocal ? !hasUsableLocalChannel : !hasGlobalFreeChannel) continue;
      const destTriggers = isInput ? cti.OutputTriggers : cti.InputTriggers;
      const destDir = isInput ? "OutputTriggers" : "InputTriggers";

      for (const key of Object.keys(destTriggers)) {
        const destIdx = parseInt(key, 10);
        const destSig = this.resolveCTMScopedSignal(cti.name, destDir, destIdx);
        connections.push({
          sourceSignal,
          componentSourceSignal: componentSource,
          componentDestinationSignal: destSig,
          destinationSignal: isInput
            ? cti.OutputTriggers[destIdx]
            : cti.InputTriggers[destIdx],
          isActive: false,
        });
      }
    }
    return connections;
  }

  // ---------------------------------------------------------------------------
  // Connection discovery
  // ---------------------------------------------------------------------------

  /**
   * Returns the connections of a given trigger signal across all CTIs in this CTM.
   *
   * @param signal  The trigger signal in the format `"<ctiName>.<InputTriggers|OutputTriggers>.<index>"`.
   * @param offline If true, returns all theoretical pairings without reading hardware;
   *                `isActive` is `undefined` for every connection. If false, reads live
   *                register state and sets `isActive` accordingly.
   * @returns A promise that resolves to an array of connections for the given trigger signal.
   */
  async getConnections(
    signal: string,
    offline?: boolean,
  ): Promise<SoCTraceComponentConnection[]> {
    const [sourceCtiName, direction, sourceTrigIdxStr] = signal.split(".");
    if (!sourceCtiName || !direction || !sourceTrigIdxStr) {
      throw new Error(
        `Signal "${signal}" is not a valid CTM trigger signal. Expected format: "<ctiName>.<InputTriggers|OutputTriggers>.<index>".`,
      );
    }

    if (direction !== "InputTriggers" && direction !== "OutputTriggers") {
      throw new Error(
        `Only InputTriggers and OutputTriggers signals are supported for ${this.name} (received ${signal}).`,
      );
    }

    const isInput = direction === "InputTriggers";
    const sourceTrigIdx = parseInt(sourceTrigIdxStr, 10);
    const sourceCti = this.ctiByName(sourceCtiName);

    const triggerMap = isInput
      ? sourceCti.InputTriggers
      : sourceCti.OutputTriggers;
    if (isNaN(sourceTrigIdx) || !(sourceTrigIdx in triggerMap)) {
      throw new Error(
        `Invalid trigger index in signal "${signal}" for CTM ${this.name}.`,
      );
    }

    const sourceTriggerMap = isInput
      ? sourceCti.InputTriggers
      : sourceCti.OutputTriggers;
    const sourceSignal = sourceTriggerMap[sourceTrigIdx];
    const sourceSig = this.resolveCTMScopedSignal(
      sourceCtiName,
      direction,
      sourceTrigIdx,
    );

    // --- OFFLINE ---
    if (offline) {
      const connections: SoCTraceComponentConnection[] = [];
      for (const cti of this.ctis) {
        const destTriggers = isInput ? cti.OutputTriggers : cti.InputTriggers;
        const destDir = isInput ? "OutputTriggers" : "InputTriggers";
        for (const key of Object.keys(destTriggers)) {
          const destIdx = parseInt(key, 10);
          const destSig = this.resolveCTMScopedSignal(
            cti.name,
            destDir,
            destIdx,
          );
          connections.push({
            sourceSignal,
            componentSourceSignal: sourceSig,
            componentDestinationSignal: destSig,
            destinationSignal: isInput
              ? cti.OutputTriggers[destIdx]
              : cti.InputTriggers[destIdx],
            isActive: undefined,
          });
        }
      }
      return connections;
    }

    // --- ONLINE ---
    const allStatus = await this.readCtisStatus();
    const sourceStatus = allStatus.get(sourceCtiName);
    const channelArray = isInput
      ? (sourceStatus?.input[sourceTrigIdx] ?? [])
      : (sourceStatus?.output[sourceTrigIdx] ?? []);

    if (channelArray.length > 0) {
      const active = this.collectOnlineConnections(
        sourceCtiName,
        sourceSignal,
        sourceSig,
        channelArray,
        allStatus,
        isInput,
      );
      // Also advertise destinations reachable on a new free channel so
      // TraceRouter can fan-out a mapped source to additional outputs.
      const activeDests = new Set(
        active.map((c) => c.componentDestinationSignal),
      );
      const free = this.collectFreeConnections(
        sourceCtiName,
        sourceSignal,
        sourceSig,
        allStatus,
        isInput,
      ).filter((c) => !activeDests.has(c.componentDestinationSignal));
      return [...active, ...free];
    }

    return this.collectFreeConnections(
      sourceCtiName,
      sourceSignal,
      sourceSig,
      allStatus,
      isInput,
    );
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Connects an input trigger to an output trigger via a shared CTM channel.
   *
   * Delegates to {@link connectGroup}. See that method for full connection
   * semantics and error conditions.
   *
   * @param input  CTM-scoped input signal (`"<ctiName>.InputTriggers.<index>"`).
   * @param output CTM-scoped output signal (`"<ctiName>.OutputTriggers.<index>"`).
   */
  async connect(input: string, output: string): Promise<void> {
    return this.connectGroup([input], [output]);
  }

  /**
   * Disconnects a previously connected input/output trigger pair.
   *
   * Delegates to {@link disconnectGroup}. See that method for full disconnection
   * semantics and error conditions.
   *
   * @param input  CTM-scoped input signal (`"<ctiName>.InputTriggers.<index>"`).
   * @param output CTM-scoped output signal (`"<ctiName>.OutputTriggers.<index>"`).
   */
  async disconnect(input: string, output: string): Promise<void> {
    return this.disconnectGroup([input], [output]);
  }

  /**
   * Reads the current hardware trigger status across all CTIs in this CTM and
   * returns all active connections as groups of input and output trigger display names.
   *
   * Channel grouping follows the "one channel = one connection" model:
   * - **Fabric-active channel** (an enabled CTI has an input trigger mapped and
   *   CTIGATE open): one aggregated group covering gate-open input triggers and all
   *   output triggers from enabled CTIs on that channel.
   * - **Locally-gated channel** (all gates closed): each enabled CTI with triggers
   *   on that channel forms its own independent group; channels may be reused across
   *   CTIs because closed gates isolate their local routes from one another.
   *
   * @returns An array of connection groups. Each element has the display-name lists
   *          of input and output triggers that form one active connection.
   */
  public async getActiveConnectionGroups(): Promise<CtiTriggerPair[]> {
    const allStatus = await this.readCtisStatus();
    const fabricActive = this.computeFabricActiveChannels(
      new Map([...allStatus].filter(([, status]) => status.enabled)),
    );
    const connections: CtiTriggerPair[] = [];

    for (let channel = 0; channel < this.channelCount; channel++) {
      if (fabricActive.has(channel)) {
        // Cross-CTI fabric route. CTIGATE is asymmetric:
        // - Inputs: only gate-open CTIs drive the fabric (CTIGATE controls CTI→fabric).
        // - Outputs: all CTIs receive from the fabric regardless of gate state.
        // Including gate-closed inputs would cause re-application to open their gates
        // and create connectivity that did not exist in the original hardware state.
        const inputTriggers: string[] = [];
        const outputTriggers: string[] = [];
        for (const cti of this.ctis) {
          const status = allStatus.get(cti.name);
          if (!status || !status.enabled) continue;
          const gateOpen = isBitSet(status.gate, channel);
          if (gateOpen) {
            for (const [indexStr, channels] of Object.entries(status.input)) {
              if (channels.includes(channel)) {
                const name = cti.InputTriggers[Number(indexStr)];
                if (name !== undefined) inputTriggers.push(name);
              }
            }
          }
          for (const [indexStr, channels] of Object.entries(status.output)) {
            if (channels.includes(channel)) {
              const name = cti.OutputTriggers[Number(indexStr)];
              if (name !== undefined) outputTriggers.push(name);
            }
          }
        }
        if (inputTriggers.length > 0 && outputTriggers.length > 0) {
          connections.push({ inputTriggers, outputTriggers });
        }
      } else {
        // Locally-gated channel: each CTI's route is independent. Report one group
        // per CTI so that local channel-N on CTI-A and local channel-N on CTI-B
        // are not merged into a nonexistent cross-CTI connection.
        for (const cti of this.ctis) {
          const status = allStatus.get(cti.name);
          if (!status || !status.enabled) continue;
          const inputTriggers: string[] = [];
          const outputTriggers: string[] = [];
          for (const [indexStr, channels] of Object.entries(status.input)) {
            if (channels.includes(channel)) {
              const name = cti.InputTriggers[Number(indexStr)];
              if (name !== undefined) inputTriggers.push(name);
            }
          }
          for (const [indexStr, channels] of Object.entries(status.output)) {
            if (channels.includes(channel)) {
              const name = cti.OutputTriggers[Number(indexStr)];
              if (name !== undefined) outputTriggers.push(name);
            }
          }
          if (inputTriggers.length > 0 && outputTriggers.length > 0) {
            connections.push({ inputTriggers, outputTriggers });
          }
        }
      }
    }
    return connections;
  }

  /**
   * Returns the list of trigger signals for the specified direction.
   *
   * @param direction The direction of the trigger signals to retrieve ("input" or "output").
   * @returns An array of trigger signal names for the specified direction.
   */
  public getTriggerSignals(direction: "input" | "output"): string[] {
    return this.ctis.flatMap((cti) => cti.getTriggerSignals(direction));
  }

  /**
   * Removes all existing trigger mappings for every CTI managed by this CTM instance.
   * This is useful for resetting the CTM to a clean state before establishing new connections.
   */
  public async removeMapping(): Promise<void> {
    for (const cti of this.ctis) {
      await cti.removeMapping();
    }
  }

  /**
   * Resolves a trigger signal display name to its CTM-scoped path.
   *
   * Searches all registered CTIs for a trigger whose display name matches
   * and returns `"<ctiName>.<InputTriggers|OutputTriggers>.<index>"`, or
   * `undefined` if no match is found.
   *
   * @param name The display name to look up (e.g., `"CPU0_DBGREQ"`).
   * @param direction Whether to search input or output triggers.
   * @returns The CTM-scoped signal path, or `undefined` if not found.
   */
  public resolveTriggerSignal(
    name: string,
    direction: "input" | "output",
  ): string | undefined {
    const group = direction === "input" ? "InputTriggers" : "OutputTriggers";
    for (const cti of this.ctis) {
      const triggers =
        direction === "input" ? cti.InputTriggers : cti.OutputTriggers;
      const entry = Object.entries(triggers).find(([, v]) => v === name);
      if (entry) return `${cti.name}.${group}.${entry[0]}`;
    }
    return undefined;
  }

  /**
   * Connects a group of input triggers to a group of output triggers via a
   * single shared CTM channel so any input activates every output (fan-out / fan-in).
   * Handles both local (same CTI) and cross-CTI groups, with different channel
   * selection and CTIGATE programming for each case.
   *
   * @param inputs  CTM-scoped input signals (`"<ctiName>.InputTriggers.<index>"`).
   * @param outputs CTM-scoped output signals (`"<ctiName>.OutputTriggers.<index>"`).
   * @throws If any signal is invalid, pre-mapped, or no suitable channel exists.
   */
  public async connectGroup(
    inputs: string[],
    outputs: string[],
  ): Promise<void> {
    const parsedInputs = inputs.map((s) =>
      this.parseCTMSignal(s, "InputTriggers"),
    );
    const parsedOutputs = outputs.map((s) =>
      this.parseCTMSignal(s, "OutputTriggers"),
    );

    const involvedCtiNames = new Set([
      ...parsedInputs.map((p) => p.cti.name),
      ...parsedOutputs.map((p) => p.cti.name),
    ]);
    const isLocal = involvedCtiNames.size === 1;

    const allStatus = await this.readCtisStatus();

    // Idempotency: find a channel whose exact hardware membership matches the
    // requested group.  A channel shared by additional triggers belongs to a
    // larger connection — do not reuse it; allocate a new channel instead.
    const allChannelArrays = [
      ...parsedInputs.map(
        (p) => allStatus.get(p.cti.name)?.input[p.triggerIndex] ?? [],
      ),
      ...parsedOutputs.map(
        (p) => allStatus.get(p.cti.name)?.output[p.triggerIndex] ?? [],
      ),
    ];
    const intersection = channelIntersection(allChannelArrays);
    const requestedSet = new Set([
      ...parsedInputs.map(
        (p) => `${p.cti.name}.InputTriggers.${p.triggerIndex}`,
      ),
      ...parsedOutputs.map(
        (p) => `${p.cti.name}.OutputTriggers.${p.triggerIndex}`,
      ),
    ]);
    // For local groups scope the membership check to the single involved CTI so
    // an independent group on another CTI that happens to share the same channel
    // number does not widen the membership set and prevent an exact match.
    // Exception: when the candidate channels are already fabric-active (gate open
    // on at least one CTI), the local filter would accept a subset of a cross-CTI
    // route and then close the gate, silently breaking it.  In that case fall
    // through to findFreeChannelCTM with the full status so a clean channel is
    // allocated instead.
    const fabricActive = isLocal
      ? this.computeFabricActiveChannels(allStatus)
      : undefined;
    const statusForMatch =
      isLocal && ![...intersection].some((ch) => fabricActive!.has(ch))
        ? new Map([...allStatus].filter(([name]) => involvedCtiNames.has(name)))
        : allStatus;
    const exactChannel = this.exactMatchChannelCTM(
      statusForMatch,
      intersection,
      requestedSet,
    );

    if (exactChannel !== undefined) {
      const ch0 = exactChannel;
      if (isLocal) {
        const ctiName = [...involvedCtiNames][0];
        const localCti = this.ctis.find((c) => c.name === ctiName)!;
        // CTIGATE does not block the fabric→output path, so a channel active on
        // the fabric would fire this CTI's outputs even with gate closed.
        for (const [name, status] of allStatus) {
          if (name === ctiName) continue;
          // Only input mappings with an open gate make a channel fabric-active
          // (CTIGATE controls the CTI→fabric path). An output-only mapping with
          // an open gate does not drive the fabric, so it is not a threat to a
          // local connection sharing the same channel number.
          if (
            channelsUsedByStatuses({ input: status.input, output: {} }).has(
              ch0,
            ) &&
            isBitSet(status.gate, ch0)
          ) {
            throw new Error(
              `connect: ${ctiName} is already connected on channel ${ch0} but that channel is also active on the CTM fabric; disconnect and reconnect to move it to a clean channel.`,
            );
          }
        }
        await localCti.setChannelGate(ch0, false);
        await ensureEnabled(localCti);
      } else {
        const producerNames = new Set(parsedInputs.map((p) => p.cti.name));
        for (const ctiName of involvedCtiNames) {
          const status = allStatus.get(ctiName);
          // Only producer CTIs need an open gate: CTIGATE does not block the
          // fabric→output path, so receiver CTIs fire regardless of gate state.
          const needsOpenGate = producerNames.has(ctiName);
          if (needsOpenGate && !isBitSet(status?.gate ?? 0, ch0)) {
            throw new Error(
              `connect: group already on channel ${ch0} but gate is closed on ${ctiName}; disconnect and reconnect.`,
            );
          }
          await ensureEnabled(this.ctis.find((c) => c.name === ctiName)!);
        }
      }
      return;
    }

    // Select the lowest-numbered free channel.  The search scope differs:
    // - Local: must be locally free AND fabric-inactive (CTIGATE does not block
    //   the fabric→output path, so a fabric-active channel would fire unexpectedly).
    // - Cross-CTI: must be globally free (visible on the fabric without collision).
    const freeChannel = this.findFreeChannelCTM(
      allStatus,
      isLocal,
      involvedCtiNames,
    );
    if (freeChannel === undefined) {
      const ctiName = isLocal ? [...involvedCtiNames][0] : undefined;
      throw new CtiNoCapacityError(
        ctiName
          ? `Cannot connect group: no channels available in ${ctiName}.`
          : `Cannot connect group: no globally available channels in CTM ${this.name}.`,
      );
    }

    if (isLocal) {
      const ctiName = [...involvedCtiNames][0];
      const localCti = this.ctis.find((c) => c.name === ctiName)!;
      // Close the gate before writing trigger mappings so the channel never
      // appears on the fabric during the intermediate partially-written state.
      await localCti.setChannelGate(freeChannel, false);
      await ensureEnabled(localCti);
      await this.clearChannelMappingsCTM(
        freeChannel,
        new Map([[ctiName, allStatus.get(ctiName)!]]),
      );
      try {
        for (const { triggerIndex } of parsedInputs)
          await localCti.connectInputTrigger(triggerIndex, freeChannel);
        for (const { triggerIndex } of parsedOutputs)
          await localCti.connectOutputTrigger(triggerIndex, freeChannel);
      } catch (err) {
        try {
          // Scope cleanup to the local CTI only — the channel may be in use by
          // other CTIs on independent isolated routes; clearing all would delete
          // their working mappings.
          const freshStatus = await this.readCtisStatus();
          await this.clearChannelMappingsCTM(
            freeChannel,
            new Map([[ctiName, freshStatus.get(ctiName)!]]),
          );
        } catch {
          // Cleanup failed — partial mappings remain until the next session clears them.
        }
        throw err;
      }
    } else {
      for (const ctiName of involvedCtiNames)
        await ensureEnabled(this.ctis.find((c) => c.name === ctiName)!);
      await this.clearChannelMappingsCTM(freeChannel, allStatus);
      try {
        for (const { cti, triggerIndex } of parsedInputs)
          await cti.connectInputTrigger(triggerIndex, freeChannel);
        for (const { cti, triggerIndex } of parsedOutputs)
          await cti.connectOutputTrigger(triggerIndex, freeChannel);
        // Open the gate on every involved CTI only after all trigger mappings are
        // written, so the channel becomes visible on the CTM fabric atomically.
        for (const ctiName of involvedCtiNames)
          await this.ctis
            .find((c) => c.name === ctiName)!
            .setChannelGate(freeChannel, true);
      } catch (err) {
        try {
          await this.clearChannelMappingsCTM(
            freeChannel,
            await this.readCtisStatus(),
          );
        } catch {
          // Cleanup failed — partial mappings remain until the next session clears them.
        }
        throw err;
      }
    }
  }

  /**
   * Returns the lowest-numbered available channel for the given scope, or
   * `undefined` when all channels are fully occupied on both sides.
   *
   * A channel is available when it is not mapped on BOTH sides: fully free
   * (no mappings at all) or one-sided (stale partial mapping from a failed
   * write). {@link clearChannelMappingsCTM} removes the stale side before
   * new triggers are written.
   *
   * The search scope follows the same rules as {@link connectGroup}:
   * - Local: locally not-two-sided AND fabric-inactive (CTIGATE does not block
   *   the fabric→output path, so a fabric-active channel would fire the local
   *   CTI's outputs unexpectedly).
   * - Cross-CTI: globally not-two-sided across all CTIs.
   */
  private findFreeChannelCTM(
    allStatus: Map<string, CtiStatus>,
    isLocal: boolean,
    involvedCtiNames: Set<string>,
  ): number | undefined {
    if (isLocal) {
      const ctiName = [...involvedCtiNames][0];
      const localStatus = allStatus.get(ctiName)!;
      const inputChannels = new Set(Object.values(localStatus.input).flat());
      const outputChannels = new Set(Object.values(localStatus.output).flat());
      const fabricActive = this.computeFabricActiveChannels(allStatus);
      for (let ch = 0; ch < this.channelCount; ch++) {
        if (fabricActive.has(ch)) continue;
        if (!inputChannels.has(ch) || !outputChannels.has(ch)) return ch;
      }
      return undefined;
    } else {
      const globalInputChannels = new Set<number>();
      const globalOutputChannels = new Set<number>();
      for (const { input, output } of allStatus.values()) {
        for (const ch of Object.values(input).flat())
          globalInputChannels.add(ch);
        for (const ch of Object.values(output).flat())
          globalOutputChannels.add(ch);
      }
      for (let ch = 0; ch < this.channelCount; ch++) {
        if (!globalInputChannels.has(ch) || !globalOutputChannels.has(ch))
          return ch;
      }
      return undefined;
    }
  }

  /**
   * Clears all trigger mappings for a specific channel across every CTI in `allStatus`.
   * Used to reclaim a one-sided (stale partial) channel before writing new triggers.
   * Is a no-op for triggers that do not reference the channel.
   *
   * @param channel The channel index to clear.
   * @param allStatus The status snapshot used to identify affected CTIs and triggers.
   */
  private async clearChannelMappingsCTM(
    channel: number,
    allStatus: Map<string, CtiStatus>,
  ): Promise<void> {
    for (const [ctiName, status] of allStatus) {
      const cti = this.ctis.find((c) => c.name === ctiName);
      if (!cti) continue;
      for (const [index, channels] of Object.entries(status.input)) {
        if (channels.includes(channel))
          await cti.disconnectInputTrigger(Number(index), channel);
      }
      for (const [index, channels] of Object.entries(status.output)) {
        if (channels.includes(channel))
          await cti.disconnectOutputTrigger(Number(index), channel);
      }
    }
  }

  /**
   * Disconnects a group of input and output triggers from their shared CTM channel.
   *
   * All triggers must currently share the same channel established by a prior
   * {@link connectGroup} call. For cross-CTI groups at least one producer CTI
   * must have the channel open to the CTM fabric.
   *
   * @param inputs  CTM-scoped input signals (`"<ctiName>.InputTriggers.<index>"`).
   * @param outputs CTM-scoped output signals (`"<ctiName>.OutputTriggers.<index>"`).
   * @throws If triggers do not share a common channel, or no producer has the
   *   channel open to the CTM fabric (cross-CTI case).
   */
  public async disconnectGroup(
    inputs: string[],
    outputs: string[],
  ): Promise<void> {
    const parsedInputs = inputs.map((s) =>
      this.parseCTMSignal(s, "InputTriggers"),
    );
    const parsedOutputs = outputs.map((s) =>
      this.parseCTMSignal(s, "OutputTriggers"),
    );

    const involvedCtiNames = new Set([
      ...parsedInputs.map((p) => p.cti.name),
      ...parsedOutputs.map((p) => p.cti.name),
    ]);
    const isLocal = involvedCtiNames.size === 1;

    const allStatus = await this.readCtisStatus();

    // AND all trigger channel bitmasks to find channels shared by every member.
    let sharedMask = 0xffffffff;
    for (const { cti, triggerIndex } of parsedInputs)
      // eslint-disable-next-line no-bitwise
      sharedMask &= channelsToBitmask(
        allStatus.get(cti.name)?.input[triggerIndex] ?? [],
      );
    for (const { cti, triggerIndex } of parsedOutputs)
      // eslint-disable-next-line no-bitwise
      sharedMask &= channelsToBitmask(
        allStatus.get(cti.name)?.output[triggerIndex] ?? [],
      );
    if (sharedMask === 0)
      throw new Error(
        `Cannot disconnect group: triggers do not all share a common channel.`,
      );

    if (!isLocal) {
      // Narrow candidates to channels that are open to the CTM fabric on at least
      // one producer CTI. Under the "one channel = one connection" model a group
      // may include gate-closed producers (externally configured), so OR across
      // producers rather than AND.
      const producerNames = new Set(parsedInputs.map((p) => p.cti.name));
      let fabricMask = 0;
      for (const ctiName of producerNames) {
        const gate = allStatus.get(ctiName)?.gate ?? 0;
        // eslint-disable-next-line no-bitwise
        fabricMask |= sharedMask & gate;
      }
      if (fabricMask === 0)
        throw new Error(
          `Cannot disconnect group: no shared channel is open to the CTM fabric on any producer CTI.`,
        );
      sharedMask = fabricMask;
    }

    const candidates: number[] = [];
    for (let ch = 0; ch < this.channelCount; ch++) {
      if (isBitSet(sharedMask, ch)) candidates.push(ch);
    }

    // The channel's complete membership must exactly match the requested group
    // to avoid damaging a larger co-sharing connection.
    const requestedSet = new Set([
      ...parsedInputs.map(
        (p) => `${p.cti.name}.InputTriggers.${p.triggerIndex}`,
      ),
      ...parsedOutputs.map(
        (p) => `${p.cti.name}.OutputTriggers.${p.triggerIndex}`,
      ),
    ]);
    // Scope membership to enabled CTIs only: discovery reports groups from
    // enabled CTIs exclusively, so a disabled CTI with a residual trigger on
    // the same channel must not inflate the membership set and block the match.
    const enabledStatus = new Map([...allStatus].filter(([, s]) => s.enabled));
    // Same fabric-active guard as connectGroup: when the candidate channel is
    // already active on the fabric, the local filter would accept a subset of a
    // cross-CTI route and remove only part of it, orphaning the remaining
    // triggers. Use the full enabled status so exactMatchChannelCTM finds no
    // match and the caller receives a clear "membership does not match" error.
    const fabricActive = isLocal
      ? this.computeFabricActiveChannels(enabledStatus)
      : undefined;
    const statusForMatch =
      isLocal && !candidates.some((ch) => fabricActive!.has(ch))
        ? new Map(
            [...enabledStatus].filter(([name]) => involvedCtiNames.has(name)),
          )
        : enabledStatus;
    // Remove all channels that carry exactly this trigger group. Externally
    // programmed hardware may map the same group onto multiple channels; one
    // disconnect call must clear every duplicate so no orphaned channel remains
    // active after the UI row goes Offline.
    const allChannels = this.allExactMatchChannelsCTM(
      statusForMatch,
      candidates,
      requestedSet,
    );
    if (allChannels.length === 0)
      throw new Error(
        `Cannot disconnect group: no channel found whose membership exactly matches the requested group.`,
      );

    for (const ch of allChannels) {
      for (const { cti, triggerIndex } of parsedInputs)
        await cti.disconnectInputTrigger(triggerIndex, ch);
      for (const { cti, triggerIndex } of parsedOutputs)
        await cti.disconnectOutputTrigger(triggerIndex, ch);

      if (isLocal) {
        const ctiName = [...involvedCtiNames][0];
        await this.ctis
          .find((c) => c.name === ctiName)!
          .setChannelGate(ch, true);
      } else {
        // Close the gate on every involved CTI so the freed channel is left in
        // a known closed state; connectGroup re-opens it on next use.
        for (const ctiName of involvedCtiNames)
          await this.ctis
            .find((c) => c.name === ctiName)!
            .setChannelGate(ch, false);
      }
    }
  }
}
