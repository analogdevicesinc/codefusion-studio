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
import type {
  Configdata,
  ConfigdataClock
} from '../types/configdata.js';
import type {Soc, SocClock, SocControl} from '../types/soc.js';

import {
  CLOCK_INIT_FUNCTION_SIGNATURE,
  INDENTATION,
  PIN_INIT_FUNCTION_SIGNATURE,
  SOC_INIT_FILENAME,
  createOrderMapping,
  generateCLinesCodeForPinConfig,
  generatePinConfigCode,
  getTopCommentLines,
  groupClockNodesByName,
  sortGpioPortArrayInAscendingOrder,
  splitAndIndent
} from './utils.js';

// If the MXC_ APIs return an error code, assume we assign to this variable.
const RESULT_VAR = 'result';

/**
 * Exports configuration choices as a MSDK C program
 * @param {Configdata} configdata - the configuration choices object
 * @param {Soc} soc - the SoC data model
 * @returns {object<string, string[]>} The MSDK C file (as array of code lines), indexed by file name
 */
// eslint-disable-next-line complexity
export function exportMsdk(configdata: Configdata, soc: Soc) {
  let checksErrorCode: boolean = false;

  // index SoC pins by id for easy lookup
  const pins = toObject(
    soc.Packages[0].Pins.map((pin) => ({
      ...pin,
      signals: toObject(pin.Signals, 'Peripheral', 'Name')
    })),
    'Name'
  );

  const clocks = toObject(
    soc.ClockNodes.map((clock) => ({
      ...clock
    })),
    'Name'
  );

  const cLinesPinConfig: string[] = []; // lines of .c file code for pins
  let cLinesClockNodes: string[] = []; // lines of .c file code for clocks

  const gpioUsedPortsArray: Array<string> = [];
  const msdkHeaders = new Set<string>();
  const epilogs = new Set<string>();

  // process configured pins one by one, in order
  for (const configuredPin of configdata.Pins) {
    const pin = pins[configuredPin.Pin];
    cLinesPinConfig.push(
      ...generatePinConfigCode(
        configuredPin,
        pin,
        soc,
        gpioUsedPortsArray
      )
    );
  }

  if (
    soc.ClockNodes.length === 0 ||
    !configdata.ClockNodes ||
    !configdata.ClockNodes.some((cn) => cn.Enabled) ||
    configdata.ClockNodes.length === 0
  ) {
    cLinesClockNodes.push(
      INDENTATION + '/* Clock configuration in default state. */',
      '',
      INDENTATION + 'return E_NO_ERROR;',
      '}'
    );
  } else {
    const configuredClockNodes = groupClockNodesByName(
      configdata.ClockNodes
    );

    const referenceOrderToProcess = Object.keys(clocks);
    const keysOrderMapping = createOrderMapping(
      referenceOrderToProcess
    );

    const sortedKeys = Object.keys(configuredClockNodes).sort(
      (a, b) => keysOrderMapping[a] - keysOrderMapping[b]
    );

    // process the clocks in the order from the data model
    for (const key of sortedKeys) {
      const clock = clocks[key];

      if (clock.ConfigProgrammingOrder) {
        const configProgrammingOrderMapping = createOrderMapping(
          clock.ConfigProgrammingOrder
        );

        // process the clocknode is emitted in the order given by ConfigProgrammingOrder
        configuredClockNodes[key].sort(
          (a, b) =>
            configProgrammingOrderMapping[a.Control] -
            configProgrammingOrderMapping[b.Control]
        );

        for (const clockConfig of configuredClockNodes[key]) {
          const clockControlDefinition =
            soc.Controls.ClockConfig.find(
              (item) => item.Id === clockConfig.Control
            );

          let code = null;

          // handle "integer" controls
          if (
            clockControlDefinition?.Type === 'integer' &&
            clock.ConfigMSDK?.[clockConfig.Control] &&
            Object.keys(clock.ConfigMSDK?.[clockConfig.Control])[0]
          ) {
            code = formatCodeTemplateAndHeaders(
              clockConfig,
              clock,
              msdkHeaders
            );
          } else if (
            clock.ConfigMSDK?.[clockConfig.Control]?.[
              clockConfig.Value
            ]
          ) {
            code = clock.ConfigMSDK?.[clockConfig.Control][
              clockConfig.Value
            ].Code as string;

            const headers: Array<string> = clock.ConfigMSDK?.[
              clockConfig.Control
            ][clockConfig.Value]?.Headers as Array<string>;
            if (headers) {
              for (const header of headers)
                msdkHeaders.add(`#include <${header}>`);
            }
          }

          const epilog = clock.ConfigMSDK?.[clockConfig.Control][
            clockConfig.Value
          ]?.Epilog as string;
          if (epilog) {
            epilogs.add(epilog);
          }

          if (code) {
            if (code.includes(RESULT_VAR)) {
              checksErrorCode = true;
            }

            cLinesClockNodes.push(
              generateComment(
                key,
                clockControlDefinition,
                clockConfig.Value
              ),
              ...splitAndIndent(code, INDENTATION, 1),
              ''
            );
          }
        }
      }
    }

    // Emit any epilog code.
    if (epilogs.size > 0) {
      cLinesClockNodes.push(
        INDENTATION +
          '/* Lock the clock configuration for enabled peripherals. */'
      );

      for (const epilog of [...epilogs].sort()) {
        cLinesClockNodes.push(INDENTATION + `${epilog}`);
      }

      cLinesClockNodes.push('');
    }

    cLinesClockNodes.push(INDENTATION + 'return E_NO_ERROR;', '}');
  }

  cLinesClockNodes = checksErrorCode
    ? [
        '',
        `${CLOCK_INIT_FUNCTION_SIGNATURE} {`,
        INDENTATION + `int ${RESULT_VAR};`,
        '',
        ...cLinesClockNodes
      ]
    : ['', `${CLOCK_INIT_FUNCTION_SIGNATURE} {`, ...cLinesClockNodes];

  sortGpioPortArrayInAscendingOrder(gpioUsedPortsArray);

  const topCommentLines = getTopCommentLines(
    soc.Name,
    soc.Packages[0].Name
  );

  const cFileName = `${soc.Name}_${SOC_INIT_FILENAME}.c`;

  const cLinesCodeForPinConfig = generateCLinesCodeForPinConfig(
    gpioUsedPortsArray,
    cLinesPinConfig,
    configdata.Pins.length
  );

  const cFileLines = [
    ...topCommentLines,
    '#include <mxc_device.h>',
    ...msdkHeaders,
    '',
    '/* Prototypes for functions in this file. */',
    `${PIN_INIT_FUNCTION_SIGNATURE};`,
    `${CLOCK_INIT_FUNCTION_SIGNATURE};`,
    '',
    ...cLinesCodeForPinConfig,
    ...cLinesClockNodes
  ];

  return {
    [cFileName]: cFileLines
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

function generateComment(
  clockNodeName: string,
  clockControl?: SocControl,
  value?: string
) {
  if (!clockControl) {
    return '';
  }

  if (clockControl.Type === 'enum') {
    const enumValue = clockControl.EnumValues?.find(
      (item) => item.Id === value
    );

    return `${INDENTATION}/* ${clockNodeName}: ${clockControl.Description} is set to ${enumValue?.Description}. */`;
  }

  return `${INDENTATION}/* ${clockNodeName}: ${clockControl.Description}. */`;
}

function formatCodeTemplateAndHeaders(
  clockConfig: ConfigdataClock,
  clock: SocClock,
  msdkHeaders: Set<string>
): null | string {
  if (clock.ConfigMSDK) {
    const valueKey = Object.keys(
      clock.ConfigMSDK[clockConfig.Control]
    )[0];
    const codeTemplate =
      clock.ConfigMSDK[clockConfig.Control][valueKey]?.Code;

    for (const header of clock.ConfigMSDK[clockConfig.Control][
      valueKey
    ]?.Headers as Array<string>)
      msdkHeaders.add(`#include <${header}>`);

    return codeTemplate
      ? (codeTemplate as string).replace('#VALUE#', clockConfig.Value)
      : null;
  }

  return null;
}
