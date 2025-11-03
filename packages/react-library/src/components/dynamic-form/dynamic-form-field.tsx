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

import CheckBox from '../checkbox/checkbox.tsx';
import TextField from '../text-field/textfield.tsx';
import TextArea from '../text-area/text-area.js';
import DropDown from '../dropdown/dropdown.tsx';

import type {
	TFormControl,
	TFormFieldValue
} from '../../types/dynamic-form.ts';

import styles from './dynamic-form-field.module.scss';
import Tooltip from '../tooltip/tooltip.tsx';
import InfoIcon from '../icons/info-icon.tsx';

const computeReceivedValue = (input: string): number | string => {
	if (isNaN(parseFloat(input))) {
		const number = input.replace(/[a-zA-Z]/g, '');

		if (number === '') return '';

		return parseFloat(number);
	}

	return parseFloat(input);
};

const validNumericInputTypes = ['number', 'integer'];

export default function DynamicFormField({
	control: {
		id,
		type,
		default: defaultValue,
		disabled,
		placeholder = 'Start typing...',
		enum: enumOptions,
		required,
		description,
		name,
		info
	},
	value,
	testId,
	component,
	error,
	onControlChange
}: Readonly<{
	control: TFormControl;
	value: TFormFieldValue;
	testId: string;
	component: React.ReactNode | undefined;
	error: string | undefined;
	onControlChange: (
		controlId: string,
		value: TFormFieldValue
	) => void;
}>) {
	const onFieldChangeHandler = (
		controlId: string,
		value: TFormFieldValue
	) => {
		onControlChange(controlId, value);
	};

	const displayDefaultComponent = () => {
		// Input type string OR number
		if (
			type === 'string' ||
			type === 'text' ||
			validNumericInputTypes.includes(type as string)
		)
			return (
				<div className={styles.input} id={`input-container:${id}`}>
					<TextField
						inputVal={value?.toString() ?? defaultValue}
						isDisabled={disabled}
						label=''
						error={error}
						placeholder={placeholder}
						dataTest={testId}
						direction='vertical'
						onInputChange={(value: string) => {
							onFieldChangeHandler(
								id,
								type === 'string' || type === 'text'
									? (value as unknown as TFormFieldValue)
									: (computeReceivedValue(
											value
										) as unknown as TFormFieldValue)
							);
						}}
					/>
				</div>
			);

		// Input type textarea
		if (type === 'textarea')
			return (
				<div data-test={testId} id={`textarea-container:${id}`}>
					<TextArea
						value={value?.toString()}
						placeholder={placeholder || ''}
						rows={6}
						error={error}
						dataTest={id}
						onInputChange={(val: string) => {
							onFieldChangeHandler(
								id,
								val as unknown as TFormFieldValue
							);
						}}
					/>
				</div>
			);

		if (enumOptions?.length)
			return (
				<div
					className={styles.dropdown}
					id={`dropdown-container:${id}`}
				>
					<DropDown
						controlId={id}
						isDisabled={disabled}
						currentControlValue={value as unknown as string}
						options={enumOptions}
						dataTest={testId}
						error={error}
						onHandleDropdown={(value: string) => {
							onFieldChangeHandler(
								id,
								value as unknown as TFormFieldValue
							);
						}}
					/>
				</div>
			);

		// Checkbox element
		if (type === 'boolean')
			return (
				<div id={`checkbox-container:${id}`}>
					<CheckBox
						checked={Boolean(value)}
						dataTest={testId}
						onClick={(
							event: Event | React.FormEvent<HTMLElement>
						) => {
							const {target} =
								event as React.ChangeEvent<HTMLInputElement>;

							onFieldChangeHandler(
								id,
								target.checked as unknown as boolean
							);
						}}
					>
						{description}
					</CheckBox>
					{error && (
						<p
							className={styles.errorMsg}
							data-test={`checkbox-container:${id}-error`}
						>
							{error}
						</p>
					)}
				</div>
			);

		return <div>No default component found</div>;
	};

	return (
		<section className={styles.formFieldContainer}>
			<div className={styles.fieldHeader} data-control-type={type}>
				<label htmlFor={id} className={styles.fieldTitle}>
					{name}
					{info && (
						<Tooltip title={info} width={150}>
							<InfoIcon />
						</Tooltip>
					)}
				</label>
				{!required && (
					<span className={styles.fieldOptional}>Optional</span>
				)}
			</div>

			{component ? component : displayDefaultComponent()}
		</section>
	);
}
