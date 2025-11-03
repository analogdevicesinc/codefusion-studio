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

import * as path from "path";
import { ShellExecutionOptions, workspace, WorkspaceFolder } from "vscode";

import {
  ENVIRONMENT,
  EXTENSION_ID,
  JLINK_PATH,
  ZEPHYR_WORKSPACE,
} from "../constants";
import { resolveVariables } from "../utils/resolveVariables";
import { Utils } from "../utils/utils";

import { platform } from "node:process";
import { getPropertyName } from "../properties";
import type { CfsToolManager, Tool } from "cfs-lib";

/**
 * The IDEShellEnvManager class manages environment and shell configuration
 * both at the workspace and user levels, as well as the ones provided by externally managed tools.
 */
export class IDEShellEnvProvider {
  /** Internal tool manager for handling tool operations */
  private toolManager: CfsToolManager;

  /** Cache for tool environment variables */
  private toolEnvVarsCache: Record<string, string> | null = null;

  /**
   * Constructor
   */
  constructor(toolManager: CfsToolManager) {
    this.toolManager = toolManager;
  }

  /**
   * Invalidates the cached tool environment variables.
   */
  public invalidateToolEnvVarsCache(): void {
    this.toolEnvVarsCache = null;
  }

  /**
   * Get the envVars for each tool.json
   * @returns an object containing all envVars for each tool.json
   */
  public getToolEnvVars(installedTools: Tool[]): Record<string, string> {
    // Return cached env vars if available
    if (this.toolEnvVarsCache) {
      return this.toolEnvVarsCache;
    }

    // Cache miss - populate the cache
    const envVars: Record<string, string> = {};

    installedTools?.forEach((tool) => {
      const toolInfo = tool.getInfo();
      if (toolInfo.envVars && toolInfo.envVars.length > 0) {
        toolInfo.envVars.forEach((envVar) => {
          const value = envVar.isPath
            ? path.join(tool.getPath(), envVar.value)
            : envVar.value;
          envVars[envVar.name] = value;
        });
      }
    });

    this.toolEnvVarsCache = { ...envVars };

    return envVars;
  }

  /**
   * Retrieves the environment variables from vscode extension settings
   * @param workspaceFolder (Optional) workspaceFolder from which to pull variables from
   * @returns Record that contains cfs ide environment variables
   */
  public getCfsEnvironmentVariables(
    workspaceFolder?: WorkspaceFolder,
  ): Record<string, string> {
    const config = workspace.getConfiguration(EXTENSION_ID, workspaceFolder);
    return config.get(ENVIRONMENT) as Record<string, string>;
  }

  /**
   * Get the shell path, including the SDK path and the
   * binary path for each installed tool
   * @returns the shell path
   */
  public getShellPath(sdkPath: string, installedTools: Tool[]): string {
    const jlinkExecutablePath = resolveVariables(
      getPropertyName(JLINK_PATH),
      true,
    );
    const shellPath: (string | undefined)[] = [];

    if (jlinkExecutablePath && jlinkExecutablePath !== "null") {
      shellPath.push(jlinkExecutablePath);
    }

    installedTools?.forEach((tool) => {
      const toolPaths = tool.getPaths();
      // if the tool doesn't define any paths, assume the bin path
      if (toolPaths.length == 0) {
        shellPath.push(tool.getBinaryPath());
      } else {
        toolPaths.forEach((path) => {
          shellPath.push(path);
        });
      }
    });
    shellPath.push(sdkPath);
    shellPath.push(process.env.PATH);

    return shellPath.join(path.delimiter);
  }

  /**
   * Get the shell environment, including the updated PATH and MAXIM_PATH variables
   * @returns the shell environment
   */
  public async getShellEnvironment(): Promise<ShellExecutionOptions["env"]> {
    const installedTools = await this.toolManager?.getInstalledTools();
    const sdkPath = await Utils.getSdkPath();
    const shellPath = this.getShellPath(sdkPath ?? "", installedTools);

    let zephyrSdkPath = "";
    if (sdkPath) {
      zephyrSdkPath = path.join(sdkPath, "Tools/zephyr-sdk");
    }

    // Add zephyr-sdk to the CMAKE_PREFIX_PATH so CMake can find the zephyr toolchains.
    let cmakePrefixPath = `${zephyrSdkPath}`;
    if (process.env.CMAKE_PREFIX_PATH) {
      cmakePrefixPath += `${path.delimiter}${process.env.CMAKE_PREFIX_PATH}`;
    }

    const config = workspace.getConfiguration(EXTENSION_ID);
    const customZephyrWrksp = config.get<string>(ZEPHYR_WORKSPACE);
    let zephyrBase = customZephyrWrksp;
    if (!customZephyrWrksp) {
      const zephyrPath = await this.toolManager.getToolPath("zephyr");
      zephyrBase = `${zephyrPath}/zephyr`;
    }

    let gitExecPath = "";
    if (platform != "win32") {
      const gitPath = await this.toolManager.getToolPath("git.tool");

      if (gitPath) {
        gitExecPath = path.join(gitPath, "libexec", "git-core");
      } else {
        console.error(
          "Could not resolve path to git while getting the shell environment.",
        );
      }
    }

    /**
     * Retrieves the installation path of the "cfsai" package using the tool manager,
     * and assigns it to `cfsaiPath`.
     */
    const cfsaiPath = (await this.toolManager.getToolPath("cfsai.tool")) || "";

    if (!cfsaiPath) {
      console.error(
        "Could not resolve path to cfsai the tool while getting the shell environment.",
      );
    }

    const env = {
      ...this.getToolEnvVars(installedTools),
    };

    // Final environment object creation
    return {
      ...env,
      PATH: shellPath,
      PYTHON_CMD: "none",
      CMAKE_PREFIX_PATH: cmakePrefixPath,
      ZEPHYR_SDK_INSTALL_DIR: `${sdkPath}/Tools/zephyr-sdk`,
      GIT_EXEC_PATH: gitExecPath,
      CFSAI_PATH: cfsaiPath.replace(/\\/g, "/"), // Replace backslashes with forward slashes for cross platform compatibility
      ZEPHYR_BASE: zephyrBase,
    };
  }
}
