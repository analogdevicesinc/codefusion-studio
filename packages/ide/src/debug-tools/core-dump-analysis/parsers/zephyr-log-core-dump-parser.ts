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
import { type WorkspaceFolder } from "vscode";

/**
 * ZephyrLogCoreDumpParser converts a Zephyr core dump log file to a bin file
 * using the official Zephyr Python script.
 */
export class ZephyrLogCoreDumpParser {
  /**
   * Converts a Zephyr core dump log file to a bin file.
   */
  static async parse(folder: WorkspaceFolder): Promise<void> {
    // Use VS Code task for log parsing if available
    const tasks = await vscode.tasks.fetchTasks();
    const logParserTask = tasks.find(
      (t) =>
        t.name === "start Zephyr core dump log parser" &&
        (t.scope as WorkspaceFolder).name === folder.name,
    );
    if (logParserTask) {
      await vscode.tasks.executeTask(logParserTask);
      return;
    }
    // If no VS Code task is found, throw an error
    throw new Error(
      "Log parser VS Code task 'start Zephyr core dump log parser' not found. Please check your workspace tasks configuration.",
    );
  }
}
