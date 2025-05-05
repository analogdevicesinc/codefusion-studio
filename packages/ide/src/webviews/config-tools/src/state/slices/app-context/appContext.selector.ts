/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {type MemoryBlock} from '../../../../../common/types/soc';
import {
	getProjectInfoList,
	type ProjectInfo
} from '../../../utils/config';
import {getCoreMemoryBlocks} from '../../../utils/memory';
import {getSocCoreList} from '../../../utils/soc-cores';
import {useAppSelector} from '../../store';
import {type Partition} from '../partitions/partitions.reducer';
import {usePartitions} from '../partitions/partitions.selector';

export const useActiveScreen = () =>
	useAppSelector(state => state.appContextReducer.activeScreen);

export const useActiveConfiguredSignal = () =>
	useAppSelector(
		state =>
			state.appContextReducer.configScreen.activeConfiguredSignalId
	);

export const useActiveFilterType = () =>
	useAppSelector(state => state.appContextReducer.filter);

export const useSearchString = (
	searchContext: 'register' | 'pinconfig'
) =>
	useAppSelector(
		state => state.appContextReducer.searchString[searchContext]
	);

export const useIsAllocatingProject = () =>
	useAppSelector(state => state.appContextReducer.isAllocatingCore);

export const useMemoryTypeFilters = () =>
	useAppSelector(state => state.appContextReducer.memoryTypeFilter);

export const useCoreFilters = () =>
	useAppSelector(state => state.appContextReducer.coresFilter);

export const useSelectedProjects = () =>
	useAppSelector(state => state.appContextReducer.selectedProjects);

export const useFilteredMemoryBlocks = (): MemoryBlock[] => {
	const memoryTypeFilter = useMemoryTypeFilters();
	const coreFilter = useCoreFilters();
	const cores = useFilteredCores();

	const blockNamesInCores = [
		...new Set(
			cores
				.map(core => {
					const dataModelCore = getSocCoreList().find(
						c => c.Id === core.CoreId
					);

					return dataModelCore?.Memory.map(
						memoryBlock => memoryBlock.Name
					);
				})
				.flat()
		)
	];

	return getCoreMemoryBlocks()
		.filter(
			block =>
				memoryTypeFilter.length === 0 ||
				memoryTypeFilter.includes(block.Type)
		)
		.filter(
			block =>
				coreFilter.length === 0 ||
				blockNamesInCores.includes(block.Name)
		);
};

export const useFilteredPartitions = (): Partition[] => {
	const partitions = usePartitions();
	const memoryTypeFilter = useMemoryTypeFilters();
	const coreFilter = useCoreFilters();
	const blockNames = useFilteredMemoryBlocks().map(
		block => block.Name
	);

	return partitions
		.filter(
			partition =>
				memoryTypeFilter.length === 0 ||
				partition.blockNames.some(name => blockNames.includes(name))
		)
		.filter(
			partition =>
				coreFilter.length === 0 ||
				partition.projects.some(project =>
					coreFilter.includes(project.label)
				)
		);
};

export const useFilteredBlockTypes = (): string[] =>
	Array.from(
		new Set(useFilteredMemoryBlocks().map(block => block.Type))
	);

export const useFilteredCores = (): ProjectInfo[] => {
	const memoryTypeFilter = useMemoryTypeFilters();
	const coreFilter = useCoreFilters();

	return (
		getProjectInfoList()
			?.filter(
				project =>
					coreFilter.length === 0 || coreFilter.includes(project.Name)
			)
			.filter(project => {
				const dataModelCore = getSocCoreList().find(
					c => c.Id === project.CoreId
				);

				return (
					memoryTypeFilter.length === 0 ||
					dataModelCore?.Memory.some(memoryBlock =>
						memoryTypeFilter.includes(memoryBlock.Type)
					)
				);
			}) ?? []
	);
};
