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
import type {
	ControlErrorTypes,
	TControlTypes,
	TNumericBase
} from '../types/errorTypes';
import {controlErrorTypes} from './control-errors';

/**
 * Converts a value to a number based on the specified numeric base.
 * @param value - The value to be converted (string or number).
 * @param base - The numeric base (e.g., Binary, Octal, Hexadecimal, Decimal).
 * @returns - The parsed number or undefined if parsing fails.
 */
const convertValueToBase = (
	value?: string | number,
	base?: TNumericBase
): number | undefined => {
	if (value === undefined || value === '') return undefined;

	let parsedNumber: number;

	switch (base) {
		case 'Binary':
			parsedNumber =
				typeof value === 'string' ? parseInt(value, 2) : NaN;
			break;
		case 'Octal':
			parsedNumber =
				typeof value === 'string' ? parseInt(value, 8) : NaN;
			break;
		case 'Hexadecimal':
			parsedNumber =
				typeof value === 'string' ? parseInt(value, 16) : NaN;
			break;
		case 'Decimal':
		default:
			parsedNumber = Number(value);
			break;
	}

	return isNaN(parsedNumber) ? undefined : parsedNumber;
};

const splitStringList = (
	content: string,
	persistenceSeparator?: string
): string[] => {
	if (
		persistenceSeparator !== undefined &&
		persistenceSeparator !== ''
	) {
		return content
			.split(persistenceSeparator)
			.map(value => value.trim());
	}

	return content.split(/\r?\n/).map(value => value.trim());
};

const matchesPattern = (value: string, pattern: string): boolean => {
	try {
		return new RegExp(`^(?:${pattern})$`).test(value);
	} catch {
		return false;
	}
};

// eslint-disable-next-line complexity
export const generateValidationErrorType = (inputData: {
	content: string;
	controlType: TControlTypes;
	minVal?: number | string;
	maxVal?: number | string;
	base?: TNumericBase;
	pattern?: string;
	persistenceSeparator?: string;
}): ControlErrorTypes | undefined => {
	const {
		content,
		controlType,
		minVal,
		maxVal,
		base,
		pattern,
		persistenceSeparator
	} = inputData;

	const parsedMinVal = convertValueToBase(minVal, base);
	const parsedMaxVal = convertValueToBase(maxVal, base);

	if (!content) {
		if (controlType === 'integer') {
			return controlErrorTypes.integer;
		}
	}

	if (controlType === 'integer') {
		const parsedContent = convertValueToBase(content, base);

		if (parsedContent === undefined) {
			return controlErrorTypes.integer;
		}

		if (parsedMinVal !== undefined && parsedContent < parsedMinVal) {
			return controlErrorTypes.minVal;
		}

		if (parsedMaxVal !== undefined && parsedContent > parsedMaxVal) {
			return controlErrorTypes.maxVal;
		}
	}

	if (content && controlType === 'text_list' && pattern) {
		const values = splitStringList(content, persistenceSeparator);

		if (
			values.some(
				value => value === '' || !matchesPattern(value, pattern)
			)
		) {
			return controlErrorTypes.text;
		}
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
