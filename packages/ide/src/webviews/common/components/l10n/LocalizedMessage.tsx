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
/* eslint-disable react/boolean-prop-naming */
import {useLocaleContext} from '../../contexts/LocaleContext';
import type {TLocaleContext} from '../../types/l10n';
import type {ReactElement} from 'react';

export function LocalizedMessage(
	props: Readonly<{
		id: string;
		parseHtml: true;
	}>
): ReactElement;
export function LocalizedMessage(
	props: Readonly<{
		id: string;
		parseHtml?: false | undefined;
	}>
): string;

export function LocalizedMessage(
	props: Readonly<{
		id: string;
		parseHtml?: boolean;
	}>
): ReactElement | string {
	const {id, parseHtml} = props;
	const translations: TLocaleContext | undefined = useLocaleContext();

	if (translations === undefined) {
		return id;
	}

	const path = id.split('.');
	let message = id;
	let currentPath = translations;

	for (const key of path) {
		if (typeof currentPath[key] === 'string') {
			message = currentPath[key];
			break;
		} else {
			currentPath = currentPath[key];
		}
	}

	if (parseHtml) {
		// eslint-disable-next-line react/no-danger
		return <div dangerouslySetInnerHTML={{__html: message}} />;
	}

	return message;
}
