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
	CfsSocControlsOverrideService
} from "cfs-plugins-api";
import { GenericPlugin } from "cfs-plugins-api";

import type { CfsPackageManagerProvider } from "cfs-package-manager";
import type { CfsDataModelManager } from "../managers/cfs-data-model-manager.js";
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
import fg from "fast-glob";

const DEFAULT_WORKSPACE_PLUGIN_ID =
	"com.analog.workspace.default.plugin";

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
	private dataModelManager?: CfsDataModelManager;

	/**
	 * Constructor
	 * @param pluginsCustomSearchPaths - Array of paths/directories to search for plugins
	 * @param pkgManager - Package manager provider
	 * @param dataModelManager - Data model manager for retrieving SoC data models
	 */
	constructor(
		pluginsCustomSearchPaths: PathLike[],
		pkgManager?: CfsPackageManagerProvider,
		dataModelManager?: CfsDataModelManager
	) {
		const validSearchPaths = pluginsCustomSearchPaths.filter(
			(dir) => {
				try {
					return existsSync(dir) && statSync(dir).isDirectory();
				} catch (error) {
					console.error(
						`Invalid plugin directory: ${String(dir)}`,
						error
					);
					return false;
				}
			}
		);

		this.searchPaths = validSearchPaths;
		this.pkgManager = pkgManager;
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

		const pluginInfo = this.pluginInfo.find(
			(info) =>
				info.pluginId === pluginId &&
				info.pluginVersion === pluginVersion
		);

		if (!pluginInfo) {
			throw new Error(
				`Plugin ${pluginId} not found in plugin directories`
			);
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

		const pluginInfo = this.pluginInfo.find(
			(info) =>
				info.pluginId === pluginId &&
				info.pluginVersion === pluginVersion
		);

		if (!pluginInfo) {
			throw new Error(
				`Plugin ${pluginId} not found in plugin directories`
			);
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
	 * Generate a workspace using the specified plugin
	 * @param cfsWorkspace - The CfsWorkspace to generate the workspace from
	 */
	public async generateWorkspace(
		cfsWorkspace: CfsWorkspace
	): Promise<void> {
		let workspacePluginId = cfsWorkspace.workspacePluginId;
		let dataModel;
		if (!workspacePluginId) {
			// Use the default workspace plugin if no workspace plugin is specified
			workspacePluginId = DEFAULT_WORKSPACE_PLUGIN_ID;
		}

		const workspacePluginVersion =
			cfsWorkspace.workspacePluginVersion;

		// Generate the workspace
		if (cfsWorkspace.soc && cfsWorkspace.package) {
			const { soc, package: socPackage } = cfsWorkspace;

			dataModel = await this.getDataModel({
				soc,
				socPackage,
				fileName: `${soc.toLowerCase()}-${socPackage.toLowerCase()}.json`
			});
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
				(p) => p.IsPrimary
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

			const dataModel = await this.getDataModel({
				soc,
				socPackage,
				fileName: `${soc.toLowerCase()}-${socPackage.toLowerCase()}.json`
			});

			if (cfsConfig && dataModel) {
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

		if (pluginId && !pluginVersion) {
			pluginVersion = this.getLatestPluginVersion(pluginId);
		}

		for (const info of this.pluginInfo) {
			if (
				(pluginId === "undefined" || pluginId === info.pluginId) &&
				(pluginVersion === "undefined" ||
					pluginVersion === info.pluginVersion)
			) {
				return CfsPluginManager.loadPlugin<T>(info);
			}
		}

		throw new Error(
			`Plugin ${pluginId ?? ""} version ${pluginVersion ?? ""} not found in plugin directories`
		);
	}

	/**
	 * Retrieve the latest installed version of a plugin
	 * @param pluginId - The plugin ID to get the latest version for
	 * @returns The latest installed version of the plugin
	 */
	private getLatestPluginVersion(pluginId: string) {
		let pluginVersion: string | undefined;
		for (const info of this.pluginInfo) {
			if (info.pluginId === pluginId) {
				if (pluginVersion === undefined) {
					pluginVersion = info.pluginVersion;
					continue;
				}

				const majorVersion = parseInt(pluginVersion.split(".")[0]);

				if (
					majorVersion < parseInt(info.pluginVersion.split(".")[0])
				) {
					continue;
				}

				const minorVersion = parseInt(pluginVersion.split(".")[1]);
				if (
					minorVersion < parseInt(info.pluginVersion.split(".")[1])
				) {
					continue;
				}

				const patchVersion = parseInt(pluginVersion.split(".")[2]);
				if (
					patchVersion < parseInt(info.pluginVersion.split(".")[2])
				) {
					continue;
				}

				pluginVersion = info.pluginVersion;
			}
		}

		return pluginVersion;
	}

	/**
	 * Retrieve the data model using the injected CfsDataModelManager
	 * @param soc - The SoC name
	 * @param socPackage - The SoC package
	 * @param schemaVersion - The schema version
	 * @returns The data model if found, otherwise undefined
	 */
	private async getDataModel({
		soc,
		socPackage,
		fileName
	}: {
		soc: string;
		socPackage: string;
		fileName: string;
	}): Promise<CfsSocDataModel | undefined> {
		if (this.dataModelManager && soc && socPackage) {
			return this.dataModelManager.getDataModel(soc, socPackage);
		}

		// Temporarily offer backwards compatibility for data model discovery
		// until data model manager is fully integrated in cfsutil
		for (const dir of this.searchPaths) {
			const dataModelPath = path.join(dir.toString(), fileName);
			if (existsSync(dataModelPath)) {
				const content = readFileSync(dataModelPath, "utf8");
				const json = JSON.parse(content) as CfsSocDataModel;
				return json;
			}
		}

		return undefined;
	}
}
