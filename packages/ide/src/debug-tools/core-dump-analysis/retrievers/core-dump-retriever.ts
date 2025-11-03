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

import { CoreDumpConfig } from "../types";
import * as fs from "fs/promises";
import * as vscode from "vscode";
import * as path from "path";
import { CORE_DUMP_RETRIEVE_COMMAND_ID } from "../commands/constants";

/**
 * Handles the retrieval of Zephyr core dumps by invoking a VS Code command
 * that runs a configured task (e.g., JLink), waits for completion,
 * and then reads the resulting bin file from disk.
 */
export class CoreDumpRetriever {
  constructor(private config: CoreDumpConfig) {}

  /**
   * Retrieves the core dump by executing the registered VS Code command,
   * waits for the retrieval task to complete, and then reads the bin file.
   * @returns Buffer containing the parsed core dump data.
   */
  async retrieve(): Promise<Buffer> {
    // Execute the registered command to start the core dump retrieval task
    await new Promise<void>((resolve, reject) => {
      const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
        if (e.execution.task.name === "retrieve core dump (JLink)") {
          disposable.dispose();
          if (e.exitCode === 0) {
            resolve();
          } else {
            reject(
              new Error(
                "Failed to retrieve core dump: Task exited with code " +
                  e.exitCode,
              ),
            );
          }
        }
      });
      vscode.commands.executeCommand(CORE_DUMP_RETRIEVE_COMMAND_ID);
    });

    const fileName = path.basename(this.config.binFile);
    const fileDir = path.dirname(this.config.binFile);

    const message = `Core dump ${fileName} saved to ${fileDir}`;
    vscode.window
      .showInformationMessage(message, "Open to file location")
      .then((action) => {
        if (action === "Open to file location") {
          vscode.commands.executeCommand(
            "revealInExplorer",
            vscode.Uri.file(this.config.binFile),
          );
        }
      });

    // Read the bin file after the task completes
    return fs.readFile(this.config.binFile);
  }

  /**
   * Reads the existing core dump bin file from disk without running any retrieval task.
   * @returns Buffer containing the core dump data.
   */
  async readExisting(): Promise<Buffer> {
    return fs.readFile(this.config.binFile);
  }
}
