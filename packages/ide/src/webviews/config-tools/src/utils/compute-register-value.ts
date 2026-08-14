/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
/* eslint-disable no-bitwise */
import type {
	ConfigField,
	ConfigFields,
	ControlCfg,
	FieldDictionary,
	RegisterConfigField,
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
		pinConfig: Array<RegisterConfigField | undefined>;
		signalConfig: ConfigField[] | undefined;
	}>,
	registerConfigs: Array<
		Record<string, RegisterConfigField[] | undefined>
	>,
	currentRegister: RegisterDictionary
) {
	let resetValue = BigInt(0);
	let computedValue = BigInt(0);
	let previousRegister = '';

	const modifiedFields: RegisterConfigField[] = [];

	// Get modified fields for current register from pin assignments
	assignedPinsConfigs.forEach(config => {
		const mergedConfigs = [
			...(config.pinConfig ?? []),
			// The control value is not used in PinMux and initialization sequences, so we set it to 0.
			...(config.signalConfig?.map(s => ({...s, ControlValue: 0})) ??
				[])
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
	registerConfigs.forEach(config => {
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
			const value = BigInt(
				evaluateBitfieldExpression(
					modifiedField.ControlValue,
					modifiedField.Value!
				)
			);

			const {position, length} = getEffectiveSliceBounds(
				socField,
				modifiedField
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
		pinConfig: Array<RegisterConfigField | undefined>;
		signalConfig: ConfigField[] | undefined;
	}>,
	registerConfigs: Array<
		Record<string, RegisterConfigField[] | undefined>
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
			// The control value is not used in PinMux and initialization sequences, so we set it to 0.
			...(config.signalConfig?.map(s => ({...s, ControlValue: 0})) ??
				[])
		])
		.flat()
		.reduce<RegisterConfigField[]>((acc, config) => {
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

	// Filtered config fields that belong to the current register
	const otherConfig = Object.values(registerConfigs).reduce<
		RegisterConfigField[]
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

	const mergedConfigs = [...pinsConfig, ...otherConfig];

	// Apply all writes for this field in chronological order.
	// Full-field writes naturally reset everything; slices overlay on top.
	for (const targetField of mergedConfigs) {
		if (targetField?.Field !== field.name) {
			continue;
		}

		const value = BigInt(
			evaluateBitfieldExpression(
				targetField.ControlValue,
				targetField.Value!
			)
		);

		if (
			targetField.SlicePosition !== undefined &&
			targetField.SliceWidth !== undefined
		) {
			const slicePos = BigInt(targetField.SlicePosition);
			const sliceLen = BigInt(targetField.SliceWidth);
			const sliceMask =
				((BigInt(1) << sliceLen) - BigInt(1)) << slicePos;

			computedValue =
				(computedValue & ~sliceMask) |
				((value << slicePos) & sliceMask);
		} else {
			computedValue = value;
		}
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

		const value = control?.EnumValues?.find(
			e => e.Id === controlValue
		)?.Value;

		if (value !== undefined) {
			const numericValue = Number(value);

			return Number.isFinite(numericValue) ? numericValue : 0;
		}

		return 0;
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

function evaluateHint(
	pinSignalName: Record<string, string> | undefined,
	hint: string | undefined
): string | undefined {
	const raw = computeEntryBoxDefaultValue(pinSignalName, hint);

	return raw !== undefined && raw !== '' ? String(raw) : undefined;
}

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

	for (const [controlValueKey, controlValues] of Object.entries(
		filteredConfig
	)) {
		const control = getControl(controlValueKey, controls);
		const controlType = control?.Type;

		let defaultValue: string | undefined;

		if (control?.Default !== undefined) {
			defaultValue = String(control.Default);
			defaultValueObj[controlValueKey] = defaultValue;
			continue;
		}

		if (controlType === 'integer') {
			defaultValueObj[controlValueKey] =
				evaluateHint(pinSignalName, control?.Hint) ??
				getIntegerControlResetValue(controlValues);

			continue;
		} else if (controlType === 'text') {
			defaultValueObj[controlValueKey] =
				evaluateHint(pinSignalName, control?.Hint) ?? '';
			continue;
		}

		defaultValue = undefined;

		for (const [key, configs] of Object.entries(controlValues)) {
			if (configMatchesResetValues(
					configs,
					controlValueKey,
					key,
					controls
				)
			) {
				defaultValue = key;
				break;
			}
		}

		defaultValueObj[controlValueKey] =
			defaultValue ?? Object.keys(controlValues)[0];
	}

	return defaultValueObj;
}

/**
 * Checks whether a config sequence matches the register reset values.
 * Returns true if write steps produce the expected reset values.
 *
 * Iterates backwards (newest first). Tracks which bits per field have
 * been covered by newer slice writes. When a full-field write is
 * encountered, only the uncovered bits are compared against reset.
 */
function configMatchesResetValues(
	configs: ConfigField[],
	controlValueKey: string,
	key: string,
	controls: ControlCfg[]
): boolean {
	// Track which bits have been covered by newer writes per field.
	// Key: "Register_Field", Value: bigint bitmask of covered bits.
	const coveredBits = new Map<string, bigint>();

	for (let i = configs.length - 1; i >= 0; i--) {
		const cfg = configs[i];
		const cfgValue: string | undefined = cfg.Value;

		if (['poll', 'read'].includes(cfg.Operation.toLowerCase())) {
			continue;
		} else if (cfg.Operation.toLowerCase() === 'withprevious') {
			resolveWithPrevious(cfg, configs, i);
		}

		const fieldKey = `${cfg.Register}_${cfg.Field}`;
		const covered = coveredBits.get(fieldKey) ?? BigInt(0);
		const isSliced =
			cfg.SlicePosition !== undefined &&
			cfg.SliceWidth !== undefined;

		// Determine the write mask and uncovered bits
		const writeMask = isSliced
			? ((BigInt(1) << BigInt(cfg.SliceWidth!)) - BigInt(1)) <<
				BigInt(cfg.SlicePosition!)
			: BigInt(-1); // Full-field write covers all bits

		const uncovered = writeMask & ~covered;

		if (uncovered === BigInt(0)) {
			continue; // All bits written by this step are already covered
		}

		const value = evaluateBitfieldExpression(
			getControlIntegerValue(controlValueKey, key, controls),
			cfgValue!
		);

		const resetValue = getResetValue(cfg);

		if (typeof resetValue === 'undefined') {
			return false;
		}

		// For slices, shift value into field position for comparison
		const positionedValue = isSliced
			? BigInt(value) << BigInt(cfg.SlicePosition!)
			: BigInt(value);

		if (
			(positionedValue & uncovered) !==
			(BigInt(resetValue) & uncovered)
		) {
			return false;
		}

		coveredBits.set(fieldKey, covered | writeMask);
	}

	return true;
}

/**
 * Resolves WithPrevious operations by copying the register and operation
 * from the preceding non-WithPrevious step.
 */
function resolveWithPrevious(
	cfg: ConfigField,
	configs: ConfigField[],
	currentIndex: number
): void {
	for (let j = currentIndex - 1; j >= 0; j--) {
		const prevCfg = configs[j];

		if (prevCfg.Operation.toLowerCase() !== 'withprevious') {
			cfg.Register = prevCfg.Register;
			cfg.Operation = prevCfg.Operation;
			break;
		}
	}
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

	let resetValue = getSlicedResetValue(valueCfg);

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

/**
 * Returns the reset value for a ConfigField, extracting only the slice
 * portion if SlicePosition and SliceWidth are specified.
 * Uses BigInt shifting/masking to avoid JS 32-bit bitwise coercion issues.
 */
function getSlicedResetValue(valueCfg: ConfigField) {
	let resetValue = getResetValue(valueCfg);

	if (
		typeof resetValue !== 'undefined' &&
		valueCfg.SlicePosition !== undefined &&
		valueCfg.SliceWidth !== undefined
	) {
		resetValue = Number(
			(BigInt(resetValue) >> BigInt(valueCfg.SlicePosition)) &
				((BigInt(1) << BigInt(valueCfg.SliceWidth)) - BigInt(1))
		);
	}

	return resetValue;
}

/**
 * Computes effective bit position and length for a ConfigField within its
 * register, accounting for optional SlicePosition/SliceWidth.
 *
 * The slice is assumed to be valid (fits within the bitfield) as this is
 * enforced by the data model schema validation.
 */
function getEffectiveSliceBounds(
	socField: FieldDictionary,
	configField: ConfigField
): {position: bigint; length: bigint} {
	if (
		configField.SlicePosition !== undefined &&
		configField.SliceWidth !== undefined
	) {
		const slicePosition = configField.SlicePosition;
		const sliceWidth = configField.SliceWidth;

		return {
			position: BigInt(socField.position + slicePosition),
			length: BigInt(sliceWidth)
		};
	}

	return {
		position: BigInt(socField.position),
		length: BigInt(socField.length)
	};
}
