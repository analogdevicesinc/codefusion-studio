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
import {type ByteUnit} from '../../../types/memory';

export type Partition = {
	displayName: string;
	type: string;
	baseBlock: MemoryBlock;
	blockNames: string[];
	startAddress: string;
	size: number;
	projects: PartitionCore[];
	config?: Record<string, Record<string, string | number | boolean>>;
	displayUnit?: ByteUnit;
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
	activePartition: Partition | undefined;
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
		displayUnit: undefined,
		projects: []
	},
	activePartition: undefined
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
			state.activePartition = payload.isSidebarMinimised
				? undefined
				: structuredClone(payload.sidebarPartition);
		},
		updateActivePartition(
			state,
			{payload}: PayloadAction<Partition | undefined>
		) {
			if (!payload) {
				state.activePartition = undefined;
				return;
			}
			state.activePartition = {
				...state.activePartition,
				...payload
			};
		},
		updateActivePartitionConfig(
			state,
			{
				payload
			}: PayloadAction<{
				projectId: string;
				key: string;
				value: string | number | boolean;
			}>
		) {
			if (!state.activePartition) {
				return;
			}

			state.activePartition.config = {
				...state.activePartition.config,
				[payload.projectId]: {
					...state.activePartition.config?.[payload.projectId],
					[payload.key]: payload.value
				}
			};
		},
		updateActivePartitionDisplayName(
			state,
			{payload}: PayloadAction<string>
		) {
			if (!state.activePartition) {
				return;
			}
			state.activePartition = {
				...state.activePartition,
				displayName: payload
			};
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
			const startAddress = parseInt(payload.startAddress, 16);
			return {
				...state,
				partitions: state.partitions.map(partition =>
					parseInt(partition.startAddress, 16) === startAddress
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
	editPartition,
	updateActivePartition,
	updateActivePartitionDisplayName,
	updateActivePartitionConfig
} = partitionsSlice.actions;

export const partitionsReducer = partitionsSlice.reducer;
