/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import type {
	CfsConfig,
	CfsPluginInfo,
	CfsPluginProperty,
	CfsProject,
	CfsSocDataModel,
	CfsWorkspace,
	SocControl,
	CfsFeatureScope,
	CfsWorkspaceGenerationService,
	CfsProjectGenerationService,
	CfsPlugin,
	CfsPropertyProviderService,
	CfsSystemConfigService,
	CfsProjectConfigService,
	CfsCodeGenerationService,
	CfsSocControlsOverrideService,
	CfsMemoryAccessOverrideService
} from "cfs-types";
import { GenericPlugin } from "cfs-plugins-sdk";

import type { CfsPackageManagerProvider } from "cfs-package-manager";
import { CfsDataModelManager } from "../managers/cfs-data-model-manager.js";
import { MissingDependencyError } from "../utils/missing-dependency-error.js";
import {
	promises as fs,
	statSync,
	PathLike,
	existsSync,
	readFileSync,
	readdirSync
} from "node:fs";
import path, { dirname } from "node:path";
import { createRequire } from "node:module";
import { getHostPlatform } from "../utils/node-utils.js";
import { findMatchingVersion } from "../utils/semantic-versioning.js";
import fg from "fast-glob";

const DEFAULT_WORKSPACE_PLUGIN_ID =
	"com.analog.workspace.default.plugin";

interface PluginManagerOptions {
	/**
	 * List of paths to be searched by the plugin manager
	 */
	pluginsCustomSearchPaths?: PathLike[];
}

/*
 * The CfsPluginManager is provided by the `cfs-lib` package in
 * CodeFusion Studio and is used to automatically detect installed plugins.
 * It also manages the plugin lifecycle.
 */
export class CfsPluginManager {
	/**
	 * Array of .cfsplugin file contents, one per plugin found
	 */
	private pluginInfo: CfsPluginInfo[] = [];

	/**
	 * Array of directories to search for plugins
	 */
	private searchPaths: PathLike[] = [];

	/**
	 * Package manager provider for retrieving packages, including plugins
	 */
	private pkgManager?: CfsPackageManagerProvider;

	/**
	 * Data model manager for retrieving SoC data models
	 */
	private dataModelManager: CfsDataModelManager;

	/**
	 * Constructor
	 * @param {CfsDataModelManager} dataModelManager - Data model manager for retrieving SoC data models
	 * @param {CfsPackageManagerProvider|undefined} packageManager - Package manager provider
	 * @param {PluginManagerOptions} options - Options for plugins
	 */
	constructor(
		dataModelManager: CfsDataModelManager,
		packageManager: CfsPackageManagerProvider | undefined,
		options?: PluginManagerOptions
	) {
		if (options?.pluginsCustomSearchPaths) {
			const validSearchPaths =
				options.pluginsCustomSearchPaths.filter((dir) => {
					try {
						return existsSync(dir) && statSync(dir).isDirectory();
					} catch (error) {
						console.error(
							`Invalid plugin directory: ${String(dir)}`,
							error
						);
						return false;
					}
				});

			this.searchPaths = validSearchPaths;
		}
		this.pkgManager = packageManager;
		this.dataModelManager = dataModelManager;
	}

	/**
	 * Get info for all found plugins
	 * @param filter - Plugin info filter function
	 * @returns The plugin info for all found plugins
	 */
	public async getPluginsInfoList(
		filter?: (cfsPluginInfo: CfsPluginInfo) => boolean
	): Promise<CfsPluginInfo[]> {
		if (this.pluginInfo.length === 0) {
			await this.refresh();
		}

		let ret: CfsPluginInfo[] = [];

		if (!filter) {
			ret = this.pluginInfo;
		} else {
			for (const i of this.pluginInfo) {
				if (filter(i)) {
					ret.push(i);
				}
			}
		}

		return new Promise<CfsPluginInfo[]>((resolve) => {
			resolve(ret);
		});
	}

	/**
	 * Dynamically load a plugin
	 * @param info - The plugin info for the plugin to load.
	 * @returns The loaded CfsPlugin instance.
	 */
	public static async loadPlugin<T>(
		info: CfsPluginInfo
	): Promise<Partial<T>> {
		return new Promise<Partial<T>>((resolve, reject) => {
			const pluginPath = path.resolve(
				dirname(info.pluginPath),
				"index.cjs"
			);

			if (existsSync(pluginPath)) {
				try {
					const require = createRequire(import.meta.url);

					// Clear the require cache for this plugin, so we always import the latest plugin
					const resolvedPath = require.resolve(pluginPath);
					if (require.cache[resolvedPath]) {
						// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
						delete require.cache[resolvedPath];
					}

					const pluginModule = require(pluginPath) as CfsPlugin<T>;

					const instance = new pluginModule(info);

					resolve(instance);
				} catch (error) {
					reject(
						new Error(
							`Failed to load plugin from ${pluginPath}: ${(error as Error).message}`
						)
					);
				}
			} else {
				const instance = new GenericPlugin(
					info
				) as unknown as Partial<T>;

				resolve(instance);
			}
		});
	}

	/**
	 * Validate that all plugins required by the configuration are available.
	 * Throws MissingDependencyError if any plugins are missing.
	 * @param cfsConfig - The configuration to validate
	 */
	public async validateConfigPlugins(
		cfsConfig: CfsConfig
	): Promise<void> {
		if (this.pluginInfo.length === 0) await this.refresh();

		const missingPlugins: {
			id: string;
			version: string | undefined;
			availableVersions: string[] | undefined;
		}[] = [];

		for (const project of cfsConfig.Projects) {
			if (
				!project.PluginId ||
				project.PluginId.trim() === "" ||
				project.ExternallyManaged
			) {
				continue;
			}

			const pluginInfo = this.findPluginByVersionOrRange(
				project.PluginId,
				project.PluginVersion
			);

			if (!pluginInfo) {
				const availableVersions = this.getAvailableVersions(
					project.PluginId
				);

				// Check if already in missing list to avoid duplicates
				const alreadyAdded = missingPlugins.some(
					(p) =>
						p.id === project.PluginId &&
						p.version === project.PluginVersion
				);

				if (!alreadyAdded) {
					missingPlugins.push({
						id: project.PluginId,
						version: project.PluginVersion,
						availableVersions:
							availableVersions.length > 0
								? availableVersions
								: undefined
					});
				}
			}
		}

		if (missingPlugins.length > 0) {
			throw new MissingDependencyError("plugin", {
				plugins: missingPlugins
			});
		}
	}

	/**
	 * Get all properties supported by the specified plugin for the given scope.
	 * @param pluginId - The ID of the plugin to retrieve properties from.
	 * @param pluginVersion - The version of the plugin to retrieve properties from.
	 * @param scope - The scope of the properties to retrieve, such as "workspace", "project", "code", or "memory".
	 * @param context - Context the plugin will use to parse defaults and conditions
	 * @returns The properties supported by the plugin.
	 */
	public async getProperties(
		pluginId: string,
		pluginVersion: string,
		scope: CfsFeatureScope,
		context?: Record<string, unknown>
	): Promise<CfsPluginProperty[]> {
		if (this.pluginInfo.length === 0) await this.refresh();

		const pluginInfo = this.findPluginByVersionOrRange(
			pluginId,
			pluginVersion
		);

		if (!pluginInfo) {
			const availableVersions = this.getAvailableVersions(pluginId);

			throw new MissingDependencyError("plugin", {
				plugins: [
					{
						id: pluginId,
						version: pluginVersion,
						availableVersions:
							availableVersions.length > 0
								? availableVersions
								: undefined
					}
				]
			});
		}

		const pluginData = structuredClone(pluginInfo);

		if (context) {
			context.hostPlatform = getHostPlatform();
		}

		const plugin =
			await CfsPluginManager.loadPlugin<CfsPropertyProviderService>(
				pluginData
			);

		if (typeof plugin.getProperties === "function") {
			return plugin.getProperties(scope, context);
		}

		throw new Error(
			`Plugin ${pluginId} does not provide a property provider service.`
		);
	}

	/**
	 * Get all properties supported by the specified plugin for the given scope.
	 * @param pluginId - The ID of the plugin to retrieve properties from.
	 * @param pluginVersion - The version of the plugin to retrieve properties from.
	 * @param scope - The scope of the properties to retrieve, such as "workspace", "project", "code", or "memory".
	 * @param soc - Soc data used to override controls
	 * @returns The properties supported by the plugin.
	 */
	public async overrideSocControls(
		pluginId: string,
		pluginVersion: string,
		scope: CfsFeatureScope,
		soc: CfsSocDataModel
	): Promise<Record<string, SocControl[]>> {
		if (this.pluginInfo.length === 0) await this.refresh();

		const pluginInfo = this.findPluginByVersionOrRange(
			pluginId,
			pluginVersion
		);

		if (!pluginInfo) {
			const availableVersions = this.getAvailableVersions(pluginId);
			throw new MissingDependencyError("plugin", {
				plugins: [
					{
						id: pluginId,
						version: pluginVersion,
						availableVersions:
							availableVersions.length > 0
								? availableVersions
								: undefined
					}
				]
			});
		}

		const pluginData = structuredClone(pluginInfo);

		const plugin =
			await CfsPluginManager.loadPlugin<CfsSocControlsOverrideService>(
				pluginData
			);

		if (typeof plugin.overrideControls === "function") {
			return plugin.overrideControls(scope, soc);
		}

		throw new Error(
			`Plugin ${pluginId} does not provide a SoC controls provider service.`
		);
	}

	/**
	 * Retrieves the memory access permissions that need to be overridden
	 * for a specific dataModel and core combination.
	 * @param dataModelName - The name of the data model
	 * @param coreId - The ID of the core
	 * @returns An object mapping plugins to arrays of permissions to override memory access.
	 */
	public async getMemoryAccessOverrides(
		dataModelName: string,
		coreId: string
	) {
		if (this.pluginInfo.length === 0) await this.refresh();

		const overrideTable:
			| Record<string, Record<string, string[] | undefined>>
			| undefined = {};

		for (const info of this.pluginInfo) {
			const pluginData = structuredClone(info);

			const plugin =
				await CfsPluginManager.loadPlugin<CfsMemoryAccessOverrideService>(
					pluginData
				);

			if (typeof plugin.getMemoryAccessOverrides === "function") {
				const result = plugin.getMemoryAccessOverrides(
					dataModelName,
					coreId
				);

				if (!result) continue;

				overrideTable[info.pluginId] = result;
			}
		}

		return overrideTable;
	}
	/**
	 * Generate a workspace using the specified plugin
	 * @param cfsWorkspace - The CfsWorkspace to generate the workspace from
	 */
	public async generateWorkspace(
		cfsWorkspace: CfsWorkspace
	): Promise<void> {
		let workspacePluginId = cfsWorkspace.workspacePluginId;
		let dataModel: CfsSocDataModel | undefined;
		if (!workspacePluginId) {
			// Use the default workspace plugin if no workspace plugin is specified
			workspacePluginId = DEFAULT_WORKSPACE_PLUGIN_ID;
		}

		const workspacePluginVersion =
			cfsWorkspace.workspacePluginVersion;

		// Generate the workspace
		if (cfsWorkspace.soc && cfsWorkspace.package) {
			const { soc, package: socPackage } = cfsWorkspace;

			try {
				dataModel = await this.dataModelManager.getDataModel(
					soc,
					socPackage
				);
			} catch {
				/* Throw error later if needed */
			}
		}

		const extendedCfsWorkspace = {
			...cfsWorkspace
		};

		if (dataModel) {
			extendedCfsWorkspace.dataModelVersion = dataModel.Version;
			extendedCfsWorkspace.dataModelSchemaVersion = dataModel.Schema;
		}

		const workspaceGenerator =
			await this.getPlugin<CfsWorkspaceGenerationService>(
				workspacePluginId,
				workspacePluginVersion
			);

		if (typeof workspaceGenerator.generateWorkspace !== "function") {
			throw new Error(
				`Plugin ${workspacePluginId} does not provide a workspace generator service.`
			);
		}

		const workspacePath = path.join(
			cfsWorkspace.location,
			cfsWorkspace.workspaceName
		);

		// Check if the workspace directory already exists
		if (existsSync(workspacePath)) {
			return Promise.reject(
				new Error(`A folder with this name already exists.`)
			);
		}

		await workspaceGenerator.generateWorkspace(extendedCfsWorkspace);

		// Look for a .cfsconfig file in the .cfs directory
		const dotCfsDirPath = path.join(workspacePath, ".cfs");
		let cfsConfigPath: string | undefined;
		let cfsConfig: CfsConfig | undefined;
		const files = readdirSync(dotCfsDirPath);
		for (const file of files) {
			if (file.endsWith(".cfsconfig")) {
				cfsConfigPath = path.join(dotCfsDirPath, file);
				const content = readFileSync(
					path.join(dotCfsDirPath, file),
					"utf8"
				);
				cfsConfig = JSON.parse(content) as CfsConfig;
				break;
			}
		}

		// Allow primary core to configure system
		if (Array.isArray(cfsWorkspace.projects) && cfsConfig) {
			const primaryProject = cfsWorkspace.projects.find(
				(p) => p.isPrimary
			);
			if (primaryProject) {
				const primaryPluginId = primaryProject.pluginId;
				const primaryPluginVersion = primaryProject.pluginVersion;
				const primaryPlugin =
					await this.getPlugin<CfsSystemConfigService>(
						primaryPluginId,
						primaryPluginVersion
					);

				if (typeof primaryPlugin.configureSystem === "function") {
					cfsConfig = await primaryPlugin.configureSystem(cfsConfig);
				}
			}
		}

		let cfsConfigUpdate = false;

		// Generate all projects
		if (Array.isArray(cfsWorkspace.projects)) {
			for (const project of cfsWorkspace.projects) {
				if (!project.isEnabled) continue;

				const augmentedProject: CfsProject = project as CfsProject;
				augmentedProject.soc = cfsWorkspace.soc;
				augmentedProject.package = cfsWorkspace.package;
				augmentedProject.board = cfsWorkspace.board;

				const projectPlugin = await this.getPlugin<
					CfsProjectConfigService & CfsProjectGenerationService
				>(project.pluginId, project.pluginVersion);

				// Consult plugins for contributions to .cfsconfig
				if (cfsConfig !== undefined) {
					const cfsProjectIndex = cfsConfig.Projects.findIndex(
						(p) => project.id && p.ProjectId === project.id
					);

					if (cfsProjectIndex != -1) {
						if (
							typeof projectPlugin.configureProject === "function"
						) {
							cfsConfig.Projects[cfsProjectIndex] =
								await projectPlugin.configureProject(
									cfsConfig.Soc,
									cfsConfig.Projects[cfsProjectIndex]
								);
							cfsConfigUpdate = true;
						}
					}
				}

				if (typeof projectPlugin.generateProject !== "function") {
					throw new Error(
						`Plugin ${String(project.pluginId)} does not provide a project generator service.`
					);
				}

				await projectPlugin.generateProject(
					path
						.join(
							workspacePath,
							(project.platformConfig as { ProjectName?: string })
								.ProjectName ?? ""
						)
						.replace(/\\/g, "/"),
					augmentedProject
				);
			}
		}

		if (cfsConfigPath !== undefined && cfsConfigUpdate) {
			await fs.writeFile(
				cfsConfigPath,
				JSON.stringify(cfsConfig, null, 2),
				"utf-8"
			);
		}

		if (cfsConfig && dataModel) {
			await this.generateConfigCode(
				{ cfsconfig: cfsConfig, datamodel: dataModel },
				workspacePath
			);
		} else if (cfsConfig && !dataModel) {
			throw new Error(
				`Could not generate code. Data model for ${cfsWorkspace.soc} ${cfsWorkspace.package} not found.`
			);
		}
	}

	/**
	 * Generates a project using the project specific plugin
	 * @param cfsWorkspace - The CfsWorkspace that contains the projects
	 * @param projectName - The name of the project that needs to be generated
	 */
	public async generateProject(
		cfsWorkspace: CfsWorkspace,
		projectName: string
	): Promise<void> {
		const workspacePath = path.join(
			cfsWorkspace.location,
			cfsWorkspace.workspaceName
		);

		if (Array.isArray(cfsWorkspace.projects)) {
			const projectToBeGenerated = cfsWorkspace.projects.find(
				(project) => project.name === projectName
			);

			if (!projectToBeGenerated) {
				throw new Error(
					`Project: ${projectName} was not found in the workspace projects list`
				);
			}

			const projectGenerator =
				await this.getPlugin<CfsProjectGenerationService>(
					projectToBeGenerated.pluginId,
					projectToBeGenerated.pluginVersion
				);

			if (typeof projectGenerator.generateProject !== "function") {
				throw new Error(
					`Plugin ${String(projectToBeGenerated.pluginId)} does not provide a project generator service.`
				);
			}

			await projectGenerator.generateProject(
				path
					.join(workspacePath, projectToBeGenerated.name ?? "")
					.replace(/\\/g, "/"),
				projectToBeGenerated as CfsProject
			);
		} else {
			throw new Error(
				"Workspace does not count contain an array of projects"
			);
		}

		// Look for a .cfsconfig file in the .cfs directory
		const dotCfsDirPath = path.join(workspacePath, ".cfs");
		let cfsConfig: CfsConfig | undefined;
		const files = readdirSync(dotCfsDirPath);
		for (const file of files) {
			if (file.endsWith(".cfsconfig")) {
				const content = readFileSync(
					path.join(dotCfsDirPath, file),
					"utf8"
				);
				cfsConfig = JSON.parse(content) as CfsConfig;
				break;
			}
		}

		if (cfsWorkspace.soc && cfsWorkspace.package) {
			const { soc, package: socPackage } = cfsWorkspace;

			const dataModel = await this.dataModelManager.getDataModel(
				soc,
				socPackage,
				cfsConfig?.DataModelVersion
			);

			if (cfsConfig) {
				await this.generateConfigCode(
					{ cfsconfig: cfsConfig, datamodel: dataModel },
					workspacePath
				);
			}
		}
	}

	/**
	 * Generate code using the specified plugin
	 * @param cfsConfig - The CfsConfig to generate the code from
	 * @param socData - The SoC data model
	 *
	 */
	public async generateConfigCode(
		data: {
			cfsconfig: CfsConfig;
			datamodel: CfsSocDataModel;
		},
		baseDir: string
	): Promise<string[]> {
		const { cfsconfig } = data;

		const result: string[] = [];

		for (const project of cfsconfig.Projects) {
			if (
				!project.PluginId ||
				!project.PluginVersion ||
				project.ExternallyManaged
			)
				continue;

			const plugin = await this.getPlugin<CfsCodeGenerationService>(
				project.PluginId,
				project.PluginVersion
			);

			if (typeof plugin.generateCode === "function") {
				await plugin
					.generateCode(
						{
							...data,
							coreId: project.CoreId,
							projectId: project.ProjectId
						},
						baseDir
					)
					.then((generatedFiles) => {
						result.push(...generatedFiles);
					});
			}
		}

		return result;
	}

	private async getPluginPackagePaths(): Promise<string[]> {
		if (!this.pkgManager) {
			return [];
		}

		const pluginPackages =
			await this.pkgManager.getInstalledPackageInfo({
				type: "plugin"
			});

		return pluginPackages.map((pkg) => pkg.path);
	}

	/**
	 * Search the plugin directories for plugins
	 */
	private async refresh() {
		const parsedPlugins: CfsPluginInfo[] = [];
		const allSearchPaths = this.searchPaths.concat(
			await this.getPluginPackagePaths()
		);

		const searchPromises = allSearchPaths.map(async (dir) => {
			try {
				// The pattern ensures we only search for .cfsplugin files
				// either at the root or in the immediate subdirectories of the search path
				return await fg("{.cfsplugin,*/.cfsplugin}", {
					cwd: dir.toString(),
					absolute: true,
					onlyFiles: true
				});
			} catch (error) {
				console.error(
					`CfsPluginManager: Error searching directory ${dir.toString()}: ${(error as Error).message}`
				);
				return [];
			}
		});

		const searchResults = await Promise.all(searchPromises);
		const fileList = searchResults.flat();

		for (const file of fileList) {
			try {
				const info = await CfsPluginManager.loadPluginInfo(file);
				info.pluginPath = file;
				parsedPlugins.push(info);
			} catch (err) {
				console.error(
					`CfsPluginManager: Error parsing ${file}: ${(err as Error).message}`
				);
			}
		}

		this.pluginInfo = parsedPlugins;
	}

	private static async loadPluginInfo(file: PathLike) {
		try {
			const content = await fs.readFile(file, "utf8");
			const json: unknown = JSON.parse(content);
			return json as CfsPluginInfo;
		} catch (error) {
			console.error(
				`CfsPluginManager: Error parsing ${file.toString()}: ${(error as Error).message}`
			);
			throw error;
		}
	}

	private async getPlugin<T>(
		pluginId?: string,
		pluginVersion?: string
	) {
		if (this.pluginInfo.length === 0) await this.refresh();

		if (!pluginId) {
			for (const info of this.pluginInfo) {
				if (
					pluginVersion === "undefined" ||
					!pluginVersion ||
					pluginVersion === info.pluginVersion
				) {
					return CfsPluginManager.loadPlugin<T>(info);
				}
			}
			throw new Error(`Plugin not found in plugin directories`);
		}

		// Use semver-aware version matching (undefined/"undefined" treated as "*" for latest)
		const normalizedVersion =
			!pluginVersion || pluginVersion === "undefined"
				? undefined
				: pluginVersion;

		const pluginInfo = this.findPluginByVersionOrRange(
			pluginId,
			normalizedVersion
		);

		if (pluginInfo) {
			return CfsPluginManager.loadPlugin<T>(pluginInfo);
		}

		const availableVersions = this.getAvailableVersions(pluginId);
		throw new MissingDependencyError("plugin", {
			plugins: [
				{
					id: pluginId,
					version: normalizedVersion,
					availableVersions:
						availableVersions.length > 0
							? availableVersions
							: undefined
				}
			]
		});
	}

	/**
	 * Find a plugin by ID and version or semver range.
	 * If versionOrRange is undefined, returns the latest version (uses "*" range).
	 * @param pluginId - The plugin ID
	 * @param versionOrRange - Exact version, semver range (e.g., "^1.0.0", "~1.2.0"), or undefined for latest
	 * @returns The matching plugin info, or undefined if not found
	 */
	private findPluginByVersionOrRange(
		pluginId: string,
		versionOrRange?: string
	): CfsPluginInfo | undefined {
		const matchingPlugins = this.pluginInfo.filter(
			(info) => info.pluginId === pluginId
		);

		if (matchingPlugins.length === 0) {
			return undefined;
		}

		const availableVersions = matchingPlugins.map(
			(info) => info.pluginVersion
		);

		// Treat undefined as "*" (match any, returns highest)
		const range = versionOrRange ?? "*";
		const matchedVersion = findMatchingVersion(
			range,
			availableVersions
		);

		return matchingPlugins.find(
			(info) => info.pluginVersion === matchedVersion
		);
	}

	/**
	 * Get all available versions for a plugin ID.
	 * @param pluginId - The plugin ID
	 * @returns Array of available version strings
	 */
	private getAvailableVersions(pluginId: string): string[] {
		return this.pluginInfo
			.filter((info) => info.pluginId === pluginId)
			.map((info) => info.pluginVersion);
	}
}
