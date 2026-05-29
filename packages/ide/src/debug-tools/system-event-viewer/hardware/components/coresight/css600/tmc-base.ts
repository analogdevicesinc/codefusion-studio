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

import { coresight } from "../coresight";
import { RegisterDescription } from "../../../../../debug-manager";

export interface TmcConfiguration {
  formatting: boolean;
  triggerIndicator: boolean;
  flushIn: boolean;
  flushOnTrigger: boolean;
  triggerIn: boolean;
  triggerOnTriggerEvent: boolean;
  triggerOnFlush: boolean;
  stopOnFlush: boolean;
  stopOnTriggerEvent: boolean;
}

/**
 * This class represent ARM Coresight Trace Memory Controller (TMC),
 * which allows to buffer and route ATB trace data to other memory
 * interfaces.
 *
 * TMC class can be used for three different hardware configurations:
 * - Embedded Trace Buffer (ETB): Enables trace to be stored in a dedicated SRAM,
 *   used as a Circular Buffer.
 * - Embedded Trace FIFO (ETF): Enables trace to be stored in a dedicated SRAM,
 *   used either as a Circular Buffer or as a FIFO. The functionality of this
 *   configuration is a superset of the functionality of the ETB configuration.
 * - Embedded Trace Router (ETR): Enables trace to be routed over an AXI bus to
 *   system memory or to any other AXI slave
 *
 * More information can be found on:
 * - ARM® CoreSight™ Trace Memory Controller Technical Reference Manual:
 *   https://developer.arm.com/documentation/ddi0461/latest/
 *
 */
export class Css600TmcBase extends coresight.Component {
  /**
   * Checks whether the TMC is present and reachable on the debug session
   *
   * @returns boolean indicating if the component is valid or not.
   */
  async isValidHardware(): Promise<boolean> {
    const pid = await this.peripheralID();
    if (
      ![0x961, 0x9ea].includes(pid.part) ||
      pid.jep106?.continuation !== 0x4 ||
      pid.jep106?.identification !== 0x3b
    ) {
      return false;
    }

    const devType = await this.deviceType();
    if (![1, 2].includes(devType.major) || ![2, 3].includes(devType.sub)) {
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
   * Retrieves the hardware configuration of the TMC, which can be
   * either ETB, ETF or ETR.
   *
   * @returns tmc.Configuration value indicating the TMC configuration.
   */
  async getHardwareConfiguration(): Promise<tmc.Configuration> {
    const devId = await this.readRegister(tmc.DEVID);
    return devId.CONFIGTYPE as tmc.Configuration;
  }

  /**
   * Retrieves the width of the memory interface databus used by the TMC,
   * which can be 32, 64, 128 or 256 bits.
   *
   * @returns memory width in bits.
   */
  async getMemWidth(): Promise<number> {
    const devId = await this.readRegister(tmc.DEVID);
    switch (devId.MEMWIDTH) {
      case 2:
        return 32;
      case 3:
        return 64;
      case 4:
        return 128;
      case 5:
        return 256;
      default:
        throw new Error(`Unknown MEMWIDTH value: ${devId.MEMWIDTH}`);
    }
  }

  /**
   * Triggers a manual flush of the input trce data, even if the memory width
   * was not filled.
   *
   * Depending on how TMC is configured, flush events may cause triggers
   * or stop events
   */
  async flush(): Promise<void> {
    await this.writeRegister(tmc.FFCR, { FlushMan: 1 });
  }

  /**
   * Enable trace capture by the TMC. This will allow trace data to be stored in
   * the internal buffer or routed to the output interface depending on the
   * configuration of the TMC.
   *
   * For more information read section 2.2 of ARM® CoreSight™ Trace Memory Controller
   * Technical Reference Manual
   */
  async enableTraceCapture(): Promise<void> {
    await this.writeRegister(tmc.CTL, { TraceCaptEn: 1 });
  }

  /**
   * Disable trace capture by the TMC and wait until the device is ready.
   * Note that on disabled state the memory content of the TMC is lost.
   *
   * For more information read section 2.2 of ARM® CoreSight™ Trace Memory Controller
   * Technical Reference Manual
   */
  async disableTraceCapture(): Promise<void> {
    await this.writeRegister(tmc.CTL, { TraceCaptEn: 0 });
    await this.waitForReady();
  }

  /**
   * Empties the TMC buffer by flushing the current content (if any) and waiting until the flush
   * is completed and the TMC is on stopped state, which ensures that all the trace data is properly
   * flushed and can be read with readTraceBuffer() if needed. This can be used to ensure that old trace
   * data is not mixed with new trace data when starting a new trace capture session.
   *
   */

  async emptyBuffer(): Promise<void> {
    const traceSize = await this.getNumberOfWordsInBuffer();
    if (traceSize > 0) {
      await this.flush();
      await this.waitForStop();
      await this.readTraceBuffer();
    }
  }
  /**
   * Returns whether the trace capture is currently enabled or not.
   *
   * Note that enabled may not necessarily mean that the TMC is currently capturing trace,
   * since it could also be on stopped event.
   *
   * For more information read section 2.2 of ARM® CoreSight™ Trace Memory Controller
   * Technical Reference Manual
   *
   * @returns false if trace capture is disabled, true otherwise.
   */
  async isTraceCaptureEnabled(): Promise<boolean> {
    const ctl = await this.readRegister(tmc.CTL);
    return ctl.TraceCaptEn === 1;
  }

  /**
   * Retrieves current mode of the TMC, which can be either Hardware FIFO,
   * Software FIFO or Circular Buffer.
   *
   * @returns current mode of the TMC.
   */
  async getMode(): Promise<tmc.Mode> {
    const modeReg = await this.readRegister(tmc.MODE);
    return modeReg.MODE as tmc.Mode;
  }

  /**
   * Sets the mode of the TMC, which can be either Hardware FIFO
   * (only on ETF configuration), Software FIFO or Circular Buffer.
   *
   * @param mode The mode to set for the TMC.
   */
  async setMode(mode: tmc.Mode): Promise<void> {
    await this.writeRegister(tmc.MODE, { MODE: mode });
  }

  /**
   * Waits for TMC ready bit to be set.
   * This can be used after disabling TMC to ensure that the device is ready before
   * re-enabling it again.
   */
  async waitForReady(): Promise<void> {
    // TODO: Add timeout mechanism to avoid endless loop
    while ((await this.readRegister(tmc.STS)).TMCReady === 0) {}
  }

  /**
   * Waits for TMC to reach stopped state.
   * This can be used in circular buffer modeto ensure that all trace data is
   * properly flushed and ready to be read.
   */
  async waitForStop(): Promise<void> {
    let status = await this.readRegister(tmc.STS);
    // TODO: Add timeout mechanism to avoid endless loop
    while (status.TMCReady === 0) {
      const ctl = await this.readRegister(tmc.CTL);
      if (ctl.TraceCaptEn === 0) {
        throw new Error("Trace capture was disabled before stop event.");
      }
      status = await this.readRegister(tmc.STS);
    }
  }

  /**
   * Retrieves the TMC buffer size, in bytes.
   * In ETF and ETB configuration this is fixed on HW implementation.
   * In ETR configuration, this indicates the size of the memory region
   * used for trace storage. For example, if it is 4 bytes all the write
   * operations will target the same address (useful for driving streaming devices).
   *
   * @returns number of bytes of the TMC buffer size.
   */
  async getBufferSize(): Promise<number> {
    return (await this.readRegister(tmc.RSZ)).RSZ * 4;
  }

  /**
   * Set the TMC buffer size, in bytes.
   *
   * This can only be used on ETR configuration, where it indicates
   * the size of the memory region used for trace storage.
   *
   * For example, if it is 4 bytes all the write operations will target
   * the same address (useful for driving streaming devices).
   *
   * If ETR is configured in scatter-gather operation, this value is ignored
   *
   * Number of bytes must be a multiple of 4.
   *
   */
  async setBufferSize(nBytes: number): Promise<void> {
    if (nBytes % 4 !== 0) {
      throw new Error("Buffer size must be a multiple of 4 bytes.");
    }
    await this.writeRegister(tmc.RSZ, { RSZ: nBytes / 4 });
  }

  /**
   * Retrieves the current buffer location address.
   *
   * This is valid only on ETR configuration.
   *
   * @returns The current buffer location address.
   */
  async getBufferLocation(): Promise<number> {
    const lo = await this.readRegister(tmc.DBALO);
    const hi = await this.readRegister(tmc.DBAHI);
    // eslint-disable-next-line no-bitwise
    return ((hi.BUFADDRHI & 0xff) << 32) | lo.BUFADDRLO;
  }

  /**
   * Sets the current buffer location address.
   *
   * This is valid only on ETR configuration.
   *
   * @param address The buffer location address to set.
   */
  async setBufferLocation(address: number): Promise<void> {
    if (address > 0xffffffffff) {
      throw new Error("Buffer address must be a 40-bit value.");
    }
    /* eslint-disable no-bitwise */
    await this.writeRegister(tmc.DBALO, { BUFADDRLO: address & 0xffffffff });
    await this.writeRegister(tmc.DBAHI, {
      BUFADDRHI: Number((BigInt(address) >> 32n) & 0xffn),
    });
    /* eslint-enable no-bitwise */
  }

  /**
   * Retrieves the number of 32-bit words currently stored in the TMC buffer.
   *
   * @returns number of 32-bit words currently stored in the TMC buffer.
   */
  async getNumberOfWordsInBuffer(): Promise<number> {
    return (await this.readRegister(tmc.CBUFLEVEL)).CBUFLEVEL;
  }

  /**
   * Configure TMC formatting, trigger flush and stop options.
   * @param options Partial TmcConfiguration object with the options to configure.
   *                Only the options that are defined will be updated. The rest will
   *                remain unchanged.
   */
  async configure(options: Partial<TmcConfiguration>): Promise<void> {
    const ffcrReg: {
      EnFt?: number;
      EnTI?: number;
      FOnFlIn?: number;
      FOnTrigEvt?: number;
      TrigOnTrigIn?: number;
      TrigOnTrigEvt?: number;
      TrigOnFl?: number;
      StopOnFl?: number;
      StopOnTrigEvt?: number;
    } = {};
    if (options.formatting !== undefined) {
      ffcrReg.EnFt = options.formatting ? 1 : 0;
    }
    if (options.triggerIndicator !== undefined) {
      ffcrReg.EnTI = options.triggerIndicator ? 1 : 0;
    }
    if (options.flushIn !== undefined) {
      ffcrReg.FOnFlIn = options.flushIn ? 1 : 0;
    }
    if (options.flushOnTrigger !== undefined) {
      ffcrReg.FOnTrigEvt = options.flushOnTrigger ? 1 : 0;
    }
    if (options.triggerIn !== undefined) {
      ffcrReg.TrigOnTrigIn = options.triggerIn ? 1 : 0;
    }
    if (options.triggerOnTriggerEvent !== undefined) {
      ffcrReg.TrigOnTrigEvt = options.triggerOnTriggerEvent ? 1 : 0;
    }
    if (options.triggerOnFlush !== undefined) {
      ffcrReg.TrigOnFl = options.triggerOnFlush ? 1 : 0;
    }
    if (options.stopOnFlush !== undefined) {
      ffcrReg.StopOnFl = options.stopOnFlush ? 1 : 0;
    }
    if (options.stopOnTriggerEvent !== undefined) {
      ffcrReg.StopOnTrigEvt = options.stopOnTriggerEvent ? 1 : 0;
    }

    await this.writeRegister(tmc.FFCR, ffcrReg);
  }

  /**
   * Retrieves the current TMC formatting, trigger, flush, and stop options.
   *
   * @returns TmcConfiguration object with the current configuration of the TMC.
   */
  async getConfiguration(): Promise<TmcConfiguration> {
    const ffcr = await this.readRegister(tmc.FFCR);
    return {
      formatting: ffcr.EnFt === 1,
      triggerIndicator: ffcr.EnTI === 1,
      flushIn: ffcr.FOnFlIn === 1,
      flushOnTrigger: ffcr.FOnTrigEvt === 1,
      triggerIn: ffcr.TrigOnTrigIn === 1,
      triggerOnTriggerEvent: ffcr.TrigOnTrigEvt === 1,
      triggerOnFlush: ffcr.TrigOnFl === 1,
      stopOnFlush: ffcr.StopOnFl === 1,
      stopOnTriggerEvent: ffcr.StopOnTrigEvt === 1,
    };
  }

  /**
   * Reads all the content of the TMC memory.
   * This method can only be used on circular buffer mode if
   * TMC is on stopped state (waitForStop can be used to ensure this)
   * or in software FIFO mode.
   *
   * @returns Buffer object with the content of the TMC memory.
   */
  async readTraceBuffer(): Promise<Buffer> {
    // TODO: Check buffer size, add timeout mechanism, in general prevent endless loop
    const dataWords: number[] = [];
    let lastValue = (await this.readRegister(tmc.RRD)).RRD;
    while (lastValue !== 0xffffffff) {
      dataWords.push(lastValue);
      lastValue = (await this.readRegister(tmc.RRD)).RRD;
    }

    return Buffer.from(new Uint32Array(dataWords).buffer);
  }
}

export namespace tmc {
  export const enum REG {
    RSZ = 0x004,
    STS = 0x00c,
    RRD = 0x010,
    RRP = 0x014,
    RWP = 0x018,
    TRIG = 0x01c,
    CTL = 0x020,
    RWD = 0x024,
    MODE = 0x028,
    LBUFLEVEL = 0x02c,
    CBUFLEVEL = 0x030,
    BUFWM = 0x034,
    RRPHI = 0x038,
    RWPHI = 0x03c,
    AXICTL = 0x110,
    DBALO = 0x118,
    DBAHI = 0x11c,
    FFSR = 0x300,
    FFCR = 0x304,
    PSCR = 0x308,
  }

  export const RSZ: RegisterDescription = {
    address: REG.RSZ,
    fields: {
      RSZ: [0, 31],
    },
  };

  export const STS: RegisterDescription = {
    address: REG.STS,
    fields: {
      Full: [0, 1],
      Triggered: [1, 1],
      TMCReady: [2, 1],
      FtEmpty: [3, 1],
      Empty: [4, 1],
      MemErr: [5, 1],
    },
  };

  export const RRD: RegisterDescription = {
    address: REG.RRD,
    fields: {
      RRD: [0, 32],
    },
  };

  export const RRP: RegisterDescription = {
    address: REG.RRP,
    fields: {
      RRP: [0, 32],
    },
  };

  export const RWP: RegisterDescription = {
    address: REG.RWP,
    fields: {
      RWP: [0, 32],
    },
  };

  export const TRIG: RegisterDescription = {
    address: REG.TRIG,
    fields: {
      TRIG: [0, 32],
    },
  };

  export const CTL: RegisterDescription = {
    address: REG.CTL,
    fields: {
      TraceCaptEn: [0, 1],
    },
  };

  export const RWD: RegisterDescription = {
    address: REG.RWD,
    fields: {
      RWD: [0, 32],
    },
  };

  export const MODE: RegisterDescription = {
    address: REG.MODE,
    fields: {
      MODE: [0, 2],
    },
  };

  export const LBUFLEVEL: RegisterDescription = {
    address: REG.LBUFLEVEL,
    fields: {
      LBUFLEVEL: [0, 32],
    },
  };

  export const CBUFLEVEL: RegisterDescription = {
    address: REG.CBUFLEVEL,
    fields: {
      CBUFLEVEL: [0, 32],
    },
  };

  export const BUFWM: RegisterDescription = {
    address: REG.BUFWM,
    fields: {
      BUFWM: [0, 32],
    },
  };

  export const RRPHI: RegisterDescription = {
    address: REG.RRPHI,
    fields: {
      RRPHI: [0, 8],
    },
  };

  export const RWPHI: RegisterDescription = {
    address: REG.RWPHI,
    fields: {
      RWPHI: [0, 8],
    },
  };

  export const AXICTL: RegisterDescription = {
    address: REG.AXICTL,
    fields: {
      ProtCtrlBit0: [0, 1],
      ProtCtrlBit1: [1, 1],
      CacheCtrlBit0: [2, 1],
      CacheCtrlBit1: [3, 1],
      CacheCtrlBit2: [4, 1],
      CacheCtrlBit3: [5, 1],
      ScatterGatherMode: [7, 1],
      WrBurstLen: [8, 4],
    },
  };

  export const DBALO: RegisterDescription = {
    address: REG.DBALO,
    fields: {
      BUFADDRLO: [0, 32],
    },
  };

  export const DBAHI: RegisterDescription = {
    address: REG.DBAHI,
    fields: {
      BUFADDRHI: [0, 8],
    },
  };

  export const FFSR: RegisterDescription = {
    address: REG.FFSR,
    fields: {
      FlInProg: [0, 1],
      FtStopped: [1, 1],
    },
  };

  export const FFCR: RegisterDescription = {
    address: REG.FFCR,
    fields: {
      EnFt: [0, 1],
      EnTI: [1, 1],
      FOnFlIn: [4, 1],
      FOnTrigEvt: [5, 1],
      FlushMan: [6, 1],
      TrigOnTrigIn: [8, 1],
      TrigOnTrigEvt: [9, 1],
      TrigOnFl: [10, 1],
      StopOnFl: [12, 1],
      StopOnTrigEvt: [13, 1],
      DrainBuffer: [14, 1],
    },
  };

  export const PSCR: RegisterDescription = {
    address: REG.PSCR,
    fields: {
      PSCount: [0, 5],
    },
  };

  export const DEVID: RegisterDescription = {
    address: coresight.REG.DEVID,
    fields: {
      ATBINPORTCOUNT: [0, 5],
      CLKSCHEME: [5, 1],
      CONFIGTYPE: [6, 2],
      MEMWIDTH: [8, 3],
      WBUF_DEPTH: [11, 3],
    },
  };

  export const enum Configuration {
    ETB = 0x0,
    ETR = 0x1,
    ETF = 0x2,
  }

  export const enum Mode {
    HwFIFO = 0x2,
    SwFIFO = 0x1,
    CircularBuffer = 0x0,
  }
}
