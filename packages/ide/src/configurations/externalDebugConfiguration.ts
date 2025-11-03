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

// This file has configuration code for external debug configuration

import * as vscode from "vscode";
import { platform } from "node:process";
import {
  ACTIVE_CONTEXT,
  BROWSE_STRING,
  BUILD,
  EXTENSION_ID,
  JLINK_PATH,
  OZONE_EXE,
} from "../constants";
import { existsSync } from "node:fs";
import { Utils } from "../utils/utils";
import {
  LAUNCH_DEBUG_WITH_OZONE_COMMAND_ID,
  RUN_BUILD_TASK_COMMAND_ID,
} from "../commands/constants";
import { exec } from "node:child_process";

/**
 * Provides/sets up CFS for launching Ozone Debug session
 */
export class OzoneDebugConfiguration {
  /**
   *
   * @returns
   */
  static async launchOzoneCommandHandler() {
    /**
     * Command handler to launch the Ozone debug session
     */
    await OzoneDebugConfiguration.setOzoneInstallationDirectory();
    const config = vscode.workspace.getConfiguration(EXTENSION_ID);
    const context = config.get(ACTIVE_CONTEXT) as string;
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(
      (folder) => folder.name === context,
    );
    vscode.window.setStatusBarMessage(
      "CFS: Launching Ozone Debug...",
      OzoneDebugConfiguration.launchOzoneConfiguration(workspaceFolder),
    );
  }

  /**
   * Searches for Ozone exe, .jdebug file and launches a Ozone debug session.
   * @returns Resolves after successful launch of Ozone debug
   */
  static async launchOzoneConfiguration(
    selectedFolder?: vscode.WorkspaceFolder,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      //Get the configuration
      const conf = vscode.workspace.getConfiguration(`${EXTENSION_ID}`);
      let launchJDebugFile: vscode.Uri | undefined = undefined;

      //Get the Ozone jdebug file
      OzoneDebugConfiguration.getJdebugFileToLaunch(selectedFolder)
        .then((launchJDebugFileLocal) => {
          if (!selectedFolder) {
            vscode.window.showErrorMessage(
              "CFS: Failed to Launch Ozone Debug. No project folder selected.",
            );
            return;
          }

          launchJDebugFile = launchJDebugFileLocal;
          if (launchJDebugFileLocal === undefined) {
            vscode.window.showErrorMessage(
              "CFS: Failed to Launch Ozone Debug, *.jdebug file not found.",
            );
            return;
          }

          const buildFolderPath = vscode.Uri.joinPath(
            selectedFolder.uri,
            "build",
          ).fsPath;

          //If the build folder does not exist run a build task
          if (!existsSync(buildFolderPath)) {
            vscode.window.showErrorMessage(
              "CFS: Please build project before running Ozone Debug",
            );
            return;
          }
        })
        .then(() => {
          //Launch the executable
          if (launchJDebugFile === undefined) {
            return;
          }
          const ozoneExe = `"${(conf.get(OZONE_EXE) as string).replace(/\\/g, "/")}"`;
          const launchJDebugFilePath = `"${launchJDebugFile.fsPath.replace(/\\/g, "/")}"`;
          exec(
            `${ozoneExe} ${launchJDebugFilePath}`,
            (error, stdout, stderr) => {
              if (error) {
                console.error(`Error: ${error.message}`);
                return;
              }
              if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
              }
              console.log(`stdout: ${stdout}`);
            },
          );
          resolve();
        })
        .catch((err) => {
          console.error(err);
          reject(err);
        });
    });
  }

  /**
   * Searches for Ozone debug file and returns them
   * @param selectedFolder The workspace folder representing the selected project context
   * @returns Ozone debug file preferably the one present in m4 folder
   */
  static async getJdebugFileToLaunch(selectedFolder?: vscode.WorkspaceFolder) {
    let launchJDebugFile: vscode.Uri | undefined = undefined;
    if (!selectedFolder) {
      vscode.window.showErrorMessage(
        "CFS: Failed to Launch Ozone Debug. No project folder selected.",
      );
      return;
    }

    // Search for .jdebug files, prefer one with 'cm4', 'cm33', or 'cm55' in its path (case-insensitive)
    const debugFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(selectedFolder, "*.jdebug"),
    );

    if (debugFiles.length === 0) return undefined;

    const preferredNames = ["CM4", "CM33", "CM55"];
    const preferredDebugFile = debugFiles.find((f) =>
      preferredNames.some((name) => f.fsPath.toLowerCase().includes(name)),
    );
    if (preferredDebugFile) {
      launchJDebugFile = preferredDebugFile;
    } else {
      launchJDebugFile = debugFiles[0];
    }
    return launchJDebugFile;
  }

  /**
   * Checks to see if Ozone installation path is set
   */
  static async setOzoneInstallationDirectory() {
    const conf = vscode.workspace.getConfiguration(`${EXTENSION_ID}`);
    if (conf) {
      const ozoneExe = conf.get(OZONE_EXE);
      if (ozoneExe === "" || ozoneExe === null) {
        await OzoneDebugConfiguration.setOzoneInstallPathQuickPick(conf);
      }
    }
  }

  /**
   * Sets the Ozone executable path
   * @param conf : VSCode Configuration
   */
  static async setOzoneInstallPathQuickPick(
    conf: vscode.WorkspaceConfiguration,
  ): Promise<void> {
    const options: string[] = [];

    const jLinkPathConf = conf.get(JLINK_PATH);

    //Trying to get a possible ozone path from JLink Path
    if (jLinkPathConf) {
      const jLinkPath = (jLinkPathConf as string).replace(/\\/g, "/");
      let possibleOzonePath =
        jLinkPath.substring(0, jLinkPath.lastIndexOf("/")) + "/Ozone/Ozone";

      if (platform === "win32") {
        possibleOzonePath += ".exe";
      }

      if (existsSync(possibleOzonePath)) {
        options.push(possibleOzonePath);
      }
    }
    options.push(BROWSE_STRING);
    const result = await vscode.window.showQuickPick(options, {
      placeHolder: "Set Ozone Executable",
    });

    if (result === BROWSE_STRING) {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
      });

      if (uris && uris.length > 0) {
        const selectedPath = Utils.normalizePath(uris[0].fsPath);
        await conf.update(OZONE_EXE, selectedPath, true);
      } else {
        OzoneDebugConfiguration.showErrorMessageOnInvalidOzoneInstallSelection();
      }
    } else {
      try {
        await conf.update(OZONE_EXE, result, true);
      } catch (error) {
        vscode.window.showErrorMessage(
          `CFS: Error while setting Ozone installation directory.`,
        );
      }
    }
  }

  /**
   * Prompts an error message and gives the user an option to update Ozone installation.
   */
  static showErrorMessageOnInvalidOzoneInstallSelection() {
    vscode.window
      .showErrorMessage(
        "CFS: Ozone installation not set. Please select valid Ozone installation.",
        "Set Ozone Installation Directory",
      )
      .then((choice) => {
        if (choice === "Set Ozone Installation Directory") {
          vscode.commands.executeCommand(LAUNCH_DEBUG_WITH_OZONE_COMMAND_ID);
        }
      });
  }
}
