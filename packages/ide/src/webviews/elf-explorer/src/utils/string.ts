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
/**
 *
 * @param word string to capitalize
 * @returns string
 */
// type DataTree = Array<Record<string, any>>;

export const capitalizeWord = (word: string): string =>
	word.charAt(0).toUpperCase() + word.slice(1);

export const camelCaseToSpaces = (str: string): string =>
	// Use a regular expression to find the positions where a lowercase letter is followed by an uppercase letter
	str.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
