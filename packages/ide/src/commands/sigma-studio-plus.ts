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

import { exec } from "child_process";
import { existsSync } from "fs";
import * as vscode from "vscode";
import { OPEN_WITH_SSPLUS_COMMAND_ID } from "./constants";

/**
 * Opens a file with SigmaStudio+.
 * @param uri The file URI to open with SigmaStudio+
 */
export async function openWithSSPlusCommand(
  uri: vscode.Uri | undefined,
): Promise<void> {
  if (!uri) {
    const selectedFiles = await vscode.window.showOpenDialog({
      filters: { SigmaStudioPlus: ["ssprj"] },
      title: "Open a SigmaStudio+ project file",
      openLabel: "Open",
    });
    if (selectedFiles && selectedFiles.length > 0) {
      uri = selectedFiles[0];
    } else {
      return;
    }
  }

  if (!existsSync(uri.fsPath)) {
    const message = `File does not exist: ${uri.fsPath}`;
    vscode.window.showErrorMessage(message);
    console.error(message);
    return;
  }

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Opening ${uri.fsPath}...`,
    },
    async () => {
      await new Promise<void>((resolve, reject) => {
        // SigmaStudio+ doesn't have a CLI command to open projects, so we default to using the
        // Windows 'start' command, which will open the file using the default application
        // associated with the file type, which should be SigmaStudio+ if installed.
        exec(`start ${uri.fsPath}`, (error, stdout, stderr) => {
          if (error) {
            const message = `Error opening file ${uri.fsPath}: ${error.message}`;
            vscode.window.showErrorMessage(message);
            console.error(message);
            reject(error);
            return;
          }

          if (stdout) {
            console.log(`${OPEN_WITH_SSPLUS_COMMAND_ID}: ${stdout}`);
          }

          if (stderr) {
            console.error(`${OPEN_WITH_SSPLUS_COMMAND_ID}: ${stderr}`);
          }

          resolve();
        });
      });
    },
  );
}
