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

import {getWorkspaceConfig} from './api';
import type {
	WorkspaceConfig,
	WorkspaceCore
} from '../common/types/config';
import {isCypressEnvironment} from '@common/utils/env';
import type {CfsPluginInfo} from 'cfs-types';
import type {StateProject} from '../common/types/state';

import {
	SECURE_PROJ_ID_SUFFIX as S_ID_SUFFIX,
	NON_SECURE_PROJ_ID_SUFFIX as NS_ID_SUFFIX
} from '../common/constants/identifiers';

import {
	SECURE_ABBR as S,
	NON_SECURE_ABBR as NS
} from '@common/constants/core-properties';

export let workspaceConfig: WorkspaceConfig;

if (isCypressEnvironment()) {
	workspaceConfig = {
		Soc: '',
		WorkspacePluginId: '',
		Board: '',
		Package: '',
		Cores: [],
		WorkspaceName: '',
		Location: ''
	};
} else {
	const res = await getWorkspaceConfig();
	workspaceConfig = res as WorkspaceConfig;
}

export function getCurrentConfigOptions() {
	return workspaceConfig;
}

export function isWorkspaceNameInvalid(wrkspName: string) {
	return /[^a-zA-Z0-9_.-]/.test(wrkspName ?? '');
}

export function isPathInvalid(path: string) {
	return /[ !"$%&'()*+,;<=>?@[\]^{|}~\s]/.test(path ?? '');
}

export function findPluginInfo(
	pluginsList: CfsPluginInfo[],
	pluginId: string,
	pluginVersion: string
) {
	return pluginsList.find(
		p => p.pluginId === pluginId && p.pluginVersion === pluginVersion
	);
}

export function getBaseCoreName(name?: string) {
	return name?.replace(/\s*\(.*\)$/, '') ?? '';
}

export function getTrustZoneProjectIds(coreId: string) {
	return {
		secureProjectId: `${coreId}${S_ID_SUFFIX}`,
		nonSecureProjectId: `${coreId}${NS_ID_SUFFIX}`
	};
}

// Helper to get both secure and non-secure project IDs for a core
// but, it can be expanded later if other multiple project types are added
export function getMultipleProjectIds(coreId: string) {
	return Object.values(getTrustZoneProjectIds(coreId));
}

export function doesCoreHaveProperty(
	core: StateProject | WorkspaceCore,
	key: string
): boolean {
	return Object.prototype.hasOwnProperty.call(core, key);
}

/**
 * If the project's core has the secure property and TrustZone is enabled,
 * append 'S' or 'NS' suffix to the project name based on the secure flag.
 * @param projectName
 * @param coreState
 * @returns
 */
export function addSuffixToProjectName(
	projectName: string,
	coreState: StateProject
) {
	const hasCoreSecureProp = doesCoreHaveProperty(coreState, 'Secure');

	const suffix = coreState?.Secure ? S : NS;

	return coreState.isTrustZoneSupported
		? hasCoreSecureProp
			? `${projectName}${suffix}`
			: projectName
		: projectName;
}
