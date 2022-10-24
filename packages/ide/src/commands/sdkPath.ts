/**
 *
 * Copyright (c) 2023-2024 Analog Devices, Inc.
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

import { platform } from "node:process";
import * as path from "path";
import * as vscode from "vscode";

import { BROWSE_STRING, EXTENSION_ID, SDK_PATH } from "../constants";
import { ERROR, WARNING } from "../messages";
import { Utils } from "../utils/utils";

import { BROWSE_SDK_PATH_COMMAND_ID } from "./constants";
import { resolveVariables } from "../utils/resolveVariables";

export class SdkPath {
  /**
   * This function sets up default CFS installation paths.
   * This function is the command handler for command "cfs.SDK.selectSdkPath".
   */
  static async selectSdkPathCommandHandler() {
    const defaultSdkPaths: string[] = [];

    switch (platform) {
      case "win32":
        defaultSdkPaths.push("C:/analog/cfs/*/MaintenanceTool.exe");
        break;
      case "linux":
        defaultSdkPaths.push(
          resolveVariables("${userHome}/analog/cfs/*/MaintenanceTool"),
        );
        break;
      case "darwin":
        defaultSdkPaths.push(
          resolveVariables("${userHome}/analog/cfs/*/MaintenanceTool.app"),
        );
        break;
    }

    let sdkPaths: string[] = [];
    for (const p of defaultSdkPaths) {
      const pathsFound = (await Utils.findFiles(p)).map(Utils.normalizePath);
      for (const exePath of pathsFound) {
        sdkPaths = sdkPaths.concat(path.dirname(exePath));
      }
    }

    sdkPaths.push(BROWSE_STRING);

    await vscode.window
      .showQuickPick(sdkPaths, {
        canPickMany: false,
        placeHolder: "Select your CodeFusion Studio path",
      })
      .then(async (result) => {
        if (result === BROWSE_STRING) {
          vscode.commands.executeCommand(BROWSE_SDK_PATH_COMMAND_ID);
        } else {
          const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
          try {
            await conf.update(SDK_PATH, result, true);
          } catch (error) {
            vscode.window.showErrorMessage(
              `${ERROR.updateSdkPathFailed}\n${error}`,
            );
          }
        }
      });
  }

  static browseSdkPathCommandHandler() {
    const options: vscode.OpenDialogOptions = {
      title: WARNING.sdkPathNotSelected,
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
    };

    vscode.window
      .showOpenDialog(options)
      .then((uris: vscode.Uri[] | undefined) => {
        if (uris === undefined) {
          return;
        }

        let uri = uris[0];

        if (uri === undefined) {
          return;
        }

        const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
        try {
          conf.update(SDK_PATH, Utils.normalizePath(uri.fsPath), true);
        } catch (error) {
          vscode.window.showErrorMessage(
            `${ERROR.updateSdkPathFailed}\n${error}`,
          );
        }
      });
  }
}
