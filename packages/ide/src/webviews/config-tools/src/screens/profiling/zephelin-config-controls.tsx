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

import {
	CheckBox,
	DropDown,
	type DropDownOptions,
	IntegerField,
	LockIcon,
	TextField
} from 'cfs-react-library';
import styles from './zephelin-config-controls.module.scss';
import {useAppDispatch} from '../../state/store';
import {setActiveScreen} from '../../state/slices/app-context/appContext.reducer';
import {type NavigationItem} from '@common/types/navigation';

export type Reference = {
	readonly label: string;
	readonly target: NavigationItem;
};

export type BaseZephelinInputProps = {
	readonly label: string;
	readonly dataTest?: string;
	readonly reference?: Reference;
	readonly isDisabled?: boolean | 'locked' | 'global';
};

export type ZephelinConfigCheckboxProps = BaseZephelinInputProps & {
	readonly isChecked: boolean;
	readonly onChange?: () => void;
	readonly dependantInputProps?:
		| ZephelinConfigDropdownProps
		| ZephelinConfigNumberInputProps
		| ZephelinConfigTextInputProps;
};

export type ZephelinConfigDropdownProps = BaseZephelinInputProps & {
	readonly value: string;
	readonly description?: string;
	readonly controlId: string;
	readonly options: DropDownOptions;
	readonly placeholder?: string;
	readonly onChange: (value: string) => void;
};

export type ZephelinConfigNumberInputProps =
	BaseZephelinInputProps & {
		readonly numberValue: number;
		readonly description?: string;
		readonly unit?: string;
		readonly min?: number;
		readonly max?: number;
		readonly error?: string;
		readonly onChange: (value: number) => void;
	};

export type ZephelinConfigTextInputProps = BaseZephelinInputProps & {
	readonly textValue: string;
	readonly description?: string;
	readonly error?: string;
	readonly onChange?: (value: string) => void;
};

export function ZephelinConfigCheckbox({
	label,
	dataTest,
	isChecked,
	isDisabled,
	reference,
	onChange,
	dependantInputProps
}: ZephelinConfigCheckboxProps) {
	const dispatch = useAppDispatch();

	const disabledStateClass = getDisabledStateClass(
		isDisabled === true || isDisabled === 'locked'
	);

	return (
		<div className={styles.checkbox}>
			<div className={`${styles.input} ${disabledStateClass}`}>
				<CheckBox
					className={styles.input}
					isDisabled={Boolean(isDisabled)}
					dataTest={dataTest}
					checked={isChecked}
					onChange={onChange}
				/>
			</div>
			<label className={`${styles.label} ${disabledStateClass}`}>
				{label}
			</label>
			{reference && (
				<a
					className={styles.reference}
					onClick={() => dispatch(setActiveScreen(reference.target))}
				>
					{reference.label}
				</a>
			)}

			{isChecked && dependantInputProps && (
				<div className={styles.dependantInput}>
					{'options' in dependantInputProps && (
						<ZephelinConfigDropdown {...dependantInputProps} />
					)}

					{'numberValue' in dependantInputProps && (
						<ZephelinConfigNumberInput {...dependantInputProps} />
					)}

					{'textValue' in dependantInputProps && (
						<ZephelinConfigTextInput {...dependantInputProps} />
					)}
				</div>
			)}
		</div>
	);
}

export function ZephelinConfigDropdown({
	label,
	dataTest,
	description,
	reference,
	isDisabled,
	controlId,
	options,
	placeholder,
	value,
	onChange
}: ZephelinConfigDropdownProps) {
	const disabledStateClass = getDisabledStateClass(isDisabled);

	return (
		<div
			className={`${styles.dropdown} ${disabledStateClass}`}
			data-test={dataTest}
		>
			<div className={styles.labelContainer}>
				<label className={styles.label}>{label}</label>
				<DescriptionWithReference
					description={description}
					reference={reference}
				/>
			</div>
			<div>
				<DropDown
					controlId={controlId}
					options={options}
					placeholder={placeholder}
					currentControlValue={value}
					isDisabled={Boolean(isDisabled)}
					onHandleDropdown={onChange}
				/>
			</div>
		</div>
	);
}

export function ZephelinConfigNumberInput({
	label,
	dataTest,
	description,
	reference,
	numberValue,
	isDisabled,
	unit,
	min,
	max,
	error,
	onChange
}: ZephelinConfigNumberInputProps) {
	const disabledClass = getDisabledClass(isDisabled);
	const lockedClass = getLockedClass(isDisabled);

	let endSlot: JSX.Element | undefined;

	if (unit !== undefined || isDisabled === 'locked') {
		endSlot = (
			<div className={styles.endSlot}>
				{unit && <span className={styles.unit}>{unit}</span>}
				{isDisabled === 'locked' && <LockIcon />}
			</div>
		);
	}

	return (
		<div
			className={`${styles.numberInput} ${disabledClass}`}
			data-test={dataTest}
		>
			<div className={styles.labelContainer}>
				<label className={styles.label}>{label}</label>
				<DescriptionWithReference
					description={description}
					reference={reference}
				/>
			</div>

			<div
				className={`${error ? styles.errorInput : ''} ${lockedClass}`}
			>
				<IntegerField
					value={numberValue}
					min={min}
					max={max}
					endSlot={endSlot}
					isDisabled={Boolean(isDisabled)}
					onValueChange={onChange}
				/>

				{error && <p className={styles.errorText}> {error}</p>}
			</div>
		</div>
	);
}

export function ZephelinConfigTextInput({
	label,
	dataTest,
	description,
	reference,
	textValue,
	isDisabled,
	error,
	onChange
}: ZephelinConfigTextInputProps) {
	const disabledClass = getDisabledClass(isDisabled);
	const lockedClass = getLockedClass(isDisabled);

	let endSlot: JSX.Element | undefined;

	if (isDisabled === 'locked') {
		endSlot = (
			<div className={styles.endSlot}>
				<LockIcon />
			</div>
		);
	}

	return (
		<div
			className={`${styles.textInput} ${disabledClass}`}
			data-test={dataTest}
		>
			<div className={styles.labelContainer}>
				<label className={styles.label}>{label}</label>
				<DescriptionWithReference
					description={description}
					reference={reference}
				/>
			</div>

			<div
				className={`${error ? styles.errorInput : ''} ${lockedClass}`}
			>
				<TextField
					inputVal={textValue}
					endSlot={endSlot}
					isDisabled={Boolean(isDisabled)}
					onInputChange={onChange}
				/>

				{error && <p className={styles.errorText}> {error}</p>}
			</div>
		</div>
	);
}

type DescriptionProps = {
	readonly description?: string;
	readonly reference?: Reference;
};

function DescriptionWithReference({
	description,
	reference
}: DescriptionProps) {
	const dispatch = useAppDispatch();

	if (!description && !reference) {
		return null;
	}

	if (description && !reference) {
		return <p className={styles.description}>{description}</p>;
	}

	if (description && reference) {
		return (
			<p className={styles.description}>
				{description}{' '}
				<a
					className={styles.reference}
					onClick={() => dispatch(setActiveScreen(reference.target))}
				>
					{reference.label}
				</a>
			</p>
		);
	}
}

function getDisabledStateClass(
	isDisabled: BaseZephelinInputProps['isDisabled']
): string {
	if (isDisabled === 'locked') return styles.locked;
	if (isDisabled === true) return styles.disabled;

	return '';
}

function getDisabledClass(
	isDisabled: BaseZephelinInputProps['isDisabled']
): string {
	if (isDisabled === true) return styles.disabled;

	return '';
}

function getLockedClass(
	isDisabled: BaseZephelinInputProps['isDisabled']
): string {
	if (isDisabled === 'locked') return styles.locked;

	return '';
}
