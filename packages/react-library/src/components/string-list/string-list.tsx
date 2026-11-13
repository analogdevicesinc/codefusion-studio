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

import {useEffect, useRef, useState} from 'react';
import type {KeyboardEvent} from 'react';

import TextArea from '../text-area/text-area.js';

type StringListProps = Readonly<{
	value: string | undefined;
	persistenceSeparator?: string;
	preventSeparatorInput?: boolean;
	placeholder?: string;
	rows?: number;
	error?: string;
	dataTest?: string;
	onInputChange: (value: string) => void;
}>;

const normalizeLineEndings = (value: string): string =>
	value.replace(/\r\n/g, '\n');

const getInitialUiValue = (
	value: string | undefined,
	persistenceSeparator?: string
): string => {
	const persistedValue = value ?? '';

	if (
		persistenceSeparator === undefined ||
		persistenceSeparator === ''
	) {
		return normalizeLineEndings(persistedValue);
	}

	return persistedValue.split(persistenceSeparator).join('\n');
};

const getPersistedValue = (
	uiValue: string,
	persistenceSeparator?: string
): string => {
	const normalizedValue = normalizeLineEndings(uiValue);

	if (
		persistenceSeparator === undefined ||
		persistenceSeparator === ''
	) {
		return normalizedValue;
	}

	return normalizedValue.replace(/\n/g, persistenceSeparator);
};

const isSeparatorKey = (
	event: KeyboardEvent<HTMLDivElement>,
	persistenceSeparator?: string
): boolean => {
	if (
		!persistenceSeparator ||
		event.ctrlKey ||
		event.metaKey ||
		event.altKey
	) {
		return false;
	}

	if (persistenceSeparator === ' ') {
		return event.key === ' ' || event.code === 'Space';
	}

	if (persistenceSeparator === '\t') {
		return event.key === 'Tab';
	}

	if (
		persistenceSeparator === '\n' ||
		persistenceSeparator === '\r\n'
	) {
		return event.key === 'Enter';
	}

	return (
		persistenceSeparator.length === 1 &&
		event.key === persistenceSeparator
	);
};

export default function StringList({
	value,
	persistenceSeparator,
	preventSeparatorInput = false,
	placeholder = '',
	rows = 6,
	error,
	dataTest,
	onInputChange
}: StringListProps) {
	const [uiValue, setUiValue] = useState(() =>
		getInitialUiValue(value, persistenceSeparator)
	);

	const lastEmittedValue = useRef<string | undefined>();
	const lastEmittedSeparator = useRef<string | undefined>(
		persistenceSeparator
	);

	useEffect(() => {
		const separatorChanged =
			lastEmittedSeparator.current !== persistenceSeparator;

		lastEmittedSeparator.current = persistenceSeparator;

		if (!separatorChanged && lastEmittedValue.current === value) {
			lastEmittedValue.current = undefined;

			return;
		}

		lastEmittedValue.current = undefined;

		setUiValue(getInitialUiValue(value, persistenceSeparator));
	}, [value, persistenceSeparator]);

	const handleInputChange = (nextUiValue: string) => {
		const normalizedUiValue = normalizeLineEndings(nextUiValue);
		const persistedValue = getPersistedValue(
			normalizedUiValue,
			persistenceSeparator
		);

		setUiValue(normalizedUiValue);
		lastEmittedValue.current = persistedValue;

		onInputChange(persistedValue);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (
			preventSeparatorInput &&
			isSeparatorKey(event, persistenceSeparator)
		) {
			event.preventDefault();
		}
	};

	return (
		<div onKeyDownCapture={handleKeyDown}>
			<TextArea
				value={uiValue}
				placeholder={placeholder}
				rows={rows}
				error={error}
				dataTest={dataTest}
				onInputChange={handleInputChange}
			/>
		</div>
	);
}
