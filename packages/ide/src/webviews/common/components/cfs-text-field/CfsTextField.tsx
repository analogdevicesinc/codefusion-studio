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
import {VSCodeTextField} from '@vscode/webview-ui-toolkit/react';
import styles from './CfsTextField.module.scss';
import type {ChangeEvent} from 'react';

type CfsTextFieldProps = {
	readonly inputVal: string | undefined;
	readonly isDisabled?: boolean;
	readonly label: string | JSX.Element;
	readonly error: string | undefined;
	readonly unit: string;
	readonly direction: 'vertical' | 'horizontal';
	readonly dataTest: string;
	readonly onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

export default function CfsTextField({
	inputVal,
	isDisabled,
	label,
	error,
	unit,
	direction,
	dataTest,
	onInputChange
}: CfsTextFieldProps) {
	return (
		<div
			className={`${styles.container} ${direction === 'vertical' ? styles.vertical : styles.horizontal} `}
		>
			<label htmlFor='control-input'>{label}</label>
			{direction === 'horizontal' && (
				<div className={styles.divider} />
			)}
			<div>
				<VSCodeTextField
					id='control-input'
					data-test={`${dataTest}-control-input`}
					disabled={isDisabled}
					type='text'
					className={`${styles.textField} ${error ? styles.errorBorder : ''}`}
					value={inputVal ?? ''}
					onInput={e => {
						onInputChange(e as ChangeEvent<HTMLInputElement>);
					}}
				>
					<span slot='end'>{unit}</span>
				</VSCodeTextField>
				<p
					className={styles.errorMsg}
					data-test={`${dataTest}-error`}
				>
					{error}
				</p>
			</div>
		</div>
	);
}
