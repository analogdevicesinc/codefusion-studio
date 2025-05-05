/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import {VSCodeTextField} from '@vscode/webview-ui-toolkit/react';
import styles from './textfield.module.scss';
import React, {forwardRef, type ChangeEvent} from 'react';

type TextFieldProps = Readonly<{
	inputVal: string | undefined;
	label?: string | JSX.Element;
	optional?: boolean;
	isDisabled?: boolean;
	error?: string;
	placeholder?: string;
	startSlot?: JSX.Element | string;
	endSlot?: JSX.Element | string;
	direction?: 'vertical' | 'horizontal';
	fullWidth?: boolean;
	dataTest?: string;
	onInputChange: (value: string) => void;
	onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	onBeforeInput?: React.FormEventHandler<HTMLInputElement>;
	onFocus?: React.FormEventHandler;
}>;

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
	function TextField(
		{
			inputVal,
			label,
			optional,
			isDisabled,
			error,
			placeholder,
			startSlot,
			endSlot,
			direction = 'vertical',
			fullWidth,
			dataTest,
			onBeforeInput,
			onKeyUp,
			onKeyDown,
			onInputChange,
			onFocus
		},
		ref
	) {
		return (
			<div
				className={`${styles.container} ${direction === 'vertical' ? styles.vertical : styles.horizontal} ${fullWidth ? styles['full-width'] : undefined} ${inputVal ? '' : styles.empty}`}
			>
				{label && (
					<div className={styles.labelContainer}>
						<label htmlFor='control-input'>{label}</label>
						{optional && (
							<span className={styles.optionalLabel}>Optional</span>
						)}
					</div>
				)}
				{direction === 'horizontal' && (
					<div className={styles.divider} />
				)}
				<div>
					<VSCodeTextField
						//@ts-expect-error: VSCodeTextField ref expects a LegacyRef type, but this is not correct
						ref={ref}
						type='text'
						placeholder={placeholder}
						id='control-input'
						data-test={
							dataTest ? `${dataTest}-control-input` : undefined
						}
						disabled={isDisabled}
						className={`${styles.textField} ${error ? styles.errorBorder : undefined}`}
						value={inputVal ?? ''}
						onBeforeInput={onBeforeInput}
						onInput={e => {
							onInputChange(
								(e as ChangeEvent<HTMLInputElement>).target.value
							);
						}}
						onKeyUp={onKeyUp}
						onKeyDown={onKeyDown}
						onFocus={onFocus}
					>
						{startSlot && <div slot='start'>{startSlot}</div>}
						{endSlot && <div slot='end'>{endSlot}</div>}
					</VSCodeTextField>
					{error && (
						<p
							className={styles.errorMsg}
							data-test={`${dataTest}-error`}
						>
							{error}
						</p>
					)}
				</div>
			</div>
		);
	}
);

export default TextField;
