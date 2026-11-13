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
import {
  checkDirectoryExistsRequest,
  getFileSizeRequest,
  getPreferenceRequest,
  openFileNotification,
  reloadDocumentNotification,
  selectFileRequest,
  setPreferenceRequest,
  showInformationMessageNotification,
} from "../constants/messages/vscode-api-messages";
import Path from "node:path";
import { stat } from "node:fs/promises";
import { getWorkspaceRoot } from "../utils/utils";

export function registerVSCodeApiMessageHandlers(messenger: Messenger) {
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
          `File selection failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
  );

  messenger.onNotification(
    showInformationMessageNotification,
    ({ message }) => {
      void vscode.window.showInformationMessage(message);
    },
  );

  messenger.onNotification(openFileNotification, ({ filePath, editor }) => {
    if (editor) {
      void vscode.commands.executeCommand(
        "vscode.openWith",
        vscode.Uri.file(filePath),
        editor,
      );
    } else {
      void vscode.commands.executeCommand(
        "vscode.open",
        vscode.Uri.file(filePath),
      );
    }
  });

  messenger.onRequest(getPreferenceRequest, ({ id }) => {
    return vscode.workspace.getConfiguration("cfs").get(id);
  });

  messenger.onRequest(setPreferenceRequest, async ({ id, value, scope }) => {
    await vscode.workspace
      .getConfiguration("cfs")
      .update(id, value, scope ?? vscode.ConfigurationTarget.Workspace);
  });

  messenger.onRequest(getFileSizeRequest, async ({ filePath }) => {
    try {
      const fileStats = await stat(filePath);
      return fileStats.size;
    } catch (error) {
      throw new Error(`Failed to get file size: ${(error as Error).message}`);
    }
  });

  messenger.onNotification(reloadDocumentNotification, async () => {
    let uri: vscode.Uri | undefined;
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;

    if (activeTab?.input instanceof vscode.TabInputCustom) {
      uri = activeTab.input.uri;
    }

    if (!uri) {
      return;
    }

    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
    await vscode.commands.executeCommand("vscode.open", uri);
  });

  messenger.onRequest(checkDirectoryExistsRequest, async (dirPath) => {
    try {
      const dirStat = await stat(dirPath);
      return dirStat.isDirectory();
    } catch {
      return false;
    }
  });
}
