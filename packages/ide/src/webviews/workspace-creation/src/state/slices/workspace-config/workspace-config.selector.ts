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

import type {ConfigErrors} from '../../../common/types/state';
import {useAppSelector} from '../../store';

export const useSelectedSoc = () =>
	useAppSelector(state => state.workspaceConfigReducer.socId);

export const useSelectedBoardPackage = () =>
	useAppSelector(state => state.workspaceConfigReducer.boardPackage);

export const useSelectedCores = () =>
	useAppSelector(state => state.workspaceConfigReducer.cores);

export const useConfiguredCore = (coreId: string) =>
	useAppSelector(state => state.workspaceConfigReducer.cores[coreId]);

export const useIsCoreEnabled = (coreId: string) =>
	useAppSelector(
		state => state.workspaceConfigReducer.cores[coreId]?.isEnabled
	);

export const useWorkspaceTemplateType = () =>
	useAppSelector(
		state => state.workspaceConfigReducer.workspaceConfig.templateType
	);

export const useSelectedCoreToConfigId = () =>
	useAppSelector(
		state => state.workspaceConfigReducer.coreToConfigId
	);

export const useWorkspaceTemplate = () =>
	useAppSelector(
		state => state.workspaceConfigReducer.workspaceTemplate
	);
export const useWorkspacePath = () =>
	useAppSelector(
		state => state.workspaceConfigReducer.workspaceConfig.path
	);

export const useWorkspaceName = () =>
	useAppSelector(
		state => state.workspaceConfigReducer.workspaceConfig.name
	);

export const useWorkspaceConfig = () =>
	useAppSelector(
		state => state.workspaceConfigReducer.workspaceConfig
	);

export const useConfigurationErrors = (id: keyof ConfigErrors) =>
	useAppSelector(
		state => state.workspaceConfigReducer.configErrors[id]
	);

export const useCorePluginId = (coreId: string) =>
	useAppSelector(
		state => state.workspaceConfigReducer.cores[coreId]?.pluginId
	);

export const useCorePluginVersion = (coreId: string) =>
	useAppSelector(
		state => state.workspaceConfigReducer.cores[coreId]?.pluginVersion
	);

export const useCurrentCoreConfigStep = () =>
	useAppSelector(
		state => state.workspaceConfigReducer.currentCoreConfigStep
	);

export const useIsTrustZoneEnabled = (id: string) =>
	useAppSelector(state =>
		Boolean(state.workspaceConfigReducer.isTrustZoneEnabled[id])
	);

export const useCoresToPersist = () =>
	useAppSelector(state => {
		const cores = state.workspaceConfigReducer.cores;
		return Object.keys(cores)
			.filter(
				coreId =>
					!state.workspaceConfigReducer.isTrustZoneEnabled[coreId]
			)
			.map(coreId => cores[coreId]);
	});
