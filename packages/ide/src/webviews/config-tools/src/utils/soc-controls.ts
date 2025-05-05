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
	ControlCfg,
	ControlDictionary,
	Controls
} from '@common/types/soc';
import {getSocControls} from './api';
import type {
	TFormControl,
	TFormControlType,
	TFormFieldValue
} from 'cfs-react-library';
import type {SocControl} from 'cfs-plugins-api';

import {evaluateCondition} from './rpn-expression-resolver';
import {computeErrorPerControl} from '@common/services/dynamic-form-svc';
import type {TControlTypes} from '../types/errorTypes';

let socControls: Controls = {};

export const SET_INSTRUCTION = 'Set';
export const SELECT_INSTRUCTION = 'Select';

const socControlsDictionary: Record<
	string,
	ControlDictionary | undefined
> = {};

// Initialize SoC controls
if (import.meta.env.MODE === 'development') {
	initializeSocControls();
} else {
	socControls = await getSocControls();
}

/**
 * Initializes the SOC controls either from Cypress test environment, dev environment, or default empty object
 * Populates the SOC controls dictionary after initialization
 */
function initializeSocControls() {
	socControls = (window as any).__DEV_SOC__?.Controls ?? {};

	if ((window as any).Cypress) {
		socControls = JSON.parse(
			window.localStorage.getItem('Controls') ?? '{}'
		);
	}
}

function getCachedSocControls() {
	if (!Object.keys(socControls).length) {
		initializeSocControls();
	}

	return socControls;
}

/**
 * Retrieves the dictionary of controls for a specific type
 * Initializes and caches the dictionary if not already present
 * @param type - The type of controls to retrieve
 * @returns A dictionary of controls for the specified type
 */
export function getSocControlsDictionary(
	type: string
): ControlDictionary {
	if (
		socControlsDictionary[type] &&
		Object.keys(socControlsDictionary[type]).length
	)
		return socControlsDictionary[type];

	const controls = getCachedSocControls();

	socControlsDictionary[type] = controls[type]?.reduce(
		(obj, control) => ({
			...obj,
			[control.Id]: control
		}),
		{}
	);

	return socControlsDictionary[type] ?? {};
}

/**
 * Formats SOC controls into form controls compatible with the dynamic form component.
 * @param controls - Array of SOC control configurations
 * @param currentConfig - Current peripheral config. Required to compute if the control should render or not.
 * @param modifiedFields - A record that tracks which fields have diverged from the default values. Used to highlight the field labels in the UI.
 * @returns Array of form controls formatted for the dynamic form component. Controls with unmet conditions are filtered out.
 */
export function formatControlsForDynamicForm(
	controls: ControlCfg[],
	currentConfig: Record<string, any>,
	modifiedFields: Record<string, boolean>
): TFormControl[] {
	const formattedControls: TFormControl[] = [];

	for (const control of controls) {
		if (control.Condition) {
			const shouldMount = evaluateCondition(
				currentConfig,
				control.Condition
			);

			if (!shouldMount) continue;
		}

		formattedControls.push({
			id: control.Id,
			name: `${control.Description}${
				modifiedFields?.[control.Id] ? ' *' : ''
			}`,
			type: control.Type as TFormControlType,
			description: control.Description,
			pluginOption: control.PluginOption,
			default: control.Type === 'integer' ? control.Hint : '',
			...(control.EnumValues?.length
				? {
						enum:
							control.EnumValues?.map(value => ({
								label: value.Description,
								value: value.Id
							})) ?? []
					}
				: {}),
			required: true
		});
	}

	return formattedControls;
}

/**
 * Categorizes controls into regular peripheral controls and plugin options in a single iteration
 * @param controls - Array of form controls
 * @returns A tuple where the first element is an array of peripheral controls and the second is an array of plugin option controls
 */
export function categorizeControls(
	controls: TFormControl[]
): [TFormControl[], TFormControl[]] {
	return controls.reduce<[TFormControl[], TFormControl[]]>(
		(acc, control) => {
			if (control.pluginOption) {
				acc[1].push(control);
			} else {
				acc[0].push(control);
			}

			return acc;
		},
		[[], []]
	);
}

/**
 * It updates the errors object by adding or removing validation errors for a specific control based on its value.
 * The result to be used as prop to the <DynamicForm /> component.
 * @param errors - already existing errors displayed in the form
 * @param control
 * @param value
 * @returns - the updated object of errors to be displayed
 */
export const getFormErrors = (
	errors: Record<string, string>,
	control: SocControl,
	value: TFormFieldValue
): Record<string, string> => {
	let updatedErrors = {};

	const controlError: Record<string, string> | undefined =
		computeErrorPerControl({
			id: control.Id,
			type: control.Type as TControlTypes,
			value,
			minVal: control?.MinimumValue ?? undefined,
			maxVal: control?.MaximumValue ?? undefined,
			pattern: control?.Pattern ?? undefined
		});

	if (controlError) {
		updatedErrors = {
			...errors,
			[control.Id]: controlError[control.Id]
		};
	} else {
		const {[control.Id]: _, ...remainingErrors} = errors;
		updatedErrors = remainingErrors;
	}

	return updatedErrors;
};
