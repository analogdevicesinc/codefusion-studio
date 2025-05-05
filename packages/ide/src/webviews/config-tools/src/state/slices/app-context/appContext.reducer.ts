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
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {NavigationItem} from '@common/types/navigation';
import {navigationItems} from '@common/constants/navigation';
import type {RegisterDictionary} from '@common/types/soc';

export type Filter =
	| 'assigned'
	| 'available'
	| 'conflict'
	| 'reserved'
	| undefined;

type AppContextState = {
	activeScreen: NavigationItem;
	configScreen: {
		activeConfiguredSignalId: {
			peripheral?: string;
			signal?: string;
			pin?: string;
		};
	};
	isAllocatingCore: boolean;
	registersScreen: {
		registers: RegisterDictionary[];
	};
	filter: Filter;
	searchString: {
		register: string;
		pinconfig: string;
	};
	memoryTypeFilter: string[];
	coresFilter: string[];
	selectedProjects: string[];
};

export const appContextInitialState: AppContextState = {
	activeScreen: navigationItems.dashboard,
	configScreen: {
		activeConfiguredSignalId: {}
	},
	isAllocatingCore: false,
	registersScreen: {
		registers: []
	},
	filter: undefined,
	searchString: {
		register: '',
		pinconfig: ''
	},
	memoryTypeFilter: [],
	coresFilter: [],
	selectedProjects: []
};

const appContextSlice = createSlice({
	name: 'appContext',
	initialState: appContextInitialState,
	reducers: {
		setActiveScreen(state, action: PayloadAction<NavigationItem>) {
			state.activeScreen = action.payload;
		},
		setActiveConfiguredSignal(
			state,
			{
				payload: {peripheralName, signalName, pinId}
			}: PayloadAction<{
				peripheralName?: string;
				signalName?: string;
				pinId?: string;
			}>
		) {
			state.configScreen.activeConfiguredSignalId =
				peripheralName && signalName && pinId
					? {
							peripheral: peripheralName,
							signal: signalName,
							pin: pinId
						}
					: {};
		},
		setIsAllocatingCore(state, {payload}: PayloadAction<boolean>) {
			state.isAllocatingCore = payload;
		},
		setActiveFilter(state, {payload}: PayloadAction<Filter>) {
			state.filter = payload;
		},
		setActiveSearchString(
			state,
			{
				payload: {searchContext, value}
			}: PayloadAction<{
				searchContext: 'register' | 'pinconfig';
				value: string;
			}>
		) {
			state.searchString[searchContext] = value;
		},
		setMemoryTypeFilter(state, {payload}: PayloadAction<string[]>) {
			state.memoryTypeFilter = payload;
		},
		setCoresFilter(state, {payload}: PayloadAction<string[]>) {
			state.coresFilter = payload;
		},
		setSelectedProjects(state, {payload}: PayloadAction<string[]>) {
			state.selectedProjects = payload;
		}
	}
});

export const {
	setActiveScreen,
	setActiveConfiguredSignal,
	setIsAllocatingCore,
	setActiveFilter,
	setActiveSearchString,
	setMemoryTypeFilter,
	setCoresFilter,
	setSelectedProjects
} = appContextSlice.actions;

export const appContextReducer = appContextSlice.reducer;
