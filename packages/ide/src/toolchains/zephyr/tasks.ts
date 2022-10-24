/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import * as zephyrTasks from "./resources/tasks.json";
import * as vscode from "vscode";
import { ZephyrToolchain } from "./zephyr";
import fs from "fs";

import { Utils } from "../../utils/utils";
import { resolveVariables } from "../../utils/resolveVariables";
import { platform } from "node:process";

/**
 * This function detects if the project is a Zephyr project based on presence of file CMaskeLists.txt
 * and if the file exists and has a string "ZEPHYR_BASE".
 * @param workspaceFolder -  workspaceFolder to check
 * @returns Promise that resolves to true if the project is zephyr project and to false if it is not a zephyr project
 */
export async function detectZephyrProject(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<boolean> {
  return Utils.findFilesInWorkspaceFolder(workspaceFolder, "CMakeLists.txt")
    .then((cMakeListsFiles) => {
      for (const cMakeListFile of cMakeListsFiles) {
        return Promise.resolve(
          fs.readFileSync(cMakeListFile).includes("ZEPHYR_BASE"),
        );
      }
      return Promise.resolve(false);
    })
    .catch((err) => {
      console.error(`Error trying to detect Zephyr toolchain:\n${err}`);
      return Promise.resolve(false);
    });
}

export class ZephyrTaskProvider implements vscode.TaskProvider {
  provideTasks(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Task[]> {
    return this.getTasks();
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

  async getTasks(): Promise<vscode.Task[]> {
    const result: vscode.Task[] = [];

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return result;
    }

    for (const workspaceFolder of workspaceFolders) {
      const isZephyrProject = await detectZephyrProject(workspaceFolder);
      if (!isZephyrProject) {
        continue;
      }

      let environment: vscode.ShellExecutionOptions["env"] = {};
      environment = await ZephyrToolchain.getInstance().getEnvironment();

      const cwd = workspaceFolder.uri.fsPath;
      const shellOptions: vscode.ShellExecutionOptions = {
        cwd: cwd,
        env: environment,
        executable: Utils.getShellExecutable(platform),
        shellArgs: Utils.getShellArgs(platform),
      };

      // Running through tasks in task.json
      for (const taskDef of zephyrTasks.tasks) {
        //Adding a command to setup the zephyr env
        let addZephyrEnv: string;

        //Running the cmd
        if (platform === "win32") {
          addZephyrEnv = "${config:cfs.zephyr.workspace.path}/zephyr-env.cmd";
        } else {
          addZephyrEnv =
            "source ${config:cfs.zephyr.workspace.path}/zephyr-env.sh";
        }

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
        if (taskDef.group.kind === "build") {
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
