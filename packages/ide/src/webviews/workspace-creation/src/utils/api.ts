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

import {request} from '../../../common/api';
import type {WorkspaceConfig} from '../common/types/config';
import type {
	CfsPluginInfo,
	CfsPluginProperty,
	CfsWorkspace
} from 'cfs-lib';
import type {SoC} from 'cfs-ccm-lib';

export async function getCatalog() {
	return request('get-catalog') as Promise<SoC[]>;
}

export async function getWorkspaceConfig() {
	return request('get-workspace-config') as Promise<
		Record<string, unknown>
	>;
}

export async function updatePersistedConfig(
	updatedConfig: WorkspaceConfig
) {
	return request(
		'update-persisted-config',
		updatedConfig
	) as Promise<void>;
}

export async function openVSCodeFileExplorer(
	mode: 'file' | 'folder'
) {
	return request('open-file-explorer', {mode}) as Promise<string>;
}

export async function getUserDefaultPath() {
	return request('get-default-path') as Promise<string>;
}

/**
 * Retrieves a list of all available plugins from the plugin manager
 * @param filter - Optional function to filter plugins
 * @returns Promise that resolves to an array of plugin information
 * @throws Error if plugin retrieval fails
 */
export async function getPluginsInfoList(
	filter?: (cfsPluginInfo: CfsPluginInfo) => boolean
) {
	return request('get-plugins', {filter}) as Promise<CfsPluginInfo[]>;
}

/**
 * Gets the workspace properties supported by a specific plugin
 * @param pluginInfo - Information about the plugin to query
 * @returns Promise that resolves to an array of plugin properties
 * @throws Error if property retrieval fails
 */
export async function getPluginProperties(pluginInfo: CfsPluginInfo) {
	return request('get-plugin-properties', {
		pluginInfo,
		scope: 'workspace'
	}) as Promise<CfsPluginProperty[]>;
}

/**
 * Gets the plugin properties for a specific plugin
 * @param pluginInfo - The plugin to get properties for
 * @returns Promise that resolves to an array of plugin properties
 * @throws Error if property retrieval fails
 */
export async function fetchPluginProperties(
	pluginInfo: CfsPluginInfo
) {
	return getPluginProperties(pluginInfo);
}

/**
 * Fetches available plugins
 * @returns Promise that resolves to an array of plugins
 * @throws Error with a user-friendly message if plugin retrieval fails
 */
export async function fetchPlugins() {
	return new Promise<CfsPluginInfo[]>(resolve => {
		if ((window as any).Cypress) {
			setTimeout(() => {
				resolve(
					JSON.parse(
						localStorage.getItem('plugins') ?? '[]'
					) as CfsPluginInfo[]
				);
			}, 1000);
		} else {
			getPluginsInfoList()
				.then(plugins => {
					resolve(plugins);
				})
				.catch(e => {
					console.error(e);
					resolve([]);
				});
		}
	});
}

/**
 * Gets the multicore templates available for a specific SoC and package
 * @param socId - The ID of the SoC
 * @param packageId - The package ID
 * @returns Promise that resolves to an array of plugin information containing compatible templates
 * @throws Error if template retrieval fails
 */
export async function fetchMulticoreTemplates(
	socId: string,
	packageId: string,
	boardId?: string
) {
	return request('get-multicore-templates', {
		socId,
		packageId,
		boardId
	}) as Promise<CfsPluginInfo[]>;
}

/**
 * Fetches available multicore templates for a specific SoC and package
 * @returns Promise that resolves to an array of plugins containing compatible templates
 * @throws Error with a user-friendly message if template retrieval fails
 */
export async function generateMulticoreTemplatesPromise(
	socId: string,
	packageId: string,
	boardId?: string
) {
	return new Promise<CfsPluginInfo[]>(resolve => {
		if ((window as any).Cypress) {
			setTimeout(() => {
				resolve(
					JSON.parse(
						localStorage.getItem('workspace-templates') ?? '[]'
					) as CfsPluginInfo[]
				);
			}, 1000);
		} else {
			fetchMulticoreTemplates(socId, packageId, boardId)
				.then(templates => {
					const uniqueTemplateList = new Set();
					const templateList = templates.filter(
						template =>
							!uniqueTemplateList.has(template.pluginId) &&
							uniqueTemplateList.add(template.pluginId)
					);
					resolve(templateList);
				})
				.catch(e => {
					console.error(e);
					resolve([]);
				});
		}
	});
}

/**
 * Creates a new workspace using the provided configuration
 * @param workspaceConfig - Configuration object containing workspace settings
 * @returns Promise that resolves to a success message when workspace is created
 * @throws Error if workspace creation fails
 */
export async function createWorkspace(workspaceConfig: CfsWorkspace) {
	return request(
		'create-workspace',
		workspaceConfig as Record<string, unknown>
	) as Promise<string>;
}
