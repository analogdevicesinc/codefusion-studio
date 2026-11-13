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

import type {WestYamlProblem} from '@west-editor/types';

/**
 * Reads a displayable message from a rejection.
 * @param error Whatever the promise rejected with.
 * @returns The error's `message` when it has one, otherwise its string form.
 */
export function getErrorMessage(error: unknown): string {
	if (
		typeof error === 'object' &&
		error !== null &&
		'message' in error &&
		typeof error.message === 'string'
	) {
		return error.message;
	}

	return String(error);
}

/**
 * Reads the YAML problems the host attaches to a failed manifest request.
 * @param error Whatever the promise rejected with.
 * @returns The problems, or undefined when the error is not a YAML error.
 */
export function getYamlProblems(
	error: unknown
): WestYamlProblem[] | undefined {
	if (
		typeof error === 'object' &&
		error !== null &&
		'data' in error &&
		Array.isArray(error.data)
	) {
		return error.data as WestYamlProblem[];
	}

	return undefined;
}
