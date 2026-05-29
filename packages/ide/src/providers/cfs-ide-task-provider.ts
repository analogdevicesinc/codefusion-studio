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

import * as vscode from "vscode";
import {
  CfsToolManager,
  CfsTaskProvider,
  CfsTaskDiscoveryStrategy,
  MsdkTaskStrategy,
  ZephyrTaskStrategy,
} from "cfs-lib";
import { TaskDefinitionConverter } from "./task-definition-converter";
import {
  CustomTaskShellOptions,
  ToolchainShellOptions,
  type IShellOptionsResolver,
} from "./shell-options-resolver";
import type { IDEShellEnvProvider } from "../toolchains/shell-env-provider";

/**
 * Unified task provider for CodeFusion Studio that combines custom and toolchain tasks.
 *
 * This provider implements the VS Code TaskProvider interface to provide tasks from multiple sources:
 * 1. Custom tasks - defined in `.vscode/cfs.tasks.json` files (CfsTaskDiscoveryStrategy)
 * 2. Toolchain tasks - default MSDK/Zephyr tasks (MsdkTaskStrategy, ZephyrTaskStrategy)
 *
 * All strategies are aggregated through a single CfsTaskProvider orchestrator from cfs-lib.
 *
 * Task resolution flow:
 * - Custom tasks use CustomTaskShellOptions (env from task JSON)
 * - Toolchain tasks use ToolchainShellOptions (env from IDEShellEnvProvider)
 * - Both use TaskDefinitionConverter for vscode.Task creation
 *
 * Tasks are cached after initial discovery to improve performance during subsequent requests.
 *
 * @implements {vscode.TaskProvider}
 */
export class CfsIDETaskProvider implements vscode.TaskProvider {
  /**
   * Unified provider that aggregates tasks from all strategies
   */
  private readonly taskProvider: CfsTaskProvider;

  /**
   * Shell options resolver for custom tasks (reads env from task JSON)
   */
  private readonly customTaskShellOptions: IShellOptionsResolver;

  /**
   * Shell options resolver for toolchain tasks (reads env from IDEShellEnvProvider)
   */
  private readonly toolchainShellOptions: IShellOptionsResolver;

  /**
   * Cached list of resolved tasks
   */
  private resolvedTasks: vscode.Task[] | undefined;

  constructor(
    toolManager: CfsToolManager,
    shellEnvProvider: IDEShellEnvProvider,
  ) {
    // Unified provider combines all task strategies:
    // - CfsTaskDiscoveryStrategy: discovers .vscode/cfs.tasks.json files
    // - MsdkTaskStrategy: auto-detects MSDK workspaces, provides default tasks
    // - ZephyrTaskStrategy: auto-detects Zephyr workspaces, provides default tasks
    this.taskProvider = new CfsTaskProvider(
      [new CfsTaskDiscoveryStrategy(toolManager)],
      [new MsdkTaskStrategy(), new ZephyrTaskStrategy()],
    );

    this.customTaskShellOptions = new CustomTaskShellOptions();
    this.toolchainShellOptions = new ToolchainShellOptions(shellEnvProvider);
  }

  /**
   * Provides tasks found in all cfs.tasks.json files across the workspace
   */
  public provideTasks(_token: vscode.CancellationToken): vscode.Task[] {
    // Return cached tasks only
    return this.resolvedTasks || [];
  }

  /**
   * Returns undefined as we always provide fully resolved tasks from provideTasks
   */
  public resolveTask(
    _task: vscode.Task,
    _token: vscode.CancellationToken,
  ): Thenable<vscode.Task | undefined> {
    return Promise.resolve(undefined);
  }

  /**
   * Initializes the resolved tasks cache
   */
  public async initializeTasks(): Promise<void> {
    try {
      this.resolvedTasks = await this.getTasks();
    } catch (error) {
      console.error(`Error initializing CFS IDE tasks: ${error}`);
      this.resolvedTasks = [];
    }
  }

  /**
   * Discovers and loads tasks from all registered strategies.
   * @returns A Promise that resolves to an array of VS Code Task objects
   * @private
   */
  private async getTasks(): Promise<vscode.Task[]> {
    if (!vscode.workspace.workspaceFolders) {
      return [];
    }
    const platform = process.platform;

    const result: vscode.Task[] = [];

    // Discover all tasks from unified provider (custom + toolchain)
    const workspaceFolderPaths = vscode.workspace.workspaceFolders.map(
      (folder) => folder.uri.fsPath,
    );
    const taskDefinitions =
      await this.taskProvider.discoverTasks(workspaceFolderPaths);

    // Convert Task.Definition[] to vscode.Task[]
    for (const taskDefinition of taskDefinitions) {
      // Find the workspace folder for this task
      const folder =
        vscode.workspace.workspaceFolders.find((wf) =>
          taskDefinition.options?.cwd?.startsWith(wf.uri.fsPath),
        ) ?? vscode.workspace.workspaceFolders[0];

      try {
        const platformOptions =
          platform === "win32"
            ? taskDefinition.windows?.options
            : platform === "linux"
              ? taskDefinition.linux?.options
              : platform === "darwin"
                ? taskDefinition.osx?.options
                : undefined;
        // Determine which shell options resolver to use:
        // - Custom tasks (from cfs.tasks.json) may define env in root options.env
        //   or in platform-specific override options (windows/linux/osx)
        // - Toolchain tasks need full shell environment from IDEShellEnvProvider
        const hasCustomEnv =
          (taskDefinition.options?.env &&
            Object.keys(taskDefinition.options.env).length > 0) ||
          (platformOptions?.env && Object.keys(platformOptions.env).length > 0);

        const shellOptions = hasCustomEnv
          ? await this.customTaskShellOptions.resolve(taskDefinition, folder)
          : await this.toolchainShellOptions.resolve(taskDefinition, folder);

        const task = TaskDefinitionConverter.createVscodeTask(
          taskDefinition,
          folder,
          shellOptions,
        );

        if (task) {
          result.push(task);
        }
      } catch (error) {
        console.error(`Error creating task "${taskDefinition.label}":`, error);
      }
    }

    return result;
  }
}
