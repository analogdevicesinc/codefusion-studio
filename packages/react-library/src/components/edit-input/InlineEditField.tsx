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

import {forwardRef, type KeyboardEvent, useCallback} from 'react';
import CloseIcon from '../icons/close-icon.js';
import TextField from '../text-field/textfield.js';
import Button from '../button/button.js';
import CheckedIcon from '../icons/checked-icon.js';
import styles from './InlineEditField.module.scss';

export type InlineEditFieldProps = Readonly<{
	inputVal: string | undefined;
	label?: string;
	disabled?: boolean;
	dataTest?: string;
	placeholder?: string;
	maxLength?: number;
	onConfirm: () => void;
	onCancel: () => void;
	onInputChange: (value: string) => void;
	onFocus?: () => void;
}>;

const InlineEditField = forwardRef<
	HTMLInputElement,
	InlineEditFieldProps
>(function CfsEditInput(
	{
		inputVal,
		label,
		disabled = false,
		dataTest,
		placeholder = '',
		maxLength,
		onConfirm,
		onCancel,
		onInputChange,
		onFocus
	},
	ref
) {
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				onConfirm();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				onCancel();
			}
		},
		[onConfirm, onCancel]
	);

	return (
		<div className={styles.inlineEditFieldWrapper}>
			<TextField
				ref={ref}
				direction='vertical'
				inputVal={inputVal}
				label={label}
				placeholder={placeholder}
				isDisabled={disabled}
				dataTest={dataTest}
				maxLength={maxLength}
				onInputChange={onInputChange}
				onKeyDown={handleKeyDown}
				onFocus={() => {
					onFocus?.();
				}}
				endSlot={
					<div className={styles.inlineEditFieldActions}>
						<Button
							appearance='icon'
							className={styles.inlineEditFieldIconButton}
							onClick={onConfirm}
							disabled={disabled}
							dataTest={`edit-input-confirm-btn`}
						>
							<span className={styles.iconButton}>
								<CheckedIcon />
							</span>
						</Button>
						<Button
							appearance='icon'
							className={styles.inlineEditFieldIconButton}
							onClick={onCancel}
							disabled={disabled}
							dataTest={`edit-input-cancel-btn`}
						>
							<span className={styles.iconButton}>
								<CloseIcon />
							</span>
						</Button>
					</div>
				}
			/>
		</div>
	);
});

export default InlineEditField;
