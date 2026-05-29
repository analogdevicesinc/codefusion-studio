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
 * This class allow interaction with ARM Coresight ATB Funnel,
 * which allows to merge multiple trace sources into the same ATB bus.
 *
 * More information can be found on:
 * - ARM® CoreSight™ System-on-Chip SoC-600 Technical Reference Manual:
 *   https://developer.arm.com/documentation/100806/latest/
 *
 */
export class Css600AtbFunnel
  extends coresight.Component
  implements SoCTraceComponent
{
  readonly type: string;
  readonly AtbReceivers: Record<number, string>;
  readonly AtbTransmitter: string;

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
    this.AtbReceivers = socTraceInfo.AtbReceivers;
    this.AtbTransmitter = socTraceInfo.AtbTransmitter as string;
  }

  async connect(input: string, output: string): Promise<void> {
    const [first, second] = input.split(/\.(.*)/);
    if (first !== "AtbReceivers") {
      throw new Error(
        `Only AtbReceivers inputs are supported for ${this.name} (received ${input}).`,
      );
    }

    if (Object.keys(this.AtbReceivers).includes(second) === false) {
      throw new Error(`Input ${input} is not a valid input for ${this.name}.`);
    }

    if (output !== "AtbTransmitter") {
      throw new Error(
        `Output ${output} is not a valid output for ${this.name}.`,
      );
    }

    const receiverIndex = parseInt(second, 10);

    await this.enableAtbReceiver(receiverIndex);
  }

  async disconnect(input: string, output: string): Promise<void> {
    const [first, second] = input.split(/\.(.*)/);
    if (first !== "AtbReceivers") {
      throw new Error(
        `Only AtbReceivers inputs are supported for ${this.name} (received ${input}).`,
      );
    }

    if (Object.keys(this.AtbReceivers).includes(second) === false) {
      throw new Error(`Input ${input} is not a valid input for ${this.name}.`);
    }

    if (output !== "AtbTransmitter") {
      throw new Error(
        `Output ${output} is not a valid output for ${this.name}.`,
      );
    }

    const receiverIndex = parseInt(second, 10);

    await this.disableAtbReceiver(receiverIndex);
  }

  async getConnections(signal: string): Promise<SoCTraceComponentConnection[]> {
    const [first, second] = signal.split(/\.(.*)/);
    switch (first) {
      case "AtbReceivers":
        const receiverIndex = parseInt(second, 10);
        if (Object.keys(this.AtbReceivers).includes(second)) {
          const isActive = await this.isAtbReceiverEnabled(receiverIndex);
          return [
            {
              sourceSignal: this.AtbReceivers[receiverIndex],
              componentSourceSignal: signal,
              componentDestinationSignal: "AtbTransmitter",
              destinationSignal: this.AtbTransmitter,
              isActive,
            },
          ];
        }
        throw new Error(
          `${second} is not a valid AtbReceiver input for ${this.name}.`,
        );
      case "AtbTransmitter":
        const enabledReceivers: number[] = await this.getEnabledAtbReceivers();
        return Object.entries(this.AtbReceivers).map(
          ([receiverNumber, receiverSignal]) => ({
            sourceSignal: this.AtbTransmitter,
            componentSourceSignal: signal,
            componentDestinationSignal: `AtbReceivers.${receiverNumber}`,
            destinationSignal: receiverSignal,
            isActive: enabledReceivers.includes(parseInt(receiverNumber, 10)),
          }),
        );
    }

    throw new Error(`Unknown signal ${signal} for ${this.name}.`);
  }

  public async enableAtbReceiver(index: number): Promise<void> {
    // TODO: Validate index range against info from data model

    await this.writeRegister(atbFunnel.FUNNELCONTROL, { [`ENS${index}`]: 1 });
  }

  public async disableAtbReceiver(index: number): Promise<void> {
    // TODO: Validate index range against info from data model

    await this.writeRegister(atbFunnel.FUNNELCONTROL, { [`ENS${index}`]: 0 });
  }

  public async isAtbReceiverEnabled(index: number): Promise<boolean> {
    // TODO: Validate index range against info from data model

    const funnelControl = await this.readRegister(atbFunnel.FUNNELCONTROL);
    return funnelControl[`ENS${index}`] === 1;
  }

  public async getEnabledAtbReceivers(): Promise<number[]> {
    const enabledReceivers: number[] = [];
    const funnelControl = await this.readRegister(atbFunnel.FUNNELCONTROL);
    for (let i = 0; i < 8; i++) {
      if (funnelControl[`ENS${i}`] === 1) {
        enabledReceivers.push(i);
      }
    }
    return enabledReceivers;
  }
}

export namespace atbFunnel {
  export const enum REG {
    FUNNELCONTROL = 0x000,
    PRIORITYCONTROL = 0x004,
  }

  export const FUNNELCONTROL: RegisterDescription = {
    address: REG.FUNNELCONTROL,
    fields: {
      ENS0: [0, 1],
      ENS1: [1, 1],
      ENS2: [2, 1],
      ENS3: [3, 1],
      ENS4: [4, 1],
      ENS5: [5, 1],
      ENS6: [6, 1],
      ENS7: [7, 1],
      HT: [8, 4],
      FLUSH_NORMAL: [12, 1],
    },
  };

  export const PRIORITYCONTROL: RegisterDescription = {
    address: REG.PRIORITYCONTROL,
    fields: {
      PRIPORT0: [0, 3],
      PRIPORT1: [3, 3],
      PRIPORT2: [6, 3],
      PRIPORT3: [9, 3],
      PRIPORT4: [12, 3],
      PRIPORT5: [15, 3],
      PRIPORT6: [18, 3],
      PRIPORT7: [21, 3],
    },
  };
}
