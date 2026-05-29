/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import type { CfsConfig, ConfiguredProject } from "../types/cfs-config.js";
import type { CfsFeatureScope } from "../types/cfs-feature.js";
import type { CfsPluginProperty } from "../types/cfs-plugin-property.js";
import type { CfsProject } from "../types/cfs-project.js";
import type {
	CfsSocDataModel,
	SocControl,
} from "../types/cfs-soc-data-model.js";
import type { CfsWorkspace } from "../types/cfs-workspace.js";

/**
 * Service interface for providing plugin-specific properties.
 * These properties are defined in the .cfsplugins file.
 */
export interface CfsPropertyProviderService {
	/**
	 * Retrieves properties for a specific feature scope.
	 * @param scope - The scope of properties to retrieve (e.g., workspace, project, etc.)
	 * @param context - Context used to parse conditions before returning the plugin properties
	 * @returns Array of plugin properties for the specified scope
	 */
	getProperties(
		scope: CfsFeatureScope,
		context?: Record<string, unknown>,
	): CfsPluginProperty[];
}

/**
 * Service interface for generating workspaces.
 * Responsible for creating the overall workspace structure and configuration.
 */
export interface CfsWorkspaceGenerationService {
	/**
	 * Generates a complete workspace based on the provided configuration.
	 * @param cfsWorkspace - The workspace configuration object
	 * @returns Promise that resolves when workspace generation is complete
	 */
	generateWorkspace(cfsWorkspace: CfsWorkspace): Promise<void>;
}

/**
 * Service interface for generating individual projects within a workspace.
 * Handles project-specific file generation and configuration.
 */
export interface CfsProjectGenerationService {
	/**
	 * Generates a project in the specified base directory.
	 * @param baseDir - Optional base directory where the project should be generated
	 * @returns Promise that resolves when project generation is complete
	 */
	generateProject(baseDir: string, context: CfsProject): Promise<void>;
}

/**
 * Service interface for generating config code files.
 * Typically used to create configuration-specific code based on hardware settings.
 */
export interface CfsCodeGenerationService {
	/**
	 * Generates config code files based on the provided data and context.
	 * @param data - The data object containing configuration and context information
	 * @param baseDir - The base directory where generated files should be placed
	 * @returns Promise that resolves to an array of generated file paths
	 */
	generateCode(
		data: Record<string, unknown>,
		baseDir: string,
	): Promise<string[]>;
}

/**
 * Service interface for overriding SoC controls.
 * Allows plugins to modify or extend SoC control definitions based on plugin-specific directives as defined in .cfsplugins.
 */
export interface CfsSocControlsOverrideService {
	/**
	 * Override SoC controls following a set of directives provided in the plugin info.
	 * This method applies plugin-specific modifications to hardware control definitions,
	 * such as adding custom controls, removing unsupported ones, or modifying existing controls.
	 *
	 * @param scope - The scope of properties to retrieve (Peripheral, PinConfig, etc.)
	 * @param soc - Optional SoC data model containing control definitions
	 * @returns The controls with plugin directives applied, organized by control group
	 */
	overrideControls(
		scope: CfsFeatureScope,
		soc: CfsSocDataModel,
	): Record<string, SocControl[]>;
}

/**
 * Service interface for overriding memory access rules.
 * Allows plugins to specify custom memory access permissions that override default behavior.
 */
export interface CfsMemoryAccessOverrideService {
	/**
	 * Retrieves memory access overrides for a given part.
	 * This allows plugins to specify custom memory access rules that override default behavior.
	 *
	 * @param partName - The name of the part for which to retrieve memory access overrides
	 * @param coreId - The ID of the core
	 * @returns A mapping of memory access overrides
	 */
	getMemoryAccessOverrides(
		partName: string,
		coreId: string,
	): Record<string, string[] | undefined> | undefined;
}

/**
 * Service interface for configuring individual projects.
 * Allows plugins to modify project configurations read from .cfsconfig files.
 */
export interface CfsProjectConfigService {
	/**
	 * Receives a project configuration (from .cfsconfig file) and returns an updated version
	 * of that configuration.
	 * @param soc - Id of the SoC to which the project is assigned
	 * @param config - Configuration of the project, read from .cfsconfig file
	 * @returns Promise that resolves to the potentially modified project configuration
	 */
	configureProject(
		soc: string,
		config: ConfiguredProject,
	): Promise<ConfiguredProject>;
}

/**
 * Service interface for system-wide configuration.
 * Allows the primary core plugin to modify the entire system configuration.
 */
export interface CfsSystemConfigService {
	/**
	 * Receives a complete CfsConfig and returns an updated version of that configuration.
	 * This is requested only on the primary core and allows for system-wide configuration
	 * changes that affect multiple projects or the overall system setup.
	 *
	 * @param config - Complete system configuration, read from .cfsconfig file
	 * @returns Promise that resolves to the potentially modified system configuration
	 */
	configureSystem(config: CfsConfig): Promise<CfsConfig>;
}
