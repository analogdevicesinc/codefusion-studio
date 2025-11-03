/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
  WORKSPACE_CONFIG_FILE_EXTENSION,
  WORKSPACE_CREATION_EDITOR_ID,
} from "../constants";
import { openFolder } from "../utils/open-file-location";
import { Utils } from "../utils/utils";

abstract class CfsCustomEditor implements vscode.CustomTextEditorProvider {
  static viewType: string;

  constructor(context: vscode.ExtensionContext) {}

  static register(...args: any[]): vscode.Disposable {
    throw new Error("Method not implemented.");
  }

  static getViewType(): string {
    return CfsCustomEditor.viewType;
  }

  abstract resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void>;

  getDocumentAsJson(
    document: vscode.TextDocument,
  ): Document | Record<never, never> {
    const text = document.getText();

    if (text.trim().length === 0) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        "Could not get document as json. Content is not valid json",
      );
    }
  }

  async updateDocument(
    payload: Record<string, unknown>,
    document: vscode.TextDocument,
  ) {
    const edit = new vscode.WorkspaceEdit();
    const timestamp = new Date().toISOString();
    const currentDoc = this.getDocumentAsJson(document);

    if ("Timestamp" in currentDoc) {
      currentDoc["Timestamp"] = timestamp;
    }

    const newDoc = { ...currentDoc, ...payload };

    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      JSON.stringify(newDoc, null, 2) + "\n",
    );

    await vscode.workspace.applyEdit(edit);
  }

  getExtensionVersion(): string | undefined {
    const extension = vscode.extensions.getExtension("analogdevices.cfs-ide");

    if (!extension) {
      return undefined;
    }

    return extension.packageJSON.version.split("-")[0];
  }
}

function getDefaultWorkspace() {
  const currentYear = new Date().getFullYear();
  return {
    Copyright: `Copyright (c) ${currentYear} Analog Devices, Inc.  All rights reserved. This software is proprietary to Analog Devices, Inc. and its licensors.`,
    DataModelVersion: "0.0.1",
    DataModelSchemaVersion: "0.0.1",
    Timestamp: new Date().toISOString(),
    Soc: "",
    Template: "",
    Board: "",
    Package: "",
    Cores: [],
    WorkspaceConfig: {
      Name: "",
      Path: "",
    },
  };
}

/**
 * Create a temporary file in the system's temporary directory
 * and open it with the workspace creation editor.
 */
export async function openTempDocumentInWorkspaceEditor() {
  const uri = Utils.getTempCfsWorkspacePath();

  const content = JSON.stringify(getDefaultWorkspace(), null, 2);
  try {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to open Workspace Creation Wizard: ${error}`,
    );

    throw error;
  }

  await vscode.commands.executeCommand(
    "vscode.openWith",
    uri,
    WORKSPACE_CREATION_EDITOR_ID,
  );
}

/**
 * Opens a VS Code workspace by prompting the user to select a folder.
 *
 * This function uses the `openFolder` utility to display a dialog box
 * where the user can choose a folder to open as a workspace in VS Code.
 * The dialog box filters the files to show only VS Code workspace files
 * (`.code-workspace`) and all files (`*`).
 *
 * @returns {Promise<void>} A promise that resolves when the folder is opened.
 */
export async function openVscodeWorkspace(): Promise<void> {
  await openFolder("Open Workspace", {
    "VS Code Workspace": ["code-workspace"],
    "All Files": ["*"],
  });
}

/**
 * Opens the CodeFusion Studio workspace by opening a folder dialog
 * that filters for configuration files.
 *
 * @returns {Promise<void>} A promise that resolves when the folder is opened.
 */
export async function configCfsWorkspace() {
  await openFolder("Configure", {
    "Configuration Files": [WORKSPACE_CONFIG_FILE_EXTENSION],
  });
}

export default CfsCustomEditor;
