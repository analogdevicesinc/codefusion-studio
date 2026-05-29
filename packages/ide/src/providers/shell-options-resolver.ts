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

import * as vscode from "vscode";
import type { Task } from "cfs-types";
import { Utils } from "../utils/utils";
import type { IDEShellEnvProvider } from "../toolchains/shell-env-provider";

/**
 * Strategy interface for resolving shell execution options.
 *
 * Different task sources require different strategies for determining
 * shell environment and execution parameters:
 * - Custom tasks (cfs.tasks.json) embed env in the task definition
 * - Toolchain tasks derive env from IDEShellEnvProvider
 */
export interface IShellOptionsResolver {
  /**
   * Resolves shell execution options for a task definition.
   *
   * @param taskDefinition - The task definition to resolve options for
   * @param folder - The workspace folder context
   * @returns Shell execution options (cwd, env, executable, args)
   */
  resolve(
    taskDefinition: Task.Definition,
    folder: vscode.WorkspaceFolder,
  ): Promise<vscode.ShellExecutionOptions>;
}

/**
 * Resolves shell options from the task definition itself.
 *
 * Used for custom tasks (cfs.tasks.json) where the environment is self-contained
 * in the task JSON with platform-specific overrides.
 *
 * Cascade order:
 * 1. Platform-specific options (windows/linux/osx)
 * 2. Root-level options
 * 3. Utils defaults (shell executable/args)
 */
export class CustomTaskShellOptions implements IShellOptionsResolver {
  async resolve(
    taskDefinition: Task.Definition,
    folder: vscode.WorkspaceFolder,
  ): Promise<vscode.ShellExecutionOptions> {
    const platform = process.platform;
    const cwd = folder.uri.fsPath;

    // Get platform-specific options based on current platform
    let platformOptions:
      | Partial<
          vscode.ShellExecutionOptions & {
            shell: {
              args: string[];
              executable?: string;
            };
          }
        >
      | undefined;

    if (platform === "win32" && taskDefinition.windows?.options) {
      platformOptions = taskDefinition.windows.options;
    } else if (platform === "linux" && taskDefinition.linux?.options) {
      platformOptions = taskDefinition.linux.options;
    } else if (platform === "darwin" && taskDefinition.osx?.options) {
      platformOptions = taskDefinition.osx.options;
    }

    // Use platform-specific env if available, otherwise fallback to task definition env
    const env = platformOptions?.env || taskDefinition.options?.env;

    if (!env) {
      throw new Error(
        `Task "${taskDefinition.label}" is missing required environment variables configuration.`,
      );
    }

    // Determine shell args and executable
    const shellArgs =
      platformOptions?.shell?.args ||
      taskDefinition.options?.shell?.args ||
      Utils.getShellArgs(platform);

    const shellExecutable =
      platformOptions?.shell?.executable ||
      taskDefinition.options?.shell?.executable ||
      Utils.getShellExecutable(platform);

    return {
      cwd,
      env,
      executable: shellExecutable,
      shellArgs: shellArgs,
    };
  }
}

/**
 * Resolves shell options from IDEShellEnvProvider.
 *
 * Used for toolchain tasks (MSDK/Zephyr defaults) where the environment
 * is externally managed and includes tool paths, SDK paths, and per-folder
 * configuration variables.
 */
export class ToolchainShellOptions implements IShellOptionsResolver {
  constructor(private readonly shellEnvProvider: IDEShellEnvProvider) {}

  async resolve(
    _taskDefinition: Task.Definition,
    folder: vscode.WorkspaceFolder,
  ): Promise<vscode.ShellExecutionOptions> {
    const platform = process.platform;
    const cwd = folder.uri.fsPath;

    // Get base environment from shell env provider
    const baseEnvironment = await this.shellEnvProvider.getShellEnvironment();

    // Merge with folder-specific CFS environment variables
    const cfsEnvVars =
      this.shellEnvProvider.getCfsEnvironmentVariables(folder);
    const env = {
      ...baseEnvironment,
      ...cfsEnvVars,
    };

    return {
      cwd,
      env,
      executable: Utils.getShellExecutable(platform),
      shellArgs: Utils.getShellArgs(platform),
    };
  }
}
