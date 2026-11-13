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
import { CfsShellEnvProvider, getZephyrSdkPath } from "cfs-lib";

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
import type { GitRemoteHelperSetup } from "../git-remote/helper-launcher";

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

  /** cfspkg git remote helper setup (PATH entry + env additions). */
  private readonly gitRemoteHelper: GitRemoteHelperSetup;

  /**
   * Constructor
   * @param toolManager - Tool manager used to resolve installed tool paths/env.
   * @param gitRemoteHelper - cfspkg git remote helper setup so spawned
   *   build/flash/west processes can resolve `cfspkg://` URLs.
   */
  constructor(
    toolManager: CfsToolManager,
    gitRemoteHelper: GitRemoteHelperSetup,
  ) {
    this.toolManager = toolManager;
    this.gitRemoteHelper = gitRemoteHelper;
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
   * Resolves the Zephyr repository root (ZEPHYR_BASE).
   *
   * @param workspaceFolder - Optional workspace folder for resolving resource-scoped settings
   * @returns the Zephyr base path, or undefined when it cannot be resolved
   */
  public async getZephyrBase(
    workspaceFolder?: WorkspaceFolder,
  ): Promise<string | undefined> {
    const config = workspace.getConfiguration(EXTENSION_ID, workspaceFolder);
    const customZephyrWrksp = config.get<string>(ZEPHYR_WORKSPACE);

    if (customZephyrWrksp) {
      return customZephyrWrksp;
    }

    const zephyrPath = await this.toolManager.getToolPath("zephyr");

    return zephyrPath ? path.join(zephyrPath, "zephyr") : undefined;
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
    const sdkPath = Utils.getSdkPath();
    const shellPath = this.getShellPath(sdkPath ?? "", installedTools);
    const config = workspace.getConfiguration(EXTENSION_ID, workspaceFolder);

    const zephyrSdkPath = await getZephyrSdkPath(
      sdkPath,
      config.get<string>(`${PROJECT}.toolchain.path`),
      config.get<string>(`${PROJECT}.${TOOLCHAIN_ID}`),
      this.toolManager,
    );

    // Add zephyr-sdk to the CMAKE_PREFIX_PATH so CMake can find the zephyr toolchains.
    const cmakePrefixPath = [zephyrSdkPath, process.env.CMAKE_PREFIX_PATH]
      .filter((segment): segment is string => Boolean(segment))
      .join(path.delimiter);
    const zephyrBase = await this.getZephyrBase(workspaceFolder);

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

    // Prepend the cfspkg git remote helper bin dir to PATH so git/west can
    // resolve cfspkg:// URLs, and merge its environment additions.
    const pathWithCfspkgHelper = `${this.gitRemoteHelper.binDir}${path.delimiter}${shellPath}`;

    // Final environment object creation
    return {
      ...env,
      ...this.gitRemoteHelper.env,
      PATH: pathWithCfspkgHelper,
      PYTHON_CMD: "none",
      CMAKE_PREFIX_PATH: cmakePrefixPath,
      ...(zephyrSdkPath ? { ZEPHYR_SDK_INSTALL_DIR: zephyrSdkPath } : {}),
      GIT_EXEC_PATH: gitExecPath,
      CFSAI_PATH: cfsaiPath.replace(/\\/g, "/"), // Replace backslashes with forward slashes for cross platform compatibility
      ...(zephyrBase ? { ZEPHYR_BASE: zephyrBase } : {}),
    };
  }
}
