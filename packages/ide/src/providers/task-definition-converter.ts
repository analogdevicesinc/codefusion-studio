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

/**
 * Shared helper for converting Task.Definition objects into vscode.Task instances.
 *
 * This converter encapsulates the common logic for:
 * - Platform-specific command resolution (windows/osx/linux)
 * - Task group mapping (build/clean)
 * - vscode.Task construction with shell execution
 * - Presentation options setup
 *
 * @remarks
 * This is a stateless utility used by both custom and toolchain task providers.
 * Shell execution options (cwd, env, executable, args) are provided by the caller
 * via ShellOptionsResolver implementations.
 */
export class TaskDefinitionConverter {
  /**
   * Creates a vscode.Task from a Task.Definition with the given shell options.
   *
   * @param taskDefinition - The portable task definition (from cfs-lib)
   * @param folder - The VS Code workspace folder scope
   * @param shellOptions - Shell execution options (cwd, env, executable, args)
   * @returns A fully configured vscode.Task, or undefined if command cannot be resolved
   */
  public static createVscodeTask(
    taskDefinition: Task.Definition,
    folder: vscode.WorkspaceFolder,
    shellOptions: vscode.ShellExecutionOptions,
  ): vscode.Task | undefined {
    const command = this.getCommandForPlatform(taskDefinition);
    if (!command) {
      console.warn(
        `Task "${taskDefinition.label}" has no command for platform ${process.platform}. Skipping.`,
      );
      return undefined;
    }

    // Create the task with shell execution
    const task = new vscode.Task(
      {
        type: taskDefinition.type,
      },
      folder,
      taskDefinition.label,
      "CFS",
      new vscode.ShellExecution(command, shellOptions),
      taskDefinition.problemMatcher,
    );

    // Remove task ID (not supported in custom shell tasks)
    delete task.definition.id;

    // Populate definition options for task serialization
    task.definition.command = command;
    task.definition.options = {
      cwd: shellOptions.cwd,
      env: shellOptions.env,
      shell: {
        args: shellOptions.shellArgs,
        executable: shellOptions.executable,
      },
    };

    // Map task group
    task.group = this.mapTaskGroup(taskDefinition.group);

    // Set presentation options
    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Always,
      clear: false,
    };

    return task;
  }

  /**
   * Resolves the platform-specific command for the current OS.
   *
   * Checks taskDefinition.command first, then falls back to platform-specific
   * overrides (windows, osx, linux).
   *
   * @param taskDefinition - The task definition to extract command from
   * @returns The resolved command string, or undefined if no command is available
   */
  public static getCommandForPlatform(
    taskDefinition: Task.Definition,
  ): string | undefined {
    if (taskDefinition.command) {
      return taskDefinition.command;
    }

    switch (process.platform) {
      case "win32":
        return taskDefinition.windows?.command;
      case "darwin":
        return taskDefinition.osx?.command;
      case "linux":
        return taskDefinition.linux?.command;
      default:
        return undefined;
    }
  }

  /**
   * Maps a task group definition to a vscode.TaskGroup.
   *
   * Handles both string format ("build", "clean") and object format ({ kind: "build" }).
   *
   * @param group - The task group from Task.Definition
   * @returns The corresponding vscode.TaskGroup, or undefined if not mapped
   */
  public static mapTaskGroup(
    group: Task.Definition["group"],
  ): vscode.TaskGroup | undefined {
    if (!group) {
      return undefined;
    }

    if (typeof group === "string") {
      switch (group) {
        case "build":
          return vscode.TaskGroup.Build;
        case "clean":
          return vscode.TaskGroup.Clean;
        default:
          console.warn(`Unknown task group: ${group}`);
          return undefined;
      }
    }

    // Handle object format { kind: "build", isDefault: true }
    if (typeof group === "object" && group.kind) {
      switch (group.kind) {
        case "build":
          return vscode.TaskGroup.Build;
        case "clean":
          return vscode.TaskGroup.Clean;
        default:
          console.warn(`Unknown task group kind: ${group.kind}`);
          return undefined;
      }
    }

    return undefined;
  }
}
