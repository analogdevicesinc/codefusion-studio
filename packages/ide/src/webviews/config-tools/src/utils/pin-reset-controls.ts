/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import type {ControlCfg} from '@common/types/soc';
import {computeDefaultValues} from './compute-register-value';
import {getSocPinDictionary} from './soc-pins';
import {
	computeEntryBoxDefaultValue,
	evaluateCondition
} from './rpn-expression-resolver';
import {getControlsForProjectIds} from './api';
import {CONTROL_SCOPES} from '../constants/scopes';
import {getIsExternallyManagedProyect} from './config';

export function getSocPinResetControlValues(
	pinId: string | undefined,
	signalName: string | undefined,
	peripheral: string | undefined,
	controls: ControlCfg[]
) {
	if (pinId && signalName && peripheral) {
		const socPins = getSocPinDictionary();
		const sourcePinCfg = socPins[pinId]?.Signals?.find(
			signal =>
				signal.Name === signalName && signal.Peripheral === peripheral
		)?.PinConfig;

		if (sourcePinCfg) {
			return computeDefaultValues(sourcePinCfg, controls, {
				Name: signalName
			});
		}
	}

	return {};
}

/**
 * Computes the initial pin configuration based on the provided pin, peripheral, signal, and project ID.
 *
 * This function performs the following steps:
 * 1. Retrieves the SoC pin dictionary and pin controls for the specified project
 * 2. Finds the source pin configuration from the pin's signals matching the provided signal and peripheral
 * 3. Computes reset control values for the pin
 * 4. Filters controls based on their conditions
 * 5. Adds plugin option default values to the configuration
 *
 * @param Pin - The pin identifier
 * @param Peripheral - The peripheral associated with the pin (can be undefined)
 * @param Signal - The signal name for the pin
 * @param ProjectId - The project identifier to retrieve controls for
 *
 * @returns A promise that resolves to a record of control IDs to their initial values
 */
export async function computeInitialPinConfig({
	Pin,
	Peripheral,
	Signal,
	ProjectId
}: {
	Pin: string;
	Peripheral: string | undefined;
	Signal: string;
	ProjectId: string;
}) {
	if (getIsExternallyManagedProyect(ProjectId)) {
		return {};
	}

	const socPins = getSocPinDictionary();
	const initialPinCfg: Record<string, string> = {};
	const extendedCfg: Record<string, string> = {};

	const controls = await getControlsForProjectIds(
		[ProjectId],
		CONTROL_SCOPES.PIN_CONFIG
	).then(({PinConfig}) => PinConfig);

	const controlsDict = controls.reduce<Record<string, ControlCfg>>(
		(acc, control) => {
			acc[control.Id] = control;

			return acc;
		},
		{}
	);

	const {PinConfig, Name} =
		socPins[Pin]?.Signals?.find(
			signal =>
				signal.Name === Signal && signal.Peripheral === Peripheral
		) ?? {};

	if (Name) {
		extendedCfg.Name = Name;
	}

	if (PinConfig) {
		const computedResetValues = getSocPinResetControlValues(
			Pin,
			Signal,
			Peripheral,
			controls
		);

		if (Object.keys(computedResetValues).length) {
			Object.assign(extendedCfg, computedResetValues);
		}

		Object.entries(PinConfig).forEach(([controlKey]) => {
			if (
				evaluateCondition(
					extendedCfg,
					controlsDict[controlKey]?.Condition
				)
			) {
				initialPinCfg[controlKey] = computedResetValues[controlKey];
			}
		});
	}

	// Compute plugin options default values
	// Filter controls to only those with PluginOption set
	const pluginOptions = Object.values(controlsDict).filter(
		control => control?.PluginOption
	);

	for (const control of pluginOptions) {
		if (control.Condition) {
			const shouldAppend = evaluateCondition(
				extendedCfg,
				control.Condition
			);

			if (!shouldAppend) {
				continue;
			}
		}

		const {Type, EnumValues, Hint, Id} = control;
		let defaultValue = '';

		// For enum types, use the first enum value
		if (Type === 'enum' && EnumValues?.length) {
			defaultValue = String(EnumValues[0].Id ?? '');
		}
		// For controls with a hint, attempt parsing the hint using the condition parser
		else if (Hint) {
			// Create context with Name for hint evaluation
			const context = {...initialPinCfg};

			if (Signal) {
				context.Name = Signal;
			}

			const parsedHint = computeEntryBoxDefaultValue(context, Hint);

			defaultValue = typeof parsedHint === 'string' ? parsedHint : '';
		}

		initialPinCfg[Id] = defaultValue;
	}

	return initialPinCfg;
}

/**
 * Computes the next pin configuration object for a given pin, signal, and set of controls.
 *
 * This function:
 * - Filters the provided controls to only those relevant for the pin/signal (plugin options always included).
 * - Evaluates which controls are active based on their conditions and the current config.
 * - Removes config properties not present in the next control set.
 * - Adds missing config properties with their default values (including plugin option defaults).
 *
 * @param controls - The list of controls to consider (already filtered for the current SoC/pin/signal).
 * @param pinId - The pin identifier.
 * @param Name - The signal name.
 * @param Peripheral - The peripheral name.
 * @param newConfig - The current config object to update.
 * @returns The updated config object.
 */
export function computeNextPinConfig({
	controls,
	pinId,
	Name,
	Peripheral,
	newConfig
}: {
	controls: ControlCfg[];
	pinId: string;
	Name: string;
	Peripheral: string;
	newConfig: Record<string, any>;
}) {
	const nextControlSet: ControlCfg[] = [];

	for (const control of controls) {
		const augmentedCfg = {...newConfig, Name};

		if (evaluateCondition(augmentedCfg, control.Condition)) {
			nextControlSet.push(control);
		}
	}

	// Remove config options not present in nextControlSet
	for (const key in newConfig) {
		if (!Object.prototype.hasOwnProperty.call(newConfig, key))
			continue;

		const targetControl = nextControlSet.find(
			control => control.Id === key
		);

		if (!targetControl) {
			Reflect.deleteProperty(newConfig, key);
		}
	}

	// Add missing config values from nextControlSet
	let defaults: Record<string, string> | undefined;

	for (const control of nextControlSet) {
		if (
			!Object.prototype.hasOwnProperty.call(newConfig, control.Id)
		) {
			if (!defaults) {
				defaults = getSocPinResetControlValues(
					pinId,
					Name,
					Peripheral,
					nextControlSet
				);

				// Include defaults from plugin options
				const pluginOptions = Object.values(nextControlSet).filter(
					control => control?.PluginOption
				);

				applyPluginOptionDefaults(pluginOptions, defaults, Name);
			}

			newConfig[control.Id] = defaults?.[control.Id] ?? '';
		}
	}

	return newConfig;
}

/**
 * Applies default values for plugin option controls to the defaults object.
 * Used by computeNextPinConfig.
 */
function applyPluginOptionDefaults(
	pluginOptions: ControlCfg[],
	defaults: Record<string, any>,
	Name: string
) {
	for (const control of pluginOptions) {
		const {Type, EnumValues, Hint, Id, Default} = control;
		let defaultValue = '';

		if (Type === 'enum' && EnumValues?.length) {
			defaultValue = String(EnumValues[0].Id ?? '');
		} else if (Default) {
			defaultValue = String(Default);
		} else if (Hint) {
			const context = {...defaults};

			if (Name) {
				context.Name = Name;
			}

			const parsedHint = computeEntryBoxDefaultValue(context, Hint);

			defaultValue = String(parsedHint ?? '');
		}

		defaults[Id] = defaultValue;
	}
}
