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
import { ELF_EXPLORER_COMMANDS } from "./constants";
import { ELF_EDITOR_ID } from "../constants";

export function registerLoadElfFileCommand() {
  return vscode.commands.registerCommand(
    ELF_EXPLORER_COMMANDS.LOAD_ELF_FILE,
    async () => {
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: "Load",
        filters: {
          "ELF Files": [
            "axf",
            "elf",
            "o",
            "out",
            "prx",
            "puff",
            "ko",
            "mod",
            "so",
            "doj",
            "dxe",
            "exe",
          ],
        },
      });

      if (uri) {
        await vscode.commands.executeCommand(
          "vscode.openWith",
          uri[0],
          ELF_EDITOR_ID,
        );
      }
    },
  );
}
