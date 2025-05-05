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
import { Utils } from "./utils";
import { VSCODE_OPEN_FOLDER_COMMAND_ID } from "../commands/constants";

/**
 * Function that looks for a file and searches line by line until `content` is matched
 * and opens it in VSCode with the cursor at the respective line
 * @param filePath file path
 * @param content line content to find
 */
export const openFileAtLocation = (filePath: string, content: string) => {
  const openPath = vscode.Uri.file(filePath);
  vscode.workspace.openTextDocument(openPath).then((doc) => {
    let column = -1;
    let line = 0;
    while (line < doc.lineCount) {
      column = doc.lineAt(line).text.indexOf(content);

      if (column !== -1) {
        break;
      }

      line++;
    }

    const pos = new vscode.Position(line, column);
    vscode.window.showTextDocument(doc).then((editor) => {
      editor.selections = [new vscode.Selection(pos, pos)];

      const range = new vscode.Range(pos, pos);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    });
  });
};

/**
 * Opens a dialog to select a file from the file system and opens the selected file in the editor.
 *
 * @param openLabel - The label for the open button in the dialog.
 * @param filters - The filters to apply to the file selection dialog.
 * @returns A promise that resolves when the file is opened or rejects if an error occurs.
 *
 * @remarks
 * This function uses the VS Code API to show an open dialog and execute a command to open the selected file.
 * It defaults to the location provided by `Utils.getDefaultLocation()`.
 * If an error occurs while opening the file, an error message is displayed to the user.
 */
export async function openFolder(
  openLabel: string,
  filters: vscode.OpenDialogOptions["filters"],
) {
  const defaultLocation = Utils.getDefaultLocation();
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    canSelectFiles: true,
    canSelectFolders: false,
    defaultUri: vscode.Uri.file(defaultLocation),
    openLabel: openLabel,
    filters: filters,
  };

  const workspaceUri = await vscode.window.showOpenDialog(options);

  if (workspaceUri && workspaceUri[0]) {
    try {
      await vscode.commands.executeCommand(
        VSCODE_OPEN_FOLDER_COMMAND_ID,
        workspaceUri[0],
        { forceNewWindow: false },
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Could not open selection ${error}`);
    }
  }
}
