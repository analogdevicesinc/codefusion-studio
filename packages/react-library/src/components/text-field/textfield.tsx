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
import {VSCodeTextField} from '@vscode/webview-ui-toolkit/react';
import styles from './textfield.module.scss';
import React, {forwardRef, type ChangeEvent} from 'react';

type TextFieldProps = Readonly<{
	/** The current value of the text input */
	inputVal: string | undefined;
	/** Label text or element to display above or beside the input field */
	label?: string | JSX.Element;
	/** Whether to display an "Optional" badge next to the label */
	optional?: boolean;
	/** Whether the input field is disabled */
	isDisabled?: boolean;
	/** Error message to display below the input field. Overrides status */
	error?: string;
	/** Placeholder text to display when the input is empty */
	placeholder?: string;
	/** Content to display at the start of the input field */
	startSlot?: JSX.Element | string;
	/** Content to display at the end of the input field */
	endSlot?: JSX.Element | string;
	/** Layout direction for the label and input field. Defaults to 'vertical' */
	direction?: 'vertical' | 'horizontal';
	/** Whether the component should take up the full width of its container */
	fullWidth?: boolean;
	/** Base string for data-test attributes, useful for testing */
	dataTest?: string;
	/** Size variant of the input field. Defaults to 'large' */
	size?: 'small' | 'large';
	/** Visual status of the input field. Defaults to 'normal' */
	status?: 'error' | 'normal';
	/** Callback invoked when the input value changes. Maps to the native input event */
	onInputChange?: (value: string) => void;
	/** Callback invoked when a key is released */
	onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	/** Callback invoked when a key is pressed down */
	onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	/** Callback invoked before input is processed */
	onBeforeInput?: React.FormEventHandler<HTMLInputElement>;
	/** Callback invoked when the input receives focus */
	onFocus?: React.FormEventHandler;
	/** Maximum number of characters allowed in the input */
	maxLength?: number;
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
			size = 'large',
			status = 'normal',
			fullWidth,
			dataTest,
			onBeforeInput,
			onKeyUp,
			onKeyDown,
			onInputChange,
			onFocus,
			maxLength
		},
		ref
	) {
		return (
			<div
				className={`${styles.container} ${direction === 'vertical' ? styles.vertical : styles.horizontal} ${fullWidth ? styles['full-width'] : undefined} ${inputVal ? '' : styles.empty} ${styles[size]}`}
			>
				{label && (
					<div className={styles.labelContainer}>
						<label htmlFor='control-input'>{label}</label>
						{optional && (
							<span className={styles.optionalLabel}>Optional</span>
						)}
					</div>
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
						className={`${styles.textField} ${status === 'error' || error ? styles.errorBorder : undefined}`}
						value={inputVal ?? ''}
						maxlength={maxLength}
						onBeforeInput={onBeforeInput}
						onInput={e => {
							onInputChange?.(
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
