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

import type {TFormFieldValue} from 'cfs-react-library';
import type {ControlCfg} from '../../../common/types/soc';
import {computeEntryBoxDefaultValue} from './rpn-expression-resolver';

export function getControlDefaultValue(
	control: ControlCfg,
	contextSource: Record<string, string>,
	name?: string
): string {
	const {Hint, Default} = control;

	// If the control has an explicit default, use it.
	if (Default !== undefined && Default !== null) {
		return String(Default);
	}

	// Enum and boolean hints are literal values, not RPN expressions.
	if (
		Hint &&
		(control.Type === 'boolean' || control.Type === 'enum')
	) {
		return Hint;
	}

	// For controls with a hint, attempt parsing the hint using the condition parser.
	if (Hint) {
		// Create context with Name for hint evaluation
		const context = {...contextSource};

		if (name) {
			context.Name = name;
		}

		const parsedHint = computeEntryBoxDefaultValue(context, Hint);

		return parsedHint === null || parsedHint === undefined
			? ''
			: String(parsedHint);
	}

	// Fall back to a type-based default (first enum value, "0" for integers, etc.).
	return getTypeBasedDefault(control);
}

/**
 * Gets the default value for a control based on its type
 * @param control - The control configuration to determine the default value for
 * @returns - The default value for the control type
 */
export function getTypeBasedDefault(control: ControlCfg): string {
	// For enum types, use the first active enum value
	if (control.Type === 'enum' && control.EnumValues?.length) {
		return String(
			control.EnumValues.find(enumValue => !enumValue.Inactive)?.Id ??
				control.EnumValues[0].Id ??
				''
		);
	}

	if (control.Type === 'integer') {
		return '0';
	}

	if (control.Type === 'boolean') {
		return 'FALSE';
	}

	return '';
}

export function areControlValuesEqual(
	value: TFormFieldValue | undefined,
	defaultValue: TFormFieldValue | undefined
) {
	return (
		normalizeControlValue(value) ===
		normalizeControlValue(defaultValue)
	);
}

function normalizeControlValue(value: TFormFieldValue | undefined) {
	if (typeof value === 'boolean') {
		return String(value).toUpperCase();
	}

	const stringValue = String(value ?? '');

	if (['true', 'false'].includes(stringValue.toLowerCase())) {
		return stringValue.toUpperCase();
	}

	return stringValue;
}
