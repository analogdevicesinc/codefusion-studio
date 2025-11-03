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

import * as vscode from "vscode";
import * as fs from "fs";
import { glob } from "glob";
import { CfsToolManager, CfsVariableResolver } from "cfs-lib";
import { Utils } from "../utils/utils";

/**
 * Interface for the cfs.tasks.json file structure
 */
interface CfsTaskJson {
  version: string;
  schema: string;
  tasks: TaskDefinitionJson[];
}

interface PlatformOptions {
  options?: Partial<
    vscode.ShellExecutionOptions & {
      shell: {
        args: string[];
        executable?: string;
      };
    }
  >;
}

interface TaskDefinitionJson {
  label: string;
  type: string;
  command: string;
  options?: Partial<
    vscode.ShellExecutionOptions & {
      shell: {
        args: string[];
        executable?: string;
      };
    }
  >;
  windows?: PlatformOptions;
  linux?: PlatformOptions;
  osx?: PlatformOptions;
  group?: string | { kind: string; isDefault: boolean };
  problemMatcher?: string | string[];
  dependsOn?: string | string[];
  [key: string]: unknown;
}

/**
 * Task provider for CodeFusion Studio that discovers and provides tasks from cfs.tasks.json files.
 *
 * This provider implements the VS Code TaskProvider interface to:
 * - Load custom tasks defined in `.vscode/cfs.tasks.json` files across all workspace folders
 * - Resolve variables within task definitions using the CfsVariableResolver
 * - Create platform-specific VS Code Task objects with appropriate shell execution configuration
 * - Support Windows, Linux, and macOS specific task configurations
 *
 * Tasks are cached after initial discovery to improve performance during subsequent requests.
 * The provider is designed to work with available tools and toolchains to provide integrated
 * task management capabilities within the VS Code environment.
 *
 * @implements {vscode.TaskProvider}
 */
export class CfsIDETaskProvider implements vscode.TaskProvider {
  /**
   * The CfsVariableResolver instance for resolving variables in task definitions
   */
  private variableResolver: CfsVariableResolver;
  /**
   * Cached list of resolved tasks
   */
  private resolvedTasks: vscode.Task[] | undefined;

  constructor(toolManager: CfsToolManager) {
    this.variableResolver = new CfsVariableResolver(toolManager);
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
   * Discovers and loads tasks from `.vscode/cfs.tasks.json` files across all workspace folders.
   * @returns A Promise that resolves to an array of VS Code Task objects
   * @private
   */
  private async getTasks(): Promise<vscode.Task[]> {
    const result: vscode.Task[] = [];

    if (!vscode.workspace.workspaceFolders) {
      return result;
    }

    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      const taskFiles = await glob([".vscode/cfs.tasks.json"], {
        cwd: workspaceFolder.uri.fsPath,
        maxDepth: 2,
        nodir: true,
        dot: true,
        absolute: true,
      });

      for (const taskFile of taskFiles) {
        try {
          const tasksJsonContent = fs.readFileSync(taskFile, "utf8");
          const tasksJson = JSON.parse(tasksJsonContent) as CfsTaskJson;

          if (!tasksJson.tasks || !Array.isArray(tasksJson.tasks)) {
            continue;
          }

          for (const taskDefinition of tasksJson.tasks) {
            // Resolve custom cfs variables in the task definition
            await this.variableResolver.resolveObjectVariables(taskDefinition);

            // Create a task from the resolved definition
            const task = await this.createTaskFromDefinition(
              taskDefinition,
              workspaceFolder,
            );

            if (task) {
              result.push(task);
            }
          }
        } catch (error) {
          console.error(
            `Error processing cfs.tasks.json at ${taskFile}:`,
            error,
          );
        }
      }
    }

    return result;
  }

  /**
   * Creates a VS Code task from a JSON task definition
   *
   * @param taskDefinition - The task definition as parsed from a cfs.tasks.json file.
   * @param folder - The VS Code workspace folder where the task will be executed
   * @returns A Promise that resolves to a configured VS Code Task object or undefined if creation fails
   *
   */
  private async createTaskFromDefinition(
    taskDefinition: TaskDefinitionJson,
    folder: vscode.WorkspaceFolder,
  ): Promise<vscode.Task | undefined> {
    try {
      const platform = process.platform;
      const cwd = folder.uri.fsPath;

      // Compute shell options with platform-specific overrides
      const shellOptions = this.computePlatformShellOptions(
        taskDefinition,
        platform,
        cwd,
      );

      // Create shell execution with merged options
      const shellExecution = new vscode.ShellExecution(
        taskDefinition.command,
        shellOptions,
      );

      // Create the task with full definition and execution
      const task = new vscode.Task(
        {
          type: taskDefinition.type,
        },
        folder,
        taskDefinition.label,
        "CFS",
        shellExecution,
        taskDefinition.problemMatcher,
      );

      // Remove the task ID, which isn't supported in custom shell tasks.
      if (taskDefinition.id) delete taskDefinition.id;

      task.definition.options = {
        cwd,
        env: shellOptions.env,
        shell: {
          args: shellOptions.shellArgs,
          executable: shellOptions.executable,
        },
      };

      // Mapping the group type
      if (typeof taskDefinition.group === "string") {
        switch (taskDefinition.group) {
          case "build":
            task.group = vscode.TaskGroup.Build;
            break;
          case "clean":
            task.group = vscode.TaskGroup.Clean;
            break;
          default:
            console.warn(`Unknown task group: ${taskDefinition.group}`);
            break;
        }
      } else {
        if (
          typeof taskDefinition.group === "object" &&
          taskDefinition.group !== null
        ) {
          if (taskDefinition.group.kind === "build") {
            task.group = vscode.TaskGroup.Build;
          } else if (taskDefinition.group.kind === "clean") {
            task.group = vscode.TaskGroup.Clean;
          }
        }
      }

      //Updating terminal presentation options
      task.presentationOptions = {
        reveal: vscode.TaskRevealKind.Always,
        clear: false,
      };

      return task;
    } catch (error) {
      console.error("Error creating task:", error);
      return undefined;
    }
  }

  /**
   * Computes shell execution options for a task based on the current platform.
   *
   * This method determines the appropriate shell options by checking for platform-specific
   * configurations first (windows, linux, or osx), then falling back to default options
   * if platform-specific ones are not available.
   *
   * @param taskDefinition - The task definition containing configuration options
   * @param platform - The current platform identifier (win32, linux, or darwin)
   * @param cwd - The current working directory for the task execution
   * @returns Shell execution options configured for the specified platform
   * @throws Error if required environment variables configuration is missing
   * @private
   */
  private computePlatformShellOptions(
    taskDefinition: TaskDefinitionJson,
    platform: string,
    cwd: string,
  ): vscode.ShellExecutionOptions {
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
