/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
  EXTENSION_ID,
  JLINK_PATH,
  OZONE_EXE,
  WORKSPACE_CONTEXT,
} from "../constants";
import { existsSync } from "node:fs";
import { Utils } from "../utils/utils";
import { LAUNCH_DEBUG_WITH_OZONE_COMMAND_ID } from "../commands/constants";
import { exec } from "node:child_process";
import { getTelemetryManager } from "../telemetry/telemetry";
import { TELEMETRY_ACTIONS } from "../telemetry/action-names";

/**
 * Provides/sets up CFS for launching Ozone Debug session
 */
export class OzoneDebugConfiguration {
  /**
   * Command handler that launches an Ozone debug session for a single core.
   * @param coreUri The stringified URI of the core's workspace folder, passed by
   * the per-core action. URI is used rather than the folder name because
   * multiple workspace folders can share a display name. When omitted, the
   * active context is used instead.
   * @returns Resolves once the launch has been initiated
   */
  static async launchOzoneCommandHandler(coreUri?: string) {
    /**
     * Command handler to launch the Ozone debug session
     */
    await OzoneDebugConfiguration.setOzoneInstallationDirectory(coreUri);
    let workspaceFolder: vscode.WorkspaceFolder | undefined;
    if (coreUri) {
      // Per-core action passes a stable folder URI; resolve it unambiguously.
      workspaceFolder = vscode.workspace.workspaceFolders?.find(
        (folder) => folder.uri.toString() === coreUri,
      );
    } else {
      const config = vscode.workspace.getConfiguration(EXTENSION_ID);
      const context = config.get(ACTIVE_CONTEXT) as string;
      if (context === WORKSPACE_CONTEXT) {
        // Launch from the first project that has an Ozone-supported core (.jdebug),
        // so that action discovery and command execution use the same criterion.
        for (const folder of vscode.workspace.workspaceFolders ?? []) {
          if (await OzoneDebugConfiguration.getJdebugFileToLaunch(folder)) {
            workspaceFolder = folder;
            break;
          }
        }
      } else {
        workspaceFolder = vscode.workspace.workspaceFolders?.find(
          (folder) => folder.name === context,
        );
      }
    }
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

          let ozoneExe = conf.get(OZONE_EXE) as string;

          if (platform === "darwin" && ozoneExe.endsWith(".app")) {
            // In macOS, .app "files" are actually directories. To execute the binary,
            // we need to point to the executable inside the .app bundle.
            // We could check Info.plist or run it with "open" command but for the moment
            // let's assume that the structure of Ozone installation on macOS is consistent.
            ozoneExe += "/Contents/MacOS/Ozone";
          }

          ozoneExe = `"${ozoneExe.replace(/\\/g, "/")}"`;

          getTelemetryManager().then((telemetryManager) => {
            telemetryManager.logAction(TELEMETRY_ACTIONS.OZONE_LAUNCHED, {});
          });

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
   * Searches for an Ozone debug file in the selected project folder.
   *
   * A `.jdebug` file is only generated for Ozone-capable projects (Arm Cortex-M
   * and RISC-V cores), so its presence in the project folder is the criterion
   * for offering Ozone debugging. Cores that do not support Ozone (SHARC-FX
   * DSP) do not produce a `.jdebug` file and therefore return `undefined`.
   * @param selectedFolder The workspace folder representing the selected project context
   * @returns The Ozone debug file for the project, or `undefined` when none exists
   */
  static async getJdebugFileToLaunch(selectedFolder?: vscode.WorkspaceFolder) {
    if (!selectedFolder) {
      vscode.window.showErrorMessage(
        "CFS: Failed to Launch Ozone Debug. No project folder selected.",
      );
      return;
    }

    const debugFiles = await vscode.workspace.findFiles(
      new vscode.RelativePattern(selectedFolder, "*.jdebug"),
    );

    return debugFiles[0];
  }

  /**
   * Checks to see if Ozone installation path is set
   * @param coreUri The core folder URI to preserve through the installation
   * prompt, so a retry after an invalid selection relaunches for the same core.
   */
  static async setOzoneInstallationDirectory(coreUri?: string) {
    const conf = vscode.workspace.getConfiguration(`${EXTENSION_ID}`);
    if (conf) {
      const ozoneExe = conf.get(OZONE_EXE);
      if (ozoneExe === "" || ozoneExe === null) {
        await OzoneDebugConfiguration.setOzoneInstallPathQuickPick(
          conf,
          coreUri,
        );
      }
    }
  }

  /**
   * Sets the Ozone executable path
   * @param conf : VSCode Configuration
   * @param coreUri The core folder URI to preserve when prompting to retry after
   * an invalid installation selection.
   */
  static async setOzoneInstallPathQuickPick(
    conf: vscode.WorkspaceConfiguration,
    coreUri?: string,
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
      } else if (platform === "darwin") {
        possibleOzonePath += ".app";
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
        OzoneDebugConfiguration.showErrorMessageOnInvalidOzoneInstallSelection(
          coreUri,
        );
      }
    } else {
      try {
        await conf.update(OZONE_EXE, result, true);
      } catch (_) {
        vscode.window.showErrorMessage(
          `CFS: Error while setting Ozone installation directory.`,
        );
      }
    }
  }

  /**
   * Prompts an error message and gives the user an option to update Ozone installation.
   * @param coreUri The core folder URI to relaunch for when the user retries, so
   * the originally selected core is preserved instead of falling back to the active context.
   */
  static showErrorMessageOnInvalidOzoneInstallSelection(coreUri?: string) {
    vscode.window
      .showErrorMessage(
        "CFS: Ozone installation not set. Please select valid Ozone installation.",
        "Set Ozone Installation Directory",
      )
      .then((choice) => {
        if (choice === "Set Ozone Installation Directory") {
          vscode.commands.executeCommand(
            LAUNCH_DEBUG_WITH_OZONE_COMMAND_ID,
            coreUri,
          );
        }
      });
  }
}
