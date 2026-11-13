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

  // VS Code strips dependsOn from the task definition, so we track it separately
  private static readonly dependsOnMap = new Map<string, string[]>();

  /**
   * Returns the `dependsOn` labels for a task, if any were declared.
   * Only CFS tasks are tracked, so other sources are ignored.
   */
  static getDependsOn(task: vscode.Task): string[] {
    if (task.source !== "CFS") return [];

    const key = `${(task.scope as vscode.WorkspaceFolder)?.uri?.fsPath}:${task.name}`;
    return this.dependsOnMap.get(key) ?? [];
  }

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
    const args = this.normalizeTaskArgs(taskDefinition.args);
    if (!command) {
      console.warn(
        `Task "${taskDefinition.label}" has no command for platform ${process.platform}. Skipping.`,
      );
      return undefined;
    }

    // Create the task with shell execution
    // command may be a full command line (e.g. "make -r -j 8 ..."), so args
    // are appended to the command line rather than passed via the structured
    // ShellExecution(command, args, options) overload, which would treat the
    // whole command line as a single executable token.
    const commandLine = args?.length
      ? `${command} ${args.map((arg) => this.quoteArg(arg)).join(" ")}`
      : command;

    const task = new vscode.Task(
      {
        type: taskDefinition.type,
      },
      folder,
      taskDefinition.label,
      "CFS",
      new vscode.ShellExecution(commandLine, shellOptions),
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

    if (taskDefinition.dependsOn) {
      const key = `${folder.uri.fsPath}:${taskDefinition.label}`;
      this.dependsOnMap.set(key, [taskDefinition.dependsOn].flat());
    }

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
   * Converts task args into a string array for VS Code shell execution.
   *
   * cfs.tasks.json allows unknown args payloads, but vscode.ShellExecution
   * requires a string array. Non-string values are stringified to preserve
   * user intent while keeping execution resilient.
   *
   * @param args - The raw args value from Task.Definition
   * @returns A string array of args, or undefined if args is not an array
   */
  private static normalizeTaskArgs(
    args: unknown,
  ): readonly string[] | undefined {
    if (!Array.isArray(args)) {
      return undefined;
    }

    return args.map((arg) => String(arg));
  }

  /**
   * Wraps an arg in double quotes and escapes embedded backslashes/quotes,
   * so it survives being appended to a shell command line as a single token.
   *
   * @remarks
   * Every arg is quoted unconditionally (not just when whitespace is
   * present) so that shell-splitting metacharacters (`;`, `|`, `&`, `<`,
   * `>`) are neutralized even in args without spaces. This does not
   * neutralize `$(...)`/backtick command substitution in bash (still
   * active inside double quotes) or `%VAR%` expansion in cmd.exe (active
   * regardless of quoting). `args` is currently only used by the xt-run
   * simulator task on SHARC-FX, using CFS-controlled variables and static
   * literals rather than arbitrary user-typed input, so this residual risk
   * is accepted for now. Revisit with a proper shell-aware quoting
   * strategy (e.g. vscode.ShellQuotedString) if `args` usage broadens to
   * less-trusted input.
   *
   * @param arg - The raw argument string
   * @returns The arg, quoted and escaped
   */
  private static quoteArg(arg: string): string {
    const escapedArg = arg.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escapedArg}"`;
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
