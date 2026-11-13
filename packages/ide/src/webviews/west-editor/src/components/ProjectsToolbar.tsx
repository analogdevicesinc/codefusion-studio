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
import {Divider, SearchInput} from 'cfs-react-library';
import type {WestProjectStatus} from '@west-editor/types';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import type {ProjectFilters} from '../utils/project-filters';
import ProjectFilterBar from './ProjectFilterBar';
import styles from './ProjectsToolbar.module.scss';

type ProjectsToolbarProps = Readonly<{
	/** Current search text. */
	search: string;
	onSearchChange: (search: string) => void;
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
 * The bar pinned above the project list. Holds the search field, the
 * filter chips and the add-project action.
 */
export default function ProjectsToolbar({
	search,
	onSearchChange,
	filters,
	statusFilters,
	groups,
	remotes,
	onFiltersChange
}: ProjectsToolbarProps) {
	const l10n = useLocaleContext();

	return (
		<div className={styles.toolbar}>
			<SearchInput
				inputVal={search}
				placeholder={l10n?.projects.search}
				dataTest='west-editor:project-search'
				onInputChange={onSearchChange}
				onClear={() => {
					onSearchChange('');
				}}
			/>
			<ProjectFilterBar
				filters={filters}
				statusFilters={statusFilters}
				groups={groups}
				remotes={remotes}
				onFiltersChange={onFiltersChange}
			/>
			<Divider className={styles.divider} />
		</div>
	);
}
