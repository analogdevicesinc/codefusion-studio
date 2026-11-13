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
import {
  DEFAULT_TEXT_EDITOR_ID,
  WEST_EDITOR_COMMANDS,
  WEST_EDITOR_ID,
} from "./constants";

/**
 * Resolves the document a title bar command was invoked for.
 *
 * `editor/title` commands are handed the resource URI, but the command is also
 * reachable from the command palette where no argument is supplied - fall back
 * to whatever the active tab is showing.
 */
function resolveManifestUri(uri?: vscode.Uri): vscode.Uri | undefined {
  if (uri) return uri;

  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;

  if (
    input instanceof vscode.TabInputText ||
    input instanceof vscode.TabInputCustom
  ) {
    return input.uri;
  }

  return vscode.window.activeTextEditor?.document.uri;
}

function baseRegisterCommand(
  commandId: string,
  viewType: string,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    commandId,
    async (uri?: vscode.Uri): Promise<void> => {
      const target = resolveManifestUri(uri);

      if (target?.path.endsWith("/west.yml")) {
        await vscode.commands.executeCommand(
          "vscode.openWith",
          target,
          viewType,
        );
      } else {
        vscode.window.showErrorMessage("No west.yml file is currently open.");
      }
    },
  );
}

export function registerOpenWestAsTextCommand() {
  return baseRegisterCommand(
    WEST_EDITOR_COMMANDS.OPEN_AS_TEXT,
    DEFAULT_TEXT_EDITOR_ID,
  );
}

export function registerOpenWestInEditorCommand() {
  return baseRegisterCommand(
    WEST_EDITOR_COMMANDS.OPEN_IN_EDITOR,
    WEST_EDITOR_ID,
  );
}
