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
import { CONFIG_FILE_EXTENSION } from "../constants";
import { MCU_EDITOR_ID } from "../constants";
import { CONFIG_TOOLS_COMMANDS } from "./constants";

export function registerLoadConfigFileCommand() {
  return vscode.commands.registerCommand(
    CONFIG_TOOLS_COMMANDS.LOAD_CONFIG_FILE,
    async () => {
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: "Load",
        filters: {
          "Configuration Files": [CONFIG_FILE_EXTENSION],
        },
      });

      if (uri) {
        await vscode.commands.executeCommand(
          "vscode.openWith",
          uri[0],
          MCU_EDITOR_ID,
        );
      }
    },
  );
}
