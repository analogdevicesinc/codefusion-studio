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
	ControlErrorTypes,
	NodeErrorTypes
} from '../types/errorTypes';

export const controlErrorTypes: Record<string, ControlErrorTypes> = {
	integer: 'INVALID_INTEGER',
	identifier: 'INVALID_IDENTIFIER',
	minVal: 'INVALID_MIN_VAL',
	maxVal: 'INVALID_MAX_VAL'
};

export const nodeErrorTypes: Record<string, NodeErrorTypes> = {
	...controlErrorTypes,
	highComputedValue: 'HIGH_COMPUTED_VALUE',
	lowComputedValue: 'LOW_COMPUTED_VALUE',
	unconfiguredValue: 'UNCONFIGURED_VALUE'
};

export function generateControlErrorMessage(
	errorType: ControlErrorTypes,
	minVal?: number | undefined,
	maxVal?: number | undefined
) {
	switch (errorType) {
		case nodeErrorTypes.integer:
			return 'Invalid input type';
		case nodeErrorTypes.identifier:
			return 'Invalid C expression';
		case nodeErrorTypes.minVal:
			checkMinMaxValues(minVal, maxVal);

			return `Value is lower than the allowed range ${minVal} to ${maxVal}`;
		case nodeErrorTypes.maxVal:
			checkMinMaxValues(minVal, maxVal);

			return `Value exceeds the range ${minVal} to ${maxVal}`;
		default:
			console.error('Invalid error type provided');

			return 'Unknown error';
	}
}

function checkMinMaxValues(
	minVal: number | undefined,
	maxVal: number | undefined
) {
	if (!minVal || !maxVal) {
		console.error(
			'Minimum and maximum values are required to generate the error message for min val error type'
		);

		return 'invalid min and max values';
	}
}
