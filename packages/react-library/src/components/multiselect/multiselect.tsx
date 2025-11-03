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

import {useEffect, useRef, useState} from 'react';
import DownArrow from '../icons/down-arrow-icon';
import styles from './multiselect.module.scss';
import CheckBox from '../checkbox/checkbox';

export interface MultiSelectOption {
	label: string | React.ReactNode;
	value: string;
	disabled?: boolean;
}
interface MultiSelectProps {
	disabled?: boolean;
	dropdownText: React.ReactNode;
	error?: string;
	initialSelectedOptions?: MultiSelectOption[];
	options: MultiSelectOption[];
	allowClear?: boolean;
	className?: string;
	dataTest?: string;
	variant?: 'default' | 'round' | 'filter';
	chipText?: string;
	size?: 'md' | 'lg';
	onSelection: (
		options: MultiSelectOption[]
	) => void | MultiSelectOption[];
}

export default function MultiSelect({
	disabled,
	dropdownText,
	error,
	initialSelectedOptions = [],
	options,
	dataTest = '',
	variant = 'default',
	chipText,
	allowClear,
	size = 'md',
	className,
	onSelection
}: MultiSelectProps): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false);
	const [selectedOptions, setSelectedOptions] = useState<
		MultiSelectOption[]
	>(initialSelectedOptions);
	const containerRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		document.addEventListener('click', handleBodyClick);

		return () => {
			document.removeEventListener('click', handleBodyClick);
		};
	});

	useEffect(() => {
		setSelectedOptions(initialSelectedOptions);
	}, [initialSelectedOptions]);

	const toggleDropdown = () => {
		if (isExpanded) {
			buttonRef.current?.blur();
			setIsExpanded(false);
			return;
		}

		setIsExpanded(true);
	};
	const closeMultiselect = (): void => {
		setIsExpanded(false);
	};

	const handleBodyClick = (event: Event): void => {
		const clickEventTarget = event.target as HTMLElement;

		if (!containerRef.current) return;
		if (!containerRef.current.contains(clickEventTarget)) {
			closeMultiselect();
		}
	};

	const handleOptionSelection = (
		selectedOption: MultiSelectOption
	): void => {
		let newOptions: MultiSelectOption[];

		if (buttonRef.current) buttonRef.current.focus();

		if (
			selectedOptions.some(opt => opt.value === selectedOption.value)
		) {
			newOptions = selectedOptions.filter(
				opt => opt.value !== selectedOption.value
			);
		} else {
			newOptions = [...selectedOptions, selectedOption];
		}
		setSelectedOptions(newOptions);
		onSelection(newOptions);
	};

	const clearAll = () => {
		setSelectedOptions([]);
		onSelection([]);
	};

	return (
		<div
			className={`${styles.container} ${disabled ? styles.disabled : ''} ${className ? className : ''}`}
			ref={containerRef}
			data-test={dataTest}
		>
			<button
				ref={buttonRef}
				className={`${styles.dropdown} ${styles[variant]} ${error ? styles.error : ''}
				${variant === 'filter' && selectedOptions.length > 0 ? styles.selectedBackground : ''}`}
				disabled={disabled}
				onClick={() => {
					toggleDropdown();
				}}
			>
				<p>
					{dropdownText}
					{chipText ? (
						<span className={styles.chip}>{chipText}</span>
					) : (
						''
					)}
				</p>
				<div
					className={`${styles.indicator}${isExpanded ? ` ${styles.expanded}` : ''}`}
				>
					<DownArrow />
				</div>
			</button>
			{isExpanded && (
				<div
					className={`${styles.optionsContainer} ${
						size === 'lg' ? styles.largeOptionsContainer : ''
					}`}
				>
					{options.map((option, index) => {
						return (
							<CheckBox
								isDisabled={option.disabled}
								className={styles.checkbox}
								key={index}
								checked={selectedOptions.some(
									opt => option.value === opt.value
								)}
								onClick={() => {
									handleOptionSelection(option);
								}}
							>
								<span
									data-test={`multiselect-option-${option.value}`}
								>
									{option.label}
								</span>
							</CheckBox>
						);
					})}
					{allowClear && (
						<button className={styles.clearButton} onClick={clearAll}>
							Clear
						</button>
					)}
				</div>
			)}
			<div
				className={styles.errorMessage}
				data-test={`${dataTest}-error`}
			>
				{error}
			</div>
		</div>
	);
}
