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

import SearchIcon from '@common/icons/Search';
import {
	Chip,
	SearchableMultiSelect,
	type MultiSelectOption
} from 'cfs-react-library';
import {useEffect} from 'react';
import styles from './package-filters.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {useAppDispatch} from '../../state/store';
import {
	fetchSocList,
	setSearchQuery,
	setSocFilter,
	setStatusFilter,
	setTypeFilter,
	toggleRequiredOnly
} from '../../state/slices/packages/packages.reducer';
import {
	usePackageListLoading,
	usePackageListTotal,
	useRequiredOnly,
	useSearchQuery,
	useStatusFilter,
	useSocFilter,
	useSocOptions,
	useTypeFilter
} from '../../state/slices/packages/packages.selector';

/**
 * Displays the page title and subtitle. This section scrolls
 * away naturally when the user scrolls down.
 */
export function PackageFiltersTitle() {
	const l10n = useLocaleContext()?.filters;

	return (
		<div className={styles.titleContainer}>
			<span className={styles.heading}>{l10n?.title}</span>
			<span className={styles.subtitle}>{l10n?.subtitle}</span>
		</div>
	);
}

/**
 * Displays the search bar and filter chips. This section is
 * intended to be placed inside a sticky wrapper so it remains
 * visible when the user scrolls.
 */
export function PackageFiltersBar() {
	const l10n = useLocaleContext()?.filters;
	const dispatch = useAppDispatch();
	const socFromCatalog = useSocOptions();
	const total = usePackageListTotal();
	const loading = usePackageListLoading();
	const searchQuery = useSearchQuery();
	const statusFilter = useStatusFilter();
	const socFilter = useSocFilter();
	const typeFilter = useTypeFilter();
	const requiredOnly = useRequiredOnly();

	useEffect(() => {
		void dispatch(fetchSocList());
	}, [dispatch]);

	const typeOptions: MultiSelectOption[] = [
		{label: 'Data Model', value: 'data-model'},
		{label: 'Plugin', value: 'plugin'},
		{label: 'SDK', value: 'sdk'},
		{label: 'Tool', value: 'tool'},
		{label: 'Toolchain', value: 'toolchain'}
	];

	const statusOptions: MultiSelectOption[] = [
		{label: 'Installed', value: 'installed'},
		{label: 'Not Installed', value: 'not-installed'},
		{label: 'Update Available', value: 'update-available'}
	];

	const socOptions: MultiSelectOption[] = socFromCatalog.map(soc => ({
		label: soc.name,
		value: soc.name
	}));

	const handleSearchChange = (value: string) => {
		dispatch(setSearchQuery(value));
	};

	const handleStatusChange = (options: MultiSelectOption[]) => {
		dispatch(setStatusFilter(options.map(o => o.value)));
	};

	const handleSocChange = (options: MultiSelectOption[]) => {
		const values = options.map(option => option.value);
		dispatch(setSocFilter(values));
	};

	const handleTypeChange = (options: MultiSelectOption[]) => {
		dispatch(setTypeFilter(options.map(o => o.value.toLowerCase())));
	};

	return (
		<div className={styles.filtersContainer}>
			<label className={styles.searchWrapper}>
				<SearchIcon />
				<input
					className={styles.searchInput}
					disabled={loading}
					placeholder={l10n?.searchPlaceholder}
					value={searchQuery}
					onChange={e => {
						handleSearchChange(e.target.value);
					}}
				/>
				{!loading && (
					<span className={styles.availableCount}>
						{l10n?.availableCount?.replace('{count}', String(total))}
					</span>
				)}
			</label>
			<div className={styles.filtersList}>
				<Chip
					isActive={requiredOnly}
					label={l10n?.requiredChip}
					isDisabled={loading}
					onClick={() => {
						dispatch(toggleRequiredOnly());
					}}
				/>
				<SearchableMultiSelect
					isClearable
					disableSearch
					className={styles.filterChip}
					variant='filter'
					isDisabled={loading}
					dropdownText={l10n?.status?.label}
					clearText={l10n?.clear}
					chipText={
						statusFilter.length
							? String(statusFilter.length)
							: undefined
					}
					initialSelectedOptions={statusFilter.map(
						status =>
							statusOptions.find(o => o.value === status) ?? {
								label: status,
								value: status
							}
					)}
					options={statusOptions}
					onSelection={handleStatusChange}
				/>
				<SearchableMultiSelect
					isClearable
					className={styles.filterChip}
					variant='filter'
					isDisabled={loading}
					dropdownText={l10n?.soc?.label}
					searchPlaceholder={l10n?.soc?.searchPlaceholder}
					noResultsText={l10n?.soc?.noResults}
					clearText={l10n?.clear}
					chipText={
						socFilter.length ? String(socFilter.length) : undefined
					}
					initialSelectedOptions={socFilter.map(
						id =>
							socOptions.find(o => o.value === id) ?? {
								label: id,
								value: id
							}
					)}
					options={socOptions}
					onSelection={handleSocChange}
				/>
				<SearchableMultiSelect
					isClearable
					disableSearch
					className={styles.filterChip}
					variant='filter'
					isDisabled={loading}
					dropdownText={l10n?.type?.label}
					clearText={l10n?.clear}
					chipText={
						typeFilter.length ? String(typeFilter.length) : undefined
					}
					initialSelectedOptions={typeFilter.map(
						type =>
							typeOptions.find(o => o.value === type) ?? {
								label: type,
								value: type
							}
					)}
					options={typeOptions}
					onSelection={handleTypeChange}
				/>
			</div>
		</div>
	);
}

/**
 * @deprecated Use {@link PackageFiltersTitle} and {@link PackageFiltersBar} separately
 * to allow the title to scroll away while keeping the filters sticky.
 */
export default function PackageFilters() {
	return (
		<div className={styles.container}>
			<PackageFiltersTitle />
			<PackageFiltersBar />
		</div>
	);
}
