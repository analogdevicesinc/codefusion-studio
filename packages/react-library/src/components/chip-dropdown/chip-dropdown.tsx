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

import {useEffect, useRef, useState} from 'react';
import DownArrow from '../icons/down-arrow-icon';
import styles from './chip-dropdown.module.scss';

export interface ChipDropdownOption {
	label: string | React.ReactNode;
	value: string;
	disabled?: boolean;
}

interface ChipDropdownProps {
	/** Label displayed on the chip trigger button */
	dropdownText: React.ReactNode;
	/** List of selectable options */
	options: ChipDropdownOption[];
	/** Currently selected option value */
	selectedValue?: string;
	/** Whether the control is disabled */
	disabled?: boolean;
	/** Error message shown below the component */
	error?: string;
	/** Optional data-test attribute */
	dataTest?: string;
	/** Additional className for the outer container */
	className?: string;
	/** Callback when an option is selected or deselected (value is undefined when cleared) */
	onSelection: (option: ChipDropdownOption | undefined) => void;
}

export default function ChipDropdown({
	dropdownText,
	options,
	selectedValue,
	disabled,
	error,
	dataTest = '',
	className,
	onSelection
}: ChipDropdownProps): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	const isSelected =
		selectedValue !== undefined && selectedValue !== '';
	const selectedOption = options.find(o => o.value === selectedValue);

	useEffect(() => {
		document.addEventListener('click', handleBodyClick);

		return () => {
			document.removeEventListener('click', handleBodyClick);
		};
	});

	const toggleDropdown = () => {
		if (isExpanded) {
			buttonRef.current?.blur();
			setIsExpanded(false);
			return;
		}

		setIsExpanded(true);
	};

	const handleBodyClick = (event: Event): void => {
		const clickEventTarget = event.target as HTMLElement;

		if (!containerRef.current) return;
		if (!containerRef.current.contains(clickEventTarget)) {
			setIsExpanded(false);
		}
	};

	const handleOptionClick = (option: ChipDropdownOption): void => {
		if (buttonRef.current) buttonRef.current.focus();

		if (selectedValue === option.value) {
			// Deselect if clicking the already-selected option
			onSelection(undefined);
		} else {
			onSelection(option);
		}

		setIsExpanded(false);
	};

	return (
		<div
			className={`${styles.container} ${disabled ? styles.disabled : ''} ${className ?? ''}`}
			ref={containerRef}
			data-test={dataTest}
		>
			<button
				ref={buttonRef}
				className={`${styles.dropdown} ${isSelected ? styles.selected : ''} ${error ? styles.error : ''}`}
				disabled={disabled}
				onClick={toggleDropdown}
			>
				<p>
					{dropdownText}
					{selectedOption && (
						<span className={styles.chip}>
							{selectedOption.label}
						</span>
					)}
				</p>
				<div
					className={`${styles.indicator}${isExpanded ? ` ${styles.expanded}` : ''}`}
				>
					<DownArrow />
				</div>
			</button>
			{isExpanded && (
				<div className={styles.optionsContainer}>
					{options.map((option, index) => (
						<button
							key={index}
							className={`${styles.option} ${selectedValue === option.value ? styles.optionSelected : ''} ${option.disabled ? styles.optionDisabled : ''}`}
							disabled={option.disabled}
							onClick={() => {
								handleOptionClick(option);
							}}
							data-test={`${dataTest}-option-${option.value}`}
						>
							{option.label}
						</button>
					))}
				</div>
			)}
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
