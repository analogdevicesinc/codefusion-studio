/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {ChangeEvent, useEffect, useRef, useState} from 'react';
import styles from './hex-input-field.module.scss';

export interface HexInputFieldProps {
	stepAmount?: number;
	value: string;
	dataTest?: string;
	error?: string;
	onValueChange: (value: string) => void;
}
export default function HexInputField({
	value,
	dataTest,
	error,
	onValueChange
}: HexInputFieldProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const [cursor, setCursor] = useState<number | null>(null);

	useEffect(() => {
		inputRef.current?.setSelectionRange(cursor, cursor);
	}, [inputRef, cursor, value]);

	// Remove all characters that are not hexadecimal
	const formatStringToHex = (input: string): string => {
		return input.replace(/[^0-9A-F]/g, '').trim();
	};

	const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value.toUpperCase();
		const cursorPosition = e.target.selectionStart;

		if (cursorPosition !== null) {
			setCursor(cursorPosition);
		}

		onValueChange(newValue);
	};

	return (
		<div className={styles.container} data-test={dataTest}>
			<div
				className={`${!value ? styles.empty : ''} ${error ? styles.errorBorder : ''} ${styles.inputWrapper}`}
			>
				<div className={styles.hexPrefix}>0x</div>

				<input
					ref={inputRef}
					className={styles.input}
					placeholder='00000000'
					type='text'
					onChange={handleOnChange}
					value={value ? formatStringToHex(value?.toUpperCase()) : ''}
				></input>
			</div>
			{error && (
				<span
					data-test={`${dataTest}-error`}
					className={styles.error}
				>
					{error}
				</span>
			)}
		</div>
	);
}
