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
import type {
	ControlErrorTypes,
	TControlTypes
} from '../types/errorTypes';
import {controlErrorTypes} from './control-errors';

export const generateValidationErrorType = (inputData: {
	content: string;
	controlType: TControlTypes;
	minVal?: number;
	maxVal?: number;
	pattern?: string;
}): ControlErrorTypes | undefined => {
	const {content, controlType, minVal, maxVal, pattern} = inputData;

	if (!content) {
		if (controlType === 'integer') return controlErrorTypes.integer;
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
		typeof minVal === 'number' &&
		Number(content) < minVal
	) {
		return controlErrorTypes.minVal;
	}

	if (
		controlType === 'integer' &&
		typeof maxVal === 'number' &&
		Number(content) > maxVal
	) {
		return controlErrorTypes.maxVal;
	}

	if (
		content &&
		controlType === 'text' &&
		pattern &&
		!new RegExp('^' + pattern + '$').test(content)
	) {
		return controlErrorTypes.text;
	}

	if (
		!content &&
		controlType === 'text' &&
		pattern &&
		!new RegExp('^' + pattern + '$').test('')
	) {
		return controlErrorTypes.text;
	}

	return undefined;
};
