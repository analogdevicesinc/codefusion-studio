/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import type {CfsConfig} from 'cfs-plugins-api';
import {type ConfiguredProject} from '../../../common/api';
import {type Core} from '../../../common/types/soc';
import {getSocAndCfsconfigData} from './api';
import {getPrimaryCoreId} from './soc-cores';

export type ProjectInfo = Omit<
	ConfiguredProject,
	'Partitions' | 'Peripherals'
> &
	Omit<Core, 'Memory' | 'Id'>;

let configDict:
	| (Pick<CfsConfig, 'Soc' | 'BoardName' | 'Package'> & {
			projects: ProjectInfo[];
	  })
	| undefined;

if (import.meta.env.MODE === 'development') {
	if ((window as any).Cypress) {
		configDict = JSON.parse(
			localStorage.getItem('configDict') ?? '{}'
		);
	}
} else {
	const {configOptions, dataModel} = await getSocAndCfsconfigData();

	if (configOptions && dataModel) {
		configDict = {
			Soc: configOptions.Soc,
			BoardName: configOptions.BoardName,
			Package: configOptions.Package,
			projects:
				configOptions.Projects?.map(project => {
					const {Partitions, Peripherals, ...cfsConfigCoreInfo} =
						project;

					const dataModelCore = dataModel.Cores.find(
						c => c.Id === cfsConfigCoreInfo.CoreId
					);

					const {Memory, Id, ...socCoreInfo} = dataModelCore ?? {
						Description: '',
						CoreNum: 0,
						IsPrimary: false,
						Name: ''
					};

					return {
						...cfsConfigCoreInfo,
						...socCoreInfo
					};
				}) ?? []
		};
	}
}

export function getProjectInfoList(): ProjectInfo[] | undefined {
	if (configDict && Object.keys(configDict).length > 0) {
		return configDict.projects;
	}

	const localStorageConfig = localStorage.getItem('configDict');

	if (localStorageConfig) {
		configDict = JSON.parse(localStorageConfig);

		return configDict?.projects;
	}
}

export function getCfsConfigDict() {
	if (!configDict || Object.keys(configDict).length === 0) {
		const localStorageConfig = localStorage.getItem('configDict');

		if (localStorageConfig) {
			configDict = JSON.parse(localStorageConfig);
		}
	}

	return configDict;
}

export function getAssignedPlugin(projectId: string):
	| {
			pluginId: string;
			pluginVersion: string;
			firmwarePlatform: string;
	  }
	| undefined {
	const projects = getProjectInfoList();

	const project = projects?.find(
		project => project.ProjectId === projectId
	);

	if (project) {
		return {
			pluginId: project.PluginId,
			pluginVersion: project.PluginVersion,
			firmwarePlatform: project.FirmwarePlatform
		};
	}

	return undefined;
}

/**
 * Retrieves a property value from a core with the specified ID.
 *
 * @param coreId - The identifier of the core to search for
 * @param property - The name of the property to retrieve from the core
 * @returns The value of the specified property if the core is found, otherwise undefined
 */
export function getProjectProperty(
	projectId: string,
	property: keyof ProjectInfo
): unknown {
	const projects = getProjectInfoList();

	const project = projects?.find(
		project => project.ProjectId === projectId
	);

	if (project) {
		return project[property];
	}

	return undefined;
}

export function getPrimaryProjectId(): string | undefined {
	const projects = getProjectInfoList();
	const primaryCoreId = getPrimaryCoreId();

	const primaryProject = projects?.find(
		project =>
			project.CoreId === primaryCoreId &&
			(project.Secure === true || project.Secure === undefined)
	);

	if (primaryProject) {
		return primaryProject.ProjectId;
	}

	return undefined;
}

/**
 * Retrieves the firmware platform for the primary core.
 *
 * This function gets the primary core ID from the SoC core dictionary,
 * then finds the corresponding project in the projects list to get its firmware platform.
 *
 * @returns The firmware platform string, or empty string if not available
 */
export function getPrimaryProjectFirmwarePlatform(): string {
	const primaryProjectId = getPrimaryProjectId();

	const projects = getProjectInfoList();

	const primaryProject = projects?.find(
		project => project.ProjectId === primaryProjectId
	);

	return primaryProject?.FirmwarePlatform ?? '';
}

/**
 * Resets the config dictionary to undefined.
 **/
export function resetConfigDict() {
	configDict = undefined;
}

/**
 * Checks if the given project is externally managed.
 * Uses getProjectProperty to retrieve the 'ExternallyManaged' property value.
 *
 * @param projectId - The project ID to check.
 * @returns True if the project is externally managed, false otherwise.
 */
export function getIsExternallyManagedProyect(
	projectId: string
): boolean {
	return (
		(getProjectProperty(projectId, 'ExternallyManaged') as boolean) ??
		false
	);
}
