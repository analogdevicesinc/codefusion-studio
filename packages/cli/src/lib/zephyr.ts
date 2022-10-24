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
  SocClock,
  SocConfigZephyr,
  SocControl,
  SocControlValue,
  SocPeripheral,
  SocPin,
  SocPinSignal
} from '../types/soc.js';

import {splitAndIndent} from './utils.js';

/* In Zephyr, tabs are used for indentation. */
const INDENTATION = '\t';

/* Constants for the code generation. */
const PERIPHERAL_DISABLED_PATTERN = /status *= *"disabled"/;
const CLOCK_REGEXP = '&(clk_[a-zA-Z0-9_]+)';
const STATUS_OKAY = 'status = "okay";';

/* Property names. */
const DRIVE_STRENGTH_KEY = 'DS';
const PULL_KEY = 'PS';
const PWR_KEY = 'PWR';
const GPIO_TYPE_KEY = 'GPIO_TYPE';
const GPIO_DT_NAME_KEY = 'DT_NAME';
const GPIO_PHANDLE_KEY = 'PHANDLE';
const GPIO_INPUT_CODE = 'INPUT_CODE';
const GPIO_POLARITY = 'POLARITY';

type SocControlValueMap = {
  enums: Record<string, SocControlValue> | undefined;
};
type ControlsInfo = SocControl & SocControlValueMap;
type ControlsMap = Record<string, ControlsInfo>;

type SocPinSignalMap = {
  signals: Record<string, SocPinSignal>;
};
type PinInfo = SocPin & SocPinSignalMap;
type PinInfoMap = Record<string, PinInfo>;

// map of SoC pins by id for easy lookup
let pins: PinInfoMap;

// map of SoC peripherals by name
let peripherals: Record<string, SocPeripheral>;

// map of SoC PinConfig controls and their enums by ID
let pincfgControls: ControlsMap;

// map of SoC clocknodes by name for easy lookup
let clockNodes: Record<string, SocClock>;

// map of SoC ClockConfig controls and their enums by ID
let clkcfgControls: ControlsMap;

const projectConfigMacros: Set<string> = new Set<string>();

// Emit block of code to configure the GPIO signals.
function configureGpios(
  configdata: Configdata,
  soc: Soc,
  overlayLines: string[]
) {
  let gpioConfigured: boolean = false;

  const typeControl = pincfgControls[GPIO_TYPE_KEY];
  if (typeControl.EnumValues) {
    for (const typeEnum of typeControl.EnumValues) {
      const gpiosWithType = configdata.Pins.filter(
        (cp) =>
          GPIO_TYPE_KEY in cp.Config &&
          cp.Config[GPIO_TYPE_KEY] === typeEnum.Id
      );

      if (gpiosWithType.length > 0) {
        if (gpioConfigured) {
          overlayLines.push(``);
        } else {
          overlayLines.push('/ {');
        }

        overlayLines.push(INDENTATION + `${typeEnum.Zephyr} {`);

        for (const cp of gpiosWithType) {
          const pin = pins[cp.Pin];

          // pin is muxable
          if (pin.signals) {
            const peripheral: SocPeripheral =
              peripherals[cp.Peripheral];
            let properties: string = concatenateZephyrGpioProperty(
              cp.Config,
              GPIO_POLARITY,
              'HIGH',
              ''
            );
            properties = concatenateZephyrGpioProperty(
              cp.Config,
              PWR_KEY,
              'VDDIO',
              properties
            );
            properties =
              typeEnum.Id === 'BUTTON'
                ? concatenateZephyrGpioProperty(
                    cp.Config,
                    PULL_KEY,
                    'DIS',
                    properties
                  )
                : concatenateZephyrGpioProperty(
                    cp.Config,
                    DRIVE_STRENGTH_KEY,
                    '0',
                    properties
                  );
            const dtName = cp.Config[GPIO_DT_NAME_KEY];
            const phandle = cp.Config[GPIO_PHANDLE_KEY];
            overlayLines.push(
              INDENTATION.repeat(2) + `${phandle}: ${dtName} {`,
              INDENTATION.repeat(3) +
                `gpios = <&${peripheral.Zephyr?.Name} ${pin.GPIOPin} (${properties})>;`
            );
            if (
              typeEnum.Id === 'BUTTON' &&
              GPIO_INPUT_CODE in cp.Config
            ) {
              overlayLines.push(
                INDENTATION.repeat(3) +
                  `zephyr,code = <${cp.Config[GPIO_INPUT_CODE]}>;`
              );
            }

            overlayLines.push(INDENTATION.repeat(2) + '};');
            gpioConfigured = true;

            if (peripheral.Zephyr?.ConfigMacros) {
              for (const macro of peripheral.Zephyr.ConfigMacros) {
                projectConfigMacros.add(macro);
              }
            }
          }
        }

        overlayLines.push(INDENTATION + '};');
      }
    }
  }

  if (gpioConfigured) {
    overlayLines.push('};', '');
  } else {
    overlayLines.push('/* No GPIO signals to configure. */', '');
  }
}

// Get block of code to set drive strength and pull settings of non-GPIO function pins.
function configureNonGpioPins(configdata: Configdata) {
  /* For signals not used as GPIOs, the drive strength and power source have to be set on the
   ** signal. Do that here.
   */
  const nonGpios = configdata.Pins.filter(
    (cp) => !(GPIO_TYPE_KEY in cp.Config)
  );

  const configuredNonGpioObj: Record<string, Array<string>> = {};

  if (nonGpios.length > 0) {
    for (const cp of nonGpios) {
      const pin = pins[cp.Pin];

      // pin is muxable
      if (pin.signals) {
        const pinSignal =
          pin.signals[cp.Peripheral + '@' + cp.Signal];
        if (
          pinSignal.PinMuxNameZephyr &&
          (PWR_KEY in cp.Config ||
            DRIVE_STRENGTH_KEY in cp.Config ||
            PULL_KEY in cp.Config)
        ) {
          configuredNonGpioObj[pinSignal.PinMuxNameZephyr] = [];
          configuredNonGpioObj[pinSignal.PinMuxNameZephyr].push(
            `&${pinSignal.PinMuxNameZephyr} {`
          );

          if (PWR_KEY in cp.Config) {
            const voltage: string =
              'MAX32_VSEL_' +
              (pincfgControls.PWR.enums?.[cp.Config.PWR]
                .Id as string);
            configuredNonGpioObj[pinSignal.PinMuxNameZephyr].push(
              INDENTATION + `power-source = <${voltage}>;`
            );
          }

          if (DRIVE_STRENGTH_KEY in cp.Config) {
            const ds = pincfgControls.DS.enums?.[
              cp.Config[DRIVE_STRENGTH_KEY]
            ].Id as string;
            configuredNonGpioObj[pinSignal.PinMuxNameZephyr].push(
              INDENTATION + `drive-strength = <${ds}>;`
            );
          }

          if (PULL_KEY in cp.Config) {
            const ps = cp.Config[PULL_KEY];

            if (ps === 'WEAK_PU') {
              configuredNonGpioObj[pinSignal.PinMuxNameZephyr].push(
                INDENTATION +
                  '/* Weak pull-up is not supported here in Zephyr. Using strong pull-up instead. */'
              );
            } else if (ps === 'WEAK_PD') {
              configuredNonGpioObj[pinSignal.PinMuxNameZephyr].push(
                INDENTATION +
                  '/* Weak pull-down is not supported here in Zephyr. Using strong pull-down instead. */'
              );
            }

            if (
              ps === 'STRONG_PU' ||
              ps === 'WEAK_PU' ||
              ps === 'PU'
            ) {
              configuredNonGpioObj[pinSignal.PinMuxNameZephyr].push(
                INDENTATION + 'bias-pull-up;'
              );
            } else if (
              ps === 'STRONG_PD' ||
              ps === 'WEAK_PD' ||
              ps === 'PD'
            ) {
              configuredNonGpioObj[pinSignal.PinMuxNameZephyr].push(
                INDENTATION + 'bias-pull-down;'
              );
            }
          }

          configuredNonGpioObj[pinSignal.PinMuxNameZephyr].push(
            '};',
            ''
          );
        }
      }
    }
  }

  return configuredNonGpioObj;
}

// Collect the pin mux line and comments for the peripheral.
function getPeripheralPinmux(
  configdata: Configdata,
  peripheral: SocPeripheral,
  enabled: boolean
) {
  /* Collect the set of pins for the peripheral, and build some comments about what's assigned.
   */
  let numSignals: number = 0;
  let pinmuxLine: string = INDENTATION + 'pinctrl-0 = <';

  for (const cp of configdata.Pins) {
    const pin = pins[cp.Pin];

    // pin is muxable
    if (pin.signals) {
      const pinSignal: SocPinSignal =
        pin.signals[cp.Peripheral + '@' + cp.Signal];
      if (
        pinSignal.PinMuxNameZephyr &&
        pinSignal.Peripheral === peripheral.Name
      ) {
        if (numSignals > 0) {
          pinmuxLine += ' ';
        }

        numSignals += 1;
        pinmuxLine += `&${pinSignal.PinMuxNameZephyr}`;
      }
    }
  }

  pinmuxLine += '>;';

  return numSignals > 0 ||
    (enabled && peripheral?.Zephyr?.AlwaysEmitPinctrl0)
    ? pinmuxLine
    : undefined;
}

// Return true if pinmuxName is associated with peripheral.
function pinmuxNameInPeripheral(
  pinmuxName: string,
  configdata: Configdata,
  peripheral: SocPeripheral
) {
  for (const cp of configdata.Pins) {
    const pin = pins[cp.Pin];

    // pin is muxable
    if (pin.signals) {
      const pinSignal: SocPinSignal =
        pin.signals[cp.Peripheral + '@' + cp.Signal];
      if (pinSignal.PinMuxNameZephyr === pinmuxName) {
        return pinSignal.Peripheral === peripheral.Name;
      }
    }
  }

  return false;
}

// Find out if peripheral is enabled, and if it has any configuration lines we need to emit.
function analyzePeripheral(
  soc: Soc,
  configdata: Configdata,
  peripheral: SocPeripheral
) {
  /* Go through each ClockNode associated with the peripheral, and see if it's enabled or disabled.
   ** We have to look at all the controls as we don't know which one enables the peripheral.
   ** Also note if there are actually any properties to emit.
   */
  let peripheralEnabled: boolean = true;
  let hasConfigurationSettings = false;

  for (const cn of soc.ClockNodes) {
    if (cn.ConfigZephyr) {
      for (const controlId of Object.keys(cn.ConfigZephyr)) {
        /* Get the value of the control if there is one. */
        const value: string | undefined = configdata.ClockNodes?.find(
          (cfg) =>
            cfg.Name === cn.Name &&
            cfg.Control === controlId &&
            cfg.Enabled
        )?.Value;
        const code = getZephyrClockConfigCode(
          clockNodes[cn.Name],
          peripheral.Name,
          controlId,
          value
        )[0];

        if (code) {
          if (PERIPHERAL_DISABLED_PATTERN.test(code)) {
            peripheralEnabled = false;
          }

          hasConfigurationSettings = true;
        }
      }
    }
  }

  return [hasConfigurationSettings, peripheralEnabled];
}

// Emit block of code to set drive strength and pull settings of non-GPIO function pins.
// eslint-disable-next-line max-params, complexity
function configurePeripherals(
  configdata: Configdata,
  soc: Soc,
  overlayLines: string[],
  headerFiles: Set<string>,
  configuredNonGpioPins: Record<string, Array<string>>,
  systemClockCode: Array<string>
) {
  /* Set of all clocks used in the configuration, so that we can enable them. */
  const clocksToInitialize: Set<string> = new Set<string>();

  /* For each peripheral, emit the block of its configuration values.
   ** Includes both the pin set-up, and the clock set-up.
   */
  for (const peripheral of soc.Peripherals) {
    if (peripheral.Zephyr?.Name) {
      const configLines: string[] = [];

      // Find out if peripheral is enabled, and if it has any configuration lines we need to emit.
      const [hasConfigurationSettings, peripheralEnabled] =
        analyzePeripheral(soc, configdata, peripheral);
      let needToEmit: boolean = hasConfigurationSettings;

      /* Collect the set of pins for the peripheral in pinctrl-0.
       */
      const pinmuxLine = getPeripheralPinmux(
        configdata,
        peripheral,
        peripheralEnabled
      );

      if (pinmuxLine) {
        needToEmit = true;
      }

      if (needToEmit) {
        // Retrieve and insert non-GPIO pin configurations related to the current peripheral
        const relatedNonGpioKeys = Object.keys(
          configuredNonGpioPins
        ).filter((key) =>
          pinmuxNameInPeripheral(key, configdata, peripheral)
        );

        for (const key of relatedNonGpioKeys) {
          configLines.push(...configuredNonGpioPins[key]);
        }

        /* Actually emit the configuration block for the peripheral. */
        configLines.push(`&${peripheral.Zephyr.Name} {`);

        /* Emit the pinmux information, if we have any. */
        if (pinmuxLine) {
          configLines.push(
            pinmuxLine,
            INDENTATION + 'pinctrl-names = "default";'
          );
        }

        /* Go through all ClockNodes for the peripheral, and emit code for all the controls. */
        for (const cn of soc.ClockNodes) {
          if (cn.ConfigZephyr) {
            for (const controlId of Object.keys(cn.ConfigZephyr)) {
              /* Get the value of the control if there is one. */
              const value: string | undefined =
                configdata.ClockNodes?.find(
                  (cfg) =>
                    cfg.Name === cn.Name &&
                    cfg.Control === controlId &&
                    cfg.Enabled
                )?.Value;
              const [code, clock, diagnostic] =
                getZephyrClockConfigCode(
                  clockNodes[cn.Name],
                  peripheral.Name,
                  controlId,
                  value
                );

              if (
                code &&
                (peripheralEnabled ||
                  PERIPHERAL_DISABLED_PATTERN.test(code))
              ) {
                configLines.push(INDENTATION + `${code}`);

                const match = code.match(CLOCK_REGEXP);

                if (match) {
                  clocksToInitialize.add(match[1]);
                }

                if (clock) {
                  clocksToInitialize.add(`clk_${clock}`);
                }

                const header = peripheral.Zephyr?.Header;
                if (header) {
                  headerFiles.add(`${header}`);
                }

                if (
                  peripheralEnabled &&
                  peripheral.Zephyr?.ConfigMacros
                ) {
                  for (const macro of peripheral.Zephyr
                    .ConfigMacros) {
                    projectConfigMacros.add(macro);
                  }
                }
              }

              if (diagnostic) {
                /* Print out message to say functionality wasn't supported. */
                configLines.push(
                  INDENTATION + `/* Warning: ${diagnostic} */`
                );
              }
            }
          }
        }

        /* Finished the peripheral. */
        if (peripheral.Zephyr.ClocksSection) {
          systemClockCode.push(...configLines, '};', '');
        } else {
          overlayLines.push(...configLines, '};', '');
        }
      }
    }
  }

  return clocksToInitialize;
}

// Emit comments for all the things that we couldn't configure.
function emitUnsupportedComments(
  configdata: Configdata,
  soc: Soc,
  overlayLines: string[]
) {
  const unsupportedLines: string[] = [];
  const peripheralsToReport: Set<SocPeripheral> =
    new Set<SocPeripheral>();

  /* Go through all ClockNodes for the peripheral, and emit code for all the controls. */
  for (const cn of soc.ClockNodes) {
    if (cn.ConfigZephyr) {
      for (const [controlId, control] of Object.entries(
        cn.ConfigZephyr
      )) {
        /* Get the value of the control if there is one. */
        const value: string | undefined = configdata.ClockNodes?.find(
          (cfg) =>
            cfg.Name === cn.Name &&
            cfg.Control === controlId &&
            cfg.Enabled
        )?.Value;
        if (value && !control[value]?.Default) {
          /* The control doesn't take its default value. */
          const config: SocConfigZephyr = control[value];
          if (config?.Peripheral) {
            const peripheral: SocPeripheral =
              peripherals[config?.Peripheral];
            if (peripheral.Zephyr?.Diagnostic) {
              /* Peripheral isn't supported. */
              peripheralsToReport.add(peripheral);
            }
          } else if (config?.Diagnostic) {
            /* There's a diagnostic, but no peripheral. If there had been a
             ** peripheral, we would have reported it when emitting the peripheral.
             ** So emit this diagnostic here.
             */
            unsupportedLines.push(` * - ${config?.Diagnostic}`);
          }
        }
      }
    }
  }

  for (const peripheral of peripheralsToReport) {
    /* Print out message to say functionality wasn't supported. */
    unsupportedLines.push(` * - ${peripheral.Zephyr?.Diagnostic}`);
  }

  for (const cp of configdata.Pins) {
    const pin = pins[cp.Pin];

    // pin is muxable
    if (pin.signals) {
      const pinSignal = pin.signals[cp.Peripheral + '@' + cp.Signal];

      if (pinSignal) {
        const peripheral = peripherals[pinSignal.Peripheral];

        if (
          peripheral && // Check if the pin signal is supported by Zephyr
          pinSignal.PinMuxNameZephyr &&
          !peripheral.Zephyr?.Name
        ) {
          unsupportedLines.push(
            ` * - ${pin.Label} (${pin.Name}) not mapped to ${cp.Peripheral}_${cp.Signal} as peripheral is not currently supported.`
          );
        } else if (
          !pinSignal.PinMuxNameZephyr &&
          pinSignal.PinMuxSlot !== 0
        ) {
          unsupportedLines.push(
            ` * - ${pin.Label} (${pin.Name}) not mapped to ${cp.Peripheral}_${cp.Signal} as signal is not currently supported.`
          );
        }
      }
    }
  }

  if (unsupportedLines.length > 0) {
    overlayLines.push('/* Warnings:', ...unsupportedLines, ' */');
  }
}

// Emit block of code to initialize the clocks.
// eslint-disable-next-line max-params
function configureClocks(
  configdata: Configdata,
  soc: Soc,
  overlayLines: string[],
  clocksToInitialize: Set<string>,
  systemClockCode: string[]
) {
  overlayLines.push(
    '',
    '/* Clock Configuration and Initialization */',
    ''
  );
  let clocksConfigured = false;

  if (systemClockCode.length > 0) {
    overlayLines.push(
      '/* System clock configuration */',
      ...systemClockCode
    );
    clocksConfigured = true;
  }

  // Set up any clock configuration not associated with a peripheral.
  if (configdata.ClockNodes) {
    for (const cn of configdata.ClockNodes) {
      if (cn.Enabled) {
        const code = getZephyrClockConfigCode(
          clockNodes[cn.Name],
          undefined,
          cn.Control,
          cn.Value
        )[0];

        if (code) {
          overlayLines.push(
            ...splitAndIndent(code, INDENTATION, 0),
            ''
          );
          clocksConfigured = true;
        }
      }
    }
  }

  // Initialize any clocks we used.
  for (const clock of clocksToInitialize) {
    overlayLines.push(
      `&${clock} {`,
      INDENTATION + STATUS_OKAY,
      '};',
      ''
    );
    clocksConfigured = true;
  }

  if (!clocksConfigured) {
    overlayLines.push('/* No clocks to configure. */');
  }
}

/**
 * Exports configuration choices as a zephyr program
 * @param {Configdata} configdata - the configuration choices object
 * @param {Soc} soc - the SoC data model
 * @returns {object<string, string[]>} The zephyr files (as arrays of code lines), indexed by file name
 */
export async function exportZephyr(configdata: Configdata, soc: Soc) {
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

  pins = toObject(
    soc.Packages[0].Pins.map((pin) => ({
      ...pin,
      signals: toObject(pin.Signals, 'Peripheral', 'Name')
    })),
    'Name'
  );

  peripherals = toObject(soc.Peripherals, 'Name');

  pincfgControls = toObject(
    soc.Controls.PinConfig.map((control) => ({
      ...control,
      enums: control.EnumValues
        ? toObject(control.EnumValues, 'Id')
        : undefined
    })),
    'Id'
  );

  clockNodes = toObject(soc.ClockNodes, 'Name');

  clkcfgControls = toObject(
    soc.Controls.ClockConfig.map((control) => ({
      ...control,
      enums: control.EnumValues
        ? toObject(control.EnumValues, 'Id')
        : undefined
    })),
    'Id'
  );

  const overlayLines: string[] = []; // lines of .c file code

  /* Set of all header files to include at the top of the file. */
  const headerFiles: Set<string> = new Set<string>();

  overlayLines.push('/* GPIO Configuration */', '');

  /* Emit block of code to configure the GPIO signals. */
  configureGpios(configdata, soc, overlayLines);

  overlayLines.push('/* Peripheral Configuration */', '');

  /* Emit block of code to set drive strength and pull settings of non-GPIO function pins. */
  const configuredNonGpioObj = configureNonGpioPins(configdata);

  const systemClockCode: Array<string> = [];

  /* Emit block of code to set drive strength and pull settings of non-GPIO function pins. */
  const clocksToInitialize: Set<string> = configurePeripherals(
    configdata,
    soc,
    overlayLines,
    headerFiles,
    configuredNonGpioObj,
    systemClockCode
  );

  /* Emit block of code to initialize the clocks. */
  configureClocks(
    configdata,
    soc,
    overlayLines,
    clocksToInitialize,
    systemClockCode
  );

  let zephyrId = configdata.ZephyrId || '';
  zephyrId = zephyrId.replaceAll('/', '_');
  const projConfFileName = zephyrId ? `${zephyrId}.conf` : 'prj.conf';
  const cfsConfigFileName = zephyrId
    ? `${zephyrId}.overlay`
    : 'cfs_config.overlay';

  const sortedProjectConfigMacros = [...projectConfigMacros].sort();

  const projConfFileLines = [
    ` # Configuration for ${soc.Name}-${soc.Packages[0].Name}`,
    ' #',
    ' # This file was generated using Analog Devices CodeFusion Studio.',
    ' # https://github.com/analogdevicesinc/codefusion-studio',
    ' #',
    ` # Generated at: ${new Date().toISOString()}`,
    ` # Generated with: ${process.argv.join(' ')}`,
    ' #',
    ' # SPDX-License-Identifier: Apache-2.0',
    ` # Copyright (c) ${new Date().getFullYear()} Analog Devices, Inc.`,
    '',
    ...sortedProjectConfigMacros
  ];

  /* Emit comments for all the things that we couldn't configure.
   * May choose not to emit this in the end, but useful for now.
   */
  emitUnsupportedComments(configdata, soc, overlayLines);

  const cfsConfigFileLines = [
    ...topCommentLines,
    ...[...headerFiles].map((file) => `#include <${file}>`),
    '',
    ...overlayLines
  ];

  return {
    [cfsConfigFileName]: cfsConfigFileLines,
    [projConfFileName]: projConfFileLines
  };
}

/* Get the code to emit for a clock config control with given value, for a given peripheral.
 * Only emit code if the peripheral matches.
 * If peripheral is undefined, only emit code if the control is not associated with
 * any peripheral.
 * Take care of getting the default value if the value is not set in the cfsconfig file.
 */
function getZephyrClockConfigCode(
  clockNode: SocClock,
  peripheral: string | undefined,
  controlId: string,
  value: string | undefined
) {
  const control = clkcfgControls[controlId];
  let valueId: string | undefined = value;
  let code: string | undefined;
  let clock: string | undefined;
  let diagnostic: string | undefined;

  if (
    control?.Type === 'integer' ||
    control?.Type === 'text' ||
    control?.Type === 'identifier'
  ) {
    /* Entry boxes store their config code under an "enum" called VALUE in the data model. */
    valueId = 'VALUE';
  } else if (!valueId) {
    /* Nothing set in the cfsconfig file. Need to find the default value from the data model. */
    if (!clockNode) {
      throw new Error(`No ClockNode found`);
    }

    if (!clockNode.ConfigZephyr) {
      throw new Error(
        `No Zephyr Config info for ${controlId} of ${clockNode.Name}`
      );
    }

    for (const [enumId, config] of Object.entries(
      clockNode.ConfigZephyr?.[controlId]
    )) {
      if (config.Default) {
        valueId = enumId;
      }
    }
  }

  /* Get the configuration code, and see if it matches the peripheral. */
  const configInfo = valueId
    ? clockNode.ConfigZephyr?.[controlId]?.[valueId]
    : undefined;

  if (configInfo?.Peripheral === peripheral) {
    code = configInfo?.Code;
    clock = configInfo?.Clock;
    diagnostic = configInfo?.Diagnostic;

    if (['identifier', 'integer', 'text'].includes(control?.Type)) {
      if (code && value) {
        /* In the code to emit, #VALUE# is used as the placeholder for the real value. */
        const stringValue: string = value as string;
        code = code.replace('#VALUE#', stringValue);
      } else {
        code = undefined;
      }
    }
  }

  return [code, clock, diagnostic];
}

// Read the property from the saved pin, and get the Zephyr property for the definition if there is one.
// Include | prefix if it's not the first.
function concatenateZephyrGpioProperty(
  config: Record<string, string>,
  controlId: string,
  defaultEnumId: string,
  properties: string
) {
  let enumId: string = defaultEnumId;
  if (controlId in config) {
    enumId = config[controlId];
  }

  if (pincfgControls[controlId].enums?.[enumId].Zephyr) {
    properties +=
      (properties.length === 0 ? '' : ' | ') +
      (pincfgControls[controlId].enums?.[enumId].Zephyr as string);
  }

  return properties;
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
