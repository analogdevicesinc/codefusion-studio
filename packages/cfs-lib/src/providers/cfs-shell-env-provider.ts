/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import * as path from "node:path";

import type { ToolInfo } from "../managers/cfs-tool-manager.js";

/**
 * Environment variable defined by an installed tool.
 */
export interface ToolEnvVar {
	name: string;
	value: string;
	isPath: boolean;
}

/**
 * Options for composing a base shell environment.
 */
export interface ShellEnvOptions {
	/** SDK installation path (e.g., CFS install path) */
	sdkPath?: string;
	/** JLink executable path */
	jlinkPath?: string;
	/** Zephyr base directory */
	zephyrBase?: string;
	/** Zephyr SDK/toolchain install directory (resolved via Tool Manager or fallback) */
	zephyrSdkPath?: string;
	/** CMAKE_PREFIX_PATH value */
	cmakePrefixPath?: string;
	/** Path to git-core directory (non-Windows) */
	gitExecPath?: string;
	/** Path to CFSAI tool */
	cfsaiPath?: string;
	/** Additional environment variables to include */
	additionalEnv?: Record<string, string>;
}

/**
 * Portable shell environment composition for task execution.
 * Zero vscode dependency; usable by both IDE and CLI.
 */
export class CfsShellEnvProvider {
	/**
	 * Computes environment variables from installed tool definitions.
	 *
	 * Iterates tools and joins env var paths with tool root directory
	 * when the env var is marked as a path.
	 */
	public getToolEnvVars(tools: ToolInfo[]): Record<string, string> {
		const env: Record<string, string> = {};

		for (const tool of tools) {
			if (tool.envVars) {
				for (const envVar of tool.envVars) {
					env[envVar.name] = envVar.isPath
						? path.join(tool.rootPath, envVar.value)
						: envVar.value;
				}
			}
		}

		return env;
	}

	/**
	 * Builds the PATH string from tools + SDK + JLink + system PATH.
	 * Tool paths are prepended to the system PATH.
	 */
	public getShellPath(
		tools: ToolInfo[],
		options?: { sdkPath?: string; jlinkPath?: string }
	): string {
		const paths: string[] = [];

		if (options?.jlinkPath) {
			paths.push(options.jlinkPath);
		}

		for (const tool of tools) {
			if (tool.paths?.length) {
				for (const relativePath of tool.paths) {
					paths.push(path.join(tool.rootPath, relativePath));
				}
			} else if (tool.resolvedPaths.length) {
				for (const toolPath of tool.resolvedPaths) {
					paths.push(toolPath);
				}
			} else if (tool.binaryPath) {
				paths.push(tool.binaryPath);
			} else {
				// Fallback to 'bin' directory if no paths specified
				paths.push(path.join(tool.rootPath, "bin"));
			}
		}

		if (options?.sdkPath) {
			paths.push(options.sdkPath);
		}

		paths.push(process.env.PATH ?? "");

		return paths.join(path.delimiter);
	}

	/**
	 * Composes the complete base shell environment for task execution.
	 * Includes PATH, tool env vars, and Zephyr/MSDK-specific variables.
	 */
	public getBaseShellEnvironment(
		tools: ToolInfo[],
		options: ShellEnvOptions = {}
	): Record<string, string> {
		const toolEnv = this.getToolEnvVars(tools);
		const pathStr = this.getShellPath(tools, {
			sdkPath: options.sdkPath,
			jlinkPath: options.jlinkPath
		});

		const env: Record<string, string> = {
			...toolEnv,
			PATH: pathStr,
			PYTHON_CMD: "none"
		};

		if (options.zephyrBase) {
			env.ZEPHYR_BASE = options.zephyrBase;
		}

		if (options.cmakePrefixPath) {
			let cmakePrefix = options.cmakePrefixPath;

			if (process.env.CMAKE_PREFIX_PATH) {
				cmakePrefix += path.delimiter + process.env.CMAKE_PREFIX_PATH;
			}

			env.CMAKE_PREFIX_PATH = cmakePrefix;
		}

		const resolvedZephyrSdkPath =
			options.zephyrSdkPath ??
			(options.sdkPath
				? path.join(options.sdkPath, "Tools", "zephyr-sdk")
				: undefined);

		if (resolvedZephyrSdkPath) {
			env.ZEPHYR_SDK_INSTALL_DIR = resolvedZephyrSdkPath;
		}

		if (options.gitExecPath) {
			env.GIT_EXEC_PATH = options.gitExecPath;
		}

		if (options.cfsaiPath) {
			env.CFSAI_PATH = options.cfsaiPath.replace(/\\/g, "/");
		}

		if (options.additionalEnv) {
			this.mergeAdditionalEnv(env, options.additionalEnv);
		}

		return env;
	}

	/**
	 * Merges caller-provided environment variables into the composed shell environment.
	 *
	 * PATH keys are handled case-insensitively and prepended to the composed PATH so
	 * tool, SDK, and JLink path entries remain available for task execution.
	 *
	 * @param env - The composed environment to mutate in place.
	 * @param additionalEnv - Caller-provided environment overrides.
	 */
	private mergeAdditionalEnv(
		env: Record<string, string>,
		additionalEnv: Record<string, string>
	): void {
		for (const [key, value] of Object.entries(additionalEnv)) {
			if (key.toUpperCase() === "PATH") {
				const composedPath = env.PATH;
				env.PATH = composedPath
					? `${value}${path.delimiter}${composedPath}`
					: value;
				continue;
			}

			env[key] = value;
		}
	}
}
