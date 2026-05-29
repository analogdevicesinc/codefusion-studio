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

import {useLocaleContext} from '../../contexts/LocaleContext';
import type {TLocaleContext} from '../../types/l10n';
import type {ReactElement} from 'react';
import {localizeMessage} from '../../utils/localization';

/**
 * A component that renders a localized message based on the provided message ID and optional parameters.
 * If parseHtml is set to true, the message will be rendered as HTML.
 * Note that parseHtml should not be used when params are provided, as this could lead to XSS vulnerabilities.
 */
export function LocalizedMessage(
	props: Readonly<{
		id: string;
		params?: Record<string, string>;
		parseHtml?: false;
	}>
): string;
export function LocalizedMessage(
	props: Readonly<{
		id: string;
		params?: never;
		parseHtml: true;
	}>
): ReactElement<any, any>;

export function LocalizedMessage(
	props: Readonly<
		| {
				id: string;
				params?: Record<string, string>;
				parseHtml?: false;
		  }
		| {
				id: string;
				params?: never;
				parseHtml: true;
		  }
	>
): ReactElement<any, any> | string {
	const {id, params, parseHtml} = props;
	const translations: TLocaleContext | undefined = useLocaleContext();

	const message = localizeMessage(translations, id, params);

	if (parseHtml && !params) {
		// eslint-disable-next-line react/no-danger
		return <div dangerouslySetInnerHTML={{__html: message}} />;
	}

	if (parseHtml && params) {
		console.warn(
			`Message ID: ${id as string}: parseHtml is not supported when params are provided. This could otherwise lead to xss vulnerabilities.`
		);
	}

	return message;
}
