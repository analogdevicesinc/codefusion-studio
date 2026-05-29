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

import type { CfsPackageManagerProvider } from "cfs-package-manager";
import * as fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import type { Options } from "fast-glob";

/**
 * Interface describing the `tool.json` file format, allowing external
 * tools to be dropped in and supported by the extension.
 */
export interface ToolInfo {
	/** Tool name */
	name: string;
	/** Tool description */
	description: string;
	/** Unique tool ID used for identifying the tool and comparing tool versions */
	id: string;
	/** Tool vendor */
	vendor: string;
	/** Tool version */
	version: string;
	/** `tool.json` schema version */
	schemaVersion: string;
	/** The relative path to the software license */
	license?: string;
	/** Paths to add to the Path environment variable */
	paths?: string[];
	/** Environment variables to set */
	envVars?: { name: string; value: string; isPath: boolean }[];
	/** Relative path to the toolchain compiler, e.g. gcc */
	compilerPath?: string;
	/** Relative path to the debugger, e.g. gdb */
	debuggerPath?: string;
	/** Absolute path to the tool  */
	rootPath: string;
	/** Computed absolute paths based on path object from tool.json */
	resolvedPaths: string[];
	/** Aboslute path to bin folder */
	binaryPath: string;
}

/**
 * The ToolManager class manages parsing and storage of tools and toolchains.
 * This class handles the core tool management functionality.
 */
// @TODO: Finish refactoring of tool and toolchain management in https://jira.analog.com/browse/CFSIO-7343
export class CfsToolManager {
	/** Info files managed by the tool manager */
	// @TODO: Consolidate into a single file.
	private static readonly MANAGED_INFO_FILES = [
		"tool.json",
		"toolchain.json"
	];
	/** Package types managed by the tool manager */
	private static readonly MANAGED_PACKAGE_TYPES = [
		"tool",
		"toolchain",
		"sdk"
	];

	/** Package manager instance */
	private packageManager: CfsPackageManagerProvider | undefined;
	/** Dictionary of all installed tools using id as first level key and version as second level key */
	private installedTools: Record<string, ToolInfo>;
	/** Custom search paths or a provider function returning them */
	private customSearchPaths?: string[] | (() => string[]);
	/** Target SoC for the tool manager */
	private targetSoc?: string;

	/**
	 * Constructor
	 */
	constructor(
		pkgManager?: CfsPackageManagerProvider,
		customSearchPaths?: string[] | (() => string[]),
		targetSoc?: string
	) {
		this.installedTools = {};
		this.packageManager = pkgManager;
		this.customSearchPaths = customSearchPaths;
		this.targetSoc = targetSoc;
	}

	/**
	 * Parse the tool from the specified file path
	 * @param toolInfoPath - the file path to the tool.json or toolchain.json file
	 * @returns the Tool object containing the parsed data
	 */
	private parseTool(toolInfoPath: string): ToolInfo | null {
		try {
			const toolPath = path.dirname(toolInfoPath);
			const fileName = path.basename(toolInfoPath);

			// Show deprecation warning for toolchain.json
			if (fileName === CfsToolManager.MANAGED_INFO_FILES[1]) {
				console.warn(
					`Deprecation Warning: Support for ${CfsToolManager.MANAGED_INFO_FILES[1]} found in ${toolPath} will be removed in a future release. Please use ${CfsToolManager.MANAGED_INFO_FILES[0]} instead.`
				);
			}

			// Read and parse the file
			const contents = fs.readFileSync(toolInfoPath, "utf8");
			const info = JSON.parse(contents) as ToolInfo;

			const resolvedPaths = (info.paths ?? []).map((_path) => {
				return path.join(toolPath, _path);
			});

			const binaryPath = resolvedPaths.find((p) =>
				p.toLowerCase().includes("bin")
			);

			return {
				...info,
				resolvedPaths,
				binaryPath: binaryPath ?? "",
				rootPath: toolPath
			} as ToolInfo;
		} catch (error) {
			console.error(
				`Error parsing tool info file ${toolInfoPath}:`,
				error
			);
			return null;
		}
	}

	/**
	 * Process tool files in a given directory and add them to installed tools
	 * @param toolPath - the directory path to search for tools
	 * @param options - Fast-glob options for file searching
	 */
	private processToolFiles(toolPath: string, options?: Options) {
		const results = fg.sync(
			CfsToolManager.MANAGED_INFO_FILES.map((file) => `**/${file}`),
			{
				cwd: toolPath,
				onlyFiles: true,
				dot: false,
				absolute: true,
				/**
				 * A depth of 3 is currently sufficient to find the tools that are added via the installer.
				 * There will not be any additional tools added at deeper levels from the installer.
				 * This will be removed in the future when the tools will be completely managed via the package manager.
				 */
				deep: 3,
				...options
			}
		);

		for (const file of results) {
			this.addTool(file);
		}
	}

	public async discoverToolPackages() {
		// First, invalidate the currently cached tools if its not empty
		if (Object.keys(this.installedTools).length > 0) {
			this.installedTools = {};
		}

		// Use the package manager to discover supported packages
		// Note: Any tool package delivered by the package manager will take precedence
		// over any tools discovered in the search paths.
		if (this.packageManager !== undefined) {
			const packageInfos =
				await this.packageManager.getInstalledPackageInfo({
					type: CfsToolManager.MANAGED_PACKAGE_TYPES
				});

			for (const pkgInfo of packageInfos) {
				if (!pkgInfo.path) {
					continue;
				}

				if (
				  Array.isArray(pkgInfo.cfsSoc) &&
				  pkgInfo.cfsSoc.length > 0 &&
				  this.targetSoc &&
				  !pkgInfo.cfsSoc.includes(this.targetSoc)
				) {
					continue;
				}

				// For package manager packages, tool.json is expected at the root
				const toolInfoPath = path.join(pkgInfo.path, "tool.json");

				if (fs.existsSync(toolInfoPath)) {
					this.addTool(toolInfoPath);
				}
			}
		}

		// Search custom search paths for available tool packages
		const customSearchPaths =
			this.customSearchPaths instanceof Function
				? this.customSearchPaths()
				: this.customSearchPaths;

		if (customSearchPaths) {
			for (const searchDir of customSearchPaths) {
				this.processToolFiles(searchDir);
			}
		}
	}

	/**
	 * Add the tool at the given path to the array of installed tools
	 * @param toolInfoPath - the file path to the tool.json or toolchain.json file
	 */
	private addTool(toolInfoPath: string) {
		const tool = this.parseTool(toolInfoPath);

		if (!tool) {
			return;
		}

		const { id } = tool;

		/**
		 * If an instance of the tool with the same id already exists, we skip adding it to give precedence
		 * to pkg manager installed tools.
		 */
		if (typeof this.installedTools[id] !== "undefined") {
			console.warn(
				`Duplicate tool detected: ${id} at path ${toolInfoPath} can't be added as its a duplicate of package at path ${this.installedTools[id].rootPath}. Skipping duplicate.`
			);

			return;
		}

		// Initialize the tool dictionary entry
		this.installedTools[id] = tool;
	}

	/**
	 * Get all installed tools
	 * @returns all currently installed tools
	 */
	public async getInstalledTools(): Promise<ToolInfo[]> {
		await this.discoverToolPackages();

		const tools: ToolInfo[] = [];

		for (const id in this.installedTools) {
			const tool = this.installedTools[id];

			tools.push(tool);
		}

		return tools;
	}

	/**
	 * Get the installed tool by ID
	 * @param id - the tool ID
	 * @returns a ToolInfo object with the given ID or null
	 */
	public async getInstalledToolById(
		id: string
	): Promise<ToolInfo | null> {
		if (typeof this.installedTools[id] === "undefined") {
			// Tool not found or no valid entries, discover new packages and check again
			await this.discoverToolPackages();
		}

		return this.installedTools[id] ?? null;
	}

	/**
	 * Resolves tool path variables from identifier strings
	 * @param string - Input string with format "toolId.subPath" or "toolId"
	 * @returns Promise that resolves to the string with tool paths resolved
	 */
	public async resolveTemplatePaths(string: string): Promise<string> {
		// Split the string to get toolId and optional subPath
		const [toolId, subPath] = string.split(".");

		// Get the tool with the specified ID
		const tool = await this.getInstalledToolById(toolId);

		if (tool !== null) {
			let resolvedPath = tool.rootPath;

			// If subPath is specified, try to get that property value from tool info
			if (subPath) {
				const info = tool;
				// Check if the subPath exists in the tool info
				const key = subPath as keyof ToolInfo;

				if (info[key]) {
					if (typeof info[key] === "string") {
						// If the property is a string, use it as a relative path
						resolvedPath = path.join(resolvedPath, info[key]);
					}
				}
			}

			return path.normalize(resolvedPath).split("\\").join("/");
		}

		// Return the original string if no tool was found
		return string;
	}

	/**
	 * Get the path for a specific tool by ID, optionally specifying a version
	 * @param id - The tool ID to look for
	 * @param version - Optional version string; if not provided, returns the one that exists
	 * @returns Promise that resolves to the tool path or empty string if not found
	 */
	public async getToolPath(
		id: string,
		version?: string
	): Promise<string> {
		try {
			const tool = await this.getInstalledToolById(id);

			if (tool === null) {
				console.warn(`No tool found with ID: ${id}`);
				return "";
			}

			if (!version || tool.version === version) {
				return tool.rootPath;
			} else {
				console.warn(`Version ${version} not found for tool ${id}`);
				return "";
			}
		} catch (error) {
			console.error(`Error getting tool path for ${id}:`, error);
			return "";
		}
	}
}
