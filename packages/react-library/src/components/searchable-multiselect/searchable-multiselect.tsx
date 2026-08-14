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
import CheckBox from '../checkbox/checkbox';
import {type MultiSelectOption} from '../multiselect/multiselect';
import styles from './searchable-multiselect.module.scss';

type SearchableMultiSelectProps = {
	readonly isDisabled?: boolean;
	readonly dropdownText: React.ReactNode;
	readonly error?: string;
	readonly initialSelectedOptions?: MultiSelectOption[];
	readonly options: MultiSelectOption[];
	readonly isClearable?: boolean;
	readonly disableSearch?: boolean;
	readonly className?: string;
	readonly dataTest?: string;
	readonly variant?: 'default' | 'form' | 'round' | 'filter';
	readonly chipText?: string;
	readonly size?: 'md' | 'lg';
	readonly searchPlaceholder?: string;
	readonly noResultsText?: string;
	readonly clearText?: string;
	readonly onSelection: (
		options: MultiSelectOption[]
	) => void | MultiSelectOption[];
};

export default function SearchableMultiSelect({
	isDisabled,
	dropdownText,
	error,
	initialSelectedOptions = [],
	options,
	dataTest = '',
	variant = 'default',
	chipText,
	isClearable,
	disableSearch,
	size = 'md',
	className,
	searchPlaceholder,
	noResultsText = 'No results found',
	clearText = 'Clear',
	onSelection
}: SearchableMultiSelectProps): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedOptions, setSelectedOptions] = useState<
		MultiSelectOption[]
	>(initialSelectedOptions);
	const containerRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

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
		setSelectedOptions(initialSelectedOptions);
	}, [initialSelectedOptions]);

	useEffect(() => {
		if (isExpanded) {
			searchInputRef.current?.focus();
		} else {
			setSearchQuery('');
		}
	}, [isExpanded]);

	const filteredOptions = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();

		if (!query) return options;

		return options.filter(option => {
			const haystack =
				typeof option.label === 'string'
					? option.label
					: option.value;

			return haystack.toLowerCase().includes(query);
		});
	}, [options, searchQuery]);

	const toggleDropdown = () => {
		if (isExpanded) {
			buttonRef.current?.blur();
			setIsExpanded(false);

			return;
		}

		setIsExpanded(true);
	};

	const handleOptionSelection = (
		selectedOption: MultiSelectOption
	): void => {
		let newOptions: MultiSelectOption[];

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
			ref={containerRef}
			className={`${styles.container} ${isDisabled ? styles.disabled : ''} ${className ? className : ''}`}
			data-test={dataTest || undefined}
		>
			<button
				ref={buttonRef}
				type='button'
				className={`${styles.dropdown} ${styles[variant]} ${error ? styles.error : ''}
				${variant === 'filter' && selectedOptions.length > 0 ? styles.selectedBackground : ''}`}
				disabled={isDisabled}
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
					{!disableSearch && (
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
							<CheckBox
								key={option.value}
								isDisabled={option.disabled}
								className={styles.checkbox}
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
						))
					)}
					{isClearable && (
						<button
							type='button'
							className={styles.clearButton}
							onClick={clearAll}
						>
							{clearText}
						</button>
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
