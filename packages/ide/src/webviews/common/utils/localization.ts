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

import {type TLocaleContext} from '../types/l10n';

/**
 * Retrieves the localization context for a given namespace. See bundle.l10n.json
 * @param namespace The namespace for which to retrieve translations.
 * @returns The localization context or undefined if not found.
 */
export function getLocalization(
	namespace: string
): TLocaleContext | undefined {
	const translations = (window as any)
		.__webview_localization_resources__?.[namespace];

	if (translations === undefined) {
		console.warn(`No translations found for namespace: ${namespace}`);
	}

	return translations;
}

/**
 * Localizes a message based on the provided translations and message ID. If parameters are provided, they will be interpolated into the message.
 * @param translations The localization context containing translations. See getLocalization().
 * @param id The message ID to be localized.
 * @param params Optional parameters to interpolate into the message. Parameters should be in the format {paramName} within the message string.
 * @returns The localized message.
 */
export function localizeMessage(
	translations: TLocaleContext | undefined,
	id: string,
	params?: Record<string, string>
) {
	if (translations === undefined) {
		return id;
	}

	let message = extractTranslation(translations, id);

	if (params) {
		message = interpolateTranslation(message, params);
	}

	return message;
}

function extractTranslation(
	translations: TLocaleContext,
	id: string
): string {
	const path = id.split('.');
	let currentPath = translations;

	for (const key of path) {
		if (currentPath === undefined) {
			return id;
		}

		if (typeof currentPath[key] === 'string') {
			return currentPath[key];
		}

		currentPath = currentPath[key];
	}

	return id;
}

function interpolateTranslation(
	message: string,
	params: Record<string, string>
): string {
	return message.replace(
		/\{(\w+)\}/g,
		(match, key) => params[key] ?? match
	);
}
