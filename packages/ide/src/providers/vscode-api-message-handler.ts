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
import { Messenger } from "vscode-messenger";
import { selectFileRequest } from "../constants/messages/vscode-api-messages";
import Path from "node:path";
import { getWorkspaceRoot } from "../utils/utils";

export function regsiterVSCodeApiMessageHandlers(messenger: Messenger) {
  messenger.onRequest(
    selectFileRequest,
    async ({ title, filters, selectionTarget, relativeToWorkspaceRoot }) => {
      const workspaceRoot = getWorkspaceRoot();

      const options: vscode.OpenDialogOptions = {
        defaultUri: workspaceRoot ? vscode.Uri.file(workspaceRoot) : undefined,
        canSelectMany: false,
        openLabel: "Select",
        filters: filters,
        title: title ?? "Select a file",
        canSelectFiles: selectionTarget !== "folder",
        canSelectFolders: selectionTarget === "folder",
      };

      try {
        const selectedFiles = await vscode.window.showOpenDialog(options);
        if (selectedFiles && selectedFiles.length > 0) {
          let path = selectedFiles[0].fsPath;
          if (
            relativeToWorkspaceRoot &&
            workspaceRoot &&
            path.startsWith(workspaceRoot)
          ) {
            path = Path.relative(workspaceRoot, path);
          }
          return path;
        } else {
          return undefined;
        }
      } catch (error) {
        throw new Error(
          `File selection failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );
}
