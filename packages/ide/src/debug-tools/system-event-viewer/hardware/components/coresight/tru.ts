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
 * This class allows interaction with ADIP TRU, which provides a generic, flexible,
 * and scalable solution for simple system level sequence control.
 *
 */
export class Tru extends coresight.Component implements SoCTraceComponent {
  readonly InputTriggers: Record<number, string>;
  readonly OutputTriggers: Record<number, string>;
  readonly type: string;
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
    this.InputTriggers = socTraceInfo.InputTriggers;
    this.OutputTriggers = socTraceInfo.OutputTriggers;
  }

  /**
   * Connect an input trigger to an output trigger. The connection is
   * established by writing the master trigger index to the slave trigger's SSR register.
   * Take into consideration that input implies master and output implies slave.
   *
   * @param input The name of the input trigger.
   * @param output The name of the output trigger.
   */
  async connect(input: string, output: string): Promise<void> {
    const masterIndex = this.parseStrictSignalIndex(input, "InputTriggers");
    if (masterIndex === 0) {
      throw new Error(
        `Cannot connect to InputTriggers.0: master index 0 is reserved by hardware as the "disconnected" state`,
      );
    }
    const slaveIndex = this.parseStrictSignalIndex(output, "OutputTriggers");
    await this.enableTru();
    await this.linkSlave2Master(slaveIndex, masterIndex);
  }

  /**
   * Disconnect an input trigger from an output trigger.
   * The connection is removed by writing 0 to the slave trigger's SSR register.
   * @param input The name of the input trigger.
   * @param output The name of the output trigger.
   */
  async disconnect(input: string, output: string): Promise<void> {
    const masterIndex = this.parseStrictSignalIndex(input, "InputTriggers");
    const slaveIndex = this.parseStrictSignalIndex(output, "OutputTriggers");

    if (masterIndex === 0) {
      throw new Error(
        `Cannot disconnect from InputTriggers.0: master index 0 is reserved by hardware as the "disconnected" state`,
      );
    }

    const currentMaster = await this.getSlaveToMasterLink(slaveIndex);
    if (currentMaster !== masterIndex) {
      const linkStatus =
        currentMaster === undefined
          ? "not currently linked to any input"
          : `linked to ${this.InputTriggers[currentMaster] ?? currentMaster}`;
      throw new Error(
        `Cannot disconnect ${input} from ${output}: output is ${linkStatus}, not the requested input.`,
      );
    }
    await this.linkSlave2Master(slaveIndex, undefined);
  }

  /**
   * Link a slave trigger to a master trigger. writing the master index to the slave's
   * SSR register establishes the connection, writing 0 disconnects it.
   * @param slaveIndex Index of the slave trigger.
   * @param masterIndex Index of the master trigger, or undefined to disconnect.
   */
  private async linkSlave2Master(
    slaveIndex: number,
    masterIndex: number | undefined,
  ): Promise<void> {
    const ssrValue = masterIndex === undefined ? 0 : masterIndex;
    await this.writeRegister(tru.makeSSR(slaveIndex), { SSR: ssrValue });
  }

  /**
   * Validate and parse a strict numeric signal index.
   * @param raw The raw index string to parse (may be undefined if signal format is invalid).
   * @param expectedPrefix The expected prefix for the signal (either "InputTriggers" or "OutputTriggers").
   * @returns The parsed numeric index.
   * @throws Error if raw is undefined/empty or if the index is not a valid non-negative integer.
   */
  private parseStrictSignalIndex(
    signal: string,
    expectedPrefix: "InputTriggers" | "OutputTriggers",
  ): number {
    const [firstElem, secondElem] = signal.split(/\.(.*)/);
    let signalMap;
    if (expectedPrefix === "InputTriggers") {
      signalMap = this.InputTriggers;
    } else {
      signalMap = this.OutputTriggers;
    }
    if (firstElem !== expectedPrefix) {
      throw new Error(
        `Invalid signal "${signal}": expected prefix "${expectedPrefix}"`,
      );
    }

    if (!secondElem) {
      throw new Error(
        `Invalid signal format "${signal}": missing or empty index`,
      );
    }
    if (!/^[0-9]+$/.test(secondElem)) {
      throw new Error(
        `Invalid signal index in "${signal}": index must be numeric`,
      );
    }

    if (!(Number(secondElem) in signalMap)) {
      throw new Error(`Invalid signal "${signal}" for component ${this.name}`);
    }

    return Number(secondElem);
  }

  /**
   * Check if a slave trigger is linked to a master trigger.
   * @param slaveIndex Index of the slave trigger.
   * @returns The index of the master trigger the slave is linked to, or undefined if it is not linked.
   */
  private async getSlaveToMasterLink(
    slaveIndex: number,
  ): Promise<number | undefined> {
    const reg = await this.readRegister(tru.makeSSR(slaveIndex));
    if (reg.SSR === 0) {
      return undefined; // No master linked to this slave
    }
    return reg.SSR;
  }

  /**
   * Enable the TRU, allowing it to propagate triggers from the input to the output.
   * The TRU should be enabled after establishing the connections and before triggering.
   * @returns A promise that resolves when the TRU has been enabled.
   */
  public async enableTru(): Promise<void> {
    await this.writeRegister(tru.GCTL, { EN: 1 });
  }
  /** Disable the TRU, preventing it from propagating triggers from the input to the output.
   * This can be used to prevent triggering while changing the connections or to save power
   * when the TRU is not needed.
   */
  public async disableTru(): Promise<void> {
    await this.writeRegister(tru.GCTL, { EN: 0 });
  }
  /**
   * Generate a trigger by writing to the MTR register. The connection between the master
   * and slave should be established before triggering. This puts the master index on the MTR,
   * if the SSR[X] is configured to link the master to the slave, the trigger will be propagated
   * to the output trigger linked to the master.
   * @param masterIndex
   */
  public async generateTrigger(masterIndex: number): Promise<void> {
    if (!Number.isInteger(masterIndex)) {
      throw new Error(`masterIndex must be an integer, got ${masterIndex}`);
    }
    if (masterIndex <= 0 || masterIndex > tru.MAX_SSR_INDEX) {
      throw new Error(
        `masterIndex must be within [1, ${tru.MAX_SSR_INDEX}], got ${masterIndex}`,
      );
    }
    await this.writeRegister(tru.MTR, { MTR0: masterIndex });
  }

  /**
   * Get the configured SSR field value for each output trigger.
   * This is used to determine the current connections between input and output triggers.
   * Each returned value is the 8-bit SSR field (bits [7:0]); a value of `undefined` indicates
   * that no input trigger is linked to that output trigger.
   * @returns A record mapping output trigger indices to their 8-bit SSR field value.
   */
  public async getTriggerConnections(): Promise<
    Record<number, number | undefined>
  > {
    const outputTriggerIndices = Object.keys(this.OutputTriggers).map((k) =>
      Number(k),
    );

    if (outputTriggerIndices.length === 0) {
      throw new Error(
        `TRU ${this.name} has no output triggers, cannot read SSR registers`,
      );
    }

    const firstOutputIndex = Math.min(...outputTriggerIndices);
    const lastOutputIndex = Math.max(...outputTriggerIndices);

    const memToRead = (lastOutputIndex - firstOutputIndex + 1) * 4;
    const firstSsrAddress = tru.makeSSR(firstOutputIndex).address;
    const readMem = await this.readMemory(firstSsrAddress, memToRead);

    const connections: Record<number, number | undefined> = {};
    outputTriggerIndices.forEach((outputIndex) => {
      const offset = (outputIndex - firstOutputIndex) * 4;
      if (offset >= 0 && offset < readMem.data.length) {
        const ssrValue = readMem.data.readUInt32LE(offset);
        // eslint-disable-next-line no-bitwise
        const linkedIndex = ssrValue & 0xff;
        connections[outputIndex] = linkedIndex === 0 ? undefined : linkedIndex;
      }
    });
    return connections;
  }

  /**
   * Check if the TRU has reported any errors by reading the STAT register.
   * If an error is reported, an exception is thrown with the appropriate error message.
   */
  public async checkErrors(): Promise<void> {
    const status = await this.readRegister(tru.STAT);
    const lwerr = !!status.LWERR;
    const addrerr = !!status.ADDRERR;

    if (lwerr) {
      throw new Error(`TRU ${this.name} reports a link error`);
    }
    if (addrerr) {
      throw new Error(`TRU ${this.name} reports an address error`);
    }
  }

  /**
   * Validates that the hardware matches the supported TRU variant.
   * Comparisons are made against extracted field values returned by readRegister,
   * not against the raw ID register word.
   * Expected extracted values:
   * SCHEMA_ID = 0x2
   * IP_ID = 0x22c
   * FLAVOR_ID = 0x0
   * For reference, these values correspond to a raw ID register word of 0x000008B2.
   * @returns True if the hardware is a supported TRU variant, false otherwise.
   */
  public async isValidHardware(): Promise<boolean> {
    const id = await this.readRegister(tru.ID);
    return id.IP_ID === 0x22c && id.SCHEMA_ID === 0x2 && id.FLAVOR_ID === 0x0;
  }

  /**
   * Get the potential connections for a given signal. For input triggers, it returns the
   * output triggers that can be connected to it. For output triggers, it returns the input
   * triggers that can be connected to it. The active connection is determined by reading
   * the SSR register of the slave trigger and checking if it matches the master trigger index.
   * @param signal The name of the signal to get connections for. This should be in the
   * format "InputTriggers.X" or "OutputTriggers.X".
   * @returns An array of SoCTraceComponentConnection objects representing the
   * potential connections for the given signal.
   */
  public async getConnections(
    signal: string,
  ): Promise<SoCTraceComponentConnection[]> {
    const [first] = signal.split(/\.(.*)/);

    switch (first) {
      case "InputTriggers": {
        const ssrStatuses = await this.getTriggerConnections();
        const inputIndex = this.parseStrictSignalIndex(signal, "InputTriggers");
        if (!(inputIndex in this.InputTriggers)) {
          throw new Error(`Invalid input trigger "${signal}" for ${this.name}`);
        }
        if (inputIndex === 0) {
          throw new Error(
            `InputTriggers.0 is reserved by hardware as the "disconnected" state`,
          );
        }

        const connections: SoCTraceComponentConnection[] = [];

        for (const [outputIndex, outputSignal] of Object.entries(
          this.OutputTriggers,
        )) {
          const linkedInputIndex = ssrStatuses[Number(outputIndex)];
          if (
            linkedInputIndex !== undefined &&
            linkedInputIndex !== inputIndex
          ) {
            continue;
          }
          connections.push({
            sourceSignal: this.InputTriggers[inputIndex],
            componentSourceSignal: signal,
            componentDestinationSignal: `OutputTriggers.${outputIndex}`,
            destinationSignal: outputSignal,
            isActive: linkedInputIndex === inputIndex,
          });
        }

        return connections;
      }

      case "OutputTriggers": {
        const outputIndex = this.parseStrictSignalIndex(
          signal,
          "OutputTriggers",
        );
        if (!(outputIndex in this.OutputTriggers)) {
          throw new Error(
            `Invalid output trigger "${signal}" for ${this.name}`,
          );
        }

        const linkedInputIndex = await this.getSlaveToMasterLink(outputIndex);

        if (linkedInputIndex === undefined) {
          return Object.entries(this.InputTriggers).map(
            ([inputIndex, inputSignal]) => ({
              sourceSignal: this.OutputTriggers[outputIndex],
              componentSourceSignal: signal,
              componentDestinationSignal: `InputTriggers.${inputIndex}`,
              destinationSignal: inputSignal,
              isActive: false,
            }),
          );
        }

        const activeInputSignal = this.InputTriggers[linkedInputIndex];
        if (!activeInputSignal) {
          throw new Error(
            `Output trigger "${signal}" is linked to unknown input index ${linkedInputIndex} for ${this.name}`,
          );
        }

        return [
          {
            sourceSignal: this.OutputTriggers[outputIndex],
            componentSourceSignal: signal,
            componentDestinationSignal: `InputTriggers.${linkedInputIndex}`,
            destinationSignal: activeInputSignal,
            isActive: true,
          },
        ];
      }
    }

    throw new Error(`Unknown signal "${signal}" for ${this.name}`);
  }

  /** Check if the TRU is currently enabled by reading the GCTL register and checking the EN bit.
   * This indicates whether the TRU is actively propagating triggers from input to output.
   * @returns A promise that resolves to true if the TRU is enabled, false otherwise.
   */
  public async isEnabled(): Promise<boolean> {
    return this.readRegister(tru.GCTL).then((reg) => !!reg.EN);
  }

  public async cleanConnections(): Promise<void> {
    const outputTriggerIndices = Object.keys(this.OutputTriggers).map((k) =>
      Number(k),
    );

    if (outputTriggerIndices.length === 0) {
      throw new Error(
        `TRU ${this.name} has no output triggers, cannot read SSR registers`,
      );
    }
    const firstOutputIndex = Math.min(...outputTriggerIndices);
    const lastOutputIndex = Math.max(...outputTriggerIndices);
    const memToWrite = (lastOutputIndex - firstOutputIndex + 1) * 4;
    const firstSsrAddress = tru.makeSSR(firstOutputIndex).address;
    const zeroBuffer = Buffer.alloc(memToWrite, 0);
    await this.writeMemory(firstSsrAddress, zeroBuffer);
  }
}

export namespace tru {
  export const MAX_SSR_INDEX = 255;

  export const enum REG {
    SSR_BASE = 0x000,
    MTR = 0x7e0,
    ERRADDR = 0x7e8,
    STAT = 0x7ec,
    GCTL = 0x7f4,
    ID = 0x7f8,
    REV = 0x7fc,
    PROG_REV_IF = 0x800,
  }

  /**
   * Creates a register description for a SSR (Slave Trigger Status Register).
   * Assumes 4-byte aligned register offsets as per ADIP TRU specification.
   *
   * @param index SSR index [0-255]
   * @returns RegisterDescription with proper address calculation
   * @throws RangeError if index is outside valid range
   */
  export function makeSSR(index: number): RegisterDescription {
    if (index < 0 || index > MAX_SSR_INDEX) {
      throw new RangeError("SSR index must be within [0, 255]");
    }

    return {
      address: REG.SSR_BASE + index * 4,
      fields: {
        SSR: [0, 8],
        LOCK: [31, 1],
      },
    };
  }

  export const MTR: RegisterDescription = {
    address: REG.MTR,
    fields: {
      MTR0: [0, 8],
      MTR1: [8, 8],
      MTR2: [16, 8],
      MTR3: [24, 8],
    },
  };

  export const ERRADDR: RegisterDescription = {
    address: REG.ERRADDR,
    fields: {
      ADDR: [0, 12],
    },
  };

  export const STAT: RegisterDescription = {
    address: REG.STAT,
    fields: {
      LWERR: [0, 1],
      ADDRERR: [1, 1],
    },
  };

  export const GCTL: RegisterDescription = {
    address: REG.GCTL,
    fields: {
      EN: [0, 1],
      RESET: [1, 1],
      MTRL: [2, 1],
      LOCK: [31, 1],
    },
  };

  export const ID: RegisterDescription = {
    address: REG.ID,
    fields: {
      SCHEMA_ID: [0, 2],
      IP_ID: [2, 10],
      FLAVOR_ID: [12, 4],
    },
  };

  export const REV: RegisterDescription = {
    address: REG.REV,
    fields: {
      MAJOR_REV: [0, 8],
      MINOR_REV: [8, 4],
      TRIVIAL_REV: [12, 4],
    },
  };

  export const PROG_REV_IF: RegisterDescription = {
    address: REG.PROG_REV_IF,
    fields: {
      PROG_REV_IF: [0, 16],
    },
  };
}
