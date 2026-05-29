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
} from "../../../trace-types";
import type { SocTraceComponentInfo } from "cfs-types";
import { coresight } from "../coresight";
import {
  CfsDebugManager,
  RegisterDescription,
} from "../../../../../debug-manager";

/**
 * This class allow interaction with ARM Coresight timestamp generator, which
 * provides 64-bit rolling time for distribution to trace generating components
 * such as ETMs and STM.
 *
 * More information can be found on:
 * - ARM® CoreSight™ System-on-Chip SoC-600 Technical Reference Manual:
 *   https://developer.arm.com/documentation/100806/latest/
 *
 */
export class Css600TsGenerator
  extends coresight.Component
  implements SoCTraceComponent
{
  readonly type: string;
  readonly frequency: number;

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
    // TODO: In the future this may be a dynamic value from clock nodes
    this.frequency = parseInt(socTraceInfo.Frequency as string, 10);
  }

  async getConnections(): Promise<SoCTraceComponentConnection[]> {
    throw new Error(`${this.name} has no inputs.`);
  }

  connect(): Promise<void> {
    throw new Error(`${this.name} has no inputs, nor outputs.`);
  }

  disconnect(): Promise<void> {
    throw new Error(`${this.name} has no inputs, nor outputs.`);
  }

  /**
   * Checks whether the timestamp generator is present and reachable on the debug session
   *
   * @returns boolean indicating if the component is valid or not.
   */
  async isValidHardware(): Promise<boolean> {
    const pid = await this.peripheralID();
    if (
      pid.part !== 0x193 ||
      pid.revision !== 0 ||
      pid.jep106?.continuation !== 0x4 ||
      pid.jep106?.identification !== 0x3b
    ) {
      return false;
    }

    const cid = await this.componentID();
    if (cid.preamble !== 0xb105000d || cid.class !== coresight.Class.Corelink) {
      return false;
    }

    return true;
  }

  /**
   * Enable timestamp count.
   *
   * @param haltOnDebug When true, the counter will halt when the system is halted for debugging.
   *                    Otherwise the count will continue even if the execution is halted. Note
   *                    the halt signal may be connected to one specific core and not all of them.
   */
  async enable(haltOnDebug: boolean = false): Promise<void> {
    await this.writeRegister(tsGen.CNTCR, { EN: 1, HDBG: haltOnDebug ? 1 : 0 });
  }

  /**
   * Disable timestamp count. Counter value is preserved and will be resumed when enabled again.
   */
  async disable(): Promise<void> {
    await this.writeRegister(tsGen.CNTCR, { EN: 0 });
  }

  /**
   * This method can be used to set the frequency of the timestamp counter for other
   * pieces of software to read it via getFrequency method.
   *
   * Note this does not actually change the frequency of the counter, which is
   * determined by hardware and clock configuration, but only allows to keep track
   * of it in software.
   *
   *
   * @param frequencyHz The frequency in Hertz.
   */
  async setFrequency(frequencyHz: number): Promise<void> {
    await this.writeRegister(tsGen.CNTFID0, { FREQ: frequencyHz });
  }

  /**
   * This method can be used to retrieve the frequency of the timestamp counter for other
   * pieces of software to read it via getFrequency method.
   *
   * Note this value may not match the actual counter frequency and it is responsibility of
   * software to properly set to the right value.
   *
   *
   * @returns The frequency in Hertz.
   */
  async getFrequency(): Promise<number> {
    return (await this.readRegister(tsGen.CNTFID0)).FREQ;
  }

  /**
   * This method returns the current counter value.
   *
   * Note that due to communication delays the value read may already be outdated
   * by the time it is received if the counter is running.
   *
   * @returns The current counter value.
   */
  async getCounterValue(): Promise<bigint> {
    const low = (await this.readRegister(tsGen.CNTCVL)).CNTCVL32;
    const high = (await this.readRegister(tsGen.CNTCVU)).CNTCVU32;
    // eslint-disable-next-line no-bitwise
    return (BigInt(high) << 32n) | BigInt(low);
  }

  /**
   * This method sets the current counter value.
   * This can be used to reset the counter to 0.
   *
   * @param value The value to set the counter to
   */
  async setCounterValue(value: bigint): Promise<void> {
    /* eslint-disable no-bitwise */
    const low = Number(value & 0xffffffffn);
    const high = Number((value >> 32n) & 0xffffffffn);
    /* eslint-enable no-bitwise */

    // Order is important here,
    // the counter is only updated when high register is written
    await this.writeRegister(tsGen.CNTCVL, { CNTCVL32: low });
    await this.writeRegister(tsGen.CNTCVU, { CNTCVU32: high });
  }
}

export namespace tsGen {
  export const enum REG {
    CNTCR = 0x000,
    CNTSR = 0x004,
    CNTCVL = 0x008,
    CNTCVU = 0x00c,
    CNTFID0 = 0x020,
  }

  export const CNTCR: RegisterDescription = {
    address: REG.CNTCR,
    fields: {
      EN: [0, 1],
      HDBG: [1, 1],
    },
  };

  export const CNTSR: RegisterDescription = {
    address: REG.CNTSR,
    fields: {
      DBGH: [1, 1],
    },
  };

  export const CNTCVL: RegisterDescription = {
    address: REG.CNTCVL,
    fields: {
      CNTCVL32: [0, 32],
    },
  };

  export const CNTCVU: RegisterDescription = {
    address: REG.CNTCVU,
    fields: {
      CNTCVU32: [0, 32],
    },
  };

  export const CNTFID0: RegisterDescription = {
    address: REG.CNTFID0,
    fields: {
      FREQ: [0, 32],
    },
  };
}
