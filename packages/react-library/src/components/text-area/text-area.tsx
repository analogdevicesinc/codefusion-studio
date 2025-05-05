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

import {VSCodeTextArea} from '@vscode/webview-ui-toolkit/react';
import {TextAreaResize} from '@vscode/webview-ui-toolkit';
import styles from './text-area.module.scss';

type TextareaProps = Readonly<{
	value: string;
	placeholder?: string;
	name?: string;
	direction?: TextAreaResize;
	maxlength?: number;
	rows?: number;
	cols?: number;
	autofocus?: boolean;
	disabled?: boolean;
	error?: string;
	dataTest?: string;
	form?: HTMLFormElement | null | undefined;
	onInputChange: (value: string) => void;
}>;

export default function TextArea({
	value,
	placeholder,
	name,
	direction = 'vertical',
	maxlength,
	rows,
	cols = 3,
	autofocus,
	disabled,
	error,
	dataTest,
	form,
	onInputChange
}: TextareaProps) {
	// TO DO: WIP implement the label element (with optional tag) and the different direction (horizontal, vertical) option
	return (
		<div className={styles.textareaContainer}>
			<VSCodeTextArea
				className={`${error ? styles.errorBorder : undefined}`}
				value={value}
				name={name}
				resize={direction}
				maxlength={maxlength}
				placeholder={placeholder}
				rows={rows}
				cols={cols}
				autofocus={autofocus}
				disabled={disabled}
				form={form}
				onInput={(event: Event | React.FormEvent<HTMLElement>) => {
					const {target} = event;
					onInputChange((target as HTMLTextAreaElement)?.value || '');
				}}
			/>

			{error && (
				<p
					className={styles.errorMsg}
					data-test={`textarea:${dataTest}-error`}
				>
					{error}
				</p>
			)}
		</div>
	);
}
