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
import {getTrustZoneProjectIds} from '../../../utils/workspace-config';
import type {CfsPluginInfo} from 'cfs-types';

import {
	TRUSTZONE_SECURE_LABEL as S_LABEL,
	TRUSTZONE_NON_SECURE_LABEL as NS_LABEL
} from '../../../common/constants/identifiers';

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
		resetCorePlatformConfig(
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
					const {
						name,
						isPrimary,
						dataModelCoreID,
						isTrustZoneSupported
					} = getCatalogCoreInfo(state.socId, id) ?? {};

					const newCore: WorkspaceConfigState['cores'][string] = {
						id,
						coreId: dataModelCoreID ?? '',
						pluginId: '',
						pluginVersion: '',
						name,
						isPrimary,
						isTrustZoneSupported: isTrustZoneSupported ?? false, // Here we don't need to add "Secure" key because this is the core in state on first init
						// enable primary core by default
						isEnabled: Boolean(isPrimary),
						platformConfig: {}
					};

					state.cores[id] = newCore;
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
			const coreIdsToRemove = new Set(action.payload);

			state.cores = Object.keys(state.cores).reduce<
				typeof state.cores
			>((acc, coreId) => {
				if (!coreIdsToRemove.has(coreId)) {
					acc[coreId] = state.cores[coreId];
				}

				return acc;
			}, {});
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
		},
		setCurrentCoreConfigStep(state, action: PayloadAction<number>) {
			state.currentCoreConfigStep = action.payload;
		},
		addProjects(
			state,
			{
				payload
			}: PayloadAction<{
				baseId: string;
			}>
		) {
			// This action adds TrustZone projects (Secure and Non-Secure) for a given base core (and removes the base core), but can be expanded to other project types
			const {baseId} = payload;
			const baseCore = state.cores[baseId];
			if (!baseCore) return;

			const {secureProjectId, nonSecureProjectId} =
				getTrustZoneProjectIds(baseId);

			const cores: typeof state.cores = {};

			for (const coreId of Object.keys(state.cores)) {
				if (coreId === baseId) {
					[
						{id: secureProjectId, suffix: S_LABEL},
						{id: nonSecureProjectId, suffix: NS_LABEL}
					].forEach(({id, suffix}) => {
						cores[id] = {
							id,
							coreId: baseCore.coreId,
							name: baseCore.name,
							isPrimary: baseCore.isPrimary,
							Secure: suffix === S_LABEL,
							isEnabled: baseCore.isEnabled,
							platformConfig: {},
							pluginId: '',
							pluginVersion: '',
							isTrustZoneSupported: baseCore.isTrustZoneSupported
						};
					});
				} else {
					cores[coreId] = state.cores[coreId];
				}
			}

			state.cores = cores;
		},
		toggleProjects(
			state,
			{
				payload
			}: PayloadAction<{
				projectIds: string[];
				isChecked: boolean;
			}>
		) {
			const {projectIds, isChecked} = payload;

			projectIds.forEach(projectId => {
				if (state.cores[projectId]) {
					state.cores[projectId].isEnabled = isChecked;
				}
			});
		},
		removeProjects(
			state,
			{payload}: PayloadAction<{baseId: string}>
		) {
			const {baseId} = payload;
			const {secureProjectId, nonSecureProjectId} =
				getTrustZoneProjectIds(baseId);

			const {
				[secureProjectId]: _secure,
				[nonSecureProjectId]: _nonSecure,
				...remainingCores
			} = state.cores;

			// Replace the trust zone projects with the base core
			const {name, isPrimary, dataModelCoreID, isTrustZoneSupported} =
				getCatalogCoreInfo(state.socId, baseId) ?? {};

			const baseCore: WorkspaceConfigState['cores'][string] = {
				id: baseId,
				coreId: dataModelCoreID ?? '',
				pluginId: '',
				pluginVersion: '',
				name,
				isPrimary,
				isTrustZoneSupported: isTrustZoneSupported ?? false,
				isEnabled: Boolean(isPrimary),
				platformConfig: {}
			};

			remainingCores[baseId] = baseCore;

			state.cores = remainingCores;
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
	resetCorePlatformConfig,
	setCoreToConfigId,
	setWorkspaceTemplate,
	setWorkspaceTemplateType,
	setConfigErrors,
	setWorkspaceName,
	setWorkspacePath,
	setCurrentCoreConfigStep,
	addProjects,
	removeProjects,
	toggleProjects
} = WorkspaceConfigSlice.actions;

export const workspaceConfigReducer = WorkspaceConfigSlice.reducer;
