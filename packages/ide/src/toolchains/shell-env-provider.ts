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

import * as path from "path";
import { ShellExecutionOptions, workspace, WorkspaceFolder } from "vscode";
import { CfsShellEnvProvider, resolveZephyrSdkRoot } from "cfs-lib";

import {
  ENVIRONMENT,
  EXTENSION_ID,
  JLINK_PATH,
  PROJECT,
  TOOLCHAIN_ID,
  ZEPHYR_WORKSPACE,
} from "../constants";
import { resolveVariables } from "../utils/resolveVariables";
import { Utils } from "../utils/utils";

import { platform } from "node:process";
import { getPropertyName } from "../properties";
import type { CfsToolManager, ToolInfo } from "cfs-lib";

/**
 * The IDEShellEnvProvider class manages environment and shell configuration
 * both at the workspace and user levels, as well as the ones provided by externally managed tools.
 */
export class IDEShellEnvProvider {
  /** Internal tool manager for handling tool operations */
  private toolManager: CfsToolManager;

  /** Shared shell env composition provider (stateless) */
  private cfsShellEnvProvider: CfsShellEnvProvider;

  /** Cache for tool environment variables */
  private toolEnvVarsCache: Record<string, string> | null = null;

  /**
   * Constructor
   */
  constructor(toolManager: CfsToolManager) {
    this.toolManager = toolManager;
    this.cfsShellEnvProvider = new CfsShellEnvProvider();
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
  public getToolEnvVars(installedTools: ToolInfo[]): Record<string, string> {
    // Return cached env vars if available
    if (this.toolEnvVarsCache) {
      return this.toolEnvVarsCache;
    }

    // Cache miss - populate the cache
    const envVars = this.cfsShellEnvProvider.getToolEnvVars(installedTools);

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
  public getShellPath(sdkPath: string, installedTools: ToolInfo[]): string {
    const jlinkExecutablePath = resolveVariables(
      getPropertyName(JLINK_PATH),
      true,
    );

    return this.cfsShellEnvProvider.getShellPath(installedTools, {
      jlinkPath:
        jlinkExecutablePath && jlinkExecutablePath !== "null"
          ? jlinkExecutablePath
          : undefined,
      sdkPath,
    });
  }

  /**
   * Get the shell environment, including the updated PATH and MAXIM_PATH variables
   * @param workspaceFolder - Optional workspace folder for resolving resource-scoped settings
   * @returns the shell environment
   */
  public async getShellEnvironment(
    workspaceFolder?: WorkspaceFolder,
  ): Promise<ShellExecutionOptions["env"]> {
    const installedTools = (await this.toolManager.getInstalledTools()) ?? [];
    const sdkPath = await Utils.getSdkPath();
    const shellPath = this.getShellPath(sdkPath ?? "", installedTools);
    const config = workspace.getConfiguration(EXTENSION_ID, workspaceFolder);

    // Zephyr SDK: prefer per-project override, then toolchain ID from settings, then legacy path
    let zephyrSdkPath = "";
    const toolchainPathOverride = config.get<string>(
      `${PROJECT}.toolchain.path`,
    );
    if (toolchainPathOverride) {
      zephyrSdkPath = toolchainPathOverride;
    } else {
      const toolchainId =
        config.get<string>(`${PROJECT}.${TOOLCHAIN_ID}`) ??
        "arm.zephyr.eabi.toolchain";
      const zephyrToolPath = toolchainId.includes("zephyr")
        ? await this.toolManager.getToolPath(toolchainId)
        : undefined;

      if (zephyrToolPath) {
        zephyrSdkPath = resolveZephyrSdkRoot(zephyrToolPath);
      } else if (sdkPath) {
        zephyrSdkPath = path.join(sdkPath, "Tools", "zephyr-sdk");
      }
    }

    // Add zephyr-sdk to the CMAKE_PREFIX_PATH so CMake can find the zephyr toolchains.
    const cmakePrefixPath = [zephyrSdkPath, process.env.CMAKE_PREFIX_PATH]
      .filter((segment): segment is string => Boolean(segment))
      .join(path.delimiter);
    const customZephyrWrksp = config.get<string>(ZEPHYR_WORKSPACE);
    let zephyrBase = customZephyrWrksp;
    if (!customZephyrWrksp) {
      const zephyrPath = await this.toolManager.getToolPath("zephyr");
      if (zephyrPath) {
        zephyrBase = path.join(zephyrPath, "zephyr");
      }
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
      ...(zephyrSdkPath ? { ZEPHYR_SDK_INSTALL_DIR: zephyrSdkPath } : {}),
      GIT_EXEC_PATH: gitExecPath,
      CFSAI_PATH: cfsaiPath.replace(/\\/g, "/"), // Replace backslashes with forward slashes for cross platform compatibility
      ...(zephyrBase ? { ZEPHYR_BASE: zephyrBase } : {}),
    };
  }
}
