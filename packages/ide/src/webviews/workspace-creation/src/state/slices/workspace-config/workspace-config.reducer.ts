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
import {getTrustZoneIds} from '../../../utils/workspace-config';
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
					const {
						name,
						isPrimary,
						dataModelCoreID,
						supportsTrustZone
					} = getCatalogCoreInfo(state.socId, id) ?? {};

					state.cores[id] = {
						id,
						coreId: dataModelCoreID ?? '',
						pluginId: '',
						pluginVersion: '',
						name,
						isPrimary,
						supportsTrustZone,
						// enable primary core by default
						isEnabled: Boolean(isPrimary),
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

			// Handles TrustZone core and base core syncing (when both the secure/non-secure is unchecked, base core should be disabled))
			const isTrustZoneCore =
				coreId.endsWith('-secure') || coreId.endsWith('-nonsecure');

			if (isTrustZoneCore) {
				const baseId = coreId.replace(/-(secure|nonsecure)$/, '');
				const {secureCoreId, nonSecureCoreId} =
					getTrustZoneIds(baseId);

				// Check if TrustZone is enabled for this base core
				const isTrustZoneEnabled =
					state.isTrustZoneEnabled?.[baseId] || false;

				if (isTrustZoneEnabled) {
					const isSecureEnabled =
						state.cores[secureCoreId]?.isEnabled || false;
					const isNonSecureEnabled =
						state.cores[nonSecureCoreId]?.isEnabled || false;
					const shouldBaseBeEnabled =
						isSecureEnabled || isNonSecureEnabled;

					if (
						state.cores[baseId] &&
						state.cores[baseId].isEnabled !== shouldBaseBeEnabled
					) {
						state.cores[baseId].isEnabled = shouldBaseBeEnabled;
					}
				}
			}
		},
		removeSelectedCores(state, action: PayloadAction<string[]>) {
			const coreIdsToRemove = new Set(action.payload);

			state.cores = Object.keys(state.cores).reduce(
				(acc, coreId) => {
					if (!coreIdsToRemove.has(coreId)) {
						acc[coreId] = state.cores[coreId];
					}
					return acc;
				},
				{} as typeof state.cores
			);
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
		addOrUpdateTrustZoneCores(
			state,
			{
				payload
			}: PayloadAction<{
				baseId: string;
				secureEnabled: boolean;
				nonSecureEnabled: boolean;
			}>
		) {
			const {baseId, secureEnabled, nonSecureEnabled} = payload;
			const baseCore = state.cores[baseId];
			if (!baseCore) return;

			const secureId = `${baseId}-secure`;
			const nonSecureId = `${baseId}-nonsecure`;

			// Add or update secure core
			const secureCore = {
				...baseCore,
				id: secureId,
				name: `${baseCore.name} (Secure)`,
				Secure: true,
				isEnabled: secureEnabled
			};

			// Add or update non-secure core
			const nonSecureCore = {
				...baseCore,
				id: nonSecureId,
				name: `${baseCore.name} (Non-Secure)`,
				Secure: false,
				isEnabled: nonSecureEnabled
			};

			// Rebuild the cores object with secure/non-secure inserted after baseId
			const newCores: typeof state.cores = {};

			for (const key of Object.keys(state.cores)) {
				newCores[key] = state.cores[key];

				if (key === baseId) {
					newCores[secureId] = secureCore;
					newCores[nonSecureId] = nonSecureCore;
				}
			}

			state.cores = newCores;
		},
		removeTrustZoneCores(
			state,
			{payload}: PayloadAction<{baseId: string}>
		) {
			const {baseId} = payload;
			const {secureCoreId, nonSecureCoreId} = getTrustZoneIds(baseId);

			const {
				[secureCoreId]: _secure,
				[nonSecureCoreId]: _nonSecure,
				...remainingCores
			} = state.cores;

			state.cores = remainingCores;
		},
		setIsTrustZoneEnabled(
			state,
			action: PayloadAction<{id: string; enabled: boolean}>
		) {
			const {id, enabled} = action.payload;
			state.isTrustZoneEnabled[id] = enabled;

			// When TrustZone is enabled, ensure the base core is enabled
			if (enabled && state.cores[id]) {
				state.cores[id].isEnabled = true;
			}
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
	setWorkspacePath,
	setCurrentCoreConfigStep,
	addOrUpdateTrustZoneCores,
	removeTrustZoneCores,
	setIsTrustZoneEnabled
} = WorkspaceConfigSlice.actions;

export const workspaceConfigReducer = WorkspaceConfigSlice.reducer;
