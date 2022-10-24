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
import type {ControlErrorTypes} from '../types/errorTypes';
import {controlErrorTypes} from './control-errors';

export const generateValidationErrorType = (inputData: {
	content: string | undefined;
	controlType: string | undefined;
	minVal: number | undefined;
	maxVal: number | undefined;
}): ControlErrorTypes | undefined => {
	const {content, controlType, minVal, maxVal} = inputData;

	if (!content) {
		if (controlType === 'integer') return controlErrorTypes.integer;

		if (controlType === 'identifier')
			return controlErrorTypes.identifier;
	}

	if (
		content &&
		controlType === 'integer' &&
		!/^-?\d+$/.test(content)
	) {
		return controlErrorTypes.integer;
	}

	if (
		controlType === 'integer' &&
		minVal &&
		Number(content) < minVal
	) {
		return controlErrorTypes.minVal;
	}

	if (
		controlType === 'integer' &&
		maxVal &&
		Number(content) > maxVal
	) {
		return controlErrorTypes.maxVal;
	}

	if (
		content &&
		controlType === 'identifier' &&
		!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(content)
	) {
		return controlErrorTypes.identifier;
	}

	return undefined;
};
