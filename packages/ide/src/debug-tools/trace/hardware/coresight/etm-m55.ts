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
  SoCTraceComponent,
  SoCTraceComponentConnection,
} from "../../trace-types";
import type { SocTraceComponentInfo } from "cfs-types";
import { coresight } from "./coresight";
import type { SessionResolver } from "./coresight";
import { RegisterDescription } from "../../../debug-manager";

export type EtmM55Configuration = {
  branchBroadcast?: boolean;
  cycleCounting?: boolean;
  conditionalLoad?: boolean;
  conditionalStore?: boolean;
  allConditional?: boolean;
  globalTimestamp?: boolean;
  returnStack?: boolean;
};

/**
 * This class represents ARM Coresight ETM (Embedded Trace Macrocell) for Cortex-M55 processor.
 * It is used to configure the ETM to generate program-flow trace for collection by a trace sink
 *
 *
 * More information can be found on:
 * - Arm® CoreSight™ ETM-M55
 *   https://developer.arm.com/documentation/101053/0101
 * Arm® Embedded Trace Macrocell Architecture Specification
 *   https://developer.arm.com/documentation/ihi0014/q/
 *
 */
export class EtmM55 extends coresight.Component implements SoCTraceComponent {
  readonly AtbOutput: string;
  readonly type: string;
  readonly TraceStream: string;

  /**
   * Creates an ETM-M55 component wrapper from data model information.
   * @param name Component instance name.
   * @param socTraceInfo SoC trace component metadata.
   * @param resolveSession Returns the debug session to use for register/memory access.
   */
  constructor(
    public name: string,
    socTraceInfo: SocTraceComponentInfo,
    resolveSession: SessionResolver,
  ) {
    super(resolveSession, socTraceInfo);
    this.AtbOutput = socTraceInfo.AtbOutput as string;
    this.type = socTraceInfo.Type as string;
    this.TraceStream = "TraceStream";
  }
  protected async writeRegister(
    register: RegisterDescription,
    values: Record<string, number>,
  ): Promise<void> {
    if (await this.isLocked()) {
      await super.writeRegister(coresight.LAR, { KEY: 0xc5acce55 });
    }
    return super.writeRegister(register, values);
  }
  /**
   * Returns the connections of the ETM-M55 component for a given signal.
   * @param signal The signal for which to get connections.
   * @param offline Whether to get offline connections.
   * @returns A promise that resolves to an array of SoCTraceComponentConnection objects.
   */

  async getConnections(
    signal: string,
    offline?: boolean,
  ): Promise<SoCTraceComponentConnection[]> {
    const [first] = signal.split(/\.(.*)/);
    switch (first) {
      case "AtbOutput":
        return [
          {
            sourceSignal: this.AtbOutput,
            componentSourceSignal: signal,
            componentDestinationSignal: this.TraceStream,
            destinationSignal: `*.${this.TraceStream}`,
            isActive: offline ? undefined : await this.isEnabled(),
          },
        ];
      case "TraceStream":
        return [
          {
            sourceSignal: `*.${this.TraceStream}`,
            componentSourceSignal: signal,
            componentDestinationSignal: "AtbOutput",
            destinationSignal: this.AtbOutput,
            isActive: offline ? undefined : await this.isEnabled(),
          },
        ];
      default:
        throw new Error(`Signal ${signal} not found in ETM-M55 component`);
    }
  }

  /**
   * Connects the ETM-M55 component to the given input and output signals.
   * @param input The input signal to connect.
   * @param output The output signal to connect.
   */
  async connect(input: string, output: string): Promise<void> {
    if (input !== "TraceStream" || output !== "AtbOutput") {
      throw new Error(
        `ETM-M55 component can only connect TraceStream to AtbOutput`,
      );
    }
    await this.enableTraceForProgramFlowTrace();
  }

  /**
   * Disconnects the ETM-M55 component from the given input and output signals.
   * @param input The input signal to disconnect.
   * @param output The output signal to disconnect.
   */
  async disconnect(input: string, output: string): Promise<void> {
    if (input !== "TraceStream" || output !== "AtbOutput") {
      throw new Error(
        `ETM-M55 component can only disconnect TraceStream from AtbOutput`,
      );
    }
    await this.disableETM();
  }

  /**
   * Configures the ETM-M55 component with the given configuration.
   * This configuration selects the amount of information that will be generated
   * by the ETM-M55 component.
   * @param config The configuration to apply.
   */
  async configureETMOutputInfo(config: EtmM55Configuration): Promise<void> {
    const conditionalLoad =
      config.allConditional === false ? false : config.conditionalLoad;
    const conditionalStore =
      config.allConditional === false ? false : config.conditionalStore;

    await this.writeRegister(etm_m55.CONFIGR, {
      BB: config.branchBroadcast ? 1 : 0,
      CCI: config.cycleCounting ? 1 : 0,
      COND: config.allConditional
        ? 0b111
        : /* eslint-disable-next-line no-bitwise */
          (conditionalLoad ? 0b001 : 0) | (conditionalStore ? 0b010 : 0),
      TS: config.globalTimestamp ? 1 : 0,
      RS: config.returnStack ? 1 : 0,
      RES1: 1, // Reserved bit must be set to 1
    });
  }

  /**
   * Sets the event 0 register.
   * @param event The event value to set.
   */
  async setEvent0(event: number): Promise<void> {
    await this.writeRegister(etm_m55.EVENTCTL0R, { EVENT0: event });
  }

  /**
   * Sets the event 1 register.
   * @param event The event value to set.
   */
  async setEvent1(event: number): Promise<void> {
    await this.writeRegister(etm_m55.EVENTCTL0R, { EVENT1: event });
  }

  /**
   * Enables or disables low-power override for event generation.
   * @param enable True to enable low-power override.
   */
  async setLowPowerOverride(enable: boolean): Promise<void> {
    await this.writeRegister(etm_m55.EVENTCTL1R, {
      LPOVERRIDE: enable ? 1 : 0,
    });
  }

  /**
   * Enables or disables ATB trigger output from ETM.
   * @param enable True to enable ATB trigger.
   */
  async enableATBTrigger(enable: boolean): Promise<void> {
    await this.writeRegister(etm_m55.EVENTCTL1R, { ATB: enable ? 1 : 0 });
  }

  /**
   * Enables or disables instruction event generation for a given event index.
   * @param event Event index (for example 0 or 1).
   * @param enable True to enable generation for the selected event index.
   */
  async enableGenerateEvent(event: 0 | 1, enable: boolean): Promise<void> {
    await this.writeRegister(etm_m55.EVENTCTL1R, {
      [`INSTEN${event}`]: enable ? 0b1 : 0b0,
    });
  }

  /**
   * Sets the ETM stall level.
   * @param level Stall level value.
   */
  async setStallLevel(level: number): Promise<void> {
    if (level < 0 || level > 15) {
      throw new Error(`Stall level must be between 0 and 15`);
    }
    await this.writeRegister(etm_m55.STALLCTLR, { LEVEL: level });
  }

  /**
   * Enables or disables processor stalling when ETM backpressure occurs.
   * @param enable True to allow ETM to stall the processor.
   */
  async stallProcessorEnable(enable: boolean): Promise<void> {
    await this.writeRegister(etm_m55.STALLCTLR, { ISTALL: enable ? 1 : 0 });
  }

  /**
   * Sets the event selector used for timestamp packet generation.
   * @param event Timestamp event selector value.
   */
  async setTimestampEvent(event: number): Promise<void> {
    await this.writeRegister(etm_m55.TSCTLR, { EVENT: event });
  }

  /**
   * Sets the cycle counter threshold used by ETM.
   * @param threshold Cycle counter threshold value.
   */
  async setCycleCounterThreshold(threshold: number): Promise<void> {
    await this.writeRegister(etm_m55.CCCTLR, { THRESHOLD: threshold });
  }

  /**
   * Sets the ETM trace ID used to identify this source in the trace stream.
   * @param traceId Trace ID value.
   */
  async setTraceID(traceId: number): Promise<void> {
    if (traceId < 0 || traceId > 0x6f) {
      throw new RangeError(
        `Trace ID must be between 0 and 0x6F (received ${traceId}).`,
      );
    }
    await this.writeRegister(etm_m55.TRACEIDR, { TRACEID: traceId });
  }

  /**
   * Reads the currently configured ETM trace ID.
   * @returns Trace ID value.
   */
  async getTraceId(): Promise<number> {
    const traceIdReg = await this.readRegister(etm_m55.TRACEIDR);
    return traceIdReg.TRACEID;
  }

  /**
   * Sets the start event for ViewInst include/exclude control.
   * @param event Start event value.
   */
  async setVIPStartEvent(event: number): Promise<void> {
    await this.writeRegister(etm_m55.VIPCSSCTLR, { START: event });
  }

  /**
   * Sets the stop event for ViewInst include/exclude control.
   * @param event Stop event value.
   */
  async setVIPStopEvent(event: number): Promise<void> {
    await this.writeRegister(etm_m55.VIPCSSCTLR, { STOP: event });
  }

  /**
   * Sets exception level filtering/status behavior in VICTLR.
   * @param status Exception level status value.
   */
  async setExceptionLevelStatus(status: number): Promise<void> {
    await this.writeRegister(etm_m55.VICTLR, { EXLEVEL_STATUS: status });
  }

  /**
   * Enables or disables trace error event tracing.
   * @param enable True to trace error events.
   */
  async setTraceError(enable: boolean): Promise<void> {
    await this.writeRegister(etm_m55.VICTLR, { TRCERR: enable ? 1 : 0 });
  }

  /**
   * Enables or disables trace reset event tracing.
   * @param enable True to trace reset events.
   */
  async setTraceReset(enable: boolean): Promise<void> {
    await this.writeRegister(etm_m55.VICTLR, { TRCRESET: enable ? 1 : 0 });
  }

  /**
   * Enables or disables start/stop status tracing.
   * @param enable True to enable SSSTATUS.
   */
  async setSSStatus(enable: boolean): Promise<void> {
    await this.writeRegister(etm_m55.VICTLR, { SSSTATUS: enable ? 1 : 0 });
  }

  /**
   * Sets the main VICTLR event selector.
   * @param event Event selector value.
   */
  async setVICTLREvent(event: number): Promise<void> {
    await this.writeRegister(etm_m55.VICTLR, { EVENT: event });
  }

  /**
   * Gets synchronization packet period.
   * @returns Synchronization counter value.
   */
  async getSynchronizationCounter(): Promise<number> {
    const syncpr = await this.readRegister(etm_m55.SYNCPR);
    return syncpr.SYNC;
  }

  /**
   * Indicates whether ETM tracing is currently enabled.
   * @returns True when ETM EN bit is set.
   */
  async isEnabled(): Promise<boolean> {
    const prgctlr = await this.readRegister(etm_m55.PRGCTLR);
    return prgctlr.EN === 1;
  }

  /**
   * Applies a baseline ETM program-flow configuration and enables ETM.
   * The sequence follows the ETM v4 architecture guidance for program-flow trace.
   */
  async enableTraceForProgramFlowTrace(): Promise<void> {
    // Configuration  from IHI0064H_b_etm_v4_architecture_specification.pdf
    // page 185 4.5.1 Enabling the trace unit for program flow trace.

    await this.disableETM();
    await this.configureETMOutputInfo({
      returnStack: true,
    });
    await this.setEvent0(0);
    await this.setEvent1(0);
    await this.setLowPowerOverride(false);
    await this.enableATBTrigger(false);
    await this.enableGenerateEvent(0, false);
    await this.enableGenerateEvent(1, false);
    await this.setStallLevel(0);
    await this.stallProcessorEnable(false);
    await this.setTimestampEvent(0);
    await this.setCycleCounterThreshold(0x3ff);
    await this.setVIPStartEvent(0);
    await this.setVIPStopEvent(0);
    await this.setExceptionLevelStatus(0);
    await this.setTraceError(false);
    await this.setTraceReset(false);
    await this.setSSStatus(true);
    await this.setVICTLREvent(1);
    await this.enableETM();
  }

  /**
   * Checks whether the ETM-M55 is present and reachable on
   * the debug session
   *
   * @returns boolean indicating if the component is valid or not.
   */
  async isValidHardware(): Promise<boolean> {
    const devArch = await this.deviceArchitecture();
    if (
      !devArch ||
      devArch.archId !== 0x4a13 ||
      devArch.revision !== 0x5 ||
      devArch.architect !== 0x23b
    ) {
      return false;
    }

    // Binary values from ARM CoreSight ETM-M55 Technical Reference Manual
    const devType = await this.deviceType();
    if (devType.major !== 0x3 || devType.sub !== 0x1) {
      return false;
    }

    return true;
  }

  /**
   * Waits until ETM reports IDLE state after enable/disable operations.
   * @param tries Number of attempts to check the ready state before giving up.
   */
  async waitForReady(tries: number = 10): Promise<void> {
    while ((await this.readRegister(etm_m55.STATR)).IDLE === 0) {
      if (tries-- <= 0) {
        throw new Error(`ETM-M55 component ${this.name} did not become idle.`);
      }
    }
  }

  /**
   * Disables ETM tracing and waits until the component becomes idle.
   */
  async disableETM(): Promise<void> {
    await this.writeRegister(etm_m55.PRGCTLR, { EN: 0 });
    await this.waitForReady();
  }

  /**
   * Enables ETM tracing.
   */
  async enableETM(): Promise<void> {
    await this.writeRegister(etm_m55.PRGCTLR, { EN: 1 });
  }
}

export namespace etm_m55 {
  export const enum REG {
    TRCPRGCTLR = 0x004,
    TRCSTATR = 0x00c,
    TRCCONFIGR = 0x010,
    TRCEVENTCTL0R = 0x020,
    TRCEVENTCTL1R = 0x024,
    TRCSTALLCTLR = 0x02c,
    TRCTSCTLR = 0x030,
    TRCSYNCPR = 0x034,
    TRCCCCTLR = 0x038,
    TRCTRACEIDR = 0x040,
    TRCVICTLR = 0x080,
    TRCVIPCSSCTLR = 0x08c,
    TRCDEVARCH = 0xfbc,
    TRCDEVID = 0xfc8,
    TRCDEVTYPE = 0xfcc,
  }

  export const PRGCTLR: RegisterDescription = {
    address: REG.TRCPRGCTLR,
    fields: {
      EN: [0, 1],
    },
  };

  export const STATR: RegisterDescription = {
    address: REG.TRCSTATR,
    fields: {
      IDLE: [0, 1],
      PMSTABLE: [1, 1],
    },
  };

  export const CONFIGR: RegisterDescription = {
    address: REG.TRCCONFIGR,
    fields: {
      RES1: [0, 1],
      BB: [3, 1],
      CCI: [4, 1],
      COND: [8, 3],
      TS: [11, 1],
      RS: [12, 1],
    },
  };

  export const EVENTCTL0R: RegisterDescription = {
    address: REG.TRCEVENTCTL0R,
    fields: {
      EVENT0: [0, 8],
      EVENT1: [8, 8],
    },
  };

  export const EVENTCTL1R: RegisterDescription = {
    address: REG.TRCEVENTCTL1R,
    fields: {
      INSTEN0: [0, 1],
      INSTEN1: [1, 1],
      ATB: [11, 1],
      LPOVERRIDE: [12, 1],
    },
  };

  export const STALLCTLR: RegisterDescription = {
    address: REG.TRCSTALLCTLR,
    fields: {
      LEVEL: [0, 4],
      ISTALL: [8, 1],
    },
  };

  export const TSCTLR: RegisterDescription = {
    address: REG.TRCTSCTLR,
    fields: {
      EVENT: [0, 8],
    },
  };

  export const SYNCPR: RegisterDescription = {
    address: REG.TRCSYNCPR,
    fields: {
      SYNC: [0, 5],
    },
  };

  export const CCCTLR: RegisterDescription = {
    address: REG.TRCCCCTLR,
    fields: {
      THRESHOLD: [0, 12],
    },
  };

  export const TRACEIDR: RegisterDescription = {
    address: REG.TRCTRACEIDR,
    fields: {
      TRACEID: [0, 7],
    },
  };

  export const VICTLR: RegisterDescription = {
    address: REG.TRCVICTLR,
    fields: {
      EVENT: [0, 8],
      SSSTATUS: [9, 1],
      TRCRESET: [10, 1],
      TRCERR: [11, 1],
      EXLEVEL_STATUS: [16, 4],
    },
  };

  export const VIPCSSCTLR: RegisterDescription = {
    address: REG.TRCVIPCSSCTLR,
    fields: {
      START: [0, 2],
      STOP: [16, 2],
    },
  };
}
