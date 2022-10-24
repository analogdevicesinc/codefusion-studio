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
/* eslint-disable max-depth */
/* eslint-disable no-bitwise */
import type {
	ConfigField,
	ConfigFields,
	ControlCfg,
	FieldDictionary,
	RegisterDictionary
} from '@common/types/soc';
import {getFirmwarePlatform} from './firmware-platform';
import {computeEntryBoxDefaultValue} from './rpn-expression-resolver';

export default function computeRegisterValue(
	assignedPinsConfigs: Array<{
		pinConfig: Array<ConfigField | undefined>;
		signalConfig: ConfigField[] | undefined;
	}>,
	modifiedClockNodesConfigs: Array<
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
			const value = BigInt(modifiedField.Value);

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
	registerName: string,
	field: FieldDictionary,
	resetValue: number | string
) {
	let computedValue = BigInt(resetValue);

	// Filtered pin config fields that belong to the current register
	const pinsConfig = configs
		.map(config => [
			...(config.pinConfig ?? []),
			...(config.signalConfig ?? [])
		])
		.flat()
		.reduce<ConfigField[]>((acc, config) => {
			let previousRegister = '';

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
		let previousRegister = '';

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

	const mergedConfigs = [...pinsConfig, ...nodesConfig];

	const targetedRegisterField = mergedConfigs.find(
		mergedConfig => mergedConfig?.Field === field.name
	);

	if (targetedRegisterField) {
		computedValue = BigInt(targetedRegisterField.Value);
	}

	return '0x' + computedValue.toString(16);
}

function getControl(controlId: string, clockConfig: ControlCfg[]) {
	return clockConfig.find(control => control.Id === controlId);
}

export function computeDefaultValues(
	config: ConfigFields,
	registers: RegisterDictionary[],
	controls: ControlCfg[],
	pinSignalName?: Record<string, string>
) {
	const firmwarePlatform = getFirmwarePlatform();
	const defaultValueObj: Record<string, string> = {};

	if (config) {
		for (const [controlValueKey, controlValues] of Object.entries(
			config
		)) {
			const control = getControl(controlValueKey, controls);
			const controlType = control?.Type;
			const controlFirmwarePlatforms = control?.FirmwarePlatforms;

			if (
				controlFirmwarePlatforms &&
				!controlFirmwarePlatforms?.some(fw =>
					firmwarePlatform?.toLowerCase().includes(fw.toLowerCase())
				)
			)
				continue;

			let defaultValue: string | undefined;

			if (controlType === 'integer') {
				defaultValueObj[controlValueKey] =
					getIntegerControlResetValue(controlValues, registers);
				continue;
			} else if (controlType === 'text') {
				const hint = controls.find(
					control => control.Id === controlValueKey
				)?.Hint;

				const textDefaultValue = computeEntryBoxDefaultValue(
					pinSignalName,
					hint
				) as string;

				defaultValueObj[controlValueKey] = textDefaultValue || '';
				continue;
			} else if (controlType === 'identifier') {
				const hint = controls.find(
					control => control.Id === controlValueKey
				)?.Hint;

				const identifierDefaultValue = computeEntryBoxDefaultValue(
					pinSignalName,
					hint
				) as string;

				defaultValueObj[controlValueKey] =
					identifierDefaultValue.replace(/\./g, '_') || '';
				continue;
			}

			for (const [key, configs] of Object.entries(controlValues)) {
				const checkedItems: string[] = [];

				for (let i = configs.length - 1; i >= 0; i--) {
					const cfg = configs[i];

					if (cfg.Operation === 'WithPrevious') {
						// Find the operation and register from the upcoming operations
						for (let j = i - 1; j >= 0; j--) {
							const prevCfg = configs[j];

							if (prevCfg.Operation !== 'WithPrevious') {
								cfg.Register = prevCfg.Register;
								cfg.Operation = prevCfg.Operation;
								break;
							}
						}
					}

					const id = `${cfg.Register}_${cfg.Field}`;

					if (checkedItems.includes(id)) {
						continue;
					}

					const resetValue = getResetValue(registers, cfg);

					if (cfg.Value !== resetValue) {
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
	cfg: Record<string, ConfigField[]>,
	registers: RegisterDictionary[]
) {
	const valueCfg = cfg.VALUE[0];

	if (cfg.VALUE === undefined) {
		throw new Error(
			`Invalid configuration object for control of type integer, received ${JSON.stringify(cfg)}`
		);
	}

	// Value key exists but is empty
	if (valueCfg === undefined) {
		return '';
	}

	const resetValue = getResetValue(registers, valueCfg);

	if (
		typeof resetValue === 'string' &&
		resetValue?.startsWith('0x')
	) {
		return parseInt(resetValue, 16).toString();
	}

	return String(resetValue);
}

function getResetValue(
	registers: RegisterDictionary[],
	valueCfg: ConfigField
) {
	const register = registers.find(
		reg => reg.name === valueCfg.Register
	);

	const field = register?.fields.find(
		fld => fld.name === valueCfg.Field
	);

	return field?.reset;
}
