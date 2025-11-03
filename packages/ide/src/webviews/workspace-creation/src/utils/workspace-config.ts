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
import type {WorkspaceConfig} from '../common/types/config';
import {isCypressEnvironment} from '@common/utils/env';
import type {CfsPluginInfo} from 'cfs-lib';
import {type StateProject} from '../common/types/state';

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
function hasSecureAndNonSecure(
	baseId: string,
	selectedCores: Record<string, StateProject>
) {
	return (
		selectedCores[`${baseId}-secure`]?.isEnabled ||
		selectedCores[`${baseId}-nonsecure`]?.isEnabled
	);
}

export function getEnabledCores(
	selectedCores: Record<string, StateProject>
) {
	const enabledCores = Object.values(selectedCores).filter(core => {
		// If this is a base core and both secure/non-secure are enabled, filter it out
		const isBase =
			!core.id.endsWith('-secure') && !core.id.endsWith('-nonsecure');

		if (isBase && hasSecureAndNonSecure(core.id, selectedCores)) {
			return false;
		}

		return core.isEnabled;
	});

	return enabledCores;
}

export function getBaseCoreName(name?: string) {
	return name?.replace(/\s*\(.*\)$/, '') ?? '';
}

export function getTrustZoneIds(coreId: string) {
	return {
		secureCoreId: `${coreId}-secure`,
		nonSecureCoreId: `${coreId}-nonsecure`
	};
}
