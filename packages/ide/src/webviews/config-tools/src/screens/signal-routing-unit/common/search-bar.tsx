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
import {Chip, SearchInput} from 'cfs-react-library';
import {useEffect, useState, type KeyboardEvent} from 'react';
import styles from './search-bar.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';

export type FilterOption = 'all' | 'default' | 'modified';

type SearchBarProps = Readonly<{
	onSearchChange: (searchValue: string) => void;
	onFilterChange: (filterOption: FilterOption) => void;
	isAllDisabled?: boolean;
	isDefaultDisabled?: boolean;
	isModifiedDisabled?: boolean;
	initialSearchValue?: string;
	initialFilterOption?: FilterOption;
	onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}>;

export function SearchBar({
	onSearchChange,
	onFilterChange,
	isAllDisabled = false,
	isDefaultDisabled = false,
	isModifiedDisabled = false,
	initialSearchValue = '',
	initialFilterOption = 'all',
	onKeyDown
}: SearchBarProps): JSX.Element {
	const l10n = useLocaleContext()?.signalRoutingUnit.filter;
	const [searchValue, setSearchValue] = useState(initialSearchValue);
	const [filterOption, setFilterOption] = useState<FilterOption>(
		initialFilterOption
	);

	const handleSearchChange = (value: string) => {
		setSearchValue(value);
		onSearchChange(value);
	};

	const handleFilterChange = (option: FilterOption) => {
		setFilterOption(option);
		onFilterChange(option);
	};

	// `initialSearchValue` is also written from outside after a keyboard/
	// mouse result selection clears the store's search text - resync so the
	// field doesn't keep showing text the store no longer has.
	useEffect(() => {
		setSearchValue(initialSearchValue);
	}, [initialSearchValue]);

	// `initialFilterOption` is also written from outside (e.g. revealing a
	// signal resets the store's filter to 'all') - resync so the active pill
	// doesn't keep showing a filter the store no longer has.
	useEffect(() => {
		setFilterOption(initialFilterOption);
	}, [initialFilterOption]);

	return (
		<div
			className={styles.container}
			data-test='search-and-filter-bar'
		>
			<div className={styles.inputs}>
				<SearchInput
					dataTest='search-bar'
					inputVal={searchValue}
					placeholder={l10n?.search}
					onClear={() => {
						handleSearchChange('');
					}}
					onInputChange={handleSearchChange}
					onKeyDown={onKeyDown}
				/>
				<div className={styles.filter}>
					<Chip
						dataTest='filter-chip-all'
						isActive={filterOption === 'all'}
						isDisabled={isAllDisabled}
						label={l10n?.all}
						onClick={() => {
							handleFilterChange('all');
						}}
					/>

					<Chip
						dataTest='filter-chip-default'
						isActive={filterOption === 'default'}
						isDisabled={isDefaultDisabled}
						label={l10n?.default}
						onClick={() => {
							handleFilterChange('default');
						}}
					/>

					<Chip
						dataTest='filter-chip-modified'
						isActive={filterOption === 'modified'}
						isDisabled={isModifiedDisabled}
						label={l10n?.modified}
						onClick={() => {
							handleFilterChange('modified');
						}}
					/>
				</div>
			</div>
		</div>
	);
}
