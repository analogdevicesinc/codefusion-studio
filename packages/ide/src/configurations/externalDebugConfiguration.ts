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
    vscode.window.setStatusBarMessage(
      "CFS: Launching Ozone Debug...",
      OzoneDebugConfiguration.launchOzoneConfiguration(),
    );
  }

  /**
   * Searches for Ozone exe, .jdebug file and launches a Ozone debug session.
   * @returns Resolves after successful launch of Ozone debug
   */
  static async launchOzoneConfiguration(): Promise<void> {
    return new Promise((resolve, reject) => {
      //Get the configuration
      const conf = vscode.workspace.getConfiguration(`${EXTENSION_ID}`);
      let launchJDebugFile: vscode.Uri | undefined = undefined;

      //Get the Ozone jdebug file
      OzoneDebugConfiguration.getJdebugFileToLaunch()
        .then((launchJDebugFileLocal) => {
          launchJDebugFile = launchJDebugFileLocal;
          if (launchJDebugFileLocal === undefined) {
            vscode.window.showErrorMessage(
              "CFS: Failed to Launch Ozone Debug, *.jdebug file not found.",
            );
            return;
          }

          //Check if build folder exists
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (!workspaceFolders) {
            vscode.window.showErrorMessage(
              "CFS: Failed to Launch Ozone Debug. Workspace folders not found. Open a CFS Project.",
            );
            return;
          }
          for (const folder of workspaceFolders) {
            const folderName = folder.name;
            const buildFolderPath = vscode.Uri.joinPath(
              folder.uri,
              "build",
            ).fsPath;

            //If the build folder does not exist run a build task
            if (folderName === "m4" && !existsSync(buildFolderPath)) {
              vscode.commands.executeCommand(RUN_BUILD_TASK_COMMAND_ID);
            }
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
   * @returns Ozone debug file preferably the one present in m4 folder
   */
  static async getJdebugFileToLaunch() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let launchJDebugFile: vscode.Uri | undefined = undefined;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage(
        "CFS: Failed to Launch Ozone Debug. Workspace folders not found. Open a CFS Project.",
      );
      return;
    }

    for (const folder of workspaceFolders) {
      const debugFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, "*.jdebug"),
      );
      launchJDebugFile = debugFiles[0];

      //Break if the debug file is for m4 core
      if (launchJDebugFile.fsPath.includes("m4")) break;
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
