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
import {
  CONFIG_TOOLS_COMMANDS,
  WORKSPACE_CREATION_COMMANDS,
} from "./constants";
import {
  CONFIG_FILE_EXTENSION,
  WORKSPACE_CONFIG_FILE_EXTENSION,
} from "../constants";

function baseRegisterCommand(
  commandId: string,
  fileExtension: string,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    commandId,
    async (args: vscode.Uri): Promise<void> => {
      let path: string | undefined;
      if (args) {
        path = args.path;
      } else {
        const uri = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          openLabel: "Load",
          filters: {
            "Configuration Files": [fileExtension],
          },
        });

        path = uri?.[0].path;
      }

      if (path) {
        const document = await vscode.workspace.openTextDocument(path);
        await vscode.window.showTextDocument(document, {
          viewColumn: vscode.ViewColumn.One,
          preview: false,
        });
      } else {
        vscode.window.showErrorMessage("Path is undefined.");
      }
    },
  );
}

export function registerViewConfigFileSourceCommand() {
  return baseRegisterCommand(
    CONFIG_TOOLS_COMMANDS.VIEW_CONFIG_FILE_SOURCE,
    CONFIG_FILE_EXTENSION,
  );
}

export function registerViewWorkspaceConfigFileSourceCommand() {
  return baseRegisterCommand(
    WORKSPACE_CREATION_COMMANDS.VIEW_CONFIG_FILE_SOURCE,
    WORKSPACE_CONFIG_FILE_EXTENSION,
  );
}
