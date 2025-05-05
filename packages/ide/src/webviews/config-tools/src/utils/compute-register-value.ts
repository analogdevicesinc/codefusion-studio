/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
/* eslint-disable max-depth */
/* eslint-disable no-bitwise */
import type {
	ConfigField,
	ConfigFields,
	ControlCfg,
	FieldDictionary,
	RegisterDictionary
} from '@common/types/soc';
import {
	computeEntryBoxDefaultValue,
	evaluateBitfieldExpression
} from './rpn-expression-resolver';
import {getRegisterDictionary} from './register-dictionary';
import {getSocControlsDictionary} from './soc-controls';

export default function computeRegisterValue(
	assignedPinsConfigs: Array<{
		pinConfig: Array<ConfigField | undefined>;
		signalConfig: ConfigField[] | undefined;
	}>,
	modifiedClockNodesConfigs: Array<
		Record<string, ConfigField[] | undefined>
	>,
	modifiedPeripheralConfigs: Array<
		Record<string, ConfigField[] | undefined>
	>,
	currentRegister: RegisterDictionary
) {
	let resetValue = BigInt(0);
	let computedValue = BigInt(0);
	let previousRegister = '';

	const modifiedFields: ConfigField[] = [];

	// Get modified fields for current register from pin assignments
	assignedPinsConfigs.forEach(config => {
		const mergedConfigs = [
			...(config.pinConfig ?? []),
			...(config.signalConfig ?? [])
		];

		mergedConfigs.forEach(mergedConfig => {
			if (
				mergedConfig?.Register === currentRegister.name &&
				mergedConfig?.Operation.toLowerCase() !== 'read'
			) {
				modifiedFields.push(mergedConfig);
				previousRegister = mergedConfig.Register;
			} else if (
				mergedConfig?.Operation.toLowerCase() === 'withprevious'
			) {
				if (currentRegister.name === previousRegister) {
					modifiedFields.push(mergedConfig);
				}
			}
		});
	});

	previousRegister = '';

	// Get modified fields for current register from clock nodes
	modifiedClockNodesConfigs.forEach(config => {
		Object.values(config)
			.flat()
			.forEach(cfg => {
				if (
					cfg?.Register === currentRegister.name &&
					cfg?.Operation.toLowerCase() !== 'read'
				) {
					modifiedFields.push(cfg);
					previousRegister = cfg.Register;
				} else if (cfg?.Operation.toLowerCase() === 'withprevious') {
					if (currentRegister.name === previousRegister) {
						modifiedFields.push(cfg);
					}
				}
			});
	});

	previousRegister = '';

	modifiedPeripheralConfigs.forEach(config => {
		Object.values(config)
			.flat()
			.forEach(cfg => {
				if (
					cfg?.Register === currentRegister.name &&
					cfg?.Operation.toLowerCase() !== 'read'
				) {
					modifiedFields.push(cfg);
					previousRegister = cfg.Register;
				} else if (cfg?.Operation.toLowerCase() === 'withprevious') {
					if (currentRegister.name === previousRegister) {
						modifiedFields.push(cfg);
					}
				}
			});
	});

	// Compute reset value
	currentRegister.fields.forEach(field => {
		const reset = BigInt(field.reset);
		const position = BigInt(field.position);
		resetValue |= reset << position;
	});

	computedValue = resetValue;

	// Iterate each modified field and compute the register value
	Object.values(modifiedFields).forEach(modifiedField => {
		const socField = currentRegister.fields.find(
			field => field.name === modifiedField.Field
		);

		if (socField) {
			const position = BigInt(socField.position);
			const length = BigInt(socField.length);
			const value = BigInt(
				evaluateBitfieldExpression(
					modifiedField.ControlValue,
					modifiedField.Value!
				)
			);

			computedValue =
				(computedValue &
					~(((BigInt(1) << length) - BigInt(1)) << position)) |
				(value << position);
		}
	});

	return {
		isResetValue: resetValue === computedValue,
		value: '0x' + computedValue.toString(16).padStart(8, '0')
	};
}

// eslint-disable-next-line max-params
export function computeFieldValue(
	configs: Array<{
		pinConfig: Array<ConfigField | undefined>;
		signalConfig: ConfigField[] | undefined;
	}>,
	clockNodesConfigs: Array<Record<string, ConfigField[] | undefined>>,
	modifiedPeripheralConfigs: Array<
		Record<string, ConfigField[] | undefined>
	>,
	registerName: string,
	field: FieldDictionary,
	resetValue: number | string
) {
	let computedValue = BigInt(resetValue);
	let previousRegister = '';

	// Filtered pin config fields that belong to the current register
	const pinsConfig = configs
		.map(config => [
			...(config.pinConfig ?? []),
			...(config.signalConfig ?? [])
		])
		.flat()
		.reduce<ConfigField[]>((acc, config) => {
			if (
				config?.Register === registerName &&
				config.Operation.toLowerCase() !== 'read'
			) {
				acc.push(config);
				previousRegister = config.Register;
			} else if (config?.Operation.toLowerCase() === 'withprevious') {
				if (registerName === previousRegister) {
					acc.push(config);
				}
			}

			return acc;
		}, []);

	// Filtered clock config fields that belong to the current register
	const nodesConfig = Object.values(clockNodesConfigs).reduce<
		ConfigField[]
	>((acc, config) => {
		Object.values(config).forEach(cfg => {
			// Only add fields that belong to the current register taking in consideration the withprevious operation
			cfg?.forEach(field => {
				if (
					field.Register === registerName &&
					field.Operation.toLowerCase() !== 'read'
				) {
					acc.push(field);
					previousRegister = field.Register;
				} else if (field.Operation.toLowerCase() === 'withprevious') {
					if (registerName === previousRegister) {
						acc.push(field);
					}
				}
			});
		});

		return acc;
	}, []);

	// Filtered peripheral config fields that belong to the current register
	const peripheralConfig = Object.values(
		modifiedPeripheralConfigs
	).reduce<ConfigField[]>((acc, config) => {
		Object.values(config).forEach(cfg => {
			// Only add fields that belong to the current register taking in consideration the withprevious operation
			cfg?.forEach(field => {
				if (
					field.Register === registerName &&
					field.Operation.toLowerCase() !== 'read'
				) {
					acc.push(field);
					previousRegister = field.Register;
				} else if (field.Operation.toLowerCase() === 'withprevious') {
					if (registerName === previousRegister) {
						acc.push(field);
					}
				}
			});
		});

		return acc;
	}, []);

	const mergedConfigs = [
		...pinsConfig,
		...nodesConfig,
		...peripheralConfig
	];

	// Find the last modified field value for the current field
	const targetedRegisterField = mergedConfigs
		.reverse()
		.find(mergedConfig => mergedConfig?.Field === field.name);

	if (targetedRegisterField) {
		computedValue = BigInt(
			evaluateBitfieldExpression(
				targetedRegisterField.ControlValue,
				targetedRegisterField.Value!
			)
		);
	}

	return '0x' + computedValue.toString(16);
}

function getControl(controlId: string, controls: ControlCfg[]) {
	return controls.find(control => control.Id === controlId);
}

function getControlIntegerValue(
	controlId: string,
	controlValue: string,
	controls: ControlCfg[]
): number {
	const control = getControl(controlId, controls);

	if (control?.Type === 'enum') {
		// For enums, get the value of the enum's Value field
		return (
			control?.EnumValues?.find(e => e.Id === controlValue)?.Value ??
			0
		);
	}

	return parseInt(controlValue, 10);
}

export function getNamespacedControlIntegerValue(
	namespace: string,
	controlId: string,
	controlValue: string
): number {
	const controls = Object.values(getSocControlsDictionary(namespace));

	return getControlIntegerValue(controlId, controlValue, controls);
}

// eslint-disable-next-line complexity
export function computeDefaultValues(
	config: ConfigFields,
	controls: ControlCfg[],
	pinSignalName?: Record<string, string>
) {
	const defaultValueObj: Record<string, string> = {};

	// Operate only on config fields that can be configured throught the available controls
	const filteredConfig = Object.entries(
		config ?? {}
	).reduce<ConfigFields>((acc, [key, fields]) => {
		const control = getControl(key, controls);

		if (control) {
			const enums = control.EnumValues ?? [];

			let filteredConfigFields:
				| Record<string, ConfigField[]>
				| undefined;

			// If the control is an enum, filter the config fields to only include
			// filter out configuration that are not accessible through the available enum options
			if (enums.length) {
				filteredConfigFields = Object.entries(fields).reduce<
					Record<string, ConfigField[]>
				>((acc, [fieldKey, fieldValue]) => {
					const field = enums.find(en => String(fieldKey) === en.Id);

					if (field) {
						acc[fieldKey] = fieldValue;
					}

					return acc;
				}, {});
			}

			if (filteredConfigFields) {
				acc[key] = filteredConfigFields;
			} else {
				acc[key] = fields;
			}
		}

		return acc;
	}, {});

	if (Object.keys(filteredConfig).length) {
		for (const [controlValueKey, controlValues] of Object.entries(
			filteredConfig
		)) {
			const control = getControl(controlValueKey, controls);
			const controlType = control?.Type;

			let defaultValue: string | undefined;

			if (control?.Default) {
				defaultValue = String(control.Default);

				defaultValueObj[controlValueKey] = defaultValue;

				continue;
			}

			if (controlType === 'integer') {
				defaultValueObj[controlValueKey] =
					getIntegerControlResetValue(controlValues);
				continue;
			} else if (controlType === 'text') {
				const hint = controls.find(
					control => control.Id === controlValueKey
				)?.Hint;

				const textDefaultValue = (computeEntryBoxDefaultValue(
					pinSignalName,
					hint
				) ?? '') as string;

				defaultValueObj[controlValueKey] = textDefaultValue || '';
				continue;
			}

			for (const [key, configs] of Object.entries(controlValues)) {
				const checkedItems: string[] = [];

				for (let i = configs.length - 1; i >= 0; i--) {
					const cfg = configs[i];
					const cfgValue: string | undefined = cfg.Value;

					if (cfg.Operation.toLowerCase() === 'poll') {
						// Don't check Poll operations. They tend to not match, even if
						// this is the default value, because the chip's reset value
						// will normally start with the value in its opposite state
						// but then it will have flipped by the time we get to the
						// startup.
						// For example, we might enable an oscillator at reset, but the
						// oscillator ready bit won't be set at reset, but will be by
						// the time we got to the configuration code.
						continue;
					} else if (cfg.Operation.toLowerCase() === 'read') {
						// Nothing to check.
						continue;
					} else if (cfg.Operation.toLowerCase() === 'withprevious') {
						// Find the operation and register from the upcoming operations
						for (let j = i - 1; j >= 0; j--) {
							const prevCfg = configs[j];

							if (
								prevCfg.Operation.toLowerCase() !== 'withprevious'
							) {
								cfg.Register = prevCfg.Register;
								cfg.Operation = prevCfg.Operation;
								break;
							}
						}
					}

					const value = evaluateBitfieldExpression(
						getControlIntegerValue(controlValueKey, key, controls),
						cfgValue!
					);

					const id = `${cfg.Register}_${cfg.Field}`;

					if (checkedItems.includes(id)) {
						continue;
					}

					const resetValue = getResetValue(cfg);

					if (value !== resetValue) {
						defaultValue = undefined;
						break;
					}

					checkedItems.push(id);
					defaultValue = key;
				}

				if (defaultValue !== undefined) {
					break;
				}
			}

			defaultValueObj[controlValueKey] =
				defaultValue ?? Object.keys(controlValues)[0];
		}
	}

	return defaultValueObj;
}

function getIntegerControlResetValue(
	cfg: Record<string, ConfigField[]>
) {
	const valueCfgSteps = cfg.VALUE;
	let valueCfg: ConfigField | undefined;

	if (cfg.VALUE === undefined) {
		throw new Error(
			`Invalid configuration object for control of type integer, received ${JSON.stringify(cfg)}`
		);
	}

	for (const step of valueCfgSteps) {
		if (
			step.Operation.toLowerCase() === 'write' &&
			step.Value?.match(/\$\{Value\}/)
		) {
			valueCfg = step;
			break;
		}
	}

	// No register write of the value found.
	if (valueCfg === undefined) {
		return '';
	}

	let resetValue = getResetValue(valueCfg);

	if (typeof resetValue !== 'undefined' && valueCfg.InverseValue) {
		resetValue = evaluateBitfieldExpression(
			resetValue,
			valueCfg.InverseValue
		);
	}

	return String(resetValue);
}

function getResetValue(valueCfg: ConfigField) {
	const registerDictionary = getRegisterDictionary();
	const register = registerDictionary.find(
		reg => reg.name === valueCfg.Register
	);

	const field = register?.fields.find(
		fld => fld.name === valueCfg.Field
	);

	const fieldResetValue = field?.reset;
	let resetValue;

	if (typeof fieldResetValue === 'string') {
		if (fieldResetValue.startsWith('0x')) {
			resetValue = parseInt(fieldResetValue, 16);
		} else {
			resetValue = parseInt(fieldResetValue, 10);
		}
	} else if (typeof fieldResetValue === 'number') {
		resetValue = fieldResetValue;
	}

	return resetValue;
}
