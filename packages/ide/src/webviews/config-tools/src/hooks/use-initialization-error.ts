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
import {useMemo} from 'react';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import type {TLocaleContext} from '@common/types/l10n';
import {getLocalizedString} from '@common/utils/string';
import type {WebviewError} from '@common/types/errors';

type ErrorContent = {
	title: string;
	description: string;
	items?: string[];
};

type ErrorFormatter = {
	formatContent: (
		body: unknown,
		i10n: TLocaleContext | undefined
	) => ErrorContent;
	docLink?: string;
};

const errorFormatters: Record<string, ErrorFormatter> = {
	unknown: {
		formatContent(_body, i10n) {
			const title = getLocalizedString(i10n, 'errors.unknown.title');
			const description = getLocalizedString(
				i10n,
				'errors.unknown.description'
			);

			return {title, description};
		}
	}
};

/**
 * Custom hook to format initialization errors for display.
 * Handles plugin, data model, and unknown error types with localized messages.
 *
 * @param error - The webview error containing type and body
 * @returns Formatted error content including title, description, items list, and optional doc link
 */
export function useInitializationError(error: WebviewError) {
	const i10n = useLocaleContext();
	const {type, body} = error;

	return useMemo(() => {
		const formatter =
			errorFormatters[type] ?? errorFormatters.unknown;
		const {title, description, items} = formatter.formatContent(
			body,
			i10n
		);
		const {docLink} = formatter;

		return {title, description, items, docLink};
	}, [type, body, i10n]);
}
