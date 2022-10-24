/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import type {Configdata} from '../types/configdata.js';
import type {
  Soc,
  SocPeripheral,
  SocRegisterField
} from '../types/soc.js';

import {
  INDENTATION,
  PIN_INIT_FUNCTION_SIGNATURE,
  SOC_INIT_FILENAME,
  getHFileLines,
  sortGpioPortArrayInAscendingOrder
} from './utils.js';

/* Hide baremetal code generator. */

/**
 * Exports configuration choices as a baremetal C program
 * @param {Configdata} configdata - the configuration choices object
 * @param {Soc} soc - the SoC data model
 * @returns {object<string, string[]>} The baremetal C and header files (as arrays of code lines), indexed by file name
 */
export function exportBaremetal(configdata: Configdata, soc: Soc) {
  // index SoC pins by id for easy lookup
  const pins = toObject(
    soc.Packages[0].Pins.map((pin) => ({
      ...pin,
      signals: toObject(pin.Signals, 'Peripheral', 'Name')
    })),
    'Name'
  );

  // index SoC registers by name
  const regs = toObject(
    soc.Registers.map((reg) => ({
      ...reg,
      fields: toObject(reg.Fields, 'Name')
    })),
    'Name'
  );

  const cLines: string[] = []; // lines of .c file code

  // names of registers used in the generated code
  const usedRegisters: Record<string, true> = {};
  const gpioInstanceNames: Array<string> = [];

  // process configured pins one by one, in order
  for (const cp of configdata.Pins) {
    const pin = pins[cp.Pin];

    if (!gpioInstanceNames.includes(`${pin.GPIOName}`)) {
      gpioInstanceNames.push(`${pin.GPIOName}`);
    }

    sortGpioPortArrayInAscendingOrder(gpioInstanceNames);

    // pin is muxable
    if (pin.signals) {
      const pinSignal = pin.signals[cp.Peripheral + '@' + cp.Signal];

      cLines.push(
        `/* ${pin.Label} (${pin.Name}): assigned to ${cp.Peripheral}_${cp.Signal} */`
      );

      for (const cfg of pinSignal.PinMuxConfig) {
        const reg = regs[cfg.Register];
        const field = reg.fields[cfg.Field];

        cLines.push(
          updateRegister(
            reg.Name,
            field.Position,
            field.Length,
            cfg.Value,
            cfg.Operation
          )
        );
        usedRegisters[reg.Name] = true;
      }

      cLines.push('');

      // pin is configured
      if (cp.Config) {
        // process controls in order
        for (const control of soc.Controls.PinConfig) {
          if (!Object.hasOwn(cp.Config, control.Id)) {
            continue;
          }

          const valueId = cp.Config[control.Id];
          const value = control.EnumValues?.find(
            (value) => value.Id === valueId
          );

          if (!value) {
            throw new Error(
              `Invalid value "${valueId}" for control "${control.Id}"`
            );
          }

          cLines.push(
            `/* ${pin.Label} (${pin.Name}): ${control.Description} = ${value.Description} */`
          );

          for (const cfg of pinSignal.PinConfig[control.Id][
            valueId
          ]) {
            if (cfg.Operation === 'WithPrevious') {
              throw new Error(
                'WithPrevious operation is not handled yet!'
              );
            }

            const reg = regs[cfg.Register];
            const field = reg.fields[cfg.Field];

            cLines.push(
              updateRegister(
                reg.Name,
                field.Position,
                field.Length,
                cfg.Value,
                cfg.Operation
              )
            );
            usedRegisters[reg.Name] = true;
          }

          cLines.push('');
        }
      }
    }
  }

  const initializedGpioPorts = initializeGpioPorts(
    soc.Peripherals,
    gpioInstanceNames,
    regs,
    usedRegisters
  );

  // for register macros alignment
  const maxRegLength = Math.max(
    ...Object.keys(usedRegisters).map((regName) => regName.length)
  );

  const registerMacroLines = Object.keys(usedRegisters)
    .sort()
    .map(
      (regName) =>
        `#define REG_${regName}${' '.repeat(maxRegLength - regName.length)} (*(volatile uint${regs[regName].Size}_t *)${regs[regName].Address})`
    );

  const topCommentLines = [
    '/**',
    ` * Configuration for ${soc.Name}-${soc.Packages[0].Name}`,
    ' *',
    ' * This file was generated using Analog Devices CodeFusion Studio.',
    ' * https://github.com/analogdevicesinc/codefusion-studio',
    ' *',
    ` * Generated at: ${new Date().toISOString()}`,
    ` * Generated with: ${process.argv.join(' ')}`,
    ' *',
    ' * SPDX-License-Identifier: Apache-2.0',
    ` * Copyright (c) ${new Date().getFullYear()} Analog Devices, Inc.`,
    ' */',
    ''
  ];

  const hFileName = `${soc.Name}_${SOC_INIT_FILENAME}.h`;
  const cFileName = `${soc.Name}_${SOC_INIT_FILENAME}.c`;

  const hFileLines = getHFileLines(topCommentLines);

  const pinInitializationLines = [];

  if (configdata.Pins.length > 0) {
    pinInitializationLines.push(
      ...initializedGpioPorts,
      '',
      ...cLines.slice(0, -1).map((line) => (line ? `  ${line}` : ''))
    );
  } else {
    pinInitializationLines.push(' /* No pins to configure. */');
  }

  const cFileLines = [
    ...topCommentLines,
    `#include "${hFileName}"`,
    '',
    ...registerMacroLines,
    '',
    `${PIN_INIT_FUNCTION_SIGNATURE} {`,
    ...pinInitializationLines,
    '}'
  ];

  return {
    [cFileName]: cFileLines,
    [hFileName]: hFileLines
  };
}

// converts an array to an object
function toObject<Type, Key extends keyof Type>(
  array: Type[],
  ...keys: Key[]
): Record<string, Type> {
  const buildKey = (item: Type) =>
    keys.map((key) => item[key]).join('@');
  const entries = array.map((item: Type) => [buildKey(item), item]);

  return Object.fromEntries(entries);
}

// generates a C code line for updating a register
/* eslint-disable-next-line max-params */
function updateRegister(
  regName: string,
  pos: number,
  len: number,
  value: number,
  operation?: string
) {
  const effectiveOperation = operation || 'Write';
  const mask = (1 << len) - 1;
  const set = value;
  const clr = mask - value;

  const R = `REG_${regName}`;

  switch (effectiveOperation) {
    case 'Write': {
      if (value > mask) {
        throw new Error(
          `Value 0x${value.toString(16)} is greater than the maximum 0x${mask.toString(16)} that can fit in register ${regName}[${pos}:${pos - len - 1}] (${len} bits).`
        );
      }

      if (set === 0) {
        return `${R} &= ~${encode(clr, len, pos)};`;
      }

      if (clr === 0) {
        return `${R} |= ${encode(set, len, pos)};`;
      }

      return `${R} = (${R} & ~${encode(clr, len, pos)}) | ${encode(set, len, pos)};`;
    }

    case 'Read': {
      return `${R};`;
    }

    case 'Poll': {
      const pollMask = encode(mask, len, pos);
      const pollValue = encode(value, len, pos);

      return `while ((${R} & ${pollMask}) != ${pollValue}) { /* Continue polling until register field value matches. */ }`;
    }

    default: {
      throw new Error(`Unsupported operation: ${operation}`);
    }
  }
}

// encodes a number value as an unsigned int literal (if less than 4)
// or a hexadecimal literal (if equal or greater than 4)
// shifted to the left with the provided number of bits
function encode(value: number, len: number, pos: number) {
  const formattedValue =
    value <= 3 ? `${value}u` : `0x${value.toString(16)}`;

  return pos > 0 ? `(${formattedValue} << ${pos})` : formattedValue;
}

function initializeGpioPorts(
  peripherals: SocPeripheral[],
  gpioInstanceNames: Array<string>,
  registers: Record<
    string,
    {
      fields: Record<string, SocRegisterField>;
      Name: string;
      Description: string;
      Address: string;
      Size: number;
      Fields: SocRegisterField[];
    }
  >,
  usedRegisters: Record<string, true>
) {
  const arrayWithGpioRegisters: Array<string> = [
    `${INDENTATION}/* Initialize all the GPIO Ports used: ${gpioInstanceNames.join(', ')} */`
  ];

  for (const gpioName of gpioInstanceNames) {
    const peripheral = peripherals.find(
      (peripheral) => peripheral.Name === gpioName
    );

    if (peripheral && peripheral.Initialization) {
      const portInialization = peripheral.Initialization[0];
      const reg = registers[portInialization.Register];
      const field = reg.fields[portInialization.Field];

      arrayWithGpioRegisters.push(
        INDENTATION +
          updateRegister(
            reg.Name,
            field.Position,
            field.Length,
            portInialization.Value,
            portInialization.Operation
          )
      );

      if (!usedRegisters[reg.Name]) {
        usedRegisters[reg.Name] = true;
      }
    }
  }

  return arrayWithGpioRegisters;
}
