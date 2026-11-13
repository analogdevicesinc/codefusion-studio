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
import { coresight } from "../coresight";
import type { SessionResolver } from "../coresight";
import { RegisterDescription } from "../../../../debug-manager";

/** Thrown by {@link Css600Cti.connectGroup} when no CTI channel is available. Hardware is untouched. */
export class CtiNoCapacityError extends Error {}

export type CtiDataModelInfo = SocTraceComponentInfo & {
  ChannelCount: number;
  BaseAddress: string;
  ApAddress?: string;
  TriggerCount: number;
  InputTriggers: Record<string, string>;
  OutputTriggers: Record<string, string>;
};

export type CTIStatus = {
  input: Record<number, number[]>;
  output: Record<number, number[]>;
};

/**
 * Returns the 0-based index of the lowest set bit.
 * Callers must ensure `mask` is non-zero.
 *
 * @param mask A non-zero bitmask.
 * @returns The 0-based index of the lowest set bit.
 */
export function lowestBitIndex(mask: number): number {
  // isolate the lowest set bit, then count leading zeros to find its position
  // eslint-disable-next-line no-bitwise
  return 31 - Math.clz32(mask & -mask);
}

/**
 * Returns true when `bit` is set in `mask`.
 *
 * @param mask The bitmask to test.
 * @param bit The 0-based bit index to check.
 * @returns `true` if the specified bit is set, `false` otherwise.
 */
export function isBitSet(mask: number, bit: number): boolean {
  // eslint-disable-next-line no-bitwise
  return (mask & (1 << bit)) !== 0;
}

/**
 * Returns the set of channel indices used across all trigger entries in the status.
 *
 * @param ctiStatus An object containing input and output trigger statuses.
 * @returns A set of channel indices that are currently in use.
 */
export function channelsUsedByStatuses(ctiStatus: CTIStatus): Set<number> {
  return new Set([
    ...Object.values(ctiStatus.input).flat(),
    ...Object.values(ctiStatus.output).flat(),
  ]);
}

/**
 * Converts an array of channel indices into a bitmask where each bit position
 * corresponds to a channel index.
 *
 * @param channels Array of 0-based channel indices.
 * @returns A 32-bit bitmask with the corresponding bits set.
 */
export function channelsToBitmask(channels: number[]): number {
  let mask = 0;
  for (const ch of channels) {
    // eslint-disable-next-line no-bitwise
    mask |= 1 << ch;
  }
  return mask;
}

/**
 * Returns the set of channel indices that appear in every array.
 * Returns an empty set if any array is empty or the input is empty.
 *
 * @param arrays Arrays of channel indices, one per trigger.
 * @returns A set of channel indices present in all arrays.
 */
export function channelIntersection(arrays: number[][]): Set<number> {
  if (arrays.length === 0) return new Set();
  const result = new Set(arrays[0]);
  for (let i = 1; i < arrays.length; i++) {
    for (const ch of result) {
      if (!arrays[i].includes(ch)) result.delete(ch);
    }
  }
  return result;
}

/**
 * This class allow interaction with ARM Coresight Cross Trigger Interface (CTI),
 * which allows to route trigger signals between different components.
 *
 * DISCLAIMER: This class is still under development with limited logic implemented.
 *
 * More information can be found on:
 * - ARM® CoreSight™ System-on-Chip SoC-600 Technical Reference Manual:
 *   https://developer.arm.com/documentation/100806/latest/
 *
 */
export class Css600Cti
  extends coresight.Component
  implements SoCTraceComponent
{
  readonly type: string;
  readonly InputTriggers: Record<number, string>;
  readonly OutputTriggers: Record<number, string>;
  readonly channelCount: number;
  readonly triggerCount: number;

  /**
   * @param name Unique name to identify the component in the system.
   *             Currently used only in error messages.
   * @param dmInfo Record containing component configuration from the data model.
   * @param resolveSession Callback that supplies the active debug session on demand.
   */
  constructor(
    public name: string,
    dmInfo: CtiDataModelInfo,
    resolveSession: SessionResolver,
  ) {
    super(resolveSession, dmInfo);

    // TODO: Improve type safety
    this.type = dmInfo.Type as string;
    this.InputTriggers = dmInfo.InputTriggers;
    this.OutputTriggers = dmInfo.OutputTriggers;
    this.channelCount = dmInfo.ChannelCount;
    this.triggerCount = dmInfo.TriggerCount;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Throws if index is not a valid trigger index for the given direction.
   * @param index The trigger index to validate.
   * @param kind The direction of the trigger ("input" or "output").
   * @throws If index is not a valid trigger index for the given direction.
   */
  private validateTrigger(index: number, kind: "input" | "output"): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.triggerCount)
      throw new Error(`Invalid ${kind} trigger index: ${index}`);
  }

  /**
   * Throws if channel is not a valid channel index for this CTI.
   * @param channel The channel index to validate.
   * @throws If `channel` is not a valid channel index for this CTI.
   */
  private validateChannel(channel: number): void {
    if (
      !Number.isInteger(channel) ||
      channel < 0 ||
      channel >= this.channelCount
    )
      throw new Error(`Invalid channel index: ${channel}`);
  }

  /**
   * Parses a component-scoped signal string and returns the numeric trigger index.
   * Throws a descriptive error when the format or index is invalid.
   * @param sig The component-scoped signal string to parse.
   * @param direction The direction of the trigger ("input" or "output").
   * @returns The numeric trigger index.
   * @throws If the signal string is malformed or the index is out of range.
   */
  private parseTriggerIndex(
    sig: string,
    direction: "input" | "output",
  ): number {
    const group = direction === "input" ? "InputTriggers" : "OutputTriggers";
    const triggers =
      direction === "input" ? this.InputTriggers : this.OutputTriggers;
    const m = new RegExp(`^${group}\\.(\\d+)$`).exec(sig);
    if (!m) throw new Error(`Expected "${group}.<index>", got "${sig}".`);
    const index = Number(m[1]);
    if (!(index in triggers))
      throw new Error(
        `Invalid ${direction} trigger index in "${sig}" on ${this.name}.`,
      );
    return index;
  }

  /**
   * Returns the set of all trigger keys (e.g. `"InputTriggers.2"`) that are
   * currently mapped to channel in the given status snapshot.
   *
   * @param status The CTI status snapshot to inspect.
   * @param channel The channel index to check.
   * @returns A set of trigger keys currently mapped to the channel.
   * @throws If channel is not a valid channel index for this CTI.
   */
  private channelMembership(
    ctiStatus: CTIStatus,
    channel: number,
  ): Set<string> {
    const members = new Set<string>();
    for (const [index, channels] of Object.entries(ctiStatus.input))
      if (channels.includes(channel)) members.add(`InputTriggers.${index}`);
    for (const [index, channels] of Object.entries(ctiStatus.output))
      if (channels.includes(channel)) members.add(`OutputTriggers.${index}`);
    return members;
  }

  /**
   * Returns the first channel in `candidates` whose complete hardware membership
   * equals `requestedSet` exactly, or `undefined` if none matches.
   * @param status The CTI status snapshot to inspect.
   * @param candidates An iterable of candidate channel indices to check.
   * @param requestedSet The set of trigger keys that must exactly match the channel's membership.
   * @returns The first channel index whose membership exactly matches `requestedSet`, or `undefined` if none match.
   */
  private exactMatchChannel(
    ctiStatus: CTIStatus,
    candidates: Iterable<number>,
    requestedSet: Set<string>,
  ): number | undefined {
    for (const channel of candidates) {
      const members = this.channelMembership(ctiStatus, channel);
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
   * equals `requestedSet` exactly. Used by {@link disconnectGroup} to remove
   * all duplicate channels that carry the same trigger group.
   * @param ctiStatus The CTI status snapshot to inspect.
   * @param candidates An iterable of candidate channel indices to check.
   * @param requestedSet The set of trigger keys that must exactly match.
   * @returns All matching channel indices (empty when none match).
   */
  private allExactMatchChannels(
    ctiStatus: CTIStatus,
    candidates: Iterable<number>,
    requestedSet: Set<string>,
  ): number[] {
    const matches: number[] = [];
    for (const channel of candidates) {
      const members = this.channelMembership(ctiStatus, channel);
      if (
        members.size === requestedSet.size &&
        [...requestedSet].every((elem) => members.has(elem))
      )
        matches.push(channel);
    }
    return matches;
  }

  // ---------------------------------------------------------------------------
  // Hardware validation
  // ---------------------------------------------------------------------------

  /**
   * Checks if the CTI component is valid by reading its registers and
   * comparing them to expected values.
   *
   * @returns A promise that resolves to true if the CTI component is valid,
   * false otherwise.
   */
  async isValidHardware(): Promise<boolean> {
    const devid = await this.readRegister(cti.CTI_DEVID);
    if (
      devid.NUMTRIG !== this.triggerCount ||
      devid.NUMCH !== this.channelCount
    ) {
      throw new Error(
        `CTI_DEVID mismatch on ${this.name}: expected NUMTRIG=${this.triggerCount} and NUMCH=${this.channelCount}, got NUMTRIG=${devid.NUMTRIG} and NUMCH=${devid.NUMCH}`,
      );
    }

    const pid = await this.peripheralID();
    if (
      pid.part !== 0x906 ||
      pid.revision !== 5 ||
      pid.jep106?.continuation !== 0x4 ||
      pid.jep106?.identification !== 0x3b
    ) {
      return false;
    }

    // CSS-600 CTI DEVTYPE: major=4 (Debug control), sub=1 (Cross Trigger Interface)
    const devType = await this.deviceType();
    if (devType.major !== 0x4 || devType.sub !== 0x1) {
      return false;
    }

    const cid = await this.componentID();
    if (
      cid.preamble !== 0xb105000d ||
      cid.class !== coresight.Class.CoresightComponent
    ) {
      return false;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Connection discovery
  // ---------------------------------------------------------------------------

  /**
   * Returns the connections of a given trigger signal, either InputTriggers or OutputTriggers.
   *
   * @param signal The trigger signal in the format "InputTriggers.<index>" or "OutputTriggers.<index>".
   * @param offline If true, only uses offline data; otherwise reads live status.
   * @returns A promise that resolves to an array of connections for the given trigger signal.
   */
  async getConnections(
    signal: string,
    offline?: boolean,
  ): Promise<SoCTraceComponentConnection[]> {
    const [group, indexStr] = signal.split(/\.(.*)/);
    const triggerIndex = parseInt(indexStr, 10);

    if (group !== "InputTriggers" && group !== "OutputTriggers") {
      throw new Error(
        `Only InputTriggers and OutputTriggers signals are supported for ${this.name} (received ${signal}).`,
      );
    }

    const isInput = group === "InputTriggers";
    const triggerMap = isInput ? this.InputTriggers : this.OutputTriggers;

    if (isNaN(triggerIndex) || !(triggerIndex in triggerMap)) {
      throw new Error(
        `Invalid ${group} signal for ${this.name}: expected "${group}.<index>", got "${signal}".`,
      );
    }

    if (offline) {
      if (isInput) {
        return Object.entries(this.OutputTriggers).map(([key, destSignal]) => ({
          sourceSignal: this.InputTriggers[triggerIndex],
          componentSourceSignal: `InputTriggers.${indexStr}`,
          componentDestinationSignal: `OutputTriggers.${parseInt(key, 10)}`,
          destinationSignal: destSignal,
          isActive: undefined,
        }));
      } else {
        return Object.entries(this.InputTriggers).map(([key, destSignal]) => ({
          sourceSignal: this.OutputTriggers[triggerIndex],
          componentSourceSignal: `OutputTriggers.${indexStr}`,
          componentDestinationSignal: `InputTriggers.${parseInt(key, 10)}`,
          destinationSignal: destSignal,
          isActive: undefined,
        }));
      }
    }

    const ctiStatus = await this.readTriggerStatus();
    const enabled = await this.isEnabled();

    return this.resolveTriggerConnections(
      isInput ? "input" : "output",
      triggerIndex,
      ctiStatus,
      enabled,
    );
  }

  /**
   * Resolves the live connections for a given trigger signal.
   *
   * @param direction Whether the trigger is an input or output trigger.
   * @param triggerIndex The index of the trigger signal.
   * @param ctiStatus The current status of the CTI channels.
   * @param enabled Whether the CTI is currently enabled.
   * @returns A promise that resolves to an array of connections for the given trigger signal.
   */
  private async resolveTriggerConnections(
    direction: "input" | "output",
    triggerIndex: number,
    ctiStatus: CTIStatus,
    enabled: boolean,
  ): Promise<SoCTraceComponentConnection[]> {
    const isInput = direction === "input";
    const sourceTriggers = isInput ? this.InputTriggers : this.OutputTriggers;
    const destTriggers = isInput ? this.OutputTriggers : this.InputTriggers;
    const sourceGroup = isInput ? "InputTriggers" : "OutputTriggers";
    const destGroup = isInput ? "OutputTriggers" : "InputTriggers";
    const sourceStatusMap = isInput ? ctiStatus.input : ctiStatus.output;
    const destStatusMap = isInput ? ctiStatus.output : ctiStatus.input;

    const sourceSignal = sourceTriggers[triggerIndex];
    const sourcePath = `${sourceGroup}.${triggerIndex}`;
    const channelArray = sourceStatusMap[triggerIndex] ?? [];

    // Source is on at least one channel: collect every destination that shares
    // any of those channels, then merge in candidates reachable on a new free
    // channel so fan-out and fan-in routes remain discoverable after mapping.
    if (channelArray.length > 0) {
      const seen = new Set<number>();
      const result: SoCTraceComponentConnection[] = [];
      for (const [key, destSignal] of Object.entries(destTriggers)) {
        const destIndex = parseInt(key, 10);
        if (seen.has(destIndex)) continue;
        const hasSharedChannel = channelArray.some((ch) =>
          (destStatusMap[destIndex] ?? []).includes(ch),
        );
        if (!hasSharedChannel) continue;
        seen.add(destIndex);
        result.push({
          sourceSignal,
          componentSourceSignal: sourcePath,
          componentDestinationSignal: `${destGroup}.${destIndex}`,
          destinationSignal: destSignal,
          isActive: enabled,
        });
      }
      // Add destinations not yet sharing any channel with the source when a
      // free channel is still available.  Use findFreeChannel rather than a
      // raw count so one-sided stale mappings (reclaimable by connectGroup) do
      // not falsely block new routes.
      if (this.findFreeChannel(ctiStatus) !== undefined) {
        for (const [key, destSignal] of Object.entries(destTriggers)) {
          const destIndex = parseInt(key, 10);
          if (seen.has(destIndex)) continue;
          result.push({
            sourceSignal,
            componentSourceSignal: sourcePath,
            componentDestinationSignal: `${destGroup}.${destIndex}`,
            destinationSignal: destSignal,
            isActive: false,
          });
        }
      }
      return result;
    }

    // Source is not yet on any channel: advertise all destinations (mapped or not)
    // when at least one channel is still available. connectGroup allocates a new
    // channel per group, so an already-mapped destination can join a fan-in route.
    // Use findFreeChannel so one-sided stale mappings are treated as reclaimable.
    if (this.findFreeChannel(ctiStatus) === undefined) return [];

    const freeResult: SoCTraceComponentConnection[] = [];
    for (const [key, destSignal] of Object.entries(destTriggers)) {
      const destIndex = parseInt(key, 10);
      freeResult.push({
        sourceSignal,
        componentSourceSignal: sourcePath,
        componentDestinationSignal: `${destGroup}.${destIndex}`,
        destinationSignal: destSignal,
        isActive: false,
      });
    }
    return freeResult;
  }

  // ---------------------------------------------------------------------------
  // Register read / write
  // ---------------------------------------------------------------------------

  /**
   * Reads the current trigger channel mappings directly from hardware.
   * Every call issues a live register read; no caching is performed.
   *
   * @returns A promise that resolves to an object containing the input and output trigger statuses.
   */
  async readTriggerStatus(): Promise<CTIStatus> {
    const memToRead = this.triggerCount * 4; // each trigger has a 32-bit channel mask
    const inputMask = await this.readMemoryToTriggerMap(
      cti.CTIINEN0.address,
      memToRead,
    );
    const outputMask = await this.readMemoryToTriggerMap(
      cti.CTIOUTEN0.address,
      memToRead,
    );
    return {
      input: this.maskToChannelArrays(inputMask),
      output: this.maskToChannelArrays(outputMask),
    };
  }

  /**
   * Clears all trigger channel mappings for this CTI by writing empty masks to the relevant registers.
   * This effectively resets the CTI's trigger configuration.
   */
  async cleanTriggerStatus(): Promise<void> {
    const emptyMask = Buffer.alloc(this.triggerCount * 4, 0);
    await this.writeMemory(cti.CTIINEN0.address, emptyMask);
    await this.writeMemory(cti.CTIOUTEN0.address, emptyMask);
  }

  /**
   * Converts a record of trigger masks to a record of channel arrays.
   *
   * @param triggerMasks Record mapping trigger index to 32-bit channel mask.
   * @returns Record mapping trigger index to array of channel indices.
   */
  private maskToChannelArrays(
    triggerMasks: Record<number, number>,
  ): Record<number, number[]> {
    const result: Record<number, number[]> = {};
    for (const [trigger, mask] of Object.entries(triggerMasks)) {
      const channels: number[] = [];
      for (let channel = 0; channel < this.channelCount; channel++) {
        if (isBitSet(mask, channel)) channels.push(channel);
      }
      result[Number(trigger)] = channels;
    }
    return result;
  }

  /**
   * Reads a block of memory from the CTI component and returns a mapping of trigger indices to their corresponding values.
   *
   * @param baseAddress The base address of the memory block to read.
   * @param numBytes The number of bytes to read from the memory block.
   * @returns A record mapping trigger index (0-based) to its 32-bit channel mask.
   */
  private async readMemoryToTriggerMap(
    baseAddress: number,
    numBytes: number,
  ): Promise<Record<number, number>> {
    const mem = await this.readMemory(baseAddress, numBytes);
    if (mem.data.length !== numBytes) {
      throw new Error(
        `Incomplete CTI register read on ${this.name}: expected ${numBytes} bytes, received ${mem.data.length}.`,
      );
    }
    const result: Record<number, number> = {};
    for (let i = 0; i < numBytes; i += 4) {
      result[i / 4] = mem.data.readUInt32LE(i);
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Enable / disable / gate
  // ---------------------------------------------------------------------------

  /**
   * Checks if the CTI component is enabled by reading the CTICONTROL register and checking the CTIEN bit.
   *
   * @returns A promise that resolves to a boolean indicating whether the CTI component is enabled.
   */
  async isEnabled(): Promise<boolean> {
    const control = await this.readRegister(cti.CTICONTROL);
    return control.CTIEN === 1;
  }

  /**
   * Enables the CTI component by setting the CTIEN bit in the CTICONTROL register.
   */
  async enable(): Promise<void> {
    await this.writeRegister(cti.CTICONTROL, { CTIEN: 1 });
  }

  /**
   * Disables the CTI component by clearing the CTIEN bit in the CTICONTROL register.
   */
  async disable(): Promise<void> {
    await this.writeRegister(cti.CTICONTROL, { CTIEN: 0 });
  }

  /**
   * Sets the specified channel in the CTIAPPSET register, enabling it for triggering.
   *
   * @param channel The index of the channel to set.
   */
  async setChannel(channel: number): Promise<void> {
    // eslint-disable-next-line no-bitwise
    await this.writeRegister(cti.CTIAPPSET, { APPSET: 1 << channel });
  }

  /**
   * Clears the specified channel in the CTIAPPCLEAR register, disabling it for triggering.
   *
   * @param channel The index of the channel to clear.
   */
  async clearChannel(channel: number): Promise<void> {
    // eslint-disable-next-line no-bitwise
    await this.writeRegister(cti.CTIAPPCLEAR, { APPCLEAR: 1 << channel });
  }

  /**
   * Pulses the specified channel in the CTIAPPPULSE register.
   *
   * @param channel The index of the channel to pulse.
   */
  async pulseChannel(channel: number): Promise<void> {
    // eslint-disable-next-line no-bitwise
    await this.writeRegister(cti.CTIAPPPULSE, { APPPULSE: 1 << channel });
  }

  /**
   * Returns the raw CTIGATEEN bitmask from the CTIGATE register.
   * A set bit means that channel is open and propagates to the CTM fabric;
   * a cleared bit means the channel is gated locally and does not propagate.
   *
   * @returns A promise resolving to the 32-bit CTIGATEEN bitmask.
   */
  async readGateStatus(): Promise<number> {
    const gate = await this.readRegister(cti.CTIGATE);
    return gate.CTIGATEEN;
  }

  /**
   * Returns true if the specified channel gate is open and propagates to the CTM fabric.
   *
   * @param channel The 0-based index of the channel to check.
   * @returns A promise resolving to `true` if the channel gate is open, `false` if gated.
   */
  async readGateChannel(channel: number): Promise<boolean> {
    return isBitSet(await this.readGateStatus(), channel);
  }

  /**
   * Acknowledges a trigger output by writing to the CTIINTACK register.
   * @param trigger The 0-based index of the trigger output to acknowledge or a set of such indices.
   */
  async ackTriggerOutput(trigger: number | Set<number>): Promise<void> {
    const value =
      trigger instanceof Set
        ? Array.from(trigger).reduce((acc, t) => acc | (1 << t), 0)
        : 1 << trigger;

    await this.writeRegister(cti.CTIINTACK, {
      INTACK: value,
    });
  }

  /**
   * Reads the status of all trigger outputs.
   *
   * @returns A promise resolving to a set of 0-based indices of active trigger outputs.
   */
  private async readTrigOutStatus(): Promise<Set<number>> {
    const trigOutStatus = await this.readRegister(cti.CTITRIGOUTSTATUS);
    const mask = trigOutStatus.TRIGOUTSTATUS;

    const enabled = new Set<number>();
    for (let bit = 0; bit < this.triggerCount; bit++) {
      if (isBitSet(mask, bit)) enabled.add(bit);
    }

    return enabled;
  }

  /**
   * Sets or clears the gate for a specific channel in the CTIGATE register.
   *
   * @param channel The index of the channel to set or clear the gate for.
   * @param enable If true, sets the gate; if false, clears the gate.
   */
  async setChannelGate(channel: number, enable: boolean): Promise<void> {
    if ((await this.readGateChannel(channel)) === enable) return;
    const gate = await this.readRegister(cti.CTIGATE);
    // eslint-disable-next-line no-bitwise
    const channelBit = 1 << channel;
    const current = gate.CTIGATEEN;
    // eslint-disable-next-line no-bitwise
    const newVal = enable ? current | channelBit : current & ~channelBit;
    await this.writeRegister(cti.CTIGATE, { CTIGATEEN: newVal });
  }

  // ---------------------------------------------------------------------------
  // Low-level trigger register access
  // ---------------------------------------------------------------------------

  /**
   * Connects the specified input trigger to a channel.
   *
   * @param trigger The 0-based index of the input trigger to connect.
   * @param channel The 0-based index of the channel to connect the trigger to.
   * @throws {Error} If `trigger` or `channel` is out of range for this CTI instance.
   */
  async connectInputTrigger(trigger: number, channel: number): Promise<void> {
    this.validateTrigger(trigger, "input");
    this.validateChannel(channel);
    await this.writeRegister(cti.makeCTIINEN_Chan(trigger, this.channelCount), {
      [`ch${channel}`]: 1,
    });
  }

  /**
   * Connects the specified output trigger to a channel.
   *
   * @param trigger The 0-based index of the output trigger to connect.
   * @param channel The 0-based index of the channel to connect the trigger to.
   * @throws {Error} If `trigger` or `channel` is out of range for this CTI instance.
   */
  async connectOutputTrigger(trigger: number, channel: number): Promise<void> {
    this.validateTrigger(trigger, "output");
    this.validateChannel(channel);
    await this.writeRegister(
      cti.makeCTIOUTEN_Chan(trigger, this.channelCount),
      { [`ch${channel}`]: 1 },
    );
  }

  /**
   * Clears all channel mappings for the specified input trigger.
   * Erases the entire CTIINEN register.
   * Use {@link disconnectInputTrigger} to clear a single channel.
   *
   * @param trigger The 0-based index of the input trigger to clear.
   * @throws {Error} If `trigger` is out of range for this CTI instance.
   */
  async clearInputTrigger(trigger: number): Promise<void> {
    this.validateTrigger(trigger, "input");
    await this.writeRegister(cti.makeCTIINEN(trigger), { TRIGINEN: 0 });
  }

  /**
   * Clears all channel mappings for the specified output trigger.
   * Erases the entire CTIOUTEN register.
   * Use {@link disconnectOutputTrigger} to clear a single channel.
   *
   * @param trigger The 0-based index of the output trigger to clear.
   * @throws {Error} If `trigger` is out of range for this CTI instance.
   */
  async clearOutputTrigger(trigger: number): Promise<void> {
    this.validateTrigger(trigger, "output");
    await this.writeRegister(cti.makeCTIOUTEN(trigger), { TRIGOUTEN: 0 });
  }

  /**
   * Disconnects the specified input trigger from a channel.
   * Clears the channel bit from the CTIINEN register, leaving other mappings intact.
   *
   * @param trigger The 0-based index of the input trigger.
   * @param channel The 0-based index of the channel to disconnect from.
   * @throws {Error} If `trigger` or `channel` is out of range for this CTI instance.
   */
  async disconnectInputTrigger(
    trigger: number,
    channel: number,
  ): Promise<void> {
    this.validateTrigger(trigger, "input");
    this.validateChannel(channel);
    await this.writeRegister(cti.makeCTIINEN_Chan(trigger, this.channelCount), {
      [`ch${channel}`]: 0,
    });
  }

  /**
   * Disconnects the specified output trigger from a channel.
   * Clears the channel bit from the CTIOUTEN register, leaving other mappings intact.
   *
   * @param trigger The 0-based index of the output trigger.
   * @param channel The 0-based index of the channel to disconnect from.
   * @throws {Error} If `trigger` or `channel` is out of range for this CTI instance.
   */
  async disconnectOutputTrigger(
    trigger: number,
    channel: number,
  ): Promise<void> {
    this.validateTrigger(trigger, "output");
    this.validateChannel(channel);
    await this.writeRegister(
      cti.makeCTIOUTEN_Chan(trigger, this.channelCount),
      { [`ch${channel}`]: 0 },
    );
  }

  /**
   * Gets the status of the specified input trigger.
   *
   * @param index The index of the input trigger.
   * @returns The 32-bit channel mask currently stored in the CTIINEN register for this trigger.
   */
  async getInputTriggerStatus(index: number): Promise<number> {
    const status = await this.readRegister(cti.makeCTIINEN(index));
    return status.TRIGINEN;
  }

  /**
   * Gets the status of the specified output trigger.
   *
   * @param index The index of the output trigger.
   * @returns The 32-bit channel mask currently stored in the CTIOUTEN register for this trigger.
   */
  async getOutputTriggerStatus(index: number): Promise<number> {
    const status = await this.readRegister(cti.makeCTIOUTEN(index));
    return status.TRIGOUTEN;
  }

  // ---------------------------------------------------------------------------
  // High-level group connect / disconnect
  // ---------------------------------------------------------------------------

  /**
   * Reads the current hardware trigger status and returns all active connections
   * as groups of input and output trigger display names, grouped by shared channel.
   * @returns An array where each element represents one connection group: a set of
   *          input and output trigger display names that share a common CTI channel.
   */
  public async getActiveConnectionGroups(): Promise<CtiTriggerPair[]> {
    if (!(await this.isEnabled())) return [];
    const status = await this.readTriggerStatus();
    const connections: CtiTriggerPair[] = [];
    for (let channel = 0; channel < this.channelCount; channel++) {
      const inputTriggers: string[] = [];
      const outputTriggers: string[] = [];
      for (const [indexStr, channels] of Object.entries(status.input)) {
        if (channels.includes(channel)) {
          const name = this.InputTriggers[Number(indexStr)];
          if (name !== undefined) inputTriggers.push(name);
        }
      }
      for (const [indexStr, channels] of Object.entries(status.output)) {
        if (channels.includes(channel)) {
          const name = this.OutputTriggers[Number(indexStr)];
          if (name !== undefined) outputTriggers.push(name);
        }
      }
      if (inputTriggers.length > 0 && outputTriggers.length > 0) {
        connections.push({ inputTriggers, outputTriggers });
      }
    }
    return connections;
  }

  /**
   * Returns the list of trigger signals for the specified direction.
   * @param direction The direction of the trigger signals to retrieve ("input" or "output").
   * @returns An array of trigger signal names for the specified direction.
   */
  public getTriggerSignals(direction: "input" | "output"): string[] {
    const trigger = direction === "input" ? "InputTriggers" : "OutputTriggers";
    return Object.values(this[trigger]);
  }

  /**
   * Removes all existing trigger mappings for this CTI, effectively resetting its state.
   */
  public async removeMapping(): Promise<void> {
    await this.cleanTriggerStatus();
  }

  /**
   * Clears all active trigger outputs by acknowledging them.
   */
  public async cleanACKTriggerOutputs(): Promise<void> {
    const trigOutStatus = await this.readTrigOutStatus();
    if (trigOutStatus.size > 0) {
      await this.ackTriggerOutput(trigOutStatus);
    }
  }

  /**
   * Resolves a trigger signal name to its component-scoped path.
   *
   * Searches the appropriate trigger map for a matching display name and returns
   * the corresponding `"<InputTriggers|OutputTriggers>.<index>"` path, or
   * `undefined` if no trigger with that name exists.
   *
   * @param name The display name to look up (e.g., `"HALTED"`).
   * @param direction Whether to search input or output triggers.
   * @returns The component-scoped signal path, or `undefined` if not found.
   */
  public resolveTriggerSignal(
    name: string,
    direction: "input" | "output",
  ): string | undefined {
    const triggers =
      direction === "input" ? this.InputTriggers : this.OutputTriggers;
    const group = direction === "input" ? "InputTriggers" : "OutputTriggers";
    const entry = Object.entries(triggers).find(([, v]) => v === name);
    return entry ? `${group}.${entry[0]}` : undefined;
  }

  /**
   * Connects an input trigger to an output trigger on this CTI.
   *
   * Delegates to {@link connectGroup}. See that method for full connection
   * semantics and error conditions.
   *
   * @param input  Input trigger signal (`"InputTriggers.<index>"`).
   * @param output Output trigger signal (`"OutputTriggers.<index>"`).
   */
  async connect(input: string, output: string): Promise<void> {
    return this.connectGroup([input], [output]);
  }

  /**
   * Disconnects an input trigger from an output trigger on this CTI.
   *
   * Delegates to {@link disconnectGroup}. See that method for full disconnection
   * semantics and error conditions.
   *
   * @param input  Input trigger signal (`"InputTriggers.<index>"`).
   * @param output Output trigger signal (`"OutputTriggers.<index>"`).
   */
  async disconnect(input: string, output: string): Promise<void> {
    return this.disconnectGroup([input], [output]);
  }

  /**
   * Connects a group of input triggers to a group of output triggers via a single
   * shared CTI channel (fan-out / fan-in): any active input propagates to every output.
   *
   * @param inputs  Input trigger signals in `"InputTriggers.<index>"` format.
   * @param outputs Output trigger signals in `"OutputTriggers.<index>"` format.
   * @throws Error if any signal is invalid, pre-mapped, or no free channel exists.
   */
  public async connectGroup(
    inputs: string[],
    outputs: string[],
  ): Promise<void> {
    const inIndex = inputs.map((s) => this.parseTriggerIndex(s, "input"));
    const outIndex = outputs.map((s) => this.parseTriggerIndex(s, "output"));

    const ctiStatus = await this.readTriggerStatus();

    // Idempotency: find a channel whose exact membership matches the requested
    // group.  A channel shared by more triggers (strict superset) belongs to a
    // larger group and must not be reused — allocate a new channel instead so
    // the two groups remain independent.
    const allArrays = [
      ...inIndex.map((i) => ctiStatus.input[i] ?? []),
      ...outIndex.map((i) => ctiStatus.output[i] ?? []),
    ];
    const intersection = channelIntersection(allArrays);
    const requestedSet = new Set([
      ...inIndex.map((i) => `InputTriggers.${i}`),
      ...outIndex.map((i) => `OutputTriggers.${i}`),
    ]);
    if (
      this.exactMatchChannel(ctiStatus, intersection, requestedSet) !==
      undefined
    ) {
      if (!(await this.isEnabled())) await this.enable();
      return;
    }

    // Pick the lowest-numbered channel not currently used by any trigger on this CTI.
    const freeChannel = this.findFreeChannel(ctiStatus);
    if (freeChannel === undefined)
      throw new CtiNoCapacityError(
        `Cannot connect group on ${this.name}: no channels available.`,
      );

    if (!(await this.isEnabled())) await this.enable();
    await this.clearChannelMappings(freeChannel, ctiStatus);
    try {
      for (const index of inIndex)
        await this.connectInputTrigger(index, freeChannel);
      for (const index of outIndex)
        await this.connectOutputTrigger(index, freeChannel);
    } catch (err) {
      try {
        await this.clearChannelMappings(
          freeChannel,
          await this.readTriggerStatus(),
        );
      } catch {
        // Cleanup failed — partial mappings remain until the next session clears them.
      }
      throw err;
    }
  }

  /**
   * Returns the lowest-numbered channel available for a new connection, or
   * `undefined` when all channels are fully occupied on both sides.
   *
   * A channel is available when it is not mapped on BOTH sides: a fully free
   * channel (no mappings at all) is returned immediately, as is a one-sided
   * channel (stale partial mapping). {@link clearChannelMappings} removes the
   * stale side before new triggers are written.
   */
  private findFreeChannel(ctiStatus: CTIStatus): number | undefined {
    const inputChannels = new Set(Object.values(ctiStatus.input).flat());
    const outputChannels = new Set(Object.values(ctiStatus.output).flat());
    for (let channel = 0; channel < this.channelCount; channel++) {
      if (!inputChannels.has(channel) || !outputChannels.has(channel))
        return channel;
    }
    return undefined;
  }

  /**
   * Clears all mappings for a specific channel from the cached trigger status.
   * Used to reclaim a one-sided (stale partial) channel before writing new triggers.
   * Is a no-op when the channel has no mappings.
   *
   * @param channel The channel index to clear.
   * @param ctiStatus The trigger status snapshot used to identify affected triggers.
   */
  private async clearChannelMappings(
    channel: number,
    ctiStatus: CTIStatus,
  ): Promise<void> {
    for (const [index, channels] of Object.entries(ctiStatus.input)) {
      if (channels.includes(channel))
        await this.disconnectInputTrigger(Number(index), channel);
    }
    for (const [index, channels] of Object.entries(ctiStatus.output)) {
      if (channels.includes(channel))
        await this.disconnectOutputTrigger(Number(index), channel);
    }
  }

  /**
   * Disconnects a group of input and output triggers from their shared channel.
   *
   * All triggers in the group must currently share the same channel, which was
   * established by a prior {@link connectGroup} call.
   *
   * @param inputs  Input trigger signals in `"InputTriggers.<index>"` format.
   * @param outputs Output trigger signals in `"OutputTriggers.<index>"` format.
   * @throws Error if the triggers do not all share a common channel.
   */
  public async disconnectGroup(
    inputs: string[],
    outputs: string[],
  ): Promise<void> {
    const inIndex = inputs.map((s) => this.parseTriggerIndex(s, "input"));
    const outIndex = outputs.map((s) => this.parseTriggerIndex(s, "output"));

    const ctiStatus = await this.readTriggerStatus();

    // AND all trigger channel bitmasks to find channels shared by every member.
    let sharedMask = 0xffffffff;
    for (const index of inIndex)
      // eslint-disable-next-line no-bitwise
      sharedMask &= channelsToBitmask(ctiStatus.input[index] ?? []);
    for (const index of outIndex)
      // eslint-disable-next-line no-bitwise
      sharedMask &= channelsToBitmask(ctiStatus.output[index] ?? []);
    if (sharedMask === 0)
      throw new Error(
        `Cannot disconnect group on ${this.name}: triggers do not all share a common channel.`,
      );

    // Select the channel whose complete membership exactly matches the requested
    // group; a strict subset must not damage a larger co-sharing connection.
    const requestedSet = new Set([
      ...inIndex.map((i) => `InputTriggers.${i}`),
      ...outIndex.map((i) => `OutputTriggers.${i}`),
    ]);
    const candidates: number[] = [];
    for (let channel = 0; channel < this.channelCount; channel++) {
      if (isBitSet(sharedMask, channel)) candidates.push(channel);
    }
    // Remove all channels that carry exactly this trigger group. Externally
    // programmed hardware may map the same group onto multiple channels; one
    // disconnect call must clear every duplicate so no orphaned channel remains
    // active after the UI row goes Offline.
    const channels = this.allExactMatchChannels(
      ctiStatus,
      candidates,
      requestedSet,
    );
    if (channels.length === 0)
      throw new Error(
        `Cannot disconnect group on ${this.name}: no channel found whose membership exactly matches the requested group.`,
      );

    for (const channel of channels) {
      for (const index of inIndex)
        await this.disconnectInputTrigger(index, channel);
      for (const index of outIndex)
        await this.disconnectOutputTrigger(index, channel);
    }
  }
}

export namespace cti {
  export const enum REG {
    CTICONTROL = 0x000,
    CTIINTACK = 0x010,
    CTIAPPSET = 0x014,
    CTIAPPCLEAR = 0x018,
    CTIAPPPULSE = 0x01c,
    CTIINEN0 = 0x020,
    CTIOUTEN0 = 0x0a0,
    CTITRIGINSTATUS = 0x130,
    CTITRIGOUTSTATUS = 0x134,
    CTICHINSTATUS = 0x138,
    CTICHOUTSTATUS = 0x13c,
    CTIGATE = 0x140,
    ASICCTL = 0x144,
  }

  export const CTICONTROL: RegisterDescription = {
    address: REG.CTICONTROL,
    fields: {
      CTIEN: [0, 1],
    },
  };

  export const CTIINTACK: RegisterDescription = {
    address: REG.CTIINTACK,
    fields: {
      INTACK: [0, 32],
    },
  };

  export const CTIAPPSET: RegisterDescription = {
    address: REG.CTIAPPSET,
    fields: {
      APPSET: [0, 16],
    },
  };

  export const CTIAPPCLEAR: RegisterDescription = {
    address: REG.CTIAPPCLEAR,
    fields: {
      APPCLEAR: [0, 16],
    },
  };

  export const CTIAPPPULSE: RegisterDescription = {
    address: REG.CTIAPPPULSE,
    fields: {
      APPPULSE: [0, 16],
    },
  };

  /**
   * Returns a {@link RegisterDescription} for CTIINEN<input> with a single
   * 32-bit TRIGINEN field covering all channel bits.
   * Use this when reading or writing the full channel mask for an input trigger.
   * Use {@link makeCTIINEN_Chan} when targeting individual channel bits.
   *
   * @param input The 0-based input trigger index.
   * @returns A register description for the corresponding CTIINENn register.
   */
  export function makeCTIINEN(input: number): RegisterDescription {
    return {
      address: REG.CTIINEN0 + input * 4,
      fields: {
        TRIGINEN: [0, 32],
      },
    };
  }

  /**
   * Returns a {@link RegisterDescription} for CTIINEN<input> with one named
   * field per channel (`ch0`…`ch<channelCount-1>`), each covering a single bit.
   * Use this when connecting or disconnecting a specific channel on an input trigger.
   * Use {@link makeCTIINEN} when operating on the full channel mask.
   *
   * @param input The 0-based input trigger index.
   * @param channelCount The total number of channels supported by this CTI instance.
   * @returns A register description with per-channel fields for the corresponding CTIINENn register.
   */
  export function makeCTIINEN_Chan(
    input: number,
    channelCount: number,
  ): RegisterDescription {
    const fields: Record<string, [number, number]> = {};
    for (let ch = 0; ch < channelCount; ch++) {
      fields[`ch${ch}`] = [ch, 1];
    }
    return { address: REG.CTIINEN0 + input * 4, fields };
  }

  /**
   * Returns a {@link RegisterDescription} for CTIOUTEN<output> with one named
   * field per channel (`ch0`…`ch<channelCount-1>`), each covering a single bit.
   * Use this when connecting or disconnecting a specific channel on an output trigger.
   * Use {@link makeCTIOUTEN} when operating on the full channel mask.
   *
   * @param output The 0-based output trigger index.
   * @param channelCount The total number of channels supported by this CTI instance.
   * @returns A register description with per-channel fields for the corresponding CTIOUTENn register.
   */
  export function makeCTIOUTEN_Chan(
    output: number,
    channelCount: number,
  ): RegisterDescription {
    const fields: Record<string, [number, number]> = {};
    for (let ch = 0; ch < channelCount; ch++) {
      fields[`ch${ch}`] = [ch, 1];
    }
    return { address: REG.CTIOUTEN0 + output * 4, fields };
  }

  export const CTIINEN0: RegisterDescription = {
    address: REG.CTIINEN0,
    fields: {
      TRIGINEN: [0, 32],
    },
  };

  /**
   * Returns a {@link RegisterDescription} for CTIOUTEN<output> with a single
   * 32-bit TRIGOUTEN field covering all channel bits.
   * Use this when reading or writing the full channel mask for an output trigger.
   * Use {@link makeCTIOUTEN_Chan} when targeting individual channel bits.
   *
   * @param output The 0-based output trigger index.
   * @returns A register description for the corresponding CTIOUTENn register.
   */
  export function makeCTIOUTEN(output: number): RegisterDescription {
    return {
      address: REG.CTIOUTEN0 + output * 4,
      fields: {
        TRIGOUTEN: [0, 32],
      },
    };
  }

  export const CTIOUTEN0: RegisterDescription = {
    address: REG.CTIOUTEN0,
    fields: {
      TRIGOUTEN: [0, 32],
    },
  };

  export const CTITRIGINSTATUS: RegisterDescription = {
    address: REG.CTITRIGINSTATUS,
    fields: {
      TRIGINSTATUS: [0, 8],
    },
  };

  export const CTITRIGOUTSTATUS: RegisterDescription = {
    address: REG.CTITRIGOUTSTATUS,
    fields: {
      TRIGOUTSTATUS: [0, 8],
    },
  };

  export const CTICHINSTATUS: RegisterDescription = {
    address: REG.CTICHINSTATUS,
    fields: {
      CHINSTATUS: [0, 4],
    },
  };

  export const CTICHOUTSTATUS: RegisterDescription = {
    address: REG.CTICHOUTSTATUS,
    fields: {
      CHOUTSTATUS: [0, 4],
    },
  };

  export const CTIGATE: RegisterDescription = {
    address: REG.CTIGATE,
    fields: {
      CTIGATEEN: [0, 4],
    },
  };

  export const ASICCTL: RegisterDescription = {
    address: REG.ASICCTL,
    fields: {
      ASICCTL: [0, 8],
    },
  };

  export const CTI_DEVID: RegisterDescription = {
    address: 0xfc8,
    fields: {
      EXTMUXNUM: [0, 5],
      NUMTRIG: [8, 8],
      NUMCH: [16, 4],
      INOUT: [24, 1],
    },
  };
}
