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
import type {NavigationItem} from '@common/types/navigation';
import {navigationItems} from '@common/constants/navigation';
import type {RegisterDictionary} from '@common/types/soc';
import type {CodeGenerationProject} from 'cfs-lib/dist/types/code-generation';

export type Filter =
	| 'assigned'
	| 'available'
	| 'conflict'
	| 'reserved'
	| undefined;

type AppContextState = {
	activeScreen: NavigationItem;
	activeScreenSubscreens?: NavigationItem[];
	activeScreenSubscreen?: NavigationItem;
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
	selectedProjects: CodeGenerationProject[];
	memoryScreen: {
		activeView: 'project' | 'type';
		openProjectCards: string[];
		openTypeCards: string[];
	};
	isProjectSelectionView: boolean;
	newPeripheralAssignment?: {
		peripheral: string | undefined;
		projectId: string | undefined;
	};
	newSignalAssignment?: {
		signal: string | undefined;
		projectId: string | undefined;
	};
	peripheralErrorCount: Record<
		string,
		{
			totalErrors: number;
			signals: Record<string, number>;
		}
	>;
	peripheralScreen: {
		openProjectCards: string[];
	};
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
	selectedProjects: [],
	memoryScreen: {
		activeView: 'project',
		openProjectCards: [],
		openTypeCards: []
	},
	isProjectSelectionView: false,
	newPeripheralAssignment: {
		peripheral: undefined,
		projectId: undefined
	},
	newSignalAssignment: {
		signal: undefined,
		projectId: undefined
	},
	peripheralErrorCount: {},
	peripheralScreen: {
		openProjectCards: []
	}
};

const appContextSlice = createSlice({
	name: 'appContext',
	initialState: appContextInitialState,
	reducers: {
		setActiveScreen(state, action: PayloadAction<NavigationItem>) {
			if (state.activeScreen !== action.payload) {
				state.activeScreenSubscreens = undefined;
			}

			state.activeScreen = action.payload;
		},
		setActiveScreenSubscreens(
			state,
			{payload}: PayloadAction<NavigationItem[]>
		) {
			state.activeScreenSubscreens = payload;
		},
		setActiveScreenSubscreen(
			state,
			{payload}: PayloadAction<NavigationItem>
		) {
			state.activeScreenSubscreen = payload;
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
		setSelectedProject(
			state,
			{payload}: PayloadAction<CodeGenerationProject>
		) {
			if (
				state.selectedProjects.find(
					project => project.projectId === payload.projectId
				)
			) {
				state.selectedProjects = state.selectedProjects.map(
					project =>
						project.projectId === payload.projectId
							? payload
							: project
				);
			} else {
				state.selectedProjects = [...state.selectedProjects, payload];
			}
		},
		removeSelectedProject(state, {payload}: PayloadAction<string>) {
			state.selectedProjects = state.selectedProjects.filter(
				project => project.projectId !== payload
			);
		},
		setMemoryScreenActiveView(
			state,
			{payload}: PayloadAction<'project' | 'type'>
		) {
			state.memoryScreen.activeView = payload;
		},
		setOpenProjectCards(state, {payload}: PayloadAction<string[]>) {
			state.memoryScreen.openProjectCards = payload;
		},
		setOpenTypeCards(state, {payload}: PayloadAction<string[]>) {
			state.memoryScreen.openTypeCards = payload;
		},
		setProjectSelectionView(
			state,
			{payload}: PayloadAction<boolean>
		) {
			state.isProjectSelectionView = payload;
		},
		setNewPeripheralAssignment(
			state,
			{
				payload
			}: PayloadAction<{
				peripheral: string | undefined;
				projectId: string | undefined;
			}>
		) {
			state.newPeripheralAssignment = {
				peripheral: payload.peripheral,
				projectId: payload.projectId
			};
		},
		setNewSignalAssignment(
			state,
			{
				payload
			}: PayloadAction<{
				signal: string | undefined;
				projectId: string | undefined;
			}>
		) {
			state.newSignalAssignment = {
				signal: payload.signal,
				projectId: payload.projectId
			};
		},
		setPeripheralErrorCount(
			state,
			{
				payload
			}: PayloadAction<{
				peripheral: string;
				signal: string;
				errorCount: number;
			}>
		) {
			const {peripheral, signal, errorCount} = payload;

			if (!state.peripheralErrorCount[peripheral]) {
				state.peripheralErrorCount[peripheral] = {
					totalErrors: 0,
					signals: {}
				};
			}

			state.peripheralErrorCount[peripheral].signals[signal] =
				errorCount;
			// Recalculate total
			state.peripheralErrorCount[peripheral].totalErrors =
				Object.values(
					state.peripheralErrorCount[peripheral].signals
				).reduce((sum, val) => sum + val, 0);
		},
		setPeripheralScreenOpenProjectCards(
			state,
			{payload}: PayloadAction<string[]>
		) {
			state.peripheralScreen.openProjectCards = payload;
		}
	}
});

export const {
	setActiveScreen,
	setActiveScreenSubscreens,
	setActiveScreenSubscreen,
	setActiveConfiguredSignal,
	setIsAllocatingCore,
	setActiveFilter,
	setActiveSearchString,
	setMemoryTypeFilter,
	setCoresFilter,
	setSelectedProject,
	removeSelectedProject,
	setMemoryScreenActiveView,
	setOpenProjectCards,
	setOpenTypeCards,
	setProjectSelectionView,
	setNewPeripheralAssignment,
	setPeripheralErrorCount,
	setNewSignalAssignment,
	setPeripheralScreenOpenProjectCards
} = appContextSlice.actions;

export const appContextReducer = appContextSlice.reducer;
