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

import type { SocTraceComponentInfo } from "cfs-types";
import {
  CfsDebugManager,
  MemoryData,
  RegisterDescription,
} from "../../../../debug-manager";

export namespace coresight {
  /**
   * Register set defined by Arm CoreSight Architecture Specification v3.0.
   * More information can be found on
   * https://developer.arm.com/documentation/ihi0029/latest/
   */
  export const enum REG {
    ITCTRL = 0xf00,
    CLAIMSET = 0xfa0,
    CLAIMCLR = 0xfa4,
    LAR = 0xfb0,
    LSR = 0xfb4,
    AUTHSTATUS = 0xfb8,
    DEVARCH = 0xfbc,
    DEVID = 0xfc8,
    DEVTYPE = 0xfcc,
    PIDR0 = 0xfe0,
    PIDR1 = 0xfe4,
    PIDR2 = 0xfe8,
    PIDR3 = 0xfec,
    PIDR4 = 0xfd0,
    CIDR0 = 0xff0,
    CIDR1 = 0xff4,
    CIDR2 = 0xff8,
    CIDR3 = 0xffc,
  }

  export const ITCTRL: RegisterDescription = {
    address: REG.ITCTRL,
    fields: {
      IME: [0, 1],
    },
  };

  export const CLAIMSET: RegisterDescription = {
    address: REG.CLAIMSET,
    fields: {
      SET: [0, 32], // bit width is dependant. Check documentation.
    },
  };

  export const CLAIMCLR: RegisterDescription = {
    address: REG.CLAIMCLR,
    fields: {
      CLR: [0, 32], // bit width is dependant. Check documentation.
    },
  };

  export const LAR: RegisterDescription = {
    address: REG.LAR,
    fields: {
      KEY: [0, 32],
    },
  };

  export const LSR: RegisterDescription = {
    address: REG.LSR,
    fields: {
      SLI: [0, 1],
      SLK: [1, 1],
      nTT: [2, 1],
    },
  };

  export const AUTHSTATUS: RegisterDescription = {
    address: REG.AUTHSTATUS,
    fields: {
      NSID: [0, 2],
      NSNID: [2, 2],
      SID: [4, 2],
      SNID: [6, 2],
    },
  };

  export const DEVARCH: RegisterDescription = {
    address: REG.DEVARCH,
    fields: {
      ARCHID: [0, 16],
      REVISION: [16, 4],
      PRESENT: [20, 1],
      ARCHITECT: [21, 11],
    },
  };

  export const DEVTYPE: RegisterDescription = {
    address: REG.DEVTYPE,
    fields: {
      MAJOR: [0, 4],
      SUB: [4, 4],
    },
  };

  export const PIDR0: RegisterDescription = {
    address: REG.PIDR0,
    fields: {
      PART_0: [0, 8],
    },
  };

  export const PIDR1: RegisterDescription = {
    address: REG.PIDR1,
    fields: {
      PART_1: [0, 4],
      DES_0: [4, 4],
    },
  };

  export const PIDR2: RegisterDescription = {
    address: REG.PIDR2,
    fields: {
      DES_1: [0, 3],
      JEDEC: [3, 1],
      REVISION: [4, 4],
    },
  };

  export const PIDR3: RegisterDescription = {
    address: REG.PIDR3,
    fields: {
      CMOD: [0, 4],
      REVAND: [4, 4],
    },
  };

  export const PIDR4: RegisterDescription = {
    address: REG.PIDR4,
    fields: {
      DES_2: [0, 4],
      SIZE: [4, 4],
    },
  };

  export const CIDR0: RegisterDescription = {
    address: REG.CIDR0,
    fields: {
      PRMBL_0: [0, 8],
    },
  };

  export const CIDR1: RegisterDescription = {
    address: REG.CIDR1,
    fields: {
      PRMBL_1: [0, 4],
      CLASS: [4, 4],
    },
  };

  export const CIDR2: RegisterDescription = {
    address: REG.CIDR2,
    fields: {
      PRMBL_2: [0, 8],
    },
  };

  export const CIDR3: RegisterDescription = {
    address: REG.CIDR3,
    fields: {
      PRMBL_3: [0, 8],
    },
  };

  export const enum Class {
    GenericVerificationComponent = 0x0,
    RomTable = 0x1,
    CoresightComponent = 0x9,
    PeripheralTestBlock = 0xb,
    GenericIpComponent = 0xe,
    Corelink = 0xf,
  }

  export interface ComponentID {
    preamble: number;
    class: Class;
  }

  export interface PeripheralID {
    revand: number;
    revision: number;
    cmod: number;
    part: number;
    jep106?: { identification: number; continuation: number };
  }

  export interface deviceArchitecture {
    archId: number;
    revision: number;
    architect: number;
  }

  export interface DeviceType {
    major: number;
    sub: number;
  }

  /**
   * This class provides generic functionality of a CoreSight component.
   * It is expected to be inherited by other classes representing
   * specific CoreSight components (e.g. ATB funnel, CTI, etc.).
   *
   * In order to interact with the hardware (i.e. perform register reads and write
   * operations), the current active debug session is used. In the future a more
   * complex API may be exposed to allow for more flexibility but that is waiting
   * for the right use case.
   */
  export class Component {
    private baseAddress: number;
    private apAddress: number | undefined = undefined;

    /**
     *
     * @param debugManager Debug manager used to read and write registers of the component.
     * @param socTraceInfo CoreSight component metadata. The component base address is derived
     *                     from `socTraceInfo.BaseAddress`, and the optional AP address is
     *                     derived from `socTraceInfo.ApAddress` when present.
     */
    constructor(
      private debugManager: CfsDebugManager,
      socTraceInfo: SocTraceComponentInfo,
    ) {
      this.baseAddress = parseInt(socTraceInfo.BaseAddress as string, 16);
      if (socTraceInfo.ApAddress !== undefined) {
        this.apAddress = parseInt(socTraceInfo.ApAddress as string, 16);
      }
    }

    /**
     * Wrapper on top of CfsDebugSession.readRegister that adds
     * the component base address to the register address.
     */
    readRegister(
      register: RegisterDescription,
    ): Promise<Record<string, number>> {
      const debugSession = this.debugManager.getActiveSession();
      if (debugSession === undefined) {
        throw new Error("No active debug session.");
      }
      return debugSession.readRegister({
        ...register,
        address: register.address + this.baseAddress,
        apAddress: this.apAddress,
      });
    }
    /**
     * Reads memory from the address space of this component.
     * The provided address is offset by the component's base address.
     *
     * @param address Memory address relative to component base address
     * @param count Number of bytes to read
     * @param offset Optional offset parameter (passed through to debug session).
     * Only supported for direct accesses, not AP accesses.
     * @returns Promise resolving to MemoryData containing the read bytes
     */
    readMemory(
      address: number,
      count: number,
      offset?: number,
    ): Promise<MemoryData> {
      const debugSession = this.debugManager.getActiveSession();
      if (debugSession === undefined) {
        throw new Error("No active debug session.");
      }
      if (this.apAddress !== undefined) {
        return debugSession.readMemoryAp(
          this.apAddress,
          address + this.baseAddress,
          count,
        );
      }
      return debugSession.readMemory(address + this.baseAddress, count, offset);
    }

    /**
     * Writes memory to the address space of this component.
     * The provided address is offset by the component's base address.
     *
     * @param address Memory address relative to component base address
     * @param data Buffer containing the data to write
     * @param offset Optional offset parameter (passed through to debug session).
     * Only supported for direct accesses, not AP accesses.
     * @returns Promise resolving when the write operation is complete
     */
    writeMemory(address: number, data: Buffer, offset?: number): Promise<void> {
      const debugSession = this.debugManager.getActiveSession();
      if (debugSession === undefined) {
        throw new Error("No active debug session.");
      }
      if (this.apAddress !== undefined) {
        return debugSession.writeMemoryAp(
          this.apAddress,
          address + this.baseAddress,
          data,
        );
      }
      return debugSession.writeMemory(address + this.baseAddress, data, offset);
    }

    /**
     * Wrapper on top of CfsDebugSession.writeRegister that adds
     * the component base address to the register address.
     * @param register RegisterDescription object containing register details
     * @param values Record containing the values to write to the register
     * @return Promise that resolves when the write operation is complete
     */
    protected writeRegister(
      register: RegisterDescription,
      values: Record<string, number>,
    ): Promise<void> {
      const debugSession = this.debugManager.getActiveSession();
      if (debugSession === undefined) {
        throw new Error("No active debug session.");
      }
      return debugSession.writeRegister(
        {
          ...register,
          address: register.address + this.baseAddress,
          apAddress: this.apAddress,
        },
        values,
      );
    }

    /**
     * Returns component ID information present on CIDR registers (preamble
     * and component class).
     *
     * @returns ComponentID object containing preamble and class information.
     */
    async componentID(): Promise<ComponentID> {
      const cid0 = await this.readRegister(CIDR0);
      const cid1 = await this.readRegister(CIDR1);
      const cid2 = await this.readRegister(CIDR2);
      const cid3 = await this.readRegister(CIDR3);

      return {
        preamble:
          /* eslint-disable no-bitwise */
          ((cid3.PRMBL_3 << 24) |
            (cid2.PRMBL_2 << 16) |
            (cid1.PRMBL_1 << 8) |
            cid0.PRMBL_0) >>>
          0, // Added >>> 0 to convert to unsigned
        /* eslint-enable no-bitwise */
        class: cid1.CLASS,
      };
    }

    /**
     * Returns peripheral ID information present on PIDR registers (revision,
     * part number, and optional JEP106 identification).
     *
     * @returns PeripheralID object.
     */
    async peripheralID(): Promise<PeripheralID> {
      const pid0 = await this.readRegister(PIDR0);
      const pid1 = await this.readRegister(PIDR1);
      const pid2 = await this.readRegister(PIDR2);
      const pid3 = await this.readRegister(PIDR3);
      const pid4 = await this.readRegister(PIDR4);

      return {
        revand: pid3.REVAND,
        revision: pid2.REVISION,
        cmod: pid3.CMOD,
        // eslint-disable-next-line no-bitwise
        part: pid0.PART_0 | (pid1.PART_1 << 8),
        jep106:
          pid2.JEDEC === 1
            ? {
                // eslint-disable-next-line no-bitwise
                identification: pid1.DES_0 | (pid2.DES_1 << 4),
                continuation: pid4.DES_2,
              }
            : undefined,
      };
    }

    /**
     * Returns device architecture information present on DEVARCH register.
     *
     * @returns DeviceArchitecture object or undefined if not present.
     */
    async deviceArchitecture(): Promise<deviceArchitecture | undefined> {
      const devArch = await this.readRegister(DEVARCH);

      return devArch.PRESENT
        ? {
            archId: devArch.ARCHID,
            revision: devArch.REVISION,
            architect: devArch.ARCHITECT,
          }
        : undefined;
    }

    /**
     * Returns device type information present on DEVTYPE register.
     *
     * This information can be used by subclasses to ensure they are
     * interacting with the expected component type.
     *
     * @returns DeviceType object.
     */
    async deviceType(): Promise<DeviceType> {
      const devType = await this.readRegister(DEVTYPE);

      return {
        major: devType.MAJOR,
        sub: devType.SUB,
      };
    }
    /**
     * Unlocks the component to allow access to secure registers and memory.
     * This is done by writing the unlock key (0xc5acce55) to the LAR register.
     * The component will remain unlocked until it is locked again or the debug session ends.
     *
     * @returns A promise that resolves when the unlock operation is complete.
     */
    async unlock(): Promise<void> {
      // Unlock the component by writing the unlock key to the LAR register.
      await this.writeRegister(coresight.LAR, {
        KEY: 0xc5acce55,
      });
    }

    /**
     * Locks the component, preventing access to secure registers and memory.
     * This is done by writing 0 to the LAR register.
     *
     * @returns A promise that resolves when the lock operation is complete.
     */
    async lock(): Promise<void> {
      // Lock the component by writing 0 to the LAR register.
      await this.writeRegister(coresight.LAR, {
        KEY: 0x0,
      });
    }

    /**
     * Checks if the component is currently locked.
     * Returns true if the software lock mechanism is implemented and the lock is active.
     *
     * @returns A promise that resolves to true if the component is locked, false otherwise.
     */
    async isLocked(): Promise<boolean> {
      const lsr = await this.readRegister(coresight.LSR);

      // Component is locked only if SLI indicates lock mechanism is implemented (1)
      // AND SLK indicates lock is active (1)
      return lsr.SLI === 1 && lsr.SLK === 1;
    }
  }
}
