/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import {MultiSelect, type MultiSelectOption} from 'cfs-react-library';
import {getSocMemoryTypeList} from '../../../utils/memory';
import {useCallback, useEffect, useMemo, useState} from 'react';
import styles from './memory-filtering.module.scss';
import {useDispatch} from 'react-redux';
import {
	setProjectFilter,
	setMemoryTypeFilter
} from '../../../state/slices/app-context/appContext.reducer';
import {useProjectFilters} from '../../../state/slices/app-context/appContext.selector';
import {getProjectInfoList} from '../../../utils/config';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import ProjectOption from '../../../components/project-option/project-option';

export type MemoryFilters = {
	memoryTypes: string[];
	cores: string[];
};

export function MemoryFiltering() {
	const projects = getProjectInfoList();
	const projectFilter = useProjectFilters();
	const l10n = useLocaleContext()?.memoryConfig as
		| Record<string, string>
		| undefined;
	const [selectedMemoryTypes, setSelectedMemoryTypes] = useState<
		MultiSelectOption[]
	>([]);

	const dispatch = useDispatch();

	const projectOptions = useMemo(
		() =>
			projects?.map(project => ({
				label: <ProjectOption project={project} />,
				value: project.ProjectId
			})),
		[projects]
	);

	const initialSelectedProjectOptions = useMemo(
		() =>
			projectFilter
				.map(projectId => {
					const project = projects?.find(
						p => p.ProjectId === projectId
					);

					return project
						? {
								label: <ProjectOption project={project} />,
								value: project.ProjectId
							}
						: null;
				})
				.filter(Boolean) as MultiSelectOption[],
		[projectFilter, projects]
	);

	const onMemoryTypeSelection = useCallback(
		(selectedOption: MultiSelectOption[]) => {
			setSelectedMemoryTypes(selectedOption);
			const options = selectedOption.map(option => option.value);
			dispatch(setMemoryTypeFilter(options));
		},
		[setSelectedMemoryTypes, dispatch]
	);

	const onProjectSelection = useCallback(
		(projectOptions: MultiSelectOption[]) => {
			const options = projectOptions.map(option => option.value);
			dispatch(setProjectFilter(options));
		},
		[dispatch]
	);

	// Clear the filters when navigating away from the memory allocation screen
	useEffect(
		() => () => {
			dispatch(setProjectFilter([]));
			dispatch(setMemoryTypeFilter([]));
		},
		[dispatch]
	);

	return (
		<div className={styles.container}>
			<div className={styles.memoryType}>
				<MultiSelect
					dropdownText={l10n?.memoryType ?? 'Memory Type'}
					initialSelectedOptions={selectedMemoryTypes}
					options={getSocMemoryTypeList().map(memoryType => ({
						label: memoryType.Name,
						value: memoryType.Name
					}))}
					variant='filter'
					dataTest='memory-type-filter'
					chipText={
						selectedMemoryTypes.length > 0
							? selectedMemoryTypes.length.toString()
							: ''
					}
					onSelection={onMemoryTypeSelection}
				/>
			</div>
			<div className={styles.cores}>
				<MultiSelect
					dropdownText={l10n?.project ?? 'Project'}
					initialSelectedOptions={initialSelectedProjectOptions}
					options={projectOptions ?? []}
					variant='filter'
					dataTest='project-filter'
					chipText={
						projectFilter.length > 0
							? projectFilter.length.toString()
							: ''
					}
					onSelection={onProjectSelection}
				/>
			</div>
		</div>
	);
}
