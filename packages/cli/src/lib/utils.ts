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
import {Eta} from "eta";
import path from 'node:path';

import {ConfigdataClock, ConfigdataPin} from '../types/configdata.js';
import {Soc, SocPinSignal} from '../types/soc.js';

export const INDENTATION = '  ';
export const PIN_INIT_FUNCTION_SIGNATURE = 'int PinInit(void)';
export const CLOCK_INIT_FUNCTION_SIGNATURE = 'int ClockInit(void)';
export const SOC_INIT_FILENAME = 'soc_init';

const GPIO_PAD = 'MXC_GPIO_PAD_';
const GPIO_VSSEL = 'MXC_GPIO_VSSEL_';
const GPIO_DRVSTR = 'MXC_GPIO_DRVSTR_';
const GPIO_PORT = 'MXC_GPIO_PORT_';

export function getTopCommentLines(
  socName: string,
  socPackageName: string
) {
  const topCommentLines = [
    '/**',
    ` * Configuration for ${socName}-${socPackageName}`,
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

  return topCommentLines;
}

export function sortGpioPortArrayInAscendingOrder(
  gpioPortArray: Array<string>
) {
  gpioPortArray.sort((a, b) => {
    const matchA = a.match(/\d+$/);
    const matchB = b.match(/\d+$/);

    const numA = matchA ? Number.parseInt(matchA[0], 10) : 0;
    const numB = matchB ? Number.parseInt(matchB[0], 10) : 0;

    return numA - numB;
  });
}

export function getHFileLines(topCommentLines: string[]) {
  return [
    ...topCommentLines,
    `${PIN_INIT_FUNCTION_SIGNATURE};`,
    `${CLOCK_INIT_FUNCTION_SIGNATURE};`
  ];
}

export function generateCLinesCodeForPinConfig(
  gpioUsedPortsArray: string[],
  cLinesPinConfig: string[],
  configuredPinLength: number
) {
  const gpioInitializationLines = [];

  if (configuredPinLength) {
    gpioInitializationLines.push(
      INDENTATION + 'int result;',
      '',
      INDENTATION + '/* Initialize all the used GPIO Ports. */',
      INDENTATION +
        `result = MXC_GPIO_Init(${gpioUsedPortsArray.join(' | ')});`,
      INDENTATION + 'if (result != E_NO_ERROR) {',
      INDENTATION.repeat(2) + 'return result;',
      INDENTATION + '}',
      '',
      INDENTATION +
        'MXC_GPIO_SetConfigLock(MXC_GPIO_CONFIG_UNLOCKED);'
    );
  } else {
    gpioInitializationLines.push(
      INDENTATION + '/* Pin configuration in default state. */'
    );
  }

  return [
    `${PIN_INIT_FUNCTION_SIGNATURE} {`,
    ...gpioInitializationLines,
    ...cLinesPinConfig
      .slice(0, -1)
      .map((line) => (line ? `  ${line}` : '')),
    '',
    INDENTATION + 'MXC_GPIO_SetConfigLock(MXC_GPIO_CONFIG_LOCKED);',
    '',
    INDENTATION + 'return E_NO_ERROR;',
    '}'
  ];
}

function getDefaultConfigValues() {
  return {
    PS: INDENTATION + `${GPIO_PAD}NONE,`,
    PWR: INDENTATION + `${GPIO_VSSEL}VDDIO,`,
    DS: INDENTATION + `${GPIO_DRVSTR}0`
  };
}

function computeGpioFunc(
  pinSignal: SocPinSignal,
  config: Record<string, string>
) {
  let functionName;
  if (pinSignal.PinMuxSlot === 0) {
    functionName =
      config && Object.keys(config).includes('MODE')
        ? config.MODE
        : 'IN';
  } else {
    functionName = `ALT${pinSignal.PinMuxSlot}`;
  }

  return `MXC_GPIO_FUNC_${functionName},`;
}

const gpioConfigMap: Record<string, Record<string, string>> = {
  PS: {
    PU: `${GPIO_PAD}PULL_UP,`,
    STRONG_PU: `${GPIO_PAD}PULL_UP,`,
    WEAK_PU: `${GPIO_PAD}WEAK_PULL_UP,`,
    DIS: `${GPIO_PAD}NONE,`,
    WEAK_PD: `${GPIO_PAD}WEAK_PULL_DOWN,`,
    PD: `${GPIO_PAD}PULL_DOWN,`,
    STRONG_PD: `${GPIO_PAD}PULL_DOWN,`
  },
  PWR: {
    VDDIO: `${GPIO_VSSEL}VDDIO,`,
    VDDIOH: `${GPIO_VSSEL}VDDIOH,`
  },
  DS: {
    '0': `${GPIO_DRVSTR}0`,
    '1': `${GPIO_DRVSTR}1`,
    '2': `${GPIO_DRVSTR}2`,
    '3': `${GPIO_DRVSTR}3`
  }
};

function computeGpioConfig(
  controlId: string,
  valueId: string,
  configForPin: Record<string, Record<string, string>>,
  pinName: string
) {
  if (controlId === 'MODE' || controlId === 'TMR_SIGNAL_TYPE') {
    return;
  }

  const configSection = gpioConfigMap[controlId] || {};
  const specificConfig = configSection[valueId];
  configForPin[pinName][controlId] = INDENTATION + specificConfig;
}

export function generatePinConfigCode(
  configuredPin: ConfigdataPin,
  pin: {
    signals: Record<string, SocPinSignal>;
    Name: string;
    Label: string;
    Description: string;
    Position: {
      X: number;
      Y: number;
    };
    Shape: string;
    GPIOPort: string;
    GPIOPin: number;
    GPIOName: string;
    Signals: SocPinSignal[];
  },
  soc: Soc,

  gpioUsedPortsArray: Array<string>
) {
  const cLinesPinConfig: string[] = [];
  const configForPin: Record<string, Record<string, string>> = {};

  configForPin[`${pin.Name}`] = getDefaultConfigValues();

  if (configuredPin.Config?.DESC) {
    cLinesPinConfig.push(
      `/* ${pin.Label} (${pin.Name}): assigned to ${configuredPin.Peripheral}_${configuredPin.Signal}.`,
      ` * This pin is used for ${configuredPin.Config.DESC}.`,
      ` */`
    );
  } else {
    cLinesPinConfig.push(
      `/* ${pin.Label} (${pin.Name}): assigned to ${configuredPin.Peripheral}_${configuredPin.Signal}. */ `
    );
  }

  cLinesPinConfig.push(
    `const mxc_gpio_cfg_t cfg_p${pin.GPIOPort}_${pin.GPIOPin} = {`,
    INDENTATION + `MXC_GPIO${pin.GPIOPort},`,
    INDENTATION + `MXC_GPIO_PIN_${pin.GPIOPin},`
  );

  if (!gpioUsedPortsArray.includes(`${GPIO_PORT}${pin.GPIOPort}`)) {
    gpioUsedPortsArray.push(`${GPIO_PORT}${pin.GPIOPort}`);
  }

  if (pin.signals) {
    const pinSignal =
      pin.signals[
        configuredPin.Peripheral + '@' + configuredPin.Signal
      ];

    cLinesPinConfig.push(
      INDENTATION + computeGpioFunc(pinSignal, configuredPin.Config)
    );

    if (
      configuredPin.Config &&
      Object.keys(configuredPin.Config)?.length
    ) {
      for (const control of soc.Controls.PinConfig) {
        if (!Object.hasOwn(configuredPin.Config, control.Id)) {
          continue;
        }

        if (control.Type === 'enum') {
          const valueId = configuredPin.Config[control.Id];
          const value = control.EnumValues?.find(
            (value) => value.Id === valueId
          );

          if (!value) {
            throw new Error(
              `Invalid value "${valueId}" for control "${control.Id}"`
            );
          }

          computeGpioConfig(
            control.Id,
            valueId,
            configForPin,
            pin.Name
          );
        }
      }
    }

    cLinesPinConfig.push(
      ...Object.values(configForPin[pin.Name]),
      '};',
      `result = MXC_GPIO_Config(&cfg_p${pin.GPIOPort}_${pin.GPIOPin});`,
      'if (result != E_NO_ERROR) {',
      INDENTATION + 'return result;',
      '}',
      ''
    );
  }

  return cLinesPinConfig;
}

export function splitAndIndent(
  line: string,
  indentation: string,
  globalLevel: number
): string[] {
  const indentedLines: string[] = [];
  let level: number = globalLevel;
  for (const subLine of line.split(/\\n|\n/)) {
    if (subLine.includes('}')) level -= 1;
    indentedLines.push(indentation.repeat(level) + subLine);
    if (subLine.includes('{')) level += 1;
  }

  return indentedLines;
}

export function groupClockNodesByName(
  clockNodes: ConfigdataClock[]
): Record<string, ConfigdataClock[]> {
  /* eslint-disable-next-line unicorn/no-array-reduce */
  return clockNodes.reduce<Record<string, ConfigdataClock[]>>(
    (acc, clockNode) => {
      if (clockNode.Enabled) {
        if (!acc[clockNode.Name]) {
          acc[clockNode.Name] = [];
        }

        acc[clockNode.Name].push(clockNode);
      }

      return acc;
    },
    {}
  );
}

export function createOrderMapping(
  referenceOrder: string[]
): Record<string, number> {
  /* eslint-disable-next-line unicorn/no-array-reduce */
  return referenceOrder.reduce(
    (acc, control, index) => {
      acc[control] = index;
      return acc;
    },
    {} as Record<string, number>
  );
}

// Returns a new instance of ETA pointing to the generators folder
export function createETA(rootDir: string) {
  const templateDir = path.resolve(path.join(rootDir, "dist/generators"));
  const eta = new Eta({
    views: templateDir,
    // By default ETA uses XMLEscape,
    // which maps special HTML characters (&, <, >, ", ') to their XML-escaped equivalents
    // We do not want that
    escapeFunction: String,
    debug: true,
  });
  return eta;
}

