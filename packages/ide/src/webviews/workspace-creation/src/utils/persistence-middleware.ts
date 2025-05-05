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

import {
	type ActionCreatorWithPayload,
	createListenerMiddleware
} from '@reduxjs/toolkit';

import type {RootState} from '../state/store';
import {
	setSelectedSoc,
	setSelectedBoardPackage,
	setCoreConfig,
	toggleCoreEnabled,
	removeSelectedCores,
	setWorkspaceTemplate,
	setWorkspaceName,
	setWorkspacePath
} from '../state/slices/workspace-config/workspace-config.reducer';
import {updatePersistedConfig} from './api';
import type {WorkspaceCoreConfig} from '../common/types/config';

export const persistedActions: Array<ActionCreatorWithPayload<any>> =
	[
		setSelectedSoc,
		setSelectedBoardPackage,
		setCoreConfig,
		toggleCoreEnabled,
		removeSelectedCores,
		setWorkspaceTemplate,
		setWorkspaceName,
		setWorkspacePath
	];

export function getPersistenceListenerMiddleware(
	actionsArray: Array<ActionCreatorWithPayload<unknown>>
) {
	return actionsArray.map(action => {
		const listenerMiddleware = createListenerMiddleware();

		listenerMiddleware.startListening({
			actionCreator: action,
			async effect(_, listenerApi) {
				const state = listenerApi.getState() as RootState;

				await updatePersistedConfig({
					Soc: state.workspaceConfigReducer.socId,
					Board: state.workspaceConfigReducer.boardPackage.boardId,
					Package:
						state.workspaceConfigReducer.boardPackage.packageId,
					Projects: Object.values(
						state.workspaceConfigReducer.cores
					).map(core => ({
						Id: core.id,
						CoreId: core.coreId,
						Name: core.name ?? '',
						IsPrimary: core.isPrimary ?? false,
						IsEnabled: core.isEnabled,
						PluginId: core.pluginId ?? '',
						PluginVersion: core.pluginVersion ?? '',
						FirmwarePlatform: core.firmwarePlatform ?? '',
						PlatformConfig:
							(core.platformConfig as WorkspaceCoreConfig) ?? {}
					})),
					WorkspaceName:
						state.workspaceConfigReducer.workspaceConfig.name,
					Location: state.workspaceConfigReducer.workspaceConfig.path,
					WorkspacePluginId:
						state.workspaceConfigReducer.workspaceTemplate
							?.pluginId ?? '',
					WorkspacePluginVersion:
						state.workspaceConfigReducer.workspaceTemplate
							?.pluginVersion ?? ''
				});
			}
		});

		return listenerMiddleware.middleware;
	});
}
