/**
 *
 * Copyright (c) 2024 - 2026 Analog Devices, Inc.
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

export const useActiveScreenSubScreens = () =>
	useAppSelector(
		state => state.appContextReducer.activeScreenSubscreens
	);

export const useActiveScreenSubscreen = () =>
	useAppSelector(
		state => state.appContextReducer.activeScreenSubscreen
	);

export const useActiveSettingsPage = () =>
	useAppSelector(state => state.appContextReducer.activeSettingsPage);

export const useActiveConfiguredSignal = () =>
	useAppSelector(
		state =>
			state.appContextReducer.configScreen.activeConfiguredSignalId
	);

export const useActivePinconfigAssignmentFilter = () =>
	useAppSelector(
		state => state.appContextReducer.filter.pinconfig.assignment
	);

export const useActivePinconfigSearchScope = () =>
	useAppSelector(
		state => state.appContextReducer.filter.pinconfig.searchScope
	);

export const useSearchString = (
	searchContext: 'register' | 'pinconfig'
) =>
	useAppSelector(
		state => state.appContextReducer.searchString[searchContext]
	);

export const useMemoryTypeFilters = () =>
	useAppSelector(state => state.appContextReducer.memoryTypeFilter);

export const useProjectFilters = () =>
	useAppSelector(state => state.appContextReducer.projectFilter);

export const useSelectedProjects = () =>
	useAppSelector(state => state.appContextReducer.selectedProjects);

export const useFilteredMemoryBlocks = (): MemoryBlock[] => {
	const memoryTypeFilter = useMemoryTypeFilters();
	const projectFilter = useProjectFilters();
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
				projectFilter.length === 0 ||
				blockNamesInCores.includes(block.Name)
		);
};

export const useFilteredPartitions = (): Partition[] => {
	const partitions = usePartitions();
	const memoryTypeFilter = useMemoryTypeFilters();
	const projectFilter = useProjectFilters();
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
				projectFilter.length === 0 ||
				partition.projects.some(project =>
					projectFilter.includes(project.projectId)
				)
		);
};

export const useFilteredBlockTypes = (): string[] =>
	Array.from(
		new Set(useFilteredMemoryBlocks().map(block => block.Type))
	);

export const useFilteredCores = (): ProjectInfo[] => {
	const memoryTypeFilter = useMemoryTypeFilters();
	const projectFilter = useProjectFilters();

	return (
		getProjectInfoList()
			?.filter(
				project =>
					projectFilter.length === 0 ||
					projectFilter.includes(project.ProjectId)
			)
			.filter(project => {
				const dataModelCore = getSocCoreList().find(
					c => c.Id === project.CoreId
				);

				return (
					memoryTypeFilter.length === 0 ||
					dataModelCore?.Memory.filter(
						memoryBlock => 'Type' in memoryBlock
					).some(memoryBlock =>
						memoryTypeFilter.includes(memoryBlock.Type)
					)
				);
			}) ?? []
	);
};

export const useMemoryScreenActiveView = () =>
	useAppSelector(
		state => state.appContextReducer.memoryScreen.activeView
	);

export const useOpenProjectCards = () =>
	useAppSelector(
		state => state.appContextReducer.memoryScreen.openProjectCards
	);

export const useOpenTypeCards = () =>
	useAppSelector(
		state => state.appContextReducer.memoryScreen.openTypeCards
	);

export function useProjectSelectionConfig() {
	return useAppSelector(
		state => state.appContextReducer.projectSelectionConfig
	);
}

export function useNewPeripheralAssignment() {
	return useAppSelector(
		state => state.appContextReducer.newPeripheralAssignment
	);
}

export function useNewSignalAssignment() {
	return useAppSelector(
		state => state.appContextReducer.newSignalAssignment
	);
}

export function usePeripheralScreenOpenProjectCards() {
	return useAppSelector(
		state => state.appContextReducer.peripheralScreen.openProjectCards
	);
}

export const useActiveSettingsChild = () =>
	useAppSelector(
		state => state.appContextReducer.activeSettingsChild
	);

export const useMcubootEnableState = () =>
	useAppSelector(state => state.appContextReducer.mcubootEnableState);

export const useSigningKeys = () =>
	useAppSelector(state => state.appContextReducer.signingKeys);
