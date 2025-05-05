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
import type {
	WorkspaceTemplateType,
	BoardPackage,
	WorkspaceConfigState,
	StatePlatformConfig
} from '../../../common/types/state';

import {workspaceConfigInitialState} from '../../constants/workspace-config';
import {getCatalogCoreInfo} from '../../../utils/core-list';
import type {CfsPluginInfo} from 'cfs-lib';

const WorkspaceConfigSlice = createSlice({
	name: 'workspaceConfig',
	initialState: workspaceConfigInitialState,
	reducers: {
		setSelectedSoc(state, action: PayloadAction<string>) {
			Object.assign(state, workspaceConfigInitialState);
			state.socId = action.payload;
		},
		setSelectedBoardPackage(
			state,
			action: PayloadAction<BoardPackage>
		) {
			state.boardPackage = action.payload;
		},
		setCoreConfig(
			state,
			{
				payload
			}: PayloadAction<{
				id: string;
				config: {
					pluginId: string;
					pluginVersion: string;
					firmwarePlatform: string;
					platformConfig: StatePlatformConfig;
				};
			}>
		) {
			if (state.cores[payload.id]) {
				const {
					pluginId,
					pluginVersion,
					firmwarePlatform,
					platformConfig
				} = payload.config;

				state.cores[payload.id].pluginId = pluginId;
				state.cores[payload.id].pluginVersion = pluginVersion;
				state.cores[payload.id].firmwarePlatform = firmwarePlatform;
				state.cores[payload.id].platformConfig = platformConfig;
			}
		},
		resetCorePlayformConfig(
			state,
			{
				payload
			}: PayloadAction<{
				id: string;
			}>
		) {
			if (state.cores[payload.id]) {
				state.cores[payload.id].platformConfig = {};
			}
		},
		setCoresInitialState(state, action: PayloadAction<string[]>) {
			action.payload.forEach(id => {
				if (!state.cores[id]) {
					const {name, isPrimary, dataModelCoreID} =
						getCatalogCoreInfo(state.socId, id) ?? {};

					state.cores[id] = {
						id,
						coreId: dataModelCoreID ?? '',
						pluginId: '',
						pluginVersion: '',
						name,
						isPrimary,
						isEnabled: false,
						platformConfig: {}
					};
				}
			});
		},
		toggleCoreEnabled(
			state,
			{payload: coreId}: PayloadAction<string>
		) {
			if (!state.cores[coreId]) {
				return;
			}

			state.cores[coreId].isEnabled = !state.cores[coreId].isEnabled;
		},
		removeSelectedCores(state, action: PayloadAction<string[]>) {
			action.payload.forEach(coreId => {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete state.cores[coreId];
			});
		},
		setWorkspaceTemplateType(
			state,
			action: PayloadAction<WorkspaceTemplateType>
		) {
			state.workspaceConfig.templateType = action.payload;
		},
		setCoreToConfigId(state, action: PayloadAction<string>) {
			state.coreToConfigId = action.payload;
		},
		setWorkspaceTemplate(
			state,
			action: PayloadAction<Partial<CfsPluginInfo> | undefined>
		) {
			state.workspaceTemplate = action.payload;

			if (Object.keys(state.cores).length) {
				state.cores = {};
				state.coreToConfigId = '';
			}
		},
		setWorkspaceName(state, {payload}: PayloadAction<string>) {
			state.workspaceConfig.name = payload;
		},
		setWorkspacePath(state, {payload}: PayloadAction<string>) {
			state.workspaceConfig.path = payload;
		},
		setConfigErrors(
			state,
			{
				payload
			}: PayloadAction<{
				id: keyof WorkspaceConfigState['configErrors'];
				notifications?: string[];
				form?: Record<string, unknown>;
			}>
		) {
			state.configErrors[payload.id] = {
				notifications: payload.notifications ?? [],
				form: payload?.form
			};
		}
	}
});

export const {
	setSelectedSoc,
	setSelectedBoardPackage,
	setCoresInitialState,
	setCoreConfig,
	toggleCoreEnabled,
	removeSelectedCores,
	resetCorePlayformConfig,
	setCoreToConfigId,
	setWorkspaceTemplate,
	setWorkspaceTemplateType,
	setConfigErrors,
	setWorkspaceName,
	setWorkspacePath
} = WorkspaceConfigSlice.actions;

export const workspaceConfigReducer = WorkspaceConfigSlice.reducer;
