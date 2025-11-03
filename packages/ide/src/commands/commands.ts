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

/**
 * Registers the commands
 */
import * as vscode from "vscode";
import {
  CHANGE_CONTEXT,
  EXECUTE_TASK,
  WORKSPACE_CREATION_COMMANDS,
  ZEPHELIN_COMMANDS,
} from "./constants";
import { Utils } from "../utils/utils";
import {
  configCfsWorkspace,
  openTempDocumentInWorkspaceEditor,
  openVscodeWorkspace,
} from "../custom-editors/cfs-custom-editor";
import { ContextPanelProvider } from "../view-container";
import {
  convertTraceCtfToTef,
  captureProfilerTrace,
} from "./zephelin-commands";
/**
 * Executes a specified task by its name or as a vscode.Task within the given workspace folder.
 *
 * This function searches for tasks that match the provided task name or directly executes
 * the provided vscode.Task. If multiple tasks are found and no workspace folder is specified,
 * an error is displayed. If a workspace folder is specified, the function attempts to execute
 * the task within that workspace.
 *
 * @param taskToExecute - The name of the task to execute or a vscode.Task instance.
 * @param workspaceFolder - Optional. The workspace folder in which to search for the task.
 *                          If not provided, the function will attempt to execute the task
 *                          without considering the workspace folder.
 */
export const executeTask = async (
  taskToExecute: string | vscode.Task | vscode.TaskDefinition,
  workspaceFolder?: vscode.WorkspaceFolder,
) => {
  if (taskToExecute instanceof vscode.Task) {
    vscode.tasks.executeTask(taskToExecute);
    return;
  }

  let filteredTasks: vscode.Task[] = [];
  if (typeof taskToExecute === "object") {
    filteredTasks = (await vscode.tasks.fetchTasks()).filter((task) => {
      const taskDefinition = taskToExecute as vscode.TaskDefinition;
      // Allow build tasks from CFS or from the User's workspace
      return (
        taskDefinition.source === task.source &&
        (taskDefinition.name === task.name ||
          taskDefinition.label === task.name) &&
        task.definition.id.includes(taskDefinition.command)
      );
    });
  }

  if (typeof taskToExecute === "string") {
    filteredTasks = (await vscode.tasks.fetchTasks()).filter((task) => {
      // Allow build tasks from CFS or from the User's workspace
      return (
        (task.group === vscode.TaskGroup.Build &&
          task.source === "CFS" &&
          task.name === taskToExecute) ||
        (task.source === "Workspace" && task.name === `CFS: ${taskToExecute}`)
      );
    });
  }

  // Filter out duplicate tasks
  filteredTasks = filteredTasks.filter(
    (task, index, self) =>
      index ===
      self.findIndex((t) => {
        return (
          t.name === task.name &&
          t.source === task.source &&
          JSON.stringify(t.definition) === JSON.stringify(task.definition)
        );
      }),
  );

  if (!filteredTasks || filteredTasks.length === 0) {
    Utils.displayAndLogError(`Error: Task '${taskToExecute}' not found`);
    return;
  }

  if (filteredTasks.length === 1) {
    vscode.tasks.executeTask(filteredTasks[0]);
    return;
  }

  let taskReference: string = taskToExecute as string;
  if (typeof taskToExecute === "object") {
    taskReference = (taskToExecute as vscode.TaskDefinition).name;
  }

  if (filteredTasks.length > 1) {
    Utils.displayAndLogError(
      `Error: Multiple tasks of name "${taskReference}" detected. Please rename tasks or change task command.`,
    );
    return;
  }

  const selectedTask = filteredTasks.find((task) => {
    return task.scope === workspaceFolder;
  });

  if (selectedTask === undefined) {
    Utils.displayAndLogError(
      `Error: Task "${taskReference}" not found. Please ensure the task is defined.`,
    );
    return;
  }

  vscode.tasks.executeTask(selectedTask);
};

//TODO: rename after registerCommands is removed from extension.ts
/**
 * Registers all commands for the extension.
 *
 * This function adds commands to the provided context, allowing them to be executed
 * within the Visual Studio Code environment.
 *
 * @param context - The extension context provided by Visual Studio Code.
 */
export function registerAllCommands(context: vscode.ExtensionContext) {
  //Flash and run using openocd
  registerCommand(
    context,
    EXECUTE_TASK,
    async (taskName: vscode.Task, workspaceFolder?: vscode.WorkspaceFolder) => {
      return await executeTask(taskName, workspaceFolder);
    },
  );

  registerCommand(context, CHANGE_CONTEXT, (context: string) => {
    ContextPanelProvider.setActiveContext(context);
  });

  registerZephelinCommands(context);

  registerQuickAccessPanelCommands(context);
}

function registerQuickAccessPanelCommands(context: vscode.ExtensionContext) {
  //Workspace commands
  registerCommand(
    context,
    WORKSPACE_CREATION_COMMANDS.NEW_WORKSPACE,
    openTempDocumentInWorkspaceEditor,
  );

  registerCommand(
    context,
    WORKSPACE_CREATION_COMMANDS.OPEN_CFS_WORKSPACE_COMMAND_ID,
    openVscodeWorkspace,
  );

  registerCommand(
    context,
    WORKSPACE_CREATION_COMMANDS.CONFIG_CFS_WORKSPACE_COMMAND_ID,
    configCfsWorkspace,
  );
}

/**
 * Registers a command in the given VS Code extension context.
 *
 * @param context - The VS Code extension context to which the command will be added.
 * @param command - The unique identifier of the command.
 * @param callback - The function to be executed when the command is invoked.
 * @param thisArg - Optional. The `this` context for the callback function.
 */
export function registerCommand(
  context: vscode.ExtensionContext,
  command: string,
  callback: (...args: any[]) => any,
  thisArg?: any,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(command, callback, thisArg),
  );
}

function registerZephelinCommands(context: vscode.ExtensionContext) {
  // Zephelin commands
  registerCommand(
    context,
    ZEPHELIN_COMMANDS.CAPTURE_PROFILER_TRACE,
    captureProfilerTrace,
  );

  registerCommand(
    context,
    ZEPHELIN_COMMANDS.CONVERT_TRACE_CTF_TO_TEF,
    convertTraceCtfToTef,
  );
}
