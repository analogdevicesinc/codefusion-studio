/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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
import styles from './dropdown.module.scss';
import {useEffect, useRef, useState} from 'react';
import DownArrow from '../icons/down-arrow-icon';

export type DropDownOptions = Array<{
	value: string;
	label: string;
	dataTest?: string;
	disabled?: boolean;
}>;

type DropDownProps = {
	readonly controlId: string;
	readonly isDisabled?: boolean;
	readonly currentControlValue: string | undefined;
	readonly options: DropDownOptions;
	readonly dataTest?: string;
	readonly error?: string;
	readonly onHandleDropdown: (value: string) => void;
};

export default function DropDown({
	controlId,
	isDisabled = false,
	currentControlValue,
	options,
	dataTest,
	error,
	onHandleDropdown
}: DropDownProps) {
	const dropdownRef = useRef<HTMLSelectElement>(null);
	const [isExpanded, setIsExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleDropdown = () => {
		dropdownRef.current?.blur();
		onHandleDropdown(dropdownRef.current?.value ?? '');
	};

	useEffect(() => {
		document.addEventListener('click', handleBodyClick);

		return () => {
			document.removeEventListener('click', handleBodyClick);
		};
	});

	const handleBodyClick = (event: Event): void => {
		const clickEventTarget = event.target as HTMLElement;
		if (!containerRef.current) return;
		if (!containerRef.current.contains(clickEventTarget)) {
			setIsExpanded(false);
		}
	};

	// @TODO: Add another prop to this component to (size: xs/lg) to allow it to also render smaller dropdowns - i.e. the one in pinmux
	return (
		<div ref={containerRef}>
			<VSCodeDropdown
				// @ts-expect-error: This external component doesn't recognize a ref as a possible prop
				ref={dropdownRef}
				id={`${controlId}-controlDropdown`}
				data-test={dataTest}
				disabled={isDisabled}
				className={`${styles.dropdown} ${error ? styles.error : ''}`}
				value={currentControlValue}
				onClick={() => {
					setIsExpanded(!isExpanded);
				}}
				onChange={() => {
					handleDropdown();
				}}
			>
				<div
					slot='indicator'
					className={`${styles.indicator}${isExpanded ? ` ${styles.expanded}` : ''}`}
				>
					<DownArrow />
				</div>
				{options.map(option => (
					<VSCodeOption
						key={`${controlId}_${option.value}`}
						id={`${controlId}_${option.value}`}
						data-test={option.dataTest}
						value={option.value}
						data-value={option.value}
						className={styles.option}
						selected={option.value === currentControlValue}
						disabled={option.disabled}
					>
						{option.label}
					</VSCodeOption>
				))}
			</VSCodeDropdown>
			{error && (
				<div
					className={styles.errorMessage}
					data-test={`${dataTest}-error`}
				>
					{error}
				</div>
			)}
		</div>
	);
}
