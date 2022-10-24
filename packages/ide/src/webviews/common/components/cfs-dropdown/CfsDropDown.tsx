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
import {
	VSCodeDropdown,
	VSCodeOption
} from '@vscode/webview-ui-toolkit/react';
import styles from './CfsDropDown.module.scss';
import {type MouseEventHandler, useRef} from 'react';

export type CfsDropDownOptions = Array<{
	value: string;
	label: string;
	dataTest?: string;
}>;

type CfsDropDownProps = {
	readonly controlId: string;
	readonly isDisabled: boolean;
	readonly currentControlValue: string | undefined;
	readonly options: CfsDropDownOptions;
	readonly dataTest?: string;
	readonly onHandleDropdown: MouseEventHandler<HTMLOptionElement>;
};

export default function CfsDropDown({
	controlId,
	isDisabled,
	currentControlValue,
	options,
	dataTest,
	onHandleDropdown
}: CfsDropDownProps) {
	const dropdownRef = useRef<HTMLSelectElement>(null);

	const handleDropdown: MouseEventHandler<
		HTMLOptionElement
	> = event => {
		onHandleDropdown(event);

		// Disallows changing inputs by keyboard - otherwise it desynchronizes store and local state
		dropdownRef?.current?.blur();
	};

	// @TODO: Add another prop to this component to (size: xs/lg) to allow it to also render smaller dropdowns - i.e. the one in pinmux

	return (
		<VSCodeDropdown
			// @ts-expect-error: This external component doesn't recognize a ref as a possible prop
			ref={dropdownRef}
			id={`${controlId}-controlDropdown`}
			data-test={dataTest}
			disabled={isDisabled}
			className={styles.dropdown}
			value={currentControlValue}
		>
			{options.map(option => (
				<VSCodeOption
					key={`${controlId}_${option.value}`}
					id={`${controlId}_${option.value}`}
					data-test={option.dataTest}
					value={option.value}
					className={styles.option}
					selected={option.value === currentControlValue}
					onClick={handleDropdown}
				>
					{option.label}
				</VSCodeOption>
			))}
		</VSCodeDropdown>
	);
}
