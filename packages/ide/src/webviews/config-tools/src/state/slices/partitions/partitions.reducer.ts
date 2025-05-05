/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type MemoryBlock} from '../../../../../common/types/soc';

export type Partition = {
	displayName: string;
	type: string;
	baseBlock: MemoryBlock;
	blockNames: string[];
	startAddress: string;
	size: number;
	projects: PartitionCore[];
	config?: Record<string, Record<string, string | number | boolean>>;
};

export type PartitionCore = {
	projectId: string;
	coreId: string;
	label: string;
	access: string;
	owner: boolean;
};

type PartitionsState = {
	partitions: Partition[];
	isSidebarMinimised: boolean;
	sidebarPartition: Partition;
};

export const partitionsInitialState: PartitionsState = {
	partitions: [],
	isSidebarMinimised: true,
	sidebarPartition: {
		displayName: '',
		type: '',
		baseBlock: {
			Name: '',
			Description: '',
			AddressStart: '',
			AddressEnd: '',
			Width: 0,
			Access: '',
			Location: '',
			Type: ''
		},
		blockNames: [],
		startAddress: '',
		size: 0,
		projects: []
	}
};

const partitionsSlice = createSlice({
	name: 'Partitions',
	initialState: partitionsInitialState,
	reducers: {
		createPartition(state, {payload}: PayloadAction<Partition>) {
			state.partitions = [...state.partitions, payload];
		},
		removePartition(
			state,
			{payload}: PayloadAction<{startAddress: string}>
		) {
			return {
				...state,
				partitions: state.partitions.filter(
					partition =>
						parseInt(partition.startAddress, 16) !==
						parseInt(payload.startAddress, 16)
				)
			};
		},
		setSideBarState(
			state,
			{
				payload
			}: PayloadAction<{
				isSidebarMinimised: boolean;
				sidebarPartition: Partition;
			}>
		) {
			state.isSidebarMinimised = payload.isSidebarMinimised;
			state.sidebarPartition = payload.sidebarPartition;
		},
		editPartition(
			state,
			{
				payload
			}: PayloadAction<{
				sidebarPartition: Partition;
				startAddress: string;
			}>
		) {
			return {
				...state,
				partitions: state.partitions.map(partition =>
					parseInt(partition.startAddress, 16) ===
					parseInt(payload.startAddress, 16)
						? {...partition, ...payload.sidebarPartition}
						: partition
				)
			};
		}
	}
});

export const {
	createPartition,
	removePartition,
	setSideBarState,
	editPartition
} = partitionsSlice.actions;

export const partitionsReducer = partitionsSlice.reducer;
