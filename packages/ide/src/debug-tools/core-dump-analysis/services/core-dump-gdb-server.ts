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
import { CORE_DUMP_CONFIG } from "../commands/constants";
import * as path from "path";
import { CoreDumpConfig } from "../types";

/**
 * CoreDumpGdbServer is responsible for launching and managing the coredump_gdbserver.py process
 * which serves the Zephyr core dump over a GDB server for analysis.
 */
export class CoreDumpGdbServer {
  private elfPath: string;
  private coreDumpPath: string;
  private taskExecution?: vscode.TaskExecution;
  private workspaceFolderUri?: vscode.Uri;
  private config?: CoreDumpConfig;

  constructor(
    elfPath: string,
    coreDumpPath: string,
    workspaceFolderUri?: vscode.Uri,
    config?: CoreDumpConfig,
  ) {
    // Normalize the elf path to prevent duplication issues
    this.elfPath = path.resolve(elfPath);
    // Ensure coreDumpPath is absolute
    if (workspaceFolderUri && !path.isAbsolute(coreDumpPath)) {
      const folderPath = workspaceFolderUri.fsPath;
      this.coreDumpPath = path.join(folderPath, coreDumpPath);
    } else {
      this.coreDumpPath = coreDumpPath;
    }
    this.workspaceFolderUri = workspaceFolderUri;
    this.config = config;
  }

  /**
   * Starts the coredump_gdbserver.py process using a VS Code task in the integrated terminal.
   * Resolves when the task is started.
   */
  public async start(): Promise<void> {
    // Set the config variables so the task can use them

    await vscode.workspace
      .getConfiguration(CORE_DUMP_CONFIG, this.workspaceFolderUri)
      .update(
        "binFile",
        this.coreDumpPath,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );

    // Also set the gdbServerPort for this project (if available)
    if (this.config?.gdbPort) {
      await vscode.workspace
        .getConfiguration(CORE_DUMP_CONFIG, this.workspaceFolderUri)
        .update(
          "gdbServerPort",
          this.config.gdbPort,
          vscode.ConfigurationTarget.WorkspaceFolder,
        );
    }

    const allTasks = await vscode.tasks.fetchTasks();

    // Find the task by label and workspace folder
    let gdbTask: vscode.Task | undefined;
    if (this.workspaceFolderUri) {
      gdbTask = allTasks.find(
        (t) =>
          t.name === "start Zephyr core dump GDB server" &&
          t.scope &&
          typeof (t.scope as any).uri !== "undefined" &&
          (t.scope as any).uri.fsPath === this.workspaceFolderUri?.fsPath,
      );
    } else {
      // fallback: just find by name (single-folder workspace)
      gdbTask = allTasks.find(
        (t) => t.name === "start Zephyr core dump GDB server",
      );
    }

    if (!gdbTask) {
      console.error("Core Dump GDB Server: Task not found. Available tasks:");
      allTasks.forEach((task) => {
        console.error(`  - ${task.name} (scope: ${task.scope})`);
      });
      throw new Error(
        "Task 'start Zephyr core dump GDB server' not found for the selected project.",
      );
    }

    this.taskExecution = await vscode.tasks.executeTask(gdbTask);

    // Optionally, you can resolve immediately or listen for task events if you want to know when it finishes
    return Promise.resolve();
  }

  /**
   * Stops the GDB server process if it is running.
   */
  public async stop(): Promise<void> {
    if (this.taskExecution) {
      this.taskExecution.terminate();
      this.taskExecution = undefined;
    }
  }
}
