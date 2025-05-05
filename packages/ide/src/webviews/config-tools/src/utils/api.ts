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
import {
	type ConfigOptionsReturn,
	request,
	type ConfiguredClockNode,
	type ConfiguredPin,
	type ConfiguredProject
} from '@common/api';
import type {
	ClockNode,
	ClockNodeState,
	Controls,
	Core,
	DiagramData,
	Package,
	Peripheral,
	PinCanvas,
	Register,
	MemoryType,
	ControlCfg
} from '@common/types/soc';
import type {ExportEngine} from '@common/types/engines';
import {
	getAssignedPlugin,
	getIsExternallyManagedProyect,
	getProjectProperty
} from './config';

export async function getSocAndCfsconfigData(): Promise<ConfigOptionsReturn> {
	return request(
		'get-soc-and-config'
	) as Promise<ConfigOptionsReturn>;
}

export async function getExportEngines() {
	return request('get-export-engines') as Promise<ExportEngine[]>;
}

export async function generateCode(selectedProjectIds?: string[]) {
	return request('generate-code', {selectedProjectIds}) as Promise<
		string[]
	>;
}

export async function getCores() {
	return request('get-cores') as Promise<Core[]>;
}

export async function getSocMemoryTypes() {
	return request('get-memory-types') as Promise<MemoryType[]>;
}

export async function getSocControls() {
	return request('get-soc-controls') as Promise<Controls>;
}

export async function getClockCanvas() {
	return request('get-clock-canvas') as Promise<
		DiagramData | undefined
	>;
}

export async function getClockNodes() {
	return request('get-clock-nodes') as Promise<ClockNode[]>;
}

export async function updatePersistedConfig(updatedConfig: {
	updatedPins?: ConfiguredPin[];
	updatedClockNode?: ConfiguredClockNode;
	initialControlValues?: Record<string, string> | undefined;
	modifiedClockNodes?: Array<
		ClockNodeState & {EnabledControls: Record<string, boolean>}
	>;
	updatedProjects?: ConfiguredProject[];
	clockFrequencies?: Record<string, string | number>;
}) {
	return request('update-persisted-config', {
		updatedConfig
	}) as Promise<void>;
}

export async function getRegisters() {
	return request('get-registers') as Promise<Register[]>;
}

export async function getSocPackage() {
	return request('get-soc-package') as Promise<Package>;
}

export async function getPinCanvas() {
	return request('get-pin-canvas') as Promise<PinCanvas>;
}

export async function getSocPeripherals() {
	return request('get-soc-peripherals') as Promise<Peripheral[]>;
}

export async function getPluginProperties(
	pluginId: string,
	pluginVersion: string
) {
	return request('get-plugin-properties', {
		pluginId,
		pluginVersion
	}) as Promise<Record<string, any>>;
}

export async function getIsPeripheralBanner() {
	return request('get-is-peripheral-banner') as Promise<boolean>;
}

export async function updateIsPeripheralBanner(flag: boolean) {
	return request('update-is-peripheral-banner', {
		flag
	}) as Promise<void>;
}

export async function getProperties(
	pluginId: string,
	pluginVersion: string,
	scope: string
) {
	return request('get-properties', {
		pluginId,
		pluginVersion,
		scope
	}) as Promise<Record<string, ControlCfg[]>>;
}

export async function showGenerateCodeWarning(flag: boolean) {
	return request('show-generate-code-warning', {
		flag
	}) as Promise<void>;
}

export async function getGenerateCodeWarning() {
	return request('get-generate-code-warning') as Promise<boolean>;
}

/**
 * Cache for storing previously fetched control configurations
 * Key format: `${scope}:${pluginId}:${pluginVersion}`
 */
const controlsCache = new Map<string, Record<string, ControlCfg[]>>();

/**
 * Generates a consistent cache key for storing and retrieving control configurations
 * @param scope The scope of the controls (e.g., 'pinConfig', 'clockConfig')
 * @param projectId The project identifier
 * @returns A formatted cache key string
 */
export function generateControlCacheKey(
	scope: string,
	projectId: string
): string {
	const pluginInfo = getAssignedPlugin(projectId);

	if (!pluginInfo) {
		return `${scope}:unknown:unknown`;
	}

	const {pluginId = '', pluginVersion = ''} = pluginInfo;

	return `${scope}:${pluginId}:${pluginVersion}`;
}

/**
 * Retrieves control configurations directly from the cache if available
 * @param scope The scope of the controls (e.g., 'pinConfig', 'clockConfig')
 * @param projectId The project identifier
 * @returns The cached control configurations or undefined if not found
 */
export function getControlsFromCache(
	scope: string,
	projectId: string
): Record<string, ControlCfg[]> | undefined {
	if (getIsExternallyManagedProyect(projectId)) {
		return {};
	}

	if ((window as any).Cypress) {
		const storageControls = localStorage.getItem(
			`pluginControls:${projectId}`
		);

		if (storageControls) {
			return JSON.parse(storageControls) as Record<
				string,
				ControlCfg[]
			>;
		}

		console.error('Please provide mocked controls in localStorage');

		return {};
	}

	const cacheKey = generateControlCacheKey(scope, projectId);

	return controlsCache.get(cacheKey);
}

/**
 * Formats file paths to show only from project name onwards
 * @param files Array of file paths to format
 * @param projectNames Array of project names to identify in the paths
 * @returns Array of formatted file paths
 */
export function formatGeneratedFilePaths(
	files: string[],
	projectNames: string[]
): string[] {
	if (!files.length || !projectNames.length) {
		return files;
	}

	return files.map(file => {
		const pathSegments = file.split('/');

		for (const projectName of projectNames) {
			if (pathSegments.includes(projectName)) {
				const index = pathSegments.indexOf(projectName);

				return pathSegments.slice(index).join('/');
			}
		}

		// If no project name match found, return the original path
		return file;
	});
}

/**
 * Creates a promise that generates code and processes the results.
 * This function calls the generateCode API and extracts the file names from the paths.
 *
 * @param {string[]} selectedProjectIds - Optional array of project IDs to generate code for. If not provided, all projects will be included.
 * @returns {Promise<string[] | string>} A promise that resolves to either:
 *   - An array of file names (last two path segments) on successful code generation
 *   - An error message string if code generation fails
 */
export async function createCodeGenerationPromise(
	selectedProjectIds?: string[]
) {
	if ((window as any).Cypress) {
		return new Promise<string[]>(resolve => {
			setTimeout(() => {
				const mockedFiles = JSON.parse(
					localStorage.getItem('generatedFiles') ?? '[]'
				) as string[];

				resolve(mockedFiles);
			}, 1000);
		});
	}

	return new Promise<string[] | string>(resolve => {
		generateCode(selectedProjectIds)
			.then(files => {
				if (!Array.isArray(files) || files.length === 0) {
					resolve(
						'An error occurred while generating the code files. Please verify your configuration and try again.'
					);

					return;
				}

				const availableProjectNames =
					selectedProjectIds?.map(
						projectId =>
							(
								getProjectProperty(
									projectId,
									'PlatformConfig'
								) as Record<string, string>
							).ProjectName ?? ''
					) ?? [];

				if (!availableProjectNames.length) {
					// In case no valid project names are found in the configuration file, fallback to showing the whole generated path.
					resolve(files);
				}

				// Use the utility function to format paths
				const formattedFiles = formatGeneratedFilePaths(
					files,
					availableProjectNames
				);

				// Resolve the promise with the formatted files
				resolve(formattedFiles.filter(fileName => fileName !== ''));
			})
			.catch(error => {
				console.error('Error generating code:', error);

				return 'Error generating code';
			});
	});
}

const fallback: Record<string, ControlCfg[]> = {};

/**
 * Generates a promise that fetches plugin controls for all provided core IDs
 * @param coreIds Array of core IDs
 * @param scope The scope to get controls for (e.g., 'pinConfig', 'clockConfig', 'peripheral', 'memory')
 * @returns Promise resolving to a single array of controls
 */
export async function getControlsForProjectIds(
	projectIds: string[],
	scope: string
): Promise<Record<string, ControlCfg[]>> {
	try {
		if ((window as any).Cypress || !projectIds.length) {
			const projectId = projectIds?.[0] || '';
			const storageControls = localStorage.getItem(
				`pluginControls:${projectId}`
			);

			return storageControls
				? (JSON.parse(storageControls) as Record<
						string,
						ControlCfg[]
					>)
				: fallback;
		}

		// Process valid projects and collect unique plugin info
		const allControls: Record<string, ControlCfg[]> = {};

		const pluginsToFetch: Array<{
			pluginId: string;
			pluginVersion: string;
			cacheKey: string;
		}> = [];

		for (const projectId of projectIds) {
			// Skip externally managed projects
			const isExternallyManaged =
				getIsExternallyManagedProyect(projectId);

			if (isExternallyManaged) continue;

			const cacheKey = generateControlCacheKey(scope, projectId);

			// Check if controls are in cache
			const cachedData = controlsCache.get(cacheKey);

			if (cachedData) {
				// Merge cached data into results
				Object.entries(cachedData).forEach(([key, controls]) => {
					// Merge controls with existing ones if present
					allControls[key] = allControls[key]
						? [...allControls[key], ...controls]
						: controls;
				});
			} else {
				const plugin = getAssignedPlugin(projectId);

				if (!plugin) continue;

				const {pluginId, pluginVersion} = plugin;

				pluginsToFetch.push({pluginId, pluginVersion, cacheKey});
			}
		}

		// Return cached results if everything was in cache
		if (!pluginsToFetch.length) return allControls;

		// Fetch and cache missing data
		const results = await Promise.all(
			pluginsToFetch.map(
				async ({pluginId, pluginVersion, cacheKey}) => {
					try {
						const result = await getProperties(
							pluginId,
							pluginVersion,
							scope
						);

						// Only cache if we got valid results
						if (Object.keys(result ?? {}).length) {
							controlsCache.set(cacheKey, result);
						}

						return result;
					} catch (error) {
						console.error(
							`Error getting properties for plugin ${pluginId}:`,
							error
						);

						return fallback;
					}
				}
			)
		);

		// Merge newly fetched results
		results.forEach(properties => {
			Object.entries(properties).forEach(([coreId, controls]) => {
				allControls[coreId] = allControls[coreId]
					? [...allControls[coreId], ...controls]
					: controls;
			});
		});

		return allControls;
	} catch (error) {
		console.error('Error getting controls for core IDs:', error);

		return fallback;
	}
}
