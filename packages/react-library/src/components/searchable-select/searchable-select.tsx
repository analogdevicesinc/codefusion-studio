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

import {useEffect, useMemo, useRef, useState} from 'react';
import type React from 'react';
import DownArrow from '../icons/down-arrow-icon';
import SearchIcon from '../icons/search-icon';
import {type MultiSelectOption} from '../multiselect/multiselect';
import styles from './searchable-select.module.scss';

type SearchableSelectProps = {
	readonly isDisabled?: boolean;
	readonly dropdownText?: React.ReactNode;
	readonly placeholder?: string;
	readonly error?: string;
	readonly selectedValue?: string;
	readonly options: MultiSelectOption[];
	readonly className?: string;
	readonly dataTest?: string;
	readonly variant?: 'default' | 'form';
	readonly size?: 'md' | 'lg';
	readonly isSearchable?: boolean;
	readonly searchPlaceholder?: string;
	readonly noResultsText?: string;
	readonly onSelection: (option: MultiSelectOption) => void;
};

/** The searchable/displayable text of an option, falling back to its value. */
function optionText(option: MultiSelectOption): string {
	return typeof option.label === 'string'
		? option.label
		: option.value;
}

export default function SearchableSelect({
	isDisabled,
	dropdownText,
	placeholder,
	error,
	selectedValue,
	options,
	dataTest = '',
	variant = 'default',
	size = 'md',
	isSearchable = false,
	className,
	searchPlaceholder,
	noResultsText = 'No results found',
	onSelection
}: SearchableSelectProps): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const containerRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const selectedOption = useMemo(
		() => options.find(option => option.value === selectedValue),
		[options, selectedValue]
	);

	useEffect(() => {
		const handleBodyClick = (event: Event): void => {
			const clickEventTarget = event.target as HTMLElement;

			if (
				containerRef.current &&
				!containerRef.current.contains(clickEventTarget)
			) {
				setIsExpanded(false);
			}
		};

		document.addEventListener('click', handleBodyClick);

		return () => {
			document.removeEventListener('click', handleBodyClick);
		};
	}, []);

	useEffect(() => {
		if (isExpanded) {
			searchInputRef.current?.focus();
		} else {
			setSearchQuery('');
		}
	}, [isExpanded]);

	const filteredOptions = useMemo(() => {
		if (!isSearchable) return options;

		const query = searchQuery.trim().toLowerCase();

		if (!query) return options;

		return options.filter(option =>
			optionText(option).toLowerCase().includes(query)
		);
	}, [isSearchable, options, searchQuery]);

	const toggleDropdown = () => {
		if (isExpanded) {
			buttonRef.current?.blur();
			setIsExpanded(false);

			return;
		}

		setIsExpanded(true);
	};

	const handleOptionSelection = (
		selectedOptionValue: MultiSelectOption
	): void => {
		if (selectedOptionValue.disabled) return;

		onSelection(selectedOptionValue);
		setIsExpanded(false);
		buttonRef.current?.blur();
	};

	/** Moves focus to the next or previous enabled option. */
	const moveOptionFocus = (step: 1 | -1): void => {
		const optionElements = [
			...(containerRef.current?.querySelectorAll<HTMLButtonElement>(
				`.${styles.option}:not([disabled])`
			) ?? [])
		];

		if (optionElements.length === 0) return;

		const currentIndex = optionElements.indexOf(
			document.activeElement as HTMLButtonElement
		);
		let nextIndex = step === 1 ? 0 : optionElements.length - 1;

		if (currentIndex !== -1) {
			nextIndex =
				(currentIndex + step + optionElements.length) %
				optionElements.length;
		}

		optionElements[nextIndex].focus();
	};

	const handleKeyDown = (
		event: React.KeyboardEvent<HTMLDivElement>
	): void => {
		if (event.key === 'Escape' && isExpanded) {
			event.preventDefault();
			setIsExpanded(false);
			buttonRef.current?.focus();

			return;
		}

		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

		event.preventDefault();

		if (isExpanded) {
			moveOptionFocus(event.key === 'ArrowDown' ? 1 : -1);
		} else {
			setIsExpanded(true);
		}
	};

	const triggerLabel =
		dropdownText ?? (selectedOption && optionText(selectedOption));

	return (
		<div
			ref={containerRef}
			className={`${styles.container} ${isDisabled ? styles.disabled : ''} ${className ?? ''}`}
			data-test={dataTest || undefined}
			onKeyDown={handleKeyDown}
		>
			<button
				ref={buttonRef}
				type='button'
				className={`${styles.dropdown} ${styles[variant]} ${error ? styles.error : ''}`}
				disabled={isDisabled}
				aria-haspopup='listbox'
				aria-expanded={isExpanded}
				onClick={() => {
					toggleDropdown();
				}}
			>
				<p className={triggerLabel ? undefined : styles.placeholder}>
					{triggerLabel ?? placeholder}
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
					{isSearchable && (
						<div className={styles.searchHeader}>
							<label className={styles.searchWrapper}>
								<SearchIcon />
								<input
									ref={searchInputRef}
									className={styles.searchInput}
									placeholder={searchPlaceholder}
									value={searchQuery}
									data-test={
										dataTest ? `${dataTest}-search` : undefined
									}
									onChange={e => {
										setSearchQuery(e.target.value);
									}}
								/>
							</label>
						</div>
					)}
					{filteredOptions.length === 0 ? (
						<div className={styles.noResults}>{noResultsText}</div>
					) : (
						filteredOptions.map(option => (
							<button
								key={option.value}
								type='button'
								aria-current={option.value === selectedValue}
								className={`${styles.option}${
									option.value === selectedValue
										? ` ${styles.selected}`
										: ''
								}`}
								disabled={option.disabled}
								data-test={`select-option-${option.value}`}
								onClick={() => {
									handleOptionSelection(option);
								}}
							>
								{option.label}
							</button>
						))
					)}
				</div>
			)}
			{error && (
				<div
					className={styles.errorMessage}
					data-test={dataTest ? `${dataTest}-error` : undefined}
				>
					{error}
				</div>
			)}
		</div>
	);
}
