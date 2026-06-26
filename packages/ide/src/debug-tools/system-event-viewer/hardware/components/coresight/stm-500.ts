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
import {
  CfsDebugManager,
  RegisterDescription,
} from "../../../../debug-manager";

/**
 * This class allow interaction with ARM STM-500 Embedded Trace Macrocell,
 * which provides trace functionality for hardware and software events.
 *
 * More information can be found on:
 * - ARM® CoreSight™ STM-500 System Trace Macrocell Technical Reference Manual:
 *   https://documentation-service.arm.com/static/5f106ed80daa596235e81fcc
 * - ARM® System Trace Macrocell Programmers’ Model Architecture Specification:
 *   https://documentation-service.arm.com/static/5f8ffb02f86e16515cdbfec0
 *
 */
export class Stm500 extends coresight.Component implements SoCTraceComponent {
  readonly AtbOutput: string;
  readonly HwEvents: Record<number, string>;
  readonly type: string;
  // This is the maximum value for the synchronization counter of the stm-500.
  readonly SynchronizationCounterHardwareMaxValue = 4095;
  /**
   *
   * @param name Unique name to identify the component in the system.
   *             This is currently only used on error messages with no logic associated.
   * @param socTraceInfo Record containing information from the data model.
   * @param debugManager Debug manager used to read and write registers of the component.
   */
  constructor(
    public name: string,
    socTraceInfo: SocTraceComponentInfo,
    debugManager: CfsDebugManager,
  ) {
    super(debugManager, socTraceInfo);

    this.type = socTraceInfo.Type as string;
    this.AtbOutput = socTraceInfo.AtbOutput as string;
    this.HwEvents = socTraceInfo.HwEvents;
  }

  /**
   * Writes values to a register, unlocking the component if necessary.
   *
   * @param register The register to write to.
   * @param values The values to write to the register.
   */
  protected async writeRegister(
    register: RegisterDescription,
    values: Record<string, number>,
  ): Promise<void> {
    // On-demand unlock: if the component is locked, unlock it immediately.
    if (await this.isLocked()) {
      // Use super.writeRegister to bypass this override when writing LAR.
      await super.writeRegister(coresight.LAR, { KEY: 0xc5acce55 });
    }

    // Perform the requested write.
    return super.writeRegister(register, values);
  }

  async connect(input: string, output: string): Promise<void> {
    const [first, second] = input.split(/\.(.*)/);
    if (first !== "HwEvents") {
      throw new Error(`Only HwEvents inputs are supported for ${this.name}.`);
    }
    if (Object.keys(this.HwEvents).includes(second) === false) {
      throw new Error(
        `${second} is not a valid HwEvent input for ${this.name}.`,
      );
    }
    if (output !== "AtbOutput") {
      throw new Error(
        `${output} is not a valid output for ${this.name}. Only AtbOutput is supported.`,
      );
    }
    await this.enableHwEvent(parseInt(second, 10));
  }

  async disconnect(input: string, output: string): Promise<void> {
    const [first, second] = input.split(/\.(.*)/);
    if (first !== "HwEvents") {
      throw new Error(`Only HwEvents inputs are supported for ${this.name}.`);
    }
    if (Object.keys(this.HwEvents).includes(second) === false) {
      throw new Error(
        `${second} is not a valid HwEvent input for ${this.name}.`,
      );
    }
    if (output !== "AtbOutput") {
      throw new Error(
        `${output} is not a valid output for ${this.name}. Only AtbOutput is supported.`,
      );
    }
    await this.disableHwEvent(parseInt(second, 10));
  }

  /**
   * Retrieves the current connection status for a given signal.
   *
   * @param signal The signal identifier. Can be "HwEvents.<event_number>" to check if a
   *               specific event is connected, or "AtbOutput" to get all connected events
   * @returns Array of connections if the signal is connected, undefined otherwise
   * @throws Error if the signal identifier is unknown or invalid
   */
  async getConnections(signal: string): Promise<SoCTraceComponentConnection[]> {
    const [first, second] = signal.split(/\.(.*)/);

    switch (first) {
      case "HwEvents":
        const eventNumber = parseInt(second, 10);
        if (Object.keys(this.HwEvents).includes(second)) {
          const isActive = await this.isHwEventEnabled(eventNumber);
          return [
            {
              sourceSignal: this.HwEvents[eventNumber],
              componentSourceSignal: signal,
              componentDestinationSignal: "AtbOutput",
              destinationSignal: this.AtbOutput,
              isActive,
            },
          ];
        }
        throw new Error(
          `${second} is not a valid HwEvent input for ${this.name}.`,
        );
      case "AtbOutput":
        const enabledEvents = await this.getEnabledHwEvents();
        return Object.entries(this.HwEvents).map(
          ([eventNumber, eventSignal]) => ({
            sourceSignal: this.AtbOutput,
            componentSourceSignal: signal,
            componentDestinationSignal: `HwEvents.${eventNumber}`,
            destinationSignal: eventSignal,
            isActive: enabledEvents.includes(parseInt(eventNumber, 10)),
          }),
        );
    }

    throw new Error(`Unknown signal ${signal} for ${this.name}.`);
  }

  /**
   * Checks wether the STM-500 is present and reachable on
   * the debug session
   *
   * @returns boolean indicating if the component is valid or not.
   */
  async isValidHardware(): Promise<boolean> {
    const devArch = await this.deviceArchitecture();
    if (
      !devArch ||
      devArch.archId !== 0x0a63 ||
      devArch.revision !== 1 ||
      devArch.architect !== 0x23b
    ) {
      return false;
    }

    const pid = await this.peripheralID();
    if (
      pid.part !== 0x963 ||
      pid.revision !== 1 ||
      pid.jep106?.continuation !== 0x4 ||
      pid.jep106?.identification !== 0x3b
    ) {
      return false;
    }

    // Binary values from STM500 Technical Reference Manual
    const devType = await this.deviceType();
    if (devType.major !== 0b0011 || devType.sub !== 0b0110) {
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

  /**
   * Enables trace generation
   *
   * @param options A set of optional arguments to further customize the trace generation. Options
   *                that are not provided remain unchanged from their previous state.
   *                - tsEnable: When true, timestamps will not be added to the trace even if requested
   *                            on stimulus port write
   *                - compression: When true, trace entries will be compressed to the minimum size to contain
   *                               the required data value (information about the write operation size is lost).
   *                               When false the trace packet size depends on write operation size.
   */
  async enable(
    options: {
      tsEnable?: boolean;
      compression?: boolean;
    } = {},
  ): Promise<void> {
    const csrReg: { EN: number; TSEN?: number; COMPEN?: number } = { EN: 1 };
    if (options.tsEnable !== undefined) {
      csrReg.TSEN = options.tsEnable ? 1 : 0;
    }
    if (options.compression !== undefined) {
      csrReg.COMPEN = options.compression ? 1 : 0;
    }
    await this.writeRegister(stm500.STMTCSR, csrReg);
  }

  /**
   * Disables trace generation.
   */
  async disable(): Promise<void> {
    await this.writeRegister(stm500.STMTCSR, { EN: 0 });
  }

  /**
   * Configures the synchronization counter to periodically insert STPv2 sync packets.
   *
   * Note that this is a best effort and the exact number of bytes may not be respected.
   *
   * @param nBytes Number of bytes between synchronization packets. Must be between 0 and 4095.
   */
  async setSynchronizationCounter(nBytes: number): Promise<void> {
    if (nBytes < 0 || nBytes > this.SynchronizationCounterHardwareMaxValue) {
      throw new RangeError(
        `Synchronization counter value out of range ${nBytes} not in [0-${this.SynchronizationCounterHardwareMaxValue}]`,
      );
    }
    await this.writeRegister(stm500.STMSYNCR, {
      COUNT: nBytes,
      MODE: 0,
    });
  }

  /**
   * Retrieves the current synchronization counter setting.
   * Note: this method assumes STMSYNCR is supported on the hardware.
   * If STMSYNCR is not supported, a hardware read error will be thrown.
   * @returns Number of bytes between synchronization packets (0..4095).
   *          A value of 0 means the synchronization counter is disabled.
   */
  async getSynchronizationCounter(): Promise<number> {
    const syncr = await this.readRegister(stm500.STMSYNCR);
    return syncr.COUNT;
  }

  /**
   * Disables the automatic synchronization counter, stopping periodic sync packets.
   */
  async disableSynchronizationCounter(): Promise<void> {
    await this.writeRegister(stm500.STMSYNCR, { COUNT: 0 });
  }

  /**
   * Sets the timestamp frequency for trace packets.
   * This information doesn't change the actual timestamp clock, only the
   * value that is reported as trace packet after synchronization packets.
   *
   * @param frequencyHz The timestamp frequency in Hertz
   */
  async setTsFrequency(frequencyHz: number): Promise<void> {
    await this.writeRegister(stm500.STMTSFREQR, { FREQ: frequencyHz });
  }

  /**
   * Retrieves the current timestamp frequency setting.
   * This information doesn't necessarily match the timestamp generator frequency
   * unless it is properly configured (for example via setTsFrequency method)
   *
   * @returns The timestamp frequency in Hertz
   */
  async getTsFrequency(): Promise<number> {
    return (await this.readRegister(stm500.STMTSFREQR)).FREQ;
  }

  /**
   * Sets the trace ID that will be used in generated trace packets.
   * This is the ID inserted into ATB bus and it is required to properly
   * decode the output of the STM-500.
   *
   * @param traceId The trace ID value (0-0x6F)
   */
  async setTraceId(traceId: number): Promise<void> {
    if (traceId < 0 || traceId > 0x6f) {
      throw new Error(
        `Trace ID must be between 0 and 0x6F (received ${traceId}).`,
      );
    }
    await this.writeRegister(stm500.STMTCSR, { TRACEID: traceId });
  }

  /**
   * Retrieves the current trace ID setting.
   * This is the ID inserted into ATB bus and it is required to properly
   * decode the output of the STM-500.
   *
   * @returns The configured trace ID value
   */
  async getTraceId(): Promise<number> {
    return (await this.readRegister(stm500.STMTCSR)).TRACEID;
  }

  /**
   * Forces a manual generation of a synchronization packet in the trace stream.
   */
  async forceSync(): Promise<void> {
    // This should write the same value into the register, triggering
    // a sync event
    await this.writeRegister(stm500.STMTSFREQR, {});
  }

  /**
   * Enables automatic flushing of the internal FIFO buffer.
   * When enabled, STM-500 will automatically flush the FIFO, even if the ATB
   * interface is not fully utilized. Note that this may result in decreased performance
   * and it is recommended to flush by other means (e.g. disabling trace)
   */
  async enableAutoFlush(): Promise<void> {
    await this.writeRegister(stm500.STMAUXCR, { FIFOAF: 1 });
  }

  /**
   * Disables automatic flushing of the internal FIFO buffer.
   */
  async disableAutoFlush(): Promise<void> {
    await this.writeRegister(stm500.STMAUXCR, { FIFOAF: 0 });
  }

  /**
   * Checks if the STM FIFO is busy processing trace data.
   * For example the FIFO is not empty.
   *
   * If this situation is not automatically resolved, it probably means the ATB interface
   * downstream is stalling by a ETF being full or a Funnel not being enabled.
   *
   * @returns True if the STM is busy, false otherwise
   */
  async isBusy(): Promise<boolean> {
    const csr = await this.readRegister(stm500.STMTCSR);
    return csr.BUSY === 1;
  }

  /**
   * Enables trace generation for a specific hardware event.
   *
   * @param eventNumber The hardware event number to enable (0-63)
   */
  async enableHwEvent(eventNumber: number): Promise<void> {
    if (eventNumber < 0 || eventNumber > 63) {
      throw new Error(
        `Invalid event number ${eventNumber}. Must be between 0 and 63.`,
      );
    }
    // First select the proper bank
    const hwEventBank = Math.floor(eventNumber / 32);
    const hwEventBit = eventNumber % 32;
    await this.writeRegister(stm500.STMHEBSR, { HEBS: hwEventBank });

    // Then enable the event
    const currentHeer = await this.readRegister(stm500.STMHEER);
    // eslint-disable-next-line no-bitwise
    const newHeerValue = (currentHeer.HEE | (1 << hwEventBit)) >>> 0;
    await this.writeRegister(stm500.STMHEER, { HEE: newHeerValue });
    await this.writeRegister(stm500.STMHEMCR, { EN: 1, COMPEN: 1 });
  }

  /**
   * Disables trace generation for a specific hardware event.
   *
   * @param eventNumber The hardware event number to disable (0-63)
   */
  async disableHwEvent(eventNumber: number): Promise<void> {
    if (eventNumber < 0 || eventNumber > 63) {
      throw new Error(
        `Invalid event number ${eventNumber}. Must be between 0 and 63.`,
      );
    }
    // First select the proper bank
    const hwEventBank = Math.floor(eventNumber / 32);
    const hwEventBit = eventNumber % 32;
    await this.writeRegister(stm500.STMHEBSR, { HEBS: hwEventBank });

    // Then disable the event
    const currentHeer = await this.readRegister(stm500.STMHEER);
    // eslint-disable-next-line no-bitwise
    const newHeerValue = (currentHeer.HEE & ~(1 << hwEventBit)) >>> 0;
    await this.writeRegister(stm500.STMHEER, { HEE: newHeerValue });
  }

  /**
   * Retrieves a list of all currently enabled hardware events.
   *
   * @returns Array of event numbers that are currently enabled
   */
  async getEnabledHwEvents(): Promise<number[]> {
    const enabledEvents: number[] = [];
    for (const hwEventBank of [0, 1]) {
      await this.writeRegister(stm500.STMHEBSR, { HEBS: hwEventBank });
      const heer = await this.readRegister(stm500.STMHEER);
      for (let hwEventBit = 0; hwEventBit < 32; hwEventBit++) {
        // eslint-disable-next-line no-bitwise
        if ((heer.HEE & (1 << hwEventBit)) !== 0) {
          enabledEvents.push(hwEventBank * 32 + hwEventBit);
        }
      }
    }
    return enabledEvents;
  }

  /**
   * Checks if a specific hardware event is currently enabled for tracing.
   *
   * @param eventNumber The hardware event number to check (0-63)
   * @returns True if the event is enabled, false otherwise
   */
  async isHwEventEnabled(eventNumber: number): Promise<boolean> {
    const hemcr = await this.readRegister(stm500.STMHEMCR);
    if (hemcr.EN === 0) {
      return false;
    }

    // Select the proper bank
    const hwEventBank = Math.floor(eventNumber / 32);
    const hwEventBit = eventNumber % 32;
    await this.writeRegister(stm500.STMHEBSR, { HEBS: hwEventBank });

    const heer = await this.readRegister(stm500.STMHEER);
    /* eslint-disable no-bitwise */
    const eventMask = 1 << hwEventBit;
    return (heer.HEE & eventMask) !== 0;
    /* eslint-enable no-bitwise */
  }

  /**
   * Retrieves the STP master ID used for hardware event trace packets.
   * This can be used for properly decoding the generated STPv2 stream.
   *
   * @returns The configured STP master ID
   */
  async getHwEventStpMasterId(): Promise<number> {
    return (await this.readRegister(stm500.STMHEMASTR)).MASTER;
  }
}

export namespace stm500 {
  export const enum REG {
    STMDMASTARTR = 0xc04,
    STMDMASTOPR = 0xc08,
    STMDMASTATR = 0xc0c,
    STMDMACTLR = 0xc10,
    STMDMAIDR = 0xc14,
    STMHEER = 0xd00,
    STMHETER = 0xd20,
    STMHEBSR = 0xd60,
    STMHEMCR = 0xd64,
    STMHEMASTR = 0xdf4,
    STMHEFEAT1R = 0xdf8,
    STMHEIDR = 0xdfc,
    STMSPER = 0xe00,
    STMSPTER = 0xe20,
    STMSPSCR = 0xe60,
    STMSPMSCR = 0xe64,
    STMSPOVERRIDER = 0xe68,
    STMSPMOVERRIDER = 0xe6c,
    STMSPTRIGCSR = 0xe70,
    STMTCSR = 0xe80,
    STMTSSTIMR = 0xe84,
    STMTSFREQR = 0xe8c,
    STMSYNCR = 0xe90,
    STMAUXCR = 0xe94,
    STMFEAT1R = 0xea0,
    STMFEAT2R = 0xea4,
    STMFEAT3R = 0xea8,
    STMITTRIGGER = 0xee8,
    STMITATBDATA0 = 0xeec,
    STMITATBCTR2 = 0xef0,
    STMITATBID = 0xef4,
    STMITATBCTR0 = 0xef8,
  }

  export const STMDMASTARTR: RegisterDescription = {
    address: REG.STMDMASTARTR,
    fields: {
      DMASTART: [0, 1],
    },
  };

  export const STMDMASTOPR: RegisterDescription = {
    address: REG.STMDMASTOPR,
    fields: {
      DMASTOP: [0, 1],
    },
  };

  export const STMDMASTATR: RegisterDescription = {
    address: REG.STMDMASTATR,
    fields: {
      STATUS: [0, 1],
    },
  };

  export const STMDMACTLR: RegisterDescription = {
    address: REG.STMDMACTLR,
    fields: {
      SENS: [2, 2],
    },
  };

  export const STMDMAIDR: RegisterDescription = {
    address: REG.STMDMAIDR,
    fields: {
      CLASS: [0, 4],
      CLASSREV: [4, 4],
      VENDESP: [8, 4],
    },
  };

  export const STMHEER: RegisterDescription = {
    address: REG.STMHEER,
    fields: {
      HEE: [0, 32],
    },
  };

  export const STMHETER: RegisterDescription = {
    address: REG.STMHETER,
    fields: {
      HETE: [0, 32],
    },
  };

  export const STMHEBSR: RegisterDescription = {
    address: REG.STMHEBSR,
    fields: {
      HEBS: [0, 1],
    },
  };

  export const STMHEMCR: RegisterDescription = {
    address: REG.STMHEMCR,
    fields: {
      EN: [0, 1],
      COMPEN: [1, 1],
      ERRDETECT: [2, 1],
      TRIGCTL: [4, 1],
      TRIGSTATUS: [5, 1],
      TRIGCLEAR: [6, 1],
      ATBTRIGEN: [7, 1],
    },
  };

  export const STMHEMASTR: RegisterDescription = {
    address: REG.STMHEMASTR,
    fields: {
      MASTER: [0, 8],
    },
  };

  export const STMHEFEAT1R: RegisterDescription = {
    address: REG.STMHEFEAT1R,
    fields: {
      HETER: [0, 1],
      HEERR: [2, 1],
      HEMASTR: [3, 1],
      HECOMP: [4, 2],
      HEEXTMUXSIZE: [28, 3],
    },
  };

  export const STMSPER: RegisterDescription = {
    address: REG.STMSPER,
    fields: {
      SPE: [0, 32],
    },
  };

  export const STMSPTER: RegisterDescription = {
    address: REG.STMSPTER,
    fields: {
      SPTE: [0, 32],
    },
  };

  export const STMSPSCR: RegisterDescription = {
    address: REG.STMSPSCR,
    fields: {
      PORTCTL: [0, 2],
      PORTSEL: [20, 12],
    },
  };

  export const STMSPMSCR: RegisterDescription = {
    address: REG.STMSPMSCR,
    fields: {
      MASTCTL: [0, 1],
      MASTSEL: [15, 17],
    },
  };

  export const STMSPOVERRIDER: RegisterDescription = {
    address: REG.STMSPOVERRIDER,
    fields: {
      OVERCTL: [0, 2],
      OVERTS: [2, 4],
      PORTSEL: [15, 17],
    },
  };

  export const STMSPMOVERRIDER: RegisterDescription = {
    address: REG.STMSPMOVERRIDER,
    fields: {
      MASTCTL: [0, 1],
      MASTSEL: [15, 17],
    },
  };

  export const STMSPTRIGCSR: RegisterDescription = {
    address: REG.STMSPTRIGCSR,
    fields: {
      TRIGCTL: [0, 1],
      TRIGSTATUS: [1, 1],
      TRIGCLEAR: [2, 1],
      ATBTRIGEN_TE: [3, 1],
      ATBTRIGEN_DIR: [4, 1],
    },
  };

  export const STMTCSR: RegisterDescription = {
    address: REG.STMTCSR,
    fields: {
      EN: [0, 1],
      TSEN: [1, 1],
      SYNCEN: [2, 1],
      HWTEN: [3, 1],
      SWOEN: [4, 1],
      COMPEN: [5, 1],
      TSPRESCALE: [8, 2],
      TRACEID: [16, 7],
      BUSY: [23, 1],
    },
  };

  export const STMTSSTIMR: RegisterDescription = {
    address: REG.STMTSSTIMR,
    fields: {
      FORCETS: [0, 1],
    },
  };

  export const STMTSFREQR: RegisterDescription = {
    address: REG.STMTSFREQR,
    fields: {
      FREQ: [0, 32],
    },
  };

  export const STMSYNCR: RegisterDescription = {
    address: REG.STMSYNCR,
    fields: {
      COUNT: [0, 12],
      MODE: [12, 1],
    },
  };

  export const STMAUXCR: RegisterDescription = {
    address: REG.STMAUXCR,
    fields: {
      FIFOAF: [0, 1],
      ASYNCPE: [1, 1],
      PRIORINVDIS: [2, 1],
      QHWEVOVERRIDE: [7, 1],
    },
  };

  export const STMFEAT1R: RegisterDescription = {
    address: REG.STMFEAT1R,
    fields: {
      PROT: [0, 4],
      TS: [4, 2],
      TSFREQ: [6, 1],
      FORCETS: [7, 1],
      SYNC: [8, 2],
      TRACEBUS: [10, 4],
      TRIGCTL: [14, 2],
      TSPRESCALE: [16, 2],
      HWTEN: [18, 2],
      SYNCEN: [20, 2],
      SWOEN: [22, 2],
    },
  };

  export const STMFEAT2R: RegisterDescription = {
    address: REG.STMFEAT2R,
    fields: {
      SPTER: [0, 2],
      SPER: [2, 1],
      SPCOMP: [4, 2],
      SPOVERRIDE: [6, 1],
      PRIVMASK: [7, 2],
      SPTRTYPE: [9, 2],
      DSIZE: [12, 4],
      SPTYPE: [16, 2],
    },
  };

  export const STMFEAT3R: RegisterDescription = {
    address: REG.STMFEAT3R,
    fields: {
      NUMMAST: [0, 16],
    },
  };
}

export class CfsStm500Device extends coresight.Component {}
