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

import type {TLocaleContext} from '../contexts/LocaleContext';

/**
 *
 * @param word string to capitalize
 * @returns string
 */
// type DataTree = Array<Record<string, any>>;

export const capitalizeWord = (word: string): string =>
	word.charAt(0).toUpperCase() + word.slice(1);

/**
 * Format a number to either a fixed decimal or to the first significant digit
 * @param num the number to format
 * @param preferredDecimals number of preferred decimal places
 * @param maxDecimals maximum number of decimal places regardless of first significant digit
 * @returns formatted number as a string
 */
export function formatToFixedOrFirstSignificant(
	num: number,
	preferredDecimals = 2,
	maxDecimals = 4
): string {
	const numStr = num.toString();

	const [main, dec] = numStr.split('.');

	if (!dec) {
		return numStr;
	}

	if (dec.length <= preferredDecimals) {
		return numStr;
	}

	const firstSignificantIndex = dec.search(/[1-9]/);

	if (firstSignificantIndex === -1) {
		return main;
	}

	if (firstSignificantIndex + 1 <= maxDecimals) {
		return num.toFixed(
			Math.max(preferredDecimals, firstSignificantIndex + 1)
		);
	}

	return num.toFixed(0);
}

/**
 * Retrieves a localized string from the translation context using dot notation.
 * @param translations - The translation context object
 * @param key - The translation key in dot notation (e.g., 'errors.dataModel.title')
 * @returns The localized string, or the key itself if not found
 * @example
 * getLocalizedString(i10n, 'errors.dataModel.title')
 * // returns: 'Missing SoC Data Model'
 */
export function getLocalizedString(
	translations: TLocaleContext | undefined,
	key: string
): string {
	if (!translations) {
		return key;
	}

	const path = key.split('.');
	let current: any = translations;

	for (const segment of path) {
		if (
			current &&
			typeof current === 'object' &&
			segment in current
		) {
			current = current[segment];
		} else {
			return key;
		}
	}

	return typeof current === 'string' ? current : key;
}

/**
 * Interpolates named arguments into a template string using ${name} placeholders.
 * @param template - The template string with ${name} placeholders
 * @param args - Object with key-value pairs for interpolation
 * @returns The interpolated string
 * @example
 * interpolateString('Hello ${name}, you have ${count} messages', {name: 'Alice', count: 5})
 * // returns: 'Hello Alice, you have 5 messages'
 */
export function interpolateString(
	template: string,
	args?: Record<string, string | number>
): string {
	if (!args || Object.keys(args).length === 0) {
		return template;
	}

	return template.replace(/\$\{(\w+)\}/g, (match, key) => {
		const value = args[key];

		return value === undefined ? match : String(value);
	});
}

/**
 * Gets a localized string and interpolates named arguments in one step.
 * @param translations - The translation context object
 * @param key - The translation key in dot notation
 * @param args - Object with key-value pairs for interpolation
 * @returns The localized and interpolated string
 * @example
 * localizeWithArgs(i10n, 'errors.welcome', {name: 'Alice', count: 5})
 * // If translation is 'Hello ${name}, you have ${count} messages'
 * // returns: 'Hello Alice, you have 5 messages'
 */
export function localizeWithArgs(
	translations: TLocaleContext | undefined,
	key: string,
	args?: Record<string, string | number>
): string {
	const template = getLocalizedString(translations, key);

	return interpolateString(template, args);
}
