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
import type { SoCTraceComponent } from "./trace-types";
import { Css600AtbFunnel } from "./components/coresight/css600/atb-funnel";
import { Css600AtbReplicator } from "./components/coresight/css600/atb-replicator";
import { Stm500 } from "./components/coresight/stm-500";
import { Css600TmcEtf } from "./components/coresight/css600/tmc-etf";
import { Css600TmcEtr } from "./components/coresight/css600/tmc-etr";
import { Css600TsGenerator } from "./components/coresight/css600/ts-generator";
import { Css600Tpiu } from "./components/coresight/css600/tpiu";
import { Css600Cti } from "./components/coresight/css600/cti";
import { Css600Ctm } from "./components/coresight/css600/ctm";
import { CfsDebugManager } from "../../debug-manager";
import { CfsDataModelManager } from "cfs-lib/dist/managers/cfs-data-model-manager";
import { EXTENSION_ID } from "../../../constants";
import { parseATB } from "./parsers/atb-parser";
import {
  parseSTP,
  StpDataItem,
  StpFlag,
  StpItem,
  StpItemType,
} from "./parsers/stp-parser";
import {
  tmc,
  type TmcConfiguration,
} from "./components/coresight/css600/tmc-base";
import { TraceRouter } from "./trace-router";
import { Tru } from "./components/coresight/tru";

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

export interface HwEvent {
  source: string;
  timestamp: number;
}

export interface HwEventInfo {
  tsFrequency?: number;
  tsEpoch?: Date;
  events: HwEvent[];
}

// Default size of the synchronization counter in bytes,
// used when no ETF is found or when the ETF does not provide
// a way to know the actual size of the synchronization counter.
const DEFAULT_SYNC_COUNTER_BYTES = 1024;

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
  private dmInfo?: SocTraceInfo;
  private eventSources: Record<string, string>;
  private etf?: Css600TmcEtf;
  private stm500?: Stm500;
  private tsGen?: Css600TsGenerator;
  private router: TraceRouter;

  constructor(
    private dmManager: CfsDataModelManager,
    private debugManager: CfsDebugManager,
  ) {
    this.eventSources = {};
    this.etf = undefined;
    this.stm500 = undefined;
    this.tsGen = undefined;
    this.router = new TraceRouter({});
    this.refreshDataModelInfo();

    vscode.workspace.onDidChangeConfiguration(
      async (event: vscode.ConfigurationChangeEvent) => {
        if (event.affectsConfiguration(`${EXTENSION_ID}.project.target`)) {
          this.refreshDataModelInfo();
        }
      },
    );
  }

  /**
   * This method trigers a re-generation of the trace components and
   * event sources from data model information.
   *
   */
  private async refreshDataModelInfo(): Promise<void> {
    // Reset data
    this.router = new TraceRouter({});
    this.eventSources = {};
    this.etf = undefined;
    this.stm500 = undefined;
    this.tsGen = undefined;

    const target = vscode.workspace
      .getConfiguration(`${EXTENSION_ID}.project`)
      .get<string>("target");

    const pkg = (await this.dmManager.listDataModels()).find(
      (dm) => dm.name === target,
    )?.package;

    if (target === undefined || pkg === undefined) {
      console.warn(
        `No data model found for target ${target}, trace functionality will be unavailable.`,
      );
      return;
    }

    this.dmInfo = (await this.dmManager.getDataModel(target, pkg))?.Trace;

    if (this.dmInfo === undefined) {
      console.warn("No trace information found in data model.");
      return;
    }

    const components = Object.fromEntries(
      Object.entries(this.dmInfo.Components)
        .map(([name, info]) => [
          name,
          this.makeComponent(name, info, this.debugManager),
        ])
        .filter(([_, component]) => component !== undefined) as [
        string,
        SoCTraceComponent,
      ][],
    );

    this.router = new TraceRouter(components);

    // Generator to flatten event source tree
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

    this.eventSources = Object.fromEntries(
      extractSignals("*", this.dmInfo.EventSources),
    );

    // Preliminary code. For the moment select the first ETF, STM and TS generator found.
    // We will need to define this better in the future
    this.etf = this.router.getComponentByType(
      "css600_tmc_etf",
    )[0] as Css600TmcEtf;
    this.stm500 = this.router.getComponentByType("stm-500")[0] as Stm500;
    this.tsGen = this.router.getComponentByType(
      "css600_tsgen",
    )[0] as Css600TsGenerator;
  }

  private makeComponent(
    name: string,
    info: SocTraceComponentInfo,
    debugManager: CfsDebugManager,
  ): SoCTraceComponent | undefined {
    switch (info.Type) {
      case "stm-500":
        return new Stm500(name, info, debugManager);
      case "css600_cti":
        return new Css600Cti(name, info, debugManager);
      case "css600_ctm":
        return new Css600Ctm(name, info);
      case "css600_atbfunnel":
        return new Css600AtbFunnel(name, info, debugManager);
      case "css600_atbreplicator":
        return new Css600AtbReplicator(name, info);
      case "css600_tmc_etf":
        return new Css600TmcEtf(name, info, debugManager);
      case "css600_tmc_etr":
        return new Css600TmcEtr(name, info, debugManager);
      case "css600_tsgen":
        return new Css600TsGenerator(name, info, debugManager);
      case "css600_tpiu":
        return new Css600Tpiu(name, info);
      case "adi_tru":
        return new Tru(name, info, debugManager);
      default:
        console.warn(
          `Unknown trace component type: ${info.Type} for component ${name}`,
        );
        return undefined;
    }
  }

  private async getOriginatorEventSource(source: string): Promise<string> {
    if (source.startsWith("*.")) {
      // This is already an event source
      // Remove the "*." prefix
      return source.slice(2);
    }

    const eventSources: string[] = [];
    for await (const route of this.router.getRoutes(undefined, source, true)) {
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

  private async stpToEventSources(stpItems: StpItem[]): Promise<HwEvent[]> {
    const hwEventMasterId = await this.stm500?.getHwEventStpMasterId();
    const events: HwEvent[] = [];
    for (const item of stpItems) {
      switch (item.type) {
        case StpItemType.Data:
          const dataItem = item as StpDataItem;
          if (dataItem.majorSource !== hwEventMasterId) {
            // This data item is not a HW event, ignore it for the moment.
            console.warn(
              `STP Data item from unexpected source ${dataItem.majorSource}:`,
              item,
            );
            continue;
          }
          if (dataItem.timestamp === undefined) {
            // An approximate timestamp should arrive later as flag, not supported for the moment
            console.warn("STP Data item without timestamp:", item);
            continue;
          }

          // For a 50MHz TS clock we should be fine for about 5.7 years so reducing it to number,
          // but log a warning just in case
          if (dataItem.timestamp > Number.MAX_SAFE_INTEGER) {
            console.warn(
              `Timestamp ${dataItem.timestamp} exceeds MAX_SAFE_INTEGER, precision may be lost.`,
            );
          }
          const timestamp = Number(dataItem.timestamp);

          if (dataItem.marked) {
            const eventNumber =
              Math.floor(dataItem.channel / 8) * 256 + Number(dataItem.data);
            const signal = this.stm500?.HwEvents[eventNumber];
            // TODO: Cache the signal name resolution
            const sourceName = signal
              ? await this.getOriginatorEventSource(signal)
              : `Source ${eventNumber}`;

            events.push({
              source: sourceName,
              timestamp: timestamp,
            });
          } else {
            let data = BigInt(dataItem.data);
            let bitIndex = 0;

            while (data !== 0n) {
              // eslint-disable-next-line no-bitwise
              if ((data & 0x1n) === 1n) {
                const eventNumber = dataItem.channel * 32 + Number(bitIndex);
                const signal = this.stm500?.HwEvents[eventNumber];
                const sourceName = signal
                  ? await this.getOriginatorEventSource(signal)
                  : `Source ${eventNumber}`;
                events.push({
                  source: sourceName,
                  timestamp: timestamp,
                });
              }
              // eslint-disable-next-line no-bitwise
              data >>= 1n;
              bitIndex += 1;
            }
          }
          break;
        case StpItemType.Flag:
          const flagItem = item as StpFlag;
          if (flagItem.timestamp === undefined) {
            console.warn("STP Flag item without timestamp:", item);
            continue;
          }
          events.push({
            source: `SoftwareFlag.${flagItem.channel}`,
            timestamp: Number(flagItem.timestamp),
          });
          break;
        case StpItemType.Error:
          console.error(`STP Error item: ${item}`);
          break;
        case StpItemType.Trigger:
          console.log(`STP Trigger item: ${item}`);
          break;
      }
    }
    return events;
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
  public getEventSources(
    sourcePath?: string,
  ): (EventSource | EventSourceGroup)[] {
    if (this.dmInfo === undefined) {
      return [];
    }

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

    return eventSourceFromPath(sourcePath, this.dmInfo.EventSources);
  }

  /**
   * Set up and enable the ETF for trace capture, configuring it in circular buffer mode and with the desired settings.
   * This method will also enable trace capture if it is not already enabled, but if the ETF is already enabled with the
   * desired configuration it will keep it enabled without re-enabling it (to avoid unnecessary disruptions in the trace capture).
   * @returns The synchronization counter interval to request from STM, in bytes.
   * This value is derived from the ETF buffer size when an ETF is present, and it is the value passed to
   * setSynchronizationCounter(...). It is not a reserved buffer size.
   * If no ETF is found, returns DEFAULT_SYNC_COUNTER_BYTES (1024 bytes).
   */
  private async enableAndConfigureETF(): Promise<number> {
    if (this.etf) {
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
        bufferSize,
        currentConfig,
        currentMode,
        isTraceCaptureEnabledValue,
      ] = await Promise.all([
        this.etf.getBufferSize(),
        this.etf.getConfiguration(),
        this.etf.getMode(),
        this.etf.isTraceCaptureEnabled(),
      ]);

      const synchronizationCounterBytes = bufferSize / 4;
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
          console.warn(
            "ETF trace capture is active but requires reconfiguration. The current buffer contents will be discarded.",
          );
          await this.etf.emptyBuffer();
          await this.etf.disableTraceCapture();
          isTraceCaptureEnabled = false;
        }
        await this.etf.setMode(tmc.Mode.CircularBuffer);
        await this.etf.configure(config);
      }
      if (!isTraceCaptureEnabled) {
        await this.etf.enableTraceCapture();
      }
      return synchronizationCounterBytes;
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
    if (this.tsGen) {
      await this.tsGen.setFrequency(this.tsGen.frequency);
      await this.tsGen.enable();
    }

    // Connect STM to ETF
    if (this.stm500 && this.etf) {
      await this.router.connectSignals(
        this.stm500.AtbOutput,
        `${this.etf.name}.AtbReceiver`,
      );
    }

    const synchronizationCounterBytes = await this.enableAndConfigureETF();

    if (this.stm500) {
      if (this.tsGen) {
        await this.stm500.setTsFrequency(this.tsGen.frequency);
      }
      await this.stm500.setTraceId(STM_TRACE_ID);
      await this.stm500.setSynchronizationCounter(synchronizationCounterBytes);
      await this.stm500.enable({ tsEnable: true, compression: true });
    }
  }

  /**
   * Enable an event source, so events from this source are captured in the trace.
   *
   * @param source The name of the event source to enable, as per EventSource.signal.
   */
  public async enableEvent(source: string): Promise<void> {
    const signal = this.eventSources[source];
    if (signal === undefined) {
      throw new Error(`Trying to enable an unknown event source: ${source}`);
    }

    if (this.stm500 === undefined) {
      throw new Error("No STM-500 defined in the trace manager.");
    }

    return this.router.connectSignals(signal, this.stm500?.AtbOutput);
  }

  /**
   * Disable an event source, so events from this source are no longer captured in the trace.
   *
   * @param source The name of the event source to disable, as per EventSource.signal.
   */
  public async disableEvent(source: string): Promise<void> {
    const signal = this.eventSources[source];
    if (signal === undefined) {
      throw new Error(`Trying to disable an unknown event source: ${source}`);
    }

    if (this.stm500 === undefined) {
      throw new Error("No STM-500 defined in the trace manager.");
    }

    return this.router.disconnectSignals(signal, this.stm500?.AtbOutput);
  }

  /**
   * Retrieves whether an event source is enabled for being captured on trace or not.
   *
   * @param source The name of the event source to check, as per EventSource.signal.
   * @returns A promise that resolves to true if the event source is enabled, false otherwise.
   */
  public async isEventEnabled(source: string): Promise<boolean> {
    const signal = this.eventSources[source];
    if (signal === undefined) {
      throw new Error(`Unknown event source: ${source}`);
    }

    if (this.stm500 === undefined) {
      throw new Error("No STM-500 defined in the trace manager.");
    }

    return this.router.areSignalsConnected(signal, this.stm500?.AtbOutput);
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
    const signal = this.eventSources[source];
    if (signal === undefined) {
      throw new Error(`Unknown event source: ${source}`);
    }

    if (this.stm500 === undefined) {
      throw new Error("No STM-500 defined in the trace manager.");
    }

    return this.router.canSignalsBeConnected(signal, this.stm500?.AtbOutput);
  }

  /**
   * This method reads the full trace buffer from ETF and parses the STM events from it,
   * returning the list of events with their timestamp (+ some extra info).
   *
   * Note that this method will read all the trace buffer, discarding any data that is not
   * processed.
   *
   * @returns A promise that resolves to an HwEventInfo object containing the list of events
   *          and timestamp information.
   */
  public async readHwEvents(): Promise<HwEventInfo> {
    let events: HwEvent[] = [];
    let tsFrequency: number | undefined = undefined;
    let tsEpoch: Date | undefined = undefined;

    if (this.etf === undefined || this.stm500 === undefined) {
      throw new Error("ETF or STM500 component not found.");
    }
    if (await this.etf.isTraceCaptureEnabled()) {
      const stmTraceId = await this.stm500.getTraceId();

      // Stop trace buffer for its readout
      await this.etf.flush();
      await this.etf.waitForStop();

      const traceBuffer = await this.etf.readTraceBuffer();
      // Re-enable trace capture and force a sync event on STM
      await this.etf.disableTraceCapture();
      await this.etf.enableTraceCapture();
      await this.stm500.forceSync();

      const atbBuffer = parseATB(traceBuffer);
      if (stmTraceId in atbBuffer) {
        const stpData = parseSTP(atbBuffer[stmTraceId]);
        if (stpData !== undefined) {
          events = await this.stpToEventSources(stpData.items);
          tsFrequency = stpData.tsFrequency;
        } else {
          console.warn("Could not decode STP from ATB buffer");
        }
      }

      if (this.tsGen) {
        const tsCount = await this.tsGen.getCounterValue();
        const tsFreq = await this.tsGen.getFrequency();
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
}
