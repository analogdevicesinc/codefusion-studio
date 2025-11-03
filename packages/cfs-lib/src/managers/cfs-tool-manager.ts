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

import type { CfsPackageManagerProvider } from "cfs-package-manager";
import { platform } from "node:process";
import * as fs from "node:fs";
import path from "node:path";
import * as fg from "fast-glob";
import type { Options } from "fast-glob";
import { findLatestVersion } from "../utils/semantic-versioning.js";

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
	license: string;
	/** Paths to add to the Path environment variable */
	paths: string[];
	/** Environment variables to set */
	envVars: [{ name: string; value: string; isPath: boolean }];
	/** Relative path to the toolchain compiler, e.g. gcc */
	compilerPath?: string;
	/** Relative path to the debugger, e.g. gdb */
	debuggerPath?: string;
}

/**
 * The Tool class describes an external tool supported by the extension.
 * This includes the tool's path, path to the tool's binaries, and access
 * to the `tool.json` content associated with the tool (tool name, ID, version, etc).
 *
 * The Tool objects are handled by the {@link ToolManager} class.
 */
export class Tool {
	/** The tool.json file contents associated with this tool */
	protected info: ToolInfo;
	/** File path to the tool */
	protected path: string;

	/**
	 * Tool constructor
	 * @param info - Tool description info
	 * @param path - Tool root path
	 */
	constructor(info: ToolInfo, path: string) {
		this.info = info;
		this.path = path;
	}

	/**
	 * Get the absolute resolved file path to the root tool directory.
	 * @returns The resolved file path
	 */
	getPath(): string {
		return this.path;
	}

	/**
	 * Get the absolute resolved file path to the tool's paths.
	 * @returns An array of resolved paths
	 */
	getPaths(): string[] {
		const paths: string[] = [];

		if (
			Array.isArray(this.info.paths) &&
			this.info.paths.length > 0
		) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			(this.info.paths ?? []).forEach((path: string) => {
				const fullPath = [this.path, path].join("/");
				paths.push(fullPath);
			});
		}

		return paths;
	}

	/**
	 * Get the absolute resolved file path to the tool binary directory.
	 * @returns The resolved file path
	 */
	getBinaryPath(): string {
		const binaryPath = this.getPaths().find((p) =>
			p.toLowerCase().includes("bin")
		);

		if (binaryPath) {
			return [this.getPath(), binaryPath].join("/");
		}

		return "";
	}

	/**
	 * Get the {@link ToolInfo} object for this Tool.
	 * @returns The {@link ToolInfo} object
	 */
	getInfo(): ToolInfo {
		return this.info;
	}

	/**
	 * Get the full path to the given executable.
	 * @param relativeExePath - The executable path relative to the root tool path.
	 * @returns The full path to the executable
	 */
	protected getExecutablePath(relativeExePath: string): string {
		let ret = [this.getPath(), relativeExePath].join("/");

		if (platform === "win32") {
			ret += ".exe";
		}

		return ret;
	}
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
	private installedTools: Record<string, Record<string, Tool>>;
	/** Custom search paths or a provider function returning them */
	private customSearchPaths?: string[] | (() => string[]);

	/**
	 * Constructor
	 */
	constructor(
		pkgManager?: CfsPackageManagerProvider,
		customSearchPaths?: string[] | (() => string[])
	) {
		this.installedTools = {};
		this.packageManager = pkgManager;
		this.customSearchPaths = customSearchPaths;
	}

	/**
	 * Parse the tool from the specified file path
	 * @param toolInfoPath - the file path to the tool.json or toolchain.json file
	 * @returns the Tool object containing the parsed data
	 */
	private parseTool(toolInfoPath: string): Tool | null {
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

			return new Tool(info, toolPath);
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

		const { id, version } = tool.getInfo();

		// If an instance of the tool with the same id already exists, we skip adding it to give precedence
		// to pkg manager installed tools.
		if (Object.keys(this.installedTools[id] ?? {}).length > 0) {
			console.warn(
				`Duplicate tool version detected: ${id} at path ${toolInfoPath} can't be added as its a duplicate of package at path ${Object.values(this.installedTools[id])[0]?.getPath()}. Skipping duplicate.`
			);

			return;
		}

		// Initialize the tool dictionary entry
		this.installedTools[id] = {};
		this.installedTools[id][version] = tool;
	}

	/**
	 * Extracts and returns an array of Tool instances from the provided version map,
	 * filtering out any undefined values.
	 *
	 * @param versionMap - A record mapping version strings to Tool instances or undefined.
	 * @returns An array of Tool instances present in the version map.
	 */
	private getToolsFromVersionMap(
		versionMap: Record<string, Tool>
	): Tool[] {
		return Array.from(Object.values(versionMap));
	}

	/**
	 * Get all installed tools
	 * @returns all currently installed tools
	 */
	public async getInstalledTools(): Promise<Tool[]> {
		await this.discoverToolPackages();

		const tools: Tool[] = [];

		for (const id in this.installedTools) {
			const versionMap = this.installedTools[id];

			tools.push(...this.getToolsFromVersionMap(versionMap));
		}

		return tools;
	}

	/**
	 * Get the installed tools by ID
	 * @param id - the tool ID
	 * @returns an array containing all installed tools with the given ID, or an empty array
	 */
	public async getInstalledToolsForId(id: string): Promise<Tool[]> {
		const installedTools = this.getToolsFromVersionMap(
			this.installedTools[id] ?? {}
		);

		if (installedTools.length > 0) {
			return installedTools;
		}

		// Tool not found or no valid entries, discover new packages and check again
		await this.discoverToolPackages();

		return this.getToolsFromVersionMap(this.installedTools[id] ?? {});
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
		const [tool] = await this.getInstalledToolsForId(toolId);

		if (tool instanceof Tool) {
			let resolvedPath = tool.getPath();

			// If subPath is specified, try to get that property value from tool info
			if (subPath) {
				const info = tool.getInfo();
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
	 * @param version - Optional version string; if not provided, returns the latest version
	 * @returns Promise that resolves to the tool path or empty string if not found
	 */
	public async getToolPath(
		id: string,
		version?: string
	): Promise<string> {
		try {
			const tools = await this.getInstalledToolsForId(id);

			if (tools.length === 0) {
				console.warn(`No tool found with ID: ${id}`);
				return "";
			}

			let selectedTool: Tool | undefined;

			if (version) {
				// Find the specific version requested
				selectedTool = tools.find(
					(tool) => tool.getInfo().version === version
				);

				if (!selectedTool) {
					console.warn(`Version ${version} not found for tool ${id}`);
					return "";
				}
			} else {
				// Find the latest version if no specific version is requested
				if (tools.length === 1) {
					selectedTool = tools[0];
				} else {
					// Get all versions and find the latest
					const versions = tools.map(
						(tool) => tool.getInfo().version
					);
					const latestVersion = findLatestVersion(versions);
					selectedTool = tools.find(
						(tool) => tool.getInfo().version === latestVersion
					);
				}
			}

			return selectedTool ? selectedTool.getPath() : "";
		} catch (error) {
			console.error(`Error getting tool path for ${id}:`, error);
			return "";
		}
	}
}
