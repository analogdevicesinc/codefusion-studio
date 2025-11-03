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
import type {TFormFieldValue} from 'cfs-react-library';
import type {TControlTypes, TNumericBase} from '../types/errorTypes';
import {generateControlErrorMessage} from './control-errors';
import {generateValidationErrorType} from './validate-inputs';

const getFormattedContent = (value: TFormFieldValue | undefined) => {
	if (value) return value.toString();

	return '';
};

/**
 * Validates a control's value, returning an error object with a message if validation fails, otherwise undefined.
 * @param - existing errors object or empty object, control data for which errors need to be computed
 * @returns - errors: {controlId1: 'error message', controlId2: 'new error message'}
 */
export const computeErrorPerControl = (control: {
	id: string;
	type: TControlTypes;
	value: TFormFieldValue | undefined;
	minVal?: number | string | undefined;
	maxVal?: number | string | undefined;
	base?: TNumericBase | undefined;
	pattern?: string | undefined;
}): Record<string, string> | undefined => {
	const {id, type, value, minVal, maxVal, base, pattern} = control;
	let controlError;

	const inputData = {
		content: getFormattedContent(value),
		controlType: type,
		minVal,
		maxVal,
		base,
		pattern
	};

	const errType = generateValidationErrorType(inputData);

	if (errType) {
		controlError = {
			[id]: generateControlErrorMessage(errType, minVal, maxVal)
		};
	}

	return controlError;
};
