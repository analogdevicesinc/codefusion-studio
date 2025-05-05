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
import * as vscode from "vscode";
import { MCU_EDITOR_ID } from "../constants";
import { CONFIG_FILE_EXTENSION } from "../constants";

export async function writeConfigFile(
  filePath: string,
  content: Record<string, unknown>,
) {
  if (!filePath.endsWith(`.${CONFIG_FILE_EXTENSION}`)) {
    void vscode.window.showErrorMessage(
      `Please use *.${CONFIG_FILE_EXTENSION} extension for your config file.`,
    );

    return "error";
  }

  const fileUri = vscode.Uri.file(filePath);
  let status = "";

  try {
    const metaData = await vscode.workspace.fs.stat(fileUri);

    if (metaData !== undefined && metaData.type === vscode.FileType.File) {
      const res = await vscode.window.showInformationMessage(
        "The file already exists. Do you want to overwrite it?",
        "Yes",
        "No",
      );

      if (res === "Yes") {
        status = "overwrite";
      } else {
        status = "dismissed";
      }
    }
  } catch {
    // File does not exist and process continues normally
  }

  if (status === "dismissed") return "dismissed";

  try {
    await vscode.workspace.fs
      .writeFile(fileUri, Buffer.from(JSON.stringify(content, null, 2)))
      .then(async () => {
        status = "success";

        // Closes the config file wizard
        void vscode.commands.executeCommand(
          "workbench.action.closeActiveEditor",
        );

        const document = await vscode.workspace.openTextDocument(fileUri);

        await vscode.commands.executeCommand(
          "vscode.openWith",
          document.uri,
          MCU_EDITOR_ID,
        );

        void vscode.window.showInformationMessage(
          "Config file created successfully!",
        );
      });
  } catch {
    void vscode.window.showErrorMessage(
      "An error ocurred while generating your config file. Please try again later.",
    );

    status = "error";
  }

  return status;
}
