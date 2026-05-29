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
import * as fsPromises from "node:fs/promises";

import { satisfies as semverSatisfies } from "semver";

import {
  BROWSE_STRING,
  DOWNLOAD_SDK,
  EXTENSION_ID,
  SDK_PATH,
  SDK_DOWNLOAD_URL,
  SELECT_SDK_PATH,
} from "../constants";
import { ERROR, WARNING } from "../messages";
import { Utils } from "../utils/utils";

import { resolveVariables } from "../utils/resolveVariables";
import * as fg from "fast-glob";
import { SELECT_SDK_PATH_COMMAND_ID } from "./constants";

export class SdkPath {
  // Default SDK paths for different platforms
  static PLATFORM_PATHS: Record<string, string[]> = {
    win32: ["C:/analog/cfs/*/cfs.json"],
    linux: [
      "/github/home/analog/cfs/*/cfs.json",
      "/root/analog/cfs/*/cfs.json",
      "${userHome}/analog/cfs/*/cfs.json",
    ],
    darwin: ["${userHome}/analog/cfs/*/cfs.json"],
  };

  /**
   * This function searches for SDK paths based on default paths.
   * SDK paths are defined by the presence of a "cfs.json" file.
   *
   * @returns A promise that resolves to an array of found SDK paths.
   */
  static async findSdkPaths(): Promise<Map<string, string | undefined>> {
    const defaultSdkLocations = SdkPath.PLATFORM_PATHS[platform].map((x) =>
      resolveVariables(x),
    );
    let sdkPaths: Map<string, string | undefined> = new Map();
    for (const p of defaultSdkLocations) {
      const pathsFound = (await fg.async(p, { suppressErrors: true })).map(
        Utils.normalizePath,
      );
      for (const cfsJsonPath of pathsFound) {
        const sdkPath = path.dirname(cfsJsonPath);
        const sdkVersion = await this.getSdkVersion(sdkPath);
        if (sdkVersion) {
          sdkPaths = sdkPaths.set(sdkPath, sdkVersion);
        }
      }
    }
    return sdkPaths;
  }

  /**
   * This function is the command handler for command "cfs.SDK.selectSdkPath".
   *
   * It shows a quick pick menu for selecting the SDK path from a set of found SDK paths
   * as well as allowing user to browse any path in an open dialog.
   *
   * Upon path selection, vscode setting is updated
   */
  static async selectSdkPathCommandHandler() {
    const sdkPaths = await SdkPath.findSdkPaths();
    const quickPickItems: vscode.QuickPickItem[] = Array.from(
      sdkPaths,
      ([path, version]) => ({
        label: path,
        description: version,
      }),
    );

    quickPickItems.push({ label: BROWSE_STRING });

    let selectedPath = (
      await vscode.window.showQuickPick(quickPickItems, {
        canPickMany: false,
        placeHolder: "Select your CodeFusion Studio path",
      })
    )?.label;

    if (selectedPath === BROWSE_STRING) {
      // Open a folder selection dialog
      const options: vscode.OpenDialogOptions = {
        title: WARNING.sdkPathNotSelected,
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
      };

      const uris = await vscode.window.showOpenDialog(options);

      if (uris !== undefined) {
        selectedPath = uris[0].fsPath;
      }
    }

    if (selectedPath === undefined) {
      return;
    }

    try {
      const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
      await conf.update(SDK_PATH, selectedPath, true);
    } catch (error) {
      vscode.window.showErrorMessage(`${ERROR.updateSdkPathFailed}\n${error}`);
    }
  }

  static async getSdkVersion(sdkPath: string) {
    const cfsJsonPath = path.join(sdkPath, "cfs.json");
    try {
      const cfsJson = JSON.parse(
        await fsPromises.readFile(cfsJsonPath, "utf-8"),
      );
      return cfsJson.version;
    } catch (error: any) {
      return undefined;
    }
  }

  static async verifyPathSettings() {
    const sdkPath = await Utils.getSdkPath();

    // If sdk path is missing the user will be prompted to select the appropriate sdk path
    if (!sdkPath) {
      this.showSdkPathWarning(
        "The path to the CFS SDK is missing or not valid, which prevented the extension from loading correctly. Please download and install a valid CFS SDK, or set the path to the CFS SDK in the CodeFusion Studio extension settings.",
      );
      return;
    }

    // Fix backslashes in Windows paths
    if (sdkPath.includes("\\")) {
      let conf = vscode.workspace.getConfiguration(EXTENSION_ID);
      await conf.update(SDK_PATH, sdkPath.replace(/\\/g, "/"), true);
    }

    // Verify SDK version
    if (sdkPath) {
      const extensionVersion = Utils.getExtensionVersion();
      const sdkVersion = await SdkPath.getSdkVersion(sdkPath);
      if (sdkVersion === undefined) {
        this.showSdkPathWarning(
          "Error verifying the CFS SDK version. Please download and install a valid CFS SDK, or set the path to the CFS SDK in the CodeFusion Studio extension settings.",
        );
        return;
      }

      // Assuming higher minor versions of the extension require an SDK version upgrade
      // for new functionalities.
      // for example, extension 2.1 requires SDK >=2.1 and <3.0, so it can work with
      // SDKs 2.1.0, 2.1.1 or  2.3.0 but cannot work with SDK 2.0.0 nor 3.0.0.
      const compatibleVersion = extensionVersion.replace(
        /(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)?.*/,
        "$<major>.$<minor>",
      );

      if (!semverSatisfies(sdkVersion, `^${compatibleVersion}`)) {
        this.showSdkPathWarning(
          `The selected CFS SDK (v${sdkVersion}) is not compatible with the extension (v${extensionVersion}). Please download and install a compatible CFS SDK, or set the path to the CFS SDK in the CodeFusion Studio extension settings. [Learn more](https://developer.analog.com/docs/codefusion-studio/latest/user-guide/installation/set-up-cfs/)`,
        );
      }
    }
  }

  private static showSdkPathWarning(message: string) {
    vscode.window
      .showWarningMessage(message, DOWNLOAD_SDK, SELECT_SDK_PATH)
      .then((choice) => {
        switch (choice) {
          case DOWNLOAD_SDK:
            vscode.env.openExternal(vscode.Uri.parse(SDK_DOWNLOAD_URL));
            break;
          case SELECT_SDK_PATH:
            vscode.commands.executeCommand(SELECT_SDK_PATH_COMMAND_ID);
            break;
        }
      });
  }
}
