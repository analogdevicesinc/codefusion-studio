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
import {useMemo} from 'react';
import {
	Chip,
	SearchableMultiSelect,
	type MultiSelectOption
} from 'cfs-react-library';
import type {WestProjectStatus} from '@west-editor/types';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import type {ProjectFilters} from '../utils/project-filters';
import styles from './ProjectFilterBar.module.scss';

type ProjectFilterBarProps = Readonly<{
	filters: ProjectFilters;
	/** The status filters to offer. */
	statusFilters: readonly WestProjectStatus[];
	/** Every group a project can be filtered on. */
	groups: readonly string[];
	/** Every remote a project can be filtered on. */
	remotes: readonly string[];
	onFiltersChange: (filters: ProjectFilters) => void;
}>;

/**
 * The filter chips under the project search: one toggle per workspace
 * status, plus dropdowns to pick groups and remotes.
 */
export default function ProjectFilterBar({
	filters,
	statusFilters,
	groups,
	remotes,
	onFiltersChange
}: ProjectFilterBarProps) {
	const l10n = useLocaleContext();

	const toggleStatus = (status: WestProjectStatus) => {
		onFiltersChange({
			...filters,
			statuses: filters.statuses.includes(status)
				? filters.statuses.filter(s => s !== status)
				: [...filters.statuses, status]
		});
	};

	return (
		<div className={styles.filters}>
			{statusFilters.map(status => (
				<Chip
					key={status}
					label={l10n?.projects.filters[status]}
					isActive={filters.statuses.includes(status)}
					dataTest={`west-editor:project-filter-${status}`}
					onClick={() => {
						toggleStatus(status);
					}}
				/>
			))}
			<NameFilter
				label={l10n?.projects.filters.groups}
				names={groups}
				selected={filters.groups}
				dataTest='west-editor:project-filter-groups'
				onChange={next => {
					onFiltersChange({...filters, groups: next});
				}}
			/>
			<NameFilter
				label={l10n?.projects.filters.remotes}
				names={remotes}
				selected={filters.remotes}
				dataTest='west-editor:project-filter-remotes'
				onChange={next => {
					onFiltersChange({...filters, remotes: next});
				}}
			/>
		</div>
	);
}

type NameFilterProps = Readonly<{
	label: string;
	names: readonly string[];
	selected: readonly string[];
	dataTest: string;
	onChange: (selected: string[]) => void;
}>;

/** A dropdown chip that selects any number of names from a list. */
function NameFilter({
	label,
	names,
	selected,
	dataTest,
	onChange
}: NameFilterProps) {
	const l10n = useLocaleContext();

	// Keeps a selected name the manifest no longer has, so it can still be
	// unticked rather than hiding every project with no way to clear it.
	const options = useMemo(
		() =>
			[...new Set([...names, ...selected])].map(name => ({
				label: name,
				value: name
			})),
		[names, selected]
	);

	const selectedOptions = useMemo(
		() => selected.map(name => ({label: name, value: name})),
		[selected]
	);

	return (
		<SearchableMultiSelect
			isClearable
			disableSearch
			variant='filter'
			className={styles.filterChip}
			isDisabled={options.length === 0}
			dropdownText={label}
			clearText={l10n?.projects.filters.clearAll}
			chipText={
				selected.length > 0 ? String(selected.length) : undefined
			}
			options={options}
			initialSelectedOptions={selectedOptions}
			dataTest={dataTest}
			onSelection={(next: MultiSelectOption[]) => {
				onChange(next.map(option => option.value));
			}}
		/>
	);
}
