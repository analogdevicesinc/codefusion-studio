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
  readonly Ctm: string;
  readonly InputTriggers: Record<number, string>;
  readonly OutputTriggers: Record<number, string>;

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

    // TODO: Improve type safety
    this.type = socTraceInfo.Type as string;
    this.Ctm = socTraceInfo.Ctm as string;
    this.InputTriggers = socTraceInfo.InputTriggers;
    this.OutputTriggers = socTraceInfo.OutputTriggers;
  }

  async getConnections(signal: string): Promise<SoCTraceComponentConnection[]> {
    const [first, second] = signal.split(/\.(.*)/);
    // TODO: Handle proper routing between triggers and channels
    if (first === "Channel") {
      return Object.entries(this.OutputTriggers).map(([key, value]) => ({
        sourceSignal: this.Ctm,
        componentSourceSignal: signal,
        componentDestinationSignal: `OutputTriggers.${key}`,
        destinationSignal: value,
        isActive: false, // Assuming nothing is connected until connect/disconnect methods are implemented.
      }));
    } else if (first === "InputTriggers") {
      if (Object.keys(this.InputTriggers).includes(second) === false) {
        throw new Error(
          `Input ${signal} is not a valid input for ${this.name}.`,
        );
      }
      const sourceSignal = this.InputTriggers[parseInt(second, 10)];
      return Object.entries(this.OutputTriggers)
        .map(([key, value]) => ({
          sourceSignal,
          componentSourceSignal: signal,
          componentDestinationSignal: `OutputTriggers.${key}`,
          destinationSignal: value,
          isActive: false, // Assuming nothing is connected until connect/disconnect methods are implemented.
        }))
        .concat([
          {
            sourceSignal,
            componentSourceSignal: signal,
            componentDestinationSignal: "ctm.0",
            destinationSignal: `${this.Ctm}.0`,
            isActive: true,
          },
          {
            sourceSignal,
            componentSourceSignal: signal,
            componentDestinationSignal: "ctm.1",
            destinationSignal: `${this.Ctm}.1`,
            isActive: true,
          },
          {
            sourceSignal,
            componentSourceSignal: signal,
            componentDestinationSignal: "ctm.2",
            destinationSignal: `${this.Ctm}.2`,
            isActive: true,
          },
          {
            sourceSignal,
            componentSourceSignal: signal,
            componentDestinationSignal: "ctm.3",
            destinationSignal: `${this.Ctm}.3`,
            isActive: true,
          },
        ]);
    } else {
      throw new Error(
        `Only InputTriggers and Channel inputs are supported for ${this.name} (received ${signal}).`,
      );
    }
  }

  async connect(input: string, output: string): Promise<void> {
    void input;
    void output;
    throw new Error("Method not implemented.");
  }

  async disconnect(input: string, output: string): Promise<void> {
    void input;
    void output;
    throw new Error("Method not implemented.");
  }

  async enable(): Promise<void> {
    await this.writeRegister(cti.CTICONTROL, { CTIEN: 1 });
  }

  async disable(): Promise<void> {
    await this.writeRegister(cti.CTICONTROL, { CTIEN: 0 });
  }

  async channelSet(channel: number): Promise<void> {
    // eslint-disable-next-line no-bitwise
    await this.writeRegister(cti.CTIAPPSET, { APPSET: 1 << channel });
  }

  async channelClear(channel: number): Promise<void> {
    // eslint-disable-next-line no-bitwise
    await this.writeRegister(cti.CTIAPPCLEAR, { APPCLEAR: 1 << channel });
  }

  async channelPulse(channel: number): Promise<void> {
    // eslint-disable-next-line no-bitwise
    await this.writeRegister(cti.CTIAPPPULSE, { APPPULSE: 1 << channel });
  }

  async connectTrigger(
    inputTrigger: number,
    outputTrigger: number,
    channel: number,
  ): Promise<void> {
    await this.writeRegister(cti.makeCTIINEN(inputTrigger), {
      // eslint-disable-next-line no-bitwise
      TRIGINEN: 1 << channel,
    });
    await this.writeRegister(cti.makeCTIOUTEN(outputTrigger), {
      // eslint-disable-next-line no-bitwise
      TRIGOUTEN: 1 << channel,
    });
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

  export function makeCTIINEN(channel: number): RegisterDescription {
    return {
      address: REG.CTIINEN0 + channel * 4,
      fields: {
        TRIGINEN: [0, 32],
      },
    };
  }

  export function makeCTIOUTEN(channel: number): RegisterDescription {
    return {
      address: REG.CTIOUTEN0 + channel * 4,
      fields: {
        TRIGOUTEN: [0, 32],
      },
    };
  }

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
}
