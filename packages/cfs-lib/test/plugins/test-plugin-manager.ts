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
	CfsDataProvider,
	CfsServiceType,
	CfsFeatureScope,
	CfsWorkspaceGenerator,
	CfsProjectGenerator,
	CfsCodeGenerator
} from "cfs-plugins-api";
import type {
	CfsConfig,
	CfsPluginInfo,
	CfsPluginProperty,
	CfsProject,
	CfsProjectConfigService,
	CfsSocDataModel,
	CfsWorkspace,
	SocControl
} from "cfs-plugins-api";

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

// @TODO: migrate to cfs-plugins
export interface ICfsPlugin {
	getProperties(
		scope: string,
		soc?: CfsSocDataModel
	): CfsPluginProperty[];
	setEnvironmentVariables(env: Record<string, string>[]): void;
	getEnvironmentVariables(scope: string): Record<string, string>[];
	log(message: string): void;
	warn(message: string): void;
	error(message: string): void;
	getGenerator<T>(generator: string): T;
	getService<T>(service: string): T | undefined;
}

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
	 * Constructor
	 * @param searchPaths - Array of paths/directories to search for plugins and data models
	 */
	constructor(searchPaths: PathLike[]) {
		const validSearchPaths = searchPaths.filter((dir) => {
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

		if (validSearchPaths.length === 0) {
			throw new Error(
				"No valid plugin directories provided. Please check your configuration and provide an existing directory."
			);
		}

		this.searchPaths = validSearchPaths;
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
	 * @param cfsPluginInfo - The plugin info for the plugin to load.
	 * @returns The loaded CfsPlugin instance.
	 */
	public static async loadPlugin<PluginClass = ICfsPlugin>(
		info: CfsPluginInfo,
		context?: CfsWorkspace | CfsProject | CfsConfig
	): Promise<PluginClass> {
		return new Promise<PluginClass>((resolve, reject) => {
			try {
				const require = createRequire(import.meta.url);

				const pluginPath = path.resolve(
					dirname(info.pluginPath),
					"index.cjs"
				);

				// Clear the require cache for this plugin, so we always import the latest plugin
				const resolvedPath = require.resolve(pluginPath);
				if (require.cache[resolvedPath]) {
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete require.cache[resolvedPath];
				}

				const pluginModule = require(pluginPath) as new (
					info: CfsPluginInfo,
					context?: CfsWorkspace | CfsProject | CfsConfig
				) => PluginClass;

				const instance = new pluginModule(info, context);

				resolve(instance);
			} catch (error) {
				reject(error as Error);
			}
		});
	}

	/**
	 * Get all properties supported by the specified plugin for the given scope.
	 * @param cfsPluginInfo - The plugin info for the plugin to retrieve the properties from.
	 * @param scope - The scope of the properties to retrieve, such as "workspace", "project", "code", or "memory".
	 * @returns The properties supported by the plugin.
	 */
	public async getProperties(
		pluginId: string,
		pluginVersion: string,
		scope: CfsFeatureScope,
		soc?: CfsSocDataModel
	): Promise<CfsPluginProperty[] | Record<string, SocControl[]>> {
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

		const plugin = await CfsPluginManager.loadPlugin(pluginInfo);

		return plugin.getProperties(scope, soc);
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
			dataModel = this.getDataModel(
				`${cfsWorkspace.soc.toLowerCase()}-${cfsWorkspace.package.toLowerCase()}.json`
			);
		}

		const extendedCfsWorkspace = {
			...cfsWorkspace
		};

		if (dataModel) {
			extendedCfsWorkspace.dataModelVersion = dataModel.Version;
			extendedCfsWorkspace.dataModelSchemaVersion = dataModel.Schema;
		}

		const plugin = await this.getPlugin(
			workspacePluginId,
			workspacePluginVersion,
			extendedCfsWorkspace
		);

		const workspaceGenerator =
			plugin.getGenerator<CfsWorkspaceGenerator>(
				CfsFeatureScope.Workspace
			);

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

		let cfsConfigUpdate = false;

		// Generate all projects
		if (Array.isArray(cfsWorkspace.projects)) {
			for (const project of cfsWorkspace.projects) {
				if (!project.isEnabled) continue;

				const projectPlugin = await this.getPlugin(
					project.pluginId,
					project.pluginVersion,
					project as CfsProject
				);

				// Consult plugins for contributions to .cfsconfig
				if (cfsConfig !== undefined) {
					const cfsProjectIndex = cfsConfig.Projects.findIndex(
						(p) => project.id && p.ProjectId === project.id
					);

					if (cfsProjectIndex != -1) {
						const projectConfigurator =
							projectPlugin.getService<CfsProjectConfigService>(
								CfsServiceType.ProjectConfig
							);
						if (projectConfigurator !== undefined) {
							cfsConfig.Projects[cfsProjectIndex] =
								await projectConfigurator.configureProject(
									cfsConfig.Soc,
									cfsConfig.Projects[cfsProjectIndex]
								);
							cfsConfigUpdate = true;
						}
					}
				}

				const projectGenerator =
					projectPlugin.getGenerator<CfsProjectGenerator>(
						CfsFeatureScope.Project
					);

				await projectGenerator.generateProject(
					path
						.join(
							workspacePath,
							(project.platformConfig as { ProjectName?: string })
								.ProjectName ?? ""
						)
						.replace(/\\/g, "/")
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

			const projectPlugin = await this.getPlugin(
				projectToBeGenerated.pluginId,
				projectToBeGenerated.pluginVersion,
				projectToBeGenerated as CfsProject
			);

			const projectGenerator =
				projectPlugin.getGenerator<CfsProjectGenerator>(
					CfsFeatureScope.Project
				);

			await projectGenerator.generateProject(
				path
					.join(workspacePath, projectToBeGenerated.name ?? "")
					.replace(/\\/g, "/")
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
			const dataModel = this.getDataModel(
				`${cfsWorkspace.soc.toLowerCase()}-${cfsWorkspace.package.toLowerCase()}.json`
			);

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

			const plugin: ICfsPlugin = await this.getPlugin(
				project.PluginId,
				project.PluginVersion
			);

			const codeGenerator = plugin.getGenerator<CfsCodeGenerator>(
				CfsFeatureScope.CodeGen
			);

			await codeGenerator
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

		return result;
	}

	/**
	 * Get the SoC data model from the specified plugin with changes applied
	 * @param soc - The SoC name to retrieve the data model for
	 * @param socPackage - The SoC package to retrieve the data model for
	 * @param cfsPluginId - The plugin ID to retrieve the SoC data model from
	 * @param cfsPluginVersion - The plugin version
	 */
	public async getSocDataModel(
		soc: string,
		socPackage: string,
		cfsPluginId: string,
		cfsPluginVersion: string
	): Promise<CfsSocDataModel> {
		const dataProvider = await this.getPlugin<CfsDataProvider>(
			cfsPluginId,
			cfsPluginVersion
		);
		return dataProvider.getSocDataModel(soc, socPackage);
	}

	/**
	 * Search the plugin directories for plugins
	 */
	private async refresh() {
		const parsedPlugins: CfsPluginInfo[] = [];
		for (const dir of this.searchPaths) {
			const fileList: string[] = [];
			await this.findFiles(
				dir.toString(),
				[".cfsTestFile"],
				fileList
			);
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

	// Recursively searches for files in a directory and its subdirectories
	private async findFiles(
		rootDir: string,
		extensions: string[],
		fileList: PathLike[]
	): Promise<void> {
		try {
			await fs.access(rootDir, fs.constants.R_OK);
		} catch (error) {
			console.error(
				`CfsPluginManager: No read access to directory ${rootDir}.`
			);
			return;
		}

		try {
			if (!existsSync(rootDir)) {
				console.error(
					`CfsPluginManager: Directory ${rootDir} does not exist.`
				);
				return;
			}

			const files = await fs.readdir(rootDir, {
				withFileTypes: true
			});

			for (const f of files) {
				const fullPath = path.join(rootDir, f.name);

				if (f.isDirectory()) {
					await this.findFiles(fullPath, extensions, fileList);
				} else {
					if (extensions.some((ext) => f.name.endsWith(ext))) {
						fileList.push(fullPath);
					}
				}
			}
		} catch (error) {
			console.error(
				"CfsManager.findFiles: Error finding files:",
				error
			);
		}
	}

	private async getPlugin<PluginClass = ICfsPlugin>(
		pluginId?: string,
		pluginVersion?: string,
		context?: CfsWorkspace | CfsProject | CfsConfig
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
				return CfsPluginManager.loadPlugin<PluginClass>(
					info,
					context
				);
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
	 * Retrieve the data model from the data model search directories, if found
	 * @param fileName - The file name of the data model
	 * @returns The data model if found, otherwise undefined
	 */
	private getDataModel(
		fileName: string
	): CfsSocDataModel | undefined {
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
