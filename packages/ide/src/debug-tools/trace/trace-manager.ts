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

import * as vscode from "vscode";

import type {
  SocTraceComponentInfo,
  SocTraceEventSource,
  SocTraceEventSourceGroup,
  SocTraceInfo,
} from "cfs-types";
import type { CtiTriggerPair, SoCTraceComponent } from "./trace-types";
import { Css600AtbFunnel } from "./hardware/coresight/css600/atb-funnel";
import { Css600AtbReplicator } from "./hardware/coresight/css600/atb-replicator";
import { Stm500 } from "./hardware/coresight/stm-500";
import { Css600TmcEtf } from "./hardware/coresight/css600/tmc-etf";
import { Css600TmcEtr } from "./hardware/coresight/css600/tmc-etr";
import { Css600TsGenerator } from "./hardware/coresight/css600/ts-generator";
import { Css600Tpiu } from "./hardware/coresight/css600/tpiu";
import {
  Css600Cti,
  type CtiDataModelInfo,
} from "./hardware/coresight/css600/cti";
import {
  Css600Ctm,
  type CtmDataModelInfo,
} from "./hardware/coresight/css600/ctm";
import { CfsDebugManager } from "../debug-manager";
import type { CfsDebugSession } from "../debug-manager";
import { CfsDataModelManager } from "cfs-lib";
import { EXTENSION_ID } from "../../constants";
import { parseATB } from "./parsers/atb-parser";

import {
  parseSTP,
  StpDataItem,
  StpItem,
  StpItemType,
} from "./parsers/stp-parser";
import {
  tmc,
  type TmcConfiguration,
} from "./hardware/coresight/css600/tmc-base";
import { TraceRouter } from "./trace-router";
import { Tru } from "./hardware/coresight/tru";
import { EtmM55 } from "./hardware/coresight/etm-m55";

import { SoftwareEventComponent } from "./software/software-event-component";
import { logger } from "../../utils/logger";

export { CtiNoCapacityError } from "./hardware/coresight/css600/cti";

interface EventSource {
  name: string;
  signal: string;
  isGroup: false;
}

interface EventSourceGroup {
  name: string;
  children: (EventSource | EventSourceGroup)[];
  isGroup: true;
}

export interface TraceEvent {
  source: string;
  timestamp: number;
  data?: string;
}

export interface TraceEventInfo {
  tsFrequency?: number;
  tsEpoch?: Date;
  events: TraceEvent[];
}

// Default size of the ETF Buffer.
// Used when no ETF is found or when the ETF does not provide
// a way to know the actual size of the synchronization counter.
const DEFAULT_SYNC_COUNTER_BYTES = 4096;

// The trace ID that we will use for STM events.
// This is an arbitrary value that should not conflict with other trace IDs in the system,
//  as it is used to identify STM events in the trace buffer.
const STM_TRACE_ID = 0x33;

/**
 * This class provides a high level API that allows to configure and retrieve events using
 * trace hardware. It uses "event sources" as inputs and outputs, leaving all the internal
 * interconnection logic for TraceRouter class.
 *
 * It uses the data model to create instances of the available components and passes them
 * to a TraceRouter instance.
 *
 * The data model is selected based on cfs.project.target setting, being refreshed every time
 * this setting is changed.
 *
 * For the moment this API makes some assumptions such as the presence of a single ETF, STM
 * and TS generator in the system.
 */
export class TraceManager {
  // These elements are promises because they are loaded asynchronously.
  // They will be replaced by other promises on the constructor via this.refreshDataModel
  // so most of them will never be used, but providing safe default values just in case
  // the code changes and these promises are accessed before being replaced.
  // Also note this.stm500 is accessed as first thing on refreshDataModel.
  private dmInfo: Promise<SocTraceInfo | undefined> =
    Promise.resolve(undefined);
  private eventSources: Promise<Record<string, string>> = Promise.resolve({});
  private etf: Promise<Css600TmcEtf | undefined> = Promise.resolve(undefined);
  private stm500: Promise<Stm500 | undefined> = Promise.resolve(undefined);
  private ctmOrCti: Promise<Css600Ctm | Css600Cti | undefined> =
    Promise.resolve(undefined);
  private tsGen: Promise<Css600TsGenerator | undefined> =
    Promise.resolve(undefined);
  private router: Promise<TraceRouter> = Promise.resolve(new TraceRouter({}));
  private swComponent: Promise<SoftwareEventComponent | undefined> =
    Promise.resolve(undefined);

  private disposables: vscode.Disposable[] = [];
  // Tracks the most recently halted session so that resolveSession() can
  // prefer it over insertion-order. This prevents a race condition in
  // multicore scenarios where an earlier-halted core's hardware operations
  // (CTI reads, FFCR writes) can collide on the AP with the later-halted
  // core that is recovering its session state.
  private lastHaltedSession: CfsDebugSession | undefined;

  /**
   * Creates the TraceManager, wires up a configuration-change listener to
   * refresh the data model when the target device changes, and performs an
   * initial data model load.
   * @param dmManager The data model manager used to resolve trace component info.
   * @param debugManager The debug manager used to resolve the active debug session.
   */
  constructor(
    private dmManager: CfsDataModelManager,
    private debugManager: CfsDebugManager,
  ) {
    this.refreshDataModel();

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(
        async (event: vscode.ConfigurationChangeEvent) => {
          if (event.affectsConfiguration(`${EXTENSION_ID}.project.target`)) {
            this.refreshDataModel();
          }
        },
      ),
      debugManager.onStartSession((session) => {
        const haltSub = session.onHalt(() => {
          this.lastHaltedSession = session;
        });
        const stopSub = session.onStop(() => {
          if (this.lastHaltedSession === session) {
            this.lastHaltedSession = undefined;
          }
          haltSub.dispose();
          stopSub.dispose();
        });
      }),
    );
  }

  /**
   * Returns the preferred halted session for hardware guard checks, matching
   * the session that internal hardware operations are routed through.
   * Returns `undefined` if every session is currently running.
   */
  public getDebugSession(): CfsDebugSession | undefined {
    const sessions = this.debugManager.getAllSessions();
    if (sessions.some((s) => !s.isHalted())) return undefined;
    return this.lastHaltedSession?.isHalted()
      ? this.lastHaltedSession
      : sessions.find((s) => s.isHalted());
  }

  /**
   * Disposes all registered disposables held by this manager.
   */
  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }

  /**
   * Returns the session to use for hardware operations.
   *
   * When all sessions are halted, returns the last-halted session so that
   * hardware operations are serialised through its connection (prevents the
   * multicore AP-access race described in the CTI reconciliation flow).
   *
   * When at least one session is *not* halted, that session is returned
   * intentionally so that the caller receives an error — reads issued while a
   * core is running are invalid and must be surfaced rather than silently routed
   * through a different core.
   */
  private resolveSession(): CfsDebugSession | undefined {
    // Current limitation: two parallel sessions cannot safely run with mixed
    // states (notHalted && halted).
    // This case is not yet handled and may lead to undefined behavior when
    // trying to allow AP access to devices behind those sessions. Reason is the
    // lack of one shot function like ReadMemAP to write into a device behind the AP.
    const sessions = this.debugManager.getAllSessions();
    const notHalted = sessions.find((s) => !s.isHalted());
    if (notHalted) {
      return notHalted;
    }
    if (this.lastHaltedSession?.isHalted()) {
      return this.lastHaltedSession;
    }
    return sessions.find((s) => s.isHalted());
  }

  /**
   * Kicks off a data-model refresh, stores its loading promise in `dmInfo`,
   * and derives promises for the router and selected components
   *
   * Known limitation: a caller that reads several component promises while the
   * target changes can observe values from different refresh generations. If
   * this becomes a problem, publish each refresh as one immutable state promise
   * and have operations await that snapshot once.
   */
  private refreshDataModel(): void {
    // Reset data — clear SW source signals before releasing the stm500 instance
    // so that no stale signal names from the previous SoftwareEventComponent
    // survive into the next session's topology traversal.

    const clearState = this.stm500
      .then((stm500) => stm500?.clearSWStimulusEventsSourceSignals())
      .catch((error: unknown) => {
        logger.warn(`Failed to clear previous trace state: ${String(error)}`);
      });

    this.dmInfo = clearState.then(() => this.loadDataModelInfo());
    // Catch construction failures (e.g. Css600Ctm rejecting inconsistent channel
    // counts) here, once, before the derived promises are created. Without this a
    // single bad model fans one rejection into etf, stm500, ctmOrCti, tsGen,
    // swComponent, and eventSources simultaneously, leaving every trace/CTI call
    // failing until the next target refresh.
    this.router = this.dmInfo
      .then((info) => this.loadRouter(info))
      .catch((err: unknown) => {
        logger.warn(
          `Failed to build trace router, trace functionality will be unavailable: ${String(err)}`,
        );
        return new TraceRouter({});
      });

    // Preliminary code. For the moment select the first ETF, STM and TS generator found.
    // We will need to define this better in the future
    this.etf = this.router.then(
      (router) => router.getComponentByType<Css600TmcEtf>("css600_tmc_etf")[0],
    );
    this.stm500 = this.router.then(
      (router) => router.getComponentByType<Stm500>("stm-500")[0],
    );

    this.ctmOrCti = this.router.then(
      (router) =>
        router.getComponentByType<Css600Ctm>("css600_ctm")[0] ??
        router.getComponentByType<Css600Cti>("css600_cti")[0],
    );

    this.tsGen = this.router.then(
      (router) =>
        router.getComponentByType<Css600TsGenerator>("css600_tsgen")[0],
    );

    this.swComponent = Promise.all([this.stm500, this.router]).then(
      ([stm500, router]) => this.loadSwComponent(stm500, router),
    );

    this.eventSources = Promise.all([this.dmInfo, this.swComponent]).then(
      ([dmInfo, swComponent]) => this.loadEventSources(dmInfo, swComponent),
    );
  }

  /**
   * Resolves the active target from workspace configuration, validates that a
   * data model package exists for it, and loads the raw `SocTraceInfo`.
   * @returns The resolved `SocTraceInfo`, or `undefined` when no model is available.
   */
  private async loadDataModelInfo(): Promise<SocTraceInfo | undefined> {
    const target = vscode.workspace
      .getConfiguration(`${EXTENSION_ID}.project`)
      .get<string>("target");

    const pkg = (await this.dmManager.listDataModels()).find(
      (dm) => dm.name === target,
    )?.package;

    if (target === undefined || pkg === undefined) {
      logger.warn(
        `No data model found for target ${target}, trace functionality will be unavailable.`,
      );
      return undefined;
    }

    const model = await this.dmManager
      .getDataModel(target, pkg)
      .catch((err: unknown) => {
        logger.warn(
          `Failed to load data model for target ${target}: ${String(err)}`,
        );
        return undefined;
      });
    const traceInfo = model?.Trace;
    if (traceInfo === undefined) {
      logger.warn("No trace information found in data model.");
      return undefined;
    }

    return traceInfo;
  }

  private loadRouter(dmInfo?: SocTraceInfo): TraceRouter {
    const components =
      dmInfo === undefined
        ? {}
        : Object.fromEntries(
            Object.entries(dmInfo.Components)
              .map(([name, info]) => [name, this.makeComponent(name, info)])
              .filter(([_, component]) => component !== undefined) as [
              string,
              SoCTraceComponent,
            ][],
          );

    return new TraceRouter(components);
  }

  private async loadSwComponent(
    stm500: Stm500 | undefined,
    router: TraceRouter,
  ): Promise<SoftwareEventComponent | undefined> {
    if (stm500 === undefined) {
      return undefined;
    }
    const swComponent = new SoftwareEventComponent("SWEvent_Component", stm500);
    router.registerComponent(swComponent);
    return swComponent;
  }

  /**
   * Combines data-model and software event sources into a flattened signal map.
   * @param dmInfo The resolved data-model trace information.
   * @param swComponent The optional software-event component.
   * @returns A map from event-source paths to trace signals.
   */
  private loadEventSources(
    dmInfo?: SocTraceInfo,
    swComponent?: SoftwareEventComponent,
  ): Record<string, string> {
    const extractSignals = function* (
      name: string,
      sourceGroup: SocTraceEventSourceGroup | SocTraceEventSource,
    ): Iterable<[string, string]> {
      if ("Signal" in sourceGroup) {
        const signal = sourceGroup as SocTraceEventSource;
        yield [name, signal.Signal];
      } else {
        for (const [key, value] of Object.entries(sourceGroup)) {
          yield* extractSignals(
            `${name}.${key}`,
            value as SocTraceEventSourceGroup,
          );
        }
      }
    };

    return Object.fromEntries(
      extractSignals("*", {
        ...dmInfo?.EventSources,
        ...swComponent?.getEventSources(),
      }),
    );
  }

  /**
   * Factory that instantiates the correct `SoCTraceComponent` subclass for the given
   * component name and data-model descriptor. Returns `undefined` and logs a warning
   * for unknown component types.
   * @param name The component's identifier as it appears in the data model.
   * @param info The data-model descriptor for the component.
   * @returns The instantiated component, or `undefined` if the type is not recognised.
   */
  private makeComponent(
    name: string,
    info: SocTraceComponentInfo,
  ): SoCTraceComponent | undefined {
    const resolver = () => this.resolveSession();
    switch (info.Type) {
      case "stm-500":
        return new Stm500(name, info, resolver);
      case "css600_cti":
        return new Css600Cti(name, info as CtiDataModelInfo, resolver);
      case "css600_ctm":
        return new Css600Ctm(name, info as CtmDataModelInfo, resolver);
      case "css600_atbfunnel":
        return new Css600AtbFunnel(name, info, resolver);
      case "css600_atbreplicator":
        return new Css600AtbReplicator(name, info);
      case "css600_tmc_etf":
        return new Css600TmcEtf(name, info, resolver);
      case "css600_tmc_etr":
        return new Css600TmcEtr(name, info, resolver);
      case "css600_tsgen":
        return new Css600TsGenerator(name, info, resolver);
      case "css600_tpiu":
        return new Css600Tpiu(name, info);
      case "adi_tru":
        return new Tru(name, info, resolver);
      case "etm_m55":
        return new EtmM55(name, info, resolver);
      default:
        logger.warn(
          `Unknown trace component type: ${info.Type} for component ${name}`,
        );
        return undefined;
    }
  }

  /**
   * Resolves a signal path to the name of the upstream event source that originates it.
   * Signals already prefixed with `*.` are returned directly (stripped of the prefix).
   * For other signals the trace router is walked to find the single upstream `*.` signal.
   * Throws when zero or more than one upstream source is found.
   * @param source A signal path or an already-resolved `*.` event source name.
   * @returns The event source name with the `*.` prefix removed.
   */
  private async getOriginatorEventSource(source: string): Promise<string> {
    if (source.startsWith("*.")) {
      // This is already an event source
      // Remove the "*." prefix
      return source.slice(2);
    }

    const router = await this.router;

    const eventSources: string[] = [];
    for await (const route of router.getRoutes(undefined, source, {
      onlyActive: true,
    })) {
      const firstSignal = route[0].inputSignal;
      if (firstSignal?.startsWith("*.")) {
        eventSources.push(firstSignal);
      }
    }

    if (eventSources.length === 0) {
      throw new Error(
        `No upstream event source found for signal ${source}, cannot determine originator event source.`,
      );
    }

    if (eventSources.length > 1) {
      throw new Error(
        `Multiple upstream connections found for ${source} (${eventSources.join(", ")}), cannot determine originator event source.`,
      );
    }

    // Remove the "*." prefix
    return eventSources[0].slice(2);
  }

  /**
   * Search for the event source name in the cache scoped to this STP buffer conversion;
   * if not found, resolve and cache it.
   * @param eventNumber The event number to retrieve the source name for.
   * @param eventsMap Cache map storing event-number to source-name mappings for the current read.
   * @returns The source name associated with the event number.
   */
  private async checkCachedEventSource(
    eventNumber: number,
    eventsMap: Map<number, string>,
  ): Promise<string> {
    const stm500 = await this.stm500;

    const signal = stm500?.HwEvents[eventNumber];

    let sourceName: string;
    const cached = eventsMap.get(eventNumber);
    if (cached !== undefined) {
      sourceName = cached;
    } else {
      sourceName = signal
        ? await this.getOriginatorEventSource(signal)
        : `Source ${eventNumber}`;
      eventsMap.set(eventNumber, sourceName);
    }
    return sourceName;
  }

  /**
   * Parses the provided STP items to extract hardware events, mapping them to their corresponding event sources.
   * The method uses a cache to avoid redundant lookups for event source names.
   * @param stpItems
   * @returns A promise that resolves to an array of TraceEvent objects representing the parsed hardware events.
   */
  private async parseHWEvents(stpItems: StpItem[]): Promise<TraceEvent[]> {
    const eventsMap = new Map<number, string>();
    const HwEvents: TraceEvent[] = [];

    for (const item of stpItems) {
      switch (item.type) {
        case StpItemType.Data:
          const dataItem = item as StpDataItem;
          // The channel number encodes the hardware event number.
          if (dataItem.timestamp === undefined) {
            // An approximate timestamp should arrive later as flag, not supported for the moment
            logger.warn("STP HW event item without timestamp:", item);
            continue;
          }

          // For a 50MHz TS clock we should be fine for about 5.7 years so reducing it to number,
          // but log a warning just in case
          if (dataItem.timestamp > BigInt(Number.MAX_SAFE_INTEGER)) {
            logger.warn(
              "STP timestamp exceeds MAX_SAFE_INTEGER, precision may be lost:",
              dataItem.timestamp,
            );
          }

          if (dataItem.marked) {
            // Marked DATA: channel/8 * 256 + data encodes the event number.
            const eventNumber =
              Math.floor(dataItem.channel / 8) * 256 + Number(dataItem.data);
            const sourceName = await this.checkCachedEventSource(
              eventNumber,
              eventsMap,
            );
            HwEvents.push({
              source: sourceName,
              timestamp: Number(dataItem.timestamp),
            });
          } else {
            // Unmarked DATA: each bit encodes a separate HW event (bitfield).
            let data = BigInt(dataItem.data);
            let bitIndex = 0;

            while (data !== 0n) {
              // eslint-disable-next-line no-bitwise
              if ((data & 0x1n) === 1n) {
                const eventNumber = dataItem.channel * 32 + Number(bitIndex);
                const sourceName = await this.checkCachedEventSource(
                  eventNumber,
                  eventsMap,
                );
                HwEvents.push({
                  source: sourceName,
                  timestamp: Number(dataItem.timestamp),
                });
              }
              // eslint-disable-next-line no-bitwise
              data >>= 1n;
              bitIndex += 1;
            }
          }
          break;

        case StpItemType.Error:
          logger.warn("STP HW event item not handled:", item);
          break;

        case StpItemType.Flag:
        case StpItemType.Trigger:
        default:
          // Handle other items if necessary
          break;
      }
    }
    return HwEvents;
  }

  /**
   * Converts a list of STP items into a list of TraceEvent objects, mapping each item to its corresponding event source.
   * The method groups STP items by their major source and processes each group separately, distinguishing between
   * hardware events and software events based on the major source ID.
   * @param stpItems An array of STP items to be converted into TraceEvent objects.
   * @returns A promise that resolves to an array of TraceEvent objects representing the parsed events.
   *          The events are sorted by their timestamps in ascending order.
   */
  private async stpToEventSources(stpItems: StpItem[]): Promise<TraceEvent[]> {
    const mapMajorSource: Map<number, StpItem[]> = new Map();
    let totalEvents: TraceEvent[] = [];

    for (const item of stpItems) {
      switch (item.type) {
        case StpItemType.Data:
        case StpItemType.Flag:
        case StpItemType.Error:
          if (item.majorSource !== undefined) {
            if (!mapMajorSource.has(item.majorSource)) {
              mapMajorSource.set(item.majorSource, []);
            }
            mapMajorSource.get(item.majorSource)!.push(item);
          }
          break;
        case StpItemType.Trigger:
          logger.warn(`STP Trigger item: ${item}`);
          break;
        default:
          logger.warn(`Unknown STP item type: ${item}`);
          break;
      }
    }

    const stm500 = await this.stm500;
    const swComponent = await this.swComponent;

    const hwEventMasterId = await stm500?.getHwEventStpMasterId();
    const executablePath = this.debugManager
      .getActiveSession()
      ?.getExecutablePath();
    for (const [majorSource, items] of Array.from(mapMajorSource.entries())) {
      if (Number(majorSource) === hwEventMasterId) {
        totalEvents.push(...(await this.parseHWEvents(items)));
      } else {
        const swEvents =
          (await swComponent?.decodeEvents(items, executablePath)) ?? [];
        totalEvents.push(...swEvents);
      }
    }
    totalEvents.sort((a, b) => a.timestamp - b.timestamp);
    return totalEvents;
  }

  /**
   * Returns the list of event sources available in the system.
   *
   * @param sourcePath Optional path to a specific event source group,
   *                   to retrieve only the event sources in that group.
   *                   If not provided, all event sources of the system
   *                   will be retrieved.
   * @returns Array of EventSource and EventSourceGroup objects.
   */
  public async getEventSources(
    sourcePath?: string,
  ): Promise<(EventSource | EventSourceGroup)[]> {
    const [dmInfo, swComponent] = await Promise.all([
      this.dmInfo,
      this.swComponent,
    ]);
    if (dmInfo === undefined) {
      return [];
    }

    const combined = {
      ...dmInfo.EventSources,
      ...swComponent?.getEventSources(),
    };

    if (sourcePath === undefined) {
      sourcePath = "";
    }

    function eventSourceFromPath(
      path: string,
      root: SocTraceEventSourceGroup,
    ): (EventSource | EventSourceGroup)[] {
      const [first, rest] = path.split(/\.(.*)/);

      const currentObject = first === "" ? root : root[first];

      if (currentObject === undefined) {
        throw new Error(`${root.name} has no child named ${first}.`);
      }

      if (rest === undefined) {
        // This is the last segment of the path, return the content
        return Object.entries(currentObject).map(([key, value]) => {
          if ("Signal" in value) {
            if (typeof value.Signal !== "string") {
              throw new Error(`${key}.Signal is not a string: ${value.Signal}`);
            }
            return {
              name: key,
              signal: value.Signal,
              isGroup: false,
            };
          } else {
            return {
              name: key,
              children: eventSourceFromPath("", value),
              isGroup: true,
            };
          }
        });
      }

      if (typeof currentObject === "string") {
        throw new Error(
          `${root.name}.${first} is a string and cannot have children.`,
        );
      }

      return eventSourceFromPath(
        rest,
        currentObject as SocTraceEventSourceGroup,
      );
    }
    return eventSourceFromPath(sourcePath, combined);
  }

  /**
   * Set up and enable the ETF for trace capture, configuring it in circular buffer mode and with the desired settings.
   * This method will also enable trace capture if it is not already enabled, but if the ETF is already enabled with the
   * desired configuration it will keep it enabled without re-enabling it (to avoid unnecessary disruptions in the trace capture).
   * @returns The buffer size in bytes that from ETF.
   * This value is derived from the ETF buffer size when an ETF is present, and it is the value passed to
   * setSynchronizationCounter(...). It is not a reserved buffer size.
   * If no ETF is found, returns DEFAULT_SYNC_COUNTER_BYTES (4096 bytes).
   */
  private async enableAndConfigureETF(): Promise<number> {
    const etf = await this.etf;

    if (etf) {
      // Recover info from the current configuration to avoid unnecessary disruptions in case trace capture
      const config: TmcConfiguration = {
        flushIn: false,
        flushOnTrigger: false,
        formatting: true,
        stopOnFlush: true,
        stopOnTriggerEvent: false,
        triggerIn: false,
        triggerIndicator: false,
        triggerOnFlush: false,
        triggerOnTriggerEvent: false,
      };

      const [
        bufferSizeInBytes,
        currentConfig,
        currentMode,
        isTraceCaptureEnabledValue,
      ] = await Promise.all([
        etf.getBufferSize(),
        etf.getConfiguration(),
        etf.getMode(),
        etf.isTraceCaptureEnabled(),
      ]);

      const hasSameConfig = Object.entries(config).every(
        ([key, value]) =>
          currentConfig[key as keyof TmcConfiguration] === value,
      );
      const setNewConfig = !(
        hasSameConfig && currentMode === tmc.Mode.CircularBuffer
      );
      let isTraceCaptureEnabled = isTraceCaptureEnabledValue;

      // Set the new configuration if the current one is different than the desired one.
      // if trace capture is already enabled, disable it before changing the configuration to avoid issues,
      // and re-enable it at the end if it was enabled at the beginning. If the configuration is already correct,
      // keep the current state of trace capture (enabled/disabled) to avoid unnecessary disruptions.
      if (setNewConfig) {
        if (isTraceCaptureEnabled) {
          logger.warn(
            "ETF trace capture is active but requires reconfiguration. The current buffer contents will be discarded.",
          );
          await etf.emptyBuffer();
          await etf.disableTraceCapture();
          isTraceCaptureEnabled = false;
        }
        await etf.setMode(tmc.Mode.CircularBuffer);
        await etf.configure(config);
      }
      if (!isTraceCaptureEnabled) {
        await etf.enableTraceCapture();
      }
      return bufferSizeInBytes;
    }
    return DEFAULT_SYNC_COUNTER_BYTES;
  }
  /**
   * Enable trace functionality.
   *
   * This takes care of timestmap generator, TMC and STM configuration for
   * capturing events in a circular buffer manner.
   */
  public async enableTrace(): Promise<void> {
    const tsGen = await this.tsGen;
    const stm500 = await this.stm500;
    const etf = await this.etf;
    const router = await this.router;

    if (tsGen) {
      await tsGen.setFrequency(tsGen.frequency);
      await tsGen.enable();
    }

    // Connect STM to ETF
    if (stm500 && etf) {
      await router.connectSignals(stm500.AtbOutput, `${etf.name}.AtbReceiver`);
    }

    // Using bufferSize / 4 bounds worst-case loss to ~25%,
    const synchronizationCounterBytes =
      (await this.enableAndConfigureETF()) / 4;
    if (stm500) {
      if (tsGen) {
        await stm500.setTsFrequency(tsGen.frequency);
      }

      // STMSYNCR.COUNT is 12-bit, so the synchronization counter maximum is 4095 bytes.
      await stm500.setTraceId(STM_TRACE_ID);
      const syncCounter = Math.min(
        synchronizationCounterBytes,
        stm500.SynchronizationCounterHardwareMaxValue,
      );
      await stm500.setSynchronizationCounter(syncCounter);
      // Disable stimulus port compression to avoid losing events when the stimulus
      // port is used for other purposes (e.g. SW events onZephyr).
      await stm500.enable({
        tsEnable: true,
        stimulusPortCompression: false,
      });
    }
  }

  /**
   * Enable an event source, so events from this source are captured in the trace.
   *
   * @param source The name of the event source to enable, as per EventSource.signal.
   */
  public async enableEvent(source: string): Promise<void> {
    const stm500 = await this.stm500;
    const eventSources = await this.eventSources;
    const router = await this.router;

    const signal = eventSources[source];
    if (signal === undefined) {
      throw new Error(`Trying to enable an unknown event source: ${source}`);
    }

    if (stm500 === undefined) {
      throw new Error("No STM-500 defined in the trace manager.");
    }

    return router.connectSignals(signal, stm500.AtbOutput);
  }

  /**
   * Disable an event source, so events from this source are no longer captured in the trace.
   *
   * @param source The name of the event source to disable, as per EventSource.signal.
   */
  public async disableEvent(source: string): Promise<void> {
    const stm500 = await this.stm500;
    const eventSources = await this.eventSources;
    const router = await this.router;

    const signal = eventSources[source];
    if (signal === undefined) {
      throw new Error(`Trying to disable an unknown event source: ${source}`);
    }

    if (stm500 === undefined) {
      throw new Error("No STM-500 defined in the trace manager.");
    }

    return router.disconnectSignals(signal, stm500.AtbOutput);
  }

  /**
   * Retrieves whether an event source is enabled for being captured on trace or not.
   *
   * @param source The name of the event source to check, as per EventSource.signal.
   * @returns A promise that resolves to true if the event source is enabled, false otherwise.
   */
  public async isEventEnabled(source: string): Promise<boolean> {
    const stm500 = await this.stm500;
    const eventSources = await this.eventSources;
    const router = await this.router;

    const signal = eventSources[source];
    if (signal === undefined) {
      throw new Error(`Unknown event source: ${source}`);
    }

    if (stm500 === undefined) {
      throw new Error("No STM-500 defined in the trace manager.");
    }

    return router.areSignalsConnected(signal, stm500.AtbOutput);
  }

  /**
   * Retrieves whether an event source can be enabled for being captured on trace or not.
   * An event source may not be possible to enable depending on hardware limitations such as
   * not enough interconnection resources.
   *
   * The output of this method is inherently dynamic, as it may change depending on the other
   * event sources that are currently enabled.
   *
   * @param source The name of the event source to check, as per EventSource.signal.
   * @returns A promise that resolves to true if the event source can be enabled, false otherwise.
   */
  public async canEventBeEnabled(source: string): Promise<boolean> {
    const stm500 = await this.stm500;
    const eventSources = await this.eventSources;
    const router = await this.router;

    const signal = eventSources[source];
    if (signal === undefined) {
      throw new Error(`Unknown event source: ${source}`);
    }

    if (stm500 === undefined) {
      throw new Error("No STM-500 defined in the trace manager.");
    }

    return router.canSignalsBeConnected(signal, stm500.AtbOutput);
  }

  /**
   * This method reads the full trace buffer from ETF and parses the STM events from it,
   * returning the list of events with their timestamp (+ some extra info).
   *
   * Note that this method will read all the trace buffer, discarding any data that is not
   * processed.
   *
   * @returns A promise that resolves to a TraceEventInfo object containing the list of events
   *          and timestamp information.
   */
  public async readEvents(): Promise<TraceEventInfo> {
    const stm500 = await this.stm500;
    const etf = await this.etf;
    const tsGen = await this.tsGen;

    let events: TraceEvent[] = [];
    let tsFrequency: number | undefined = undefined;
    let tsEpoch: Date | undefined = undefined;

    if (etf === undefined || stm500 === undefined) {
      throw new Error("ETF or STM500 component not found.");
    }
    if (await etf.isTraceCaptureEnabled()) {
      const stmTraceId = await stm500.getTraceId();

      // Stop trace buffer for its readout
      await etf.flush();
      await etf.waitForStop();

      const traceBuffer = await etf.readTraceBuffer();
      // Re-enable trace capture and force a sync event on STM
      await etf.disableTraceCapture();
      await etf.enableTraceCapture();
      await stm500.forceSync();

      const atbBuffer = parseATB(traceBuffer);
      if (stmTraceId in atbBuffer) {
        const stpData = parseSTP(atbBuffer[stmTraceId]);
        if (stpData !== undefined) {
          events = await this.stpToEventSources(stpData.items);
          tsFrequency = stpData.tsFrequency;
        } else {
          logger.warn("Could not decode STP from ATB buffer");
        }
      }

      if (tsGen) {
        const tsCount = await tsGen.getCounterValue();
        const tsFreq = await tsGen.getFrequency();
        if (tsFreq === 0) {
          // Just in case something goes wrong with the TS generator and we get a zero frequency,
          // avoid a division by zero
          tsEpoch = undefined;
        } else {
          const tsCountMilliseconds = Number(
            (1000n * tsCount) / BigInt(tsFreq),
          );
          tsEpoch = new Date(Date.now() - tsCountMilliseconds);
        }
      }
    }

    return { tsFrequency, tsEpoch, events };
  }

  /**
   * Retrieves the list of available CTM/CTI triggers based on the specified key.
   *
   * @param direction The type of triggers to retrieve ("input" or "output").
   * @returns A promise that resolves to an array of trigger names.
   */
  public async ctiGetTriggers(
    direction: "input" | "output",
  ): Promise<string[]> {
    const cti = await this.ctmOrCti;
    return cti?.getTriggerSignals(direction) ?? [];
  }

  /**
   * Applies a CTI trigger mapping to hardware by connecting the given input triggers
   * to the given output triggers via a single shared channel (fan-out / fan-in).
   * @param inputTriggers Display names of the CTI input triggers to connect.
   * @param outputTriggers Display names of the CTI output triggers to connect.
   */
  public async ctiConnect(
    inputTriggers: string[],
    outputTriggers: string[],
  ): Promise<void> {
    if (!inputTriggers.length || !outputTriggers.length) {
      throw new Error("No input or output triggers specified.");
    }
    const component = await this.ctmOrCti;
    if (!component) {
      throw new Error("No CTI or CTM component is available.");
    }
    const inputs = inputTriggers.map((name) => {
      const signal = component.resolveTriggerSignal(name, "input");
      if (!signal) throw new Error(`Unknown input trigger: "${name}".`);
      return signal;
    });
    const outputs = outputTriggers.map((name) => {
      const signal = component.resolveTriggerSignal(name, "output");
      if (!signal) throw new Error(`Unknown output trigger: "${name}".`);
      return signal;
    });
    await component.connectGroup(inputs, outputs);
  }

  /**
   * Removes a previously applied CTI trigger mapping from hardware.
   * @param inputTriggers Display names of the CTI input triggers to disconnect.
   * @param outputTriggers Display names of the CTI output triggers to disconnect.
   */
  public async ctiDisconnect(
    inputTriggers: string[],
    outputTriggers: string[],
  ): Promise<void> {
    if (!inputTriggers.length || !outputTriggers.length) {
      throw new Error("No input or output triggers specified.");
    }
    const component = await this.ctmOrCti;
    if (!component) {
      throw new Error("No CTI or CTM component is available.");
    }
    const inputs = inputTriggers.map((name) => {
      const signal = component.resolveTriggerSignal(name, "input");
      if (!signal) throw new Error(`Unknown input trigger: "${name}".`);
      return signal;
    });
    const outputs = outputTriggers.map((name) => {
      const signal = component.resolveTriggerSignal(name, "output");
      if (!signal) throw new Error(`Unknown output trigger: "${name}".`);
      return signal;
    });
    await component.disconnectGroup(inputs, outputs);
  }

  /**
   * Reads the current hardware CTI/CTM trigger mappings and returns all active
   * connections as groups of input and output trigger display names.
   * Each element in the returned array represents one connection group: a set of
   * input and output triggers that share a common CTI channel.
   * @returns An array of connection groups, or an empty array when no CTI/CTM is available.
   */
  public async ctiReadActiveConnections(): Promise<CtiTriggerPair[]> {
    const component = await this.ctmOrCti;
    if (!component) return [];
    return component.getActiveConnectionGroups();
  }

  /**
   * Removes all existing CTI trigger mappings by invoking
   * the removeMapping method on the CTI/CTM component.
   */
  public async ctiClearTriggerConnections(): Promise<void> {
    const cti = await this.ctmOrCti;
    if (!cti) {
      throw new Error("No CTI or CTM component is available.");
    }
    await cti.removeMapping();
  }

  /**
   * Acknowledges all active trigger outputs on the CTI/CTM component, effectively clearing them.
   */
  public async ctiCleanACKTriggerOutputs(): Promise<void> {
    const cti = await this.ctmOrCti;
    if (!cti) return;
    await cti.cleanACKTriggerOutputs();
  }
}
