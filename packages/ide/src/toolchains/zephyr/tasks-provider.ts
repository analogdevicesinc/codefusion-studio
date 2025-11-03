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

import { default as zephyrTasks } from "./resources/tasks";
import * as vscode from "vscode";
import fs from "fs";

import { Utils } from "../../utils/utils";
import { platform } from "node:process";
import type { IDEShellEnvProvider } from "../shell-env-provider";
import { type CfsToolManager } from "cfs-lib";
import { EXTENSION_ID, ZEPHYR_WORKSPACE } from "../../constants";
import { workspace } from "vscode";

export class ZephyrTaskProvider implements vscode.TaskProvider {
  private shellEnvProvider: IDEShellEnvProvider;
  private toolManager: CfsToolManager;
  private resolvedTasks: vscode.Task[] | undefined;

  constructor(
    shellEnvProvider: IDEShellEnvProvider,
    toolManager: CfsToolManager,
  ) {
    this.shellEnvProvider = shellEnvProvider;
    this.toolManager = toolManager;
  }

  provideTasks(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Task[]> {
    return this.resolvedTasks || [];
  }

  resolveTask(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _task: vscode.Task,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Task> {
    // Since we're providing fully resolved tasks, we don't need to implement this.
    return undefined;
  }

  /**
   * Initializes the resolved tasks cache
   */
  async initializeTasks(): Promise<void> {
    try {
      this.resolvedTasks = await this.getTasks();
    } catch (error) {
      console.error(`Error initializing Zephyr tasks: ${error}`);
      this.resolvedTasks = [];
    }
  }

  async getTasks(): Promise<vscode.Task[]> {
    const result: vscode.Task[] = [];

    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      return result;
    }

    const { cfs, workspaceFolders } = vscode.workspace.workspaceFolders.reduce(
      (acc, folder) => {
        if (folder.name === ".cfs") {
          acc.cfs = folder;
        } else {
          if (!Array.isArray(acc.workspaceFolders)) {
            acc.workspaceFolders = [];
          }
          acc.workspaceFolders.push(folder);
        }
        return acc;
      },
      {} as {
        cfs: vscode.WorkspaceFolder;
        workspaceFolders: vscode.WorkspaceFolder[];
      },
    );
    const cfsWorkspace = JSON.parse(
      (
        await vscode.workspace.openTextDocument(
          cfs.uri?.path + "/.cfsworkspace",
        )
      ).getText(),
    );
    const zephyrPath = await this.toolManager.getToolPath("zephyr");

    let environment: vscode.ShellExecutionOptions["env"] =
      await this.shellEnvProvider.getShellEnvironment();

    for (const workspaceFolder of workspaceFolders) {
      const isZephyrProject =
        Utils.getProjectFirmwarePlatform(workspaceFolder) === "Zephyr";
      if (!isZephyrProject) {
        continue;
      }

      const cfsEnvVars =
        this.shellEnvProvider.getCfsEnvironmentVariables(workspaceFolder);
      const config = workspace.getConfiguration(EXTENSION_ID, workspaceFolder);
      const customZephyrWrksp = config.get<string>(ZEPHYR_WORKSPACE);
      const zephyrBase = customZephyrWrksp || `${zephyrPath}/zephyr`;
      environment = {
        ...environment,
        ...cfsEnvVars,
        ZEPHYR_BASE: zephyrBase,
      };
      const cwd = workspaceFolder.uri.fsPath;
      const shellOptions: vscode.ShellExecutionOptions = {
        cwd: cwd,
        env: environment,
        executable: Utils.getShellExecutable(platform),
        shellArgs: Utils.getShellArgs(platform),
      };

      const projectConfig = cfsWorkspace.Projects?.find(
        (proj: Record<string, any>) =>
          proj.PlatformConfig?.ProjectName === workspaceFolder.name,
      );

      const tasksResource = zephyrTasks(projectConfig?.PlatformConfig);

      const userDefinedZephyrWorkspace = config.get<string>(ZEPHYR_WORKSPACE);
      const zephyrWrkspPath =
        userDefinedZephyrWorkspace || `${zephyrPath}/zephyr`;

      let addZephyrEnv: string;
      if (platform === "win32") {
        addZephyrEnv = `${zephyrWrkspPath}/zephyr-env.cmd`;
      } else {
        addZephyrEnv = `source ${zephyrWrkspPath}/zephyr-env.sh`;
      }

      for (const taskDef of tasksResource.tasks) {
        let command = taskDef.command;
        if (command === undefined) {
          switch (platform) {
            case "win32":
              command = taskDef.windows?.command;
              break;
            case "darwin":
              command = taskDef.osx?.command;
              break;
            case "linux":
              command = taskDef.linux?.command;
              break;
          }
        }
        if (command === undefined) {
          continue;
        }

        command = `${addZephyrEnv} && ${command}`;
        const taskName = `${taskDef.label}`;

        //Creating a task
        const task = new vscode.Task(
          {
            type: taskDef.type,
          },
          workspaceFolder,
          taskName,
          "CFS",
          new vscode.ShellExecution(command, shellOptions),
          taskDef.problemMatcher,
        );

        //Updating the task definition
        // Remove the task ID, which isn't supported in custom shell tasks.
        delete task.definition.id;
        task.definition.command = command;
        task.definition.options = {
          cwd: cwd,
          env: environment,
          shell: {
            args: shellOptions.shellArgs,
            executable: shellOptions.executable,
          },
        };

        //Setting the group as build
        if (
          typeof taskDef.group !== "string" &&
          taskDef.group.kind === "build"
        ) {
          task.group = vscode.TaskGroup.Build;
        }

        //Updating terminal presentation options
        task.presentationOptions = {
          reveal: vscode.TaskRevealKind.Always,
          clear: false,
        };

        result.push(task);
      }
    }

    return result;
  }
}
