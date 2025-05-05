/**
 *
 * Copyright (c) 2023-2025 Analog Devices, Inc.
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
  // Default SDK paths for different platforms
  static PLATFORM_PATHS = {
    win32: ["C:/analog/cfs/*/MaintenanceTool.exe"],
    linux: [
      "/github/home/analog/cfs/*/MaintenanceTool",
      "/root/analog/cfs/*/MaintenanceTool",
      "${userHome}/analog/cfs/*/MaintenanceTool"
  ],
    darwin: ["${userHome}/analog/cfs/*/MaintenanceTool.app"],
  };


  /**
   * This function returns the default SDK paths based on the platform.
   * @param platform - The platform identifier (e.g., 'win32', 'linux', 'darwin').
   * @returns A promise that resolves to an array of default SDK paths.
   */
  static async getDefaultSdkPaths(platform: string): Promise<string[]> {
    const defaultSdkPaths: string[] = [];
    const platformPaths = SdkPath.PLATFORM_PATHS[platform as keyof typeof SdkPath.PLATFORM_PATHS];

    if (platformPaths) {
      if (Array.isArray(platformPaths)) {
        for (const p of platformPaths) {
          defaultSdkPaths.push(resolveVariables(p));
        }
      }
    }
    return defaultSdkPaths;
  }

  /**
   * This function searches for SDK paths based on the provided default paths.
   * @param defaultSdkPaths - An array of default SDK paths to search.
   * @returns A promise that resolves to an array of found SDK paths.
   */
  static async findSdkPaths(defaultSdkPaths: string[]): Promise<string[]> {
    let sdkPaths: string[] = [];
    for (const p of defaultSdkPaths) {
      const pathsFound = (await Utils.findFiles(p)).map(Utils.normalizePath);
      for (const exePath of pathsFound) {
        sdkPaths = sdkPaths.concat(path.dirname(exePath));
      }
    }
    return sdkPaths;
  }

  /**
   * This function updates the SDK path in the configuration.
   * @param sdkPaths - An array of SDK paths to search for the matching version.
   * @param version - The version string to match against the SDK paths.
   */
  static async updateSdkPath(sdkPaths: string[], version: string) {
    const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
    try {
      const matchingPath = sdkPaths.find((path) => path.endsWith(version));
      if (matchingPath) {
        await conf.update(SDK_PATH, matchingPath, true);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`${ERROR.updateSdkPathFailed}\n${error}`);
    }
  }

  /**
   * This function is the command handler for command "cfs.SDK.setSdkPath".
   */
  static async setSdkPathCommandHandler() {
    const defaultSdkPaths = await SdkPath.getDefaultSdkPaths(platform);
    const sdkPaths = await SdkPath.findSdkPaths(defaultSdkPaths);
    if (sdkPaths.length > 0) {
      const version = Utils.getExtensionVersion();
      await SdkPath.updateSdkPath(sdkPaths, version!);
    }
  }

  /**
   * This function is the command handler for command "cfs.SDK.selectSdkPath".
   */
  static async selectSdkPathCommandHandler() {
    const defaultSdkPaths = await SdkPath.getDefaultSdkPaths(platform);
    let sdkPaths = await SdkPath.findSdkPaths(defaultSdkPaths);
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
