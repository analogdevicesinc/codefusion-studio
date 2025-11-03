/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import {useAppSelector} from '../../store';
import {type Partition} from './partitions.reducer';

export function usePartitions() {
	return useAppSelector(state => state.partitionsReducer.partitions);
}

export function useSidebarState() {
	return useAppSelector(state => ({
		isSidebarMinimised: state.partitionsReducer.isSidebarMinimised,
		sidebarPartition: state.partitionsReducer.sidebarPartition,
		activePartition: state.partitionsReducer.activePartition
	}));
}

export function useActivePartitionDisplayName() {
	return useAppSelector(
		state => state.partitionsReducer.activePartition?.displayName
	);
}

export function useActivePartitionType() {
	return useAppSelector(
		state => state.partitionsReducer.activePartition?.type
	);
}

export function useActivePartitionProjects() {
	return useAppSelector(
		state => state.partitionsReducer.activePartition?.projects
	);
}

export function useActivePartitionConfig() {
	return useAppSelector(
		state => state.partitionsReducer.activePartition?.config
	);
}

/**
 * Custom hook to get the partitions for a given project.
 * @param projectId The project Id.
 * @returns {Partition[]} The array of partitions.
 */
export function useAssignedPartitions(
	projectId: string
): Partition[] {
	return usePartitions().filter(partition =>
		partition.projects.some(
			project => project.projectId === projectId
		)
	);
}
