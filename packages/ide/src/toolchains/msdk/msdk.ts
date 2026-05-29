/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import * as fs from "fs";
import * as vscode from "vscode";

import {
  ADI_CONFIGURE_WORKSPACE_SETTING,
  BOARD,
  FIRMWARE_PLATFORM,
  OPENOCD,
  OPENOCD_INTERFACE,
  OPENOCD_RISCV_INTERFACE,
  OPENOCD_RISCV_TARGET,
  OPENOCD_TARGET,
  PROGRAM_FILE,
  PROJECT,
  TARGET,
} from "../../constants";
import { getPropertyName } from "../../properties";
import { Utils } from "../../utils/utils";
import { default as launch } from "./resources/launch";
import { default as oldSettings } from "./resources/settings-old";
import path from "path";

export function parseMaximPath(uri: vscode.Uri): string {
  const expected = vscode.Uri.joinPath(uri, "Tools"); // Look for Tools directory - it exists on both the Github repo and MaintenanceTool install

  if (fs.existsSync(expected.fsPath)) {
    return uri.fsPath.split("\\").join("/");
    // ^ Note:  uri.fsPath returns a lower-case drive letter (c:/) on windows.  However, we don't explicitly correct
    //          for that elsewhere so pattern matching should work consistently (i.e. in filter_maxim_path).
  } else {
    return "";
  }
}

/**
 * Recursively migrate all projects in the given folder
 * @param folder - root folder to start migrating from
 */
export async function migrateProjects(folder: string) {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Migrating projects`,
    },
    async (progress) => {
      progress.report({
        increment: 0,
        message: `Scanning ${path.basename(folder)} for projects...`,
      });
      const vscodeDirs = Utils.findFilesInDir(folder, ".vscode");
      const totalProjects = vscodeDirs.length;
      let lastReportTime: Date | null = null;
      let total = 0;
      for (let i = 0; i < vscodeDirs.length; i++) {
        const project = vscodeDirs[i];
        // vscode ignores progress reports if sent too frequently
        const reportFrequency = 100; // once every 100ms
        let wait = false;
        if (lastReportTime) {
          var currentTime = new Date();
          if (
            currentTime.getTime() - lastReportTime.getTime() <
            reportFrequency
          ) {
            wait = true;
          }
        }
        if (!wait) {
          // progress keeps track of the total behind the scenes,
          // so we need to subtract the total and only pass the difference
          const increment = (i / totalProjects) * 100.0 - total;
          total += increment;
          progress.report({
            message: `${path.basename(path.dirname(project))} (${i}/${totalProjects})`,
            increment: increment,
          });
          lastReportTime = new Date();
        }
        try {
          await migrateProject(path.dirname(project));
        } catch (error) {
          vscode.window.showErrorMessage(`Migration failed: ${error}`, "OK");
          return;
        }
      }

      progress.report({ increment: 0, message: "Migration finished" });
      vscode.window.showInformationMessage(
        `Successfully migrated ${totalProjects} project${totalProjects > 1 ? "s" : ""}.`,
        "OK",
      );
    },
  );
}

/**
 * Migrate the given project to use the new CFS settings
 * @param folder - the project folder path
 */
async function migrateProject(folder: string, prompt: boolean = false) {
  type Settings = {
    [key: string]: any;
  };

  const settingsFile = Utils.normalizePath(
    path.join(folder, ".vscode", "settings.json"),
  );

  if (!fs.existsSync(settingsFile)) return;

  const settings = JSON.parse(
    fs.readFileSync(settingsFile, "utf-8"),
  ) as Settings;

  const oldTarget = settings["target"];
  const oldBoard = settings["board"];

  const oldProject = oldTarget !== undefined || oldBoard !== undefined;

  if (oldProject) {
    if (prompt) {
      let migrate = false;
      await vscode.window
        .showInformationMessage(
          "Detected a legacy MSDK project. Would you like to migrate to CFS? (A backup will be created)",
          "Migrate",
          "Cancel",
        )
        .then((result) => {
          if (result === "Migrate") {
            migrate = true;
          }
        });
      if (!migrate) {
        return;
      }
    }

    backupSettings(folder);

    if (oldTarget !== undefined) {
      settings[getPropertyName(PROJECT, TARGET, false)] = oldTarget;
    }
    if (oldBoard !== undefined) {
      settings[getPropertyName(PROJECT, BOARD, false)] = oldBoard;
    }

    // set a default program file path
    settings[getPropertyName(PROGRAM_FILE, undefined, false)] =
      Utils.normalizePath(
        path.join(
          "${workspaceFolder}",
          "build",
          "${workspaceFolderBasename}.elf",
        ),
      );

    // configure as CFS workspace
    settings[
      getPropertyName(ADI_CONFIGURE_WORKSPACE_SETTING, undefined, false)
    ] = "Yes";

    // set firmware platform
    settings[getPropertyName(PROJECT, FIRMWARE_PLATFORM, false)] = "MSDK";

    // openocd target and interface
    settings[getPropertyName(OPENOCD, OPENOCD_TARGET, false)] =
      `target/${oldTarget.toLowerCase()}.cfg`;
    settings[getPropertyName(OPENOCD, OPENOCD_INTERFACE, false)] =
      "interface/cmsis-dap.cfg";
    settings[getPropertyName(OPENOCD, OPENOCD_RISCV_TARGET, false)] =
      `target/${oldTarget.toLowerCase()}_riscv.cfg`;
    settings[getPropertyName(OPENOCD, OPENOCD_RISCV_INTERFACE, false)] =
      "interface/ftdi/olimex-arm-usb-ocd-h.cfg";

    // remove all old settings
    for (const setting in oldSettings) {
      if (setting in settings) {
        delete settings[setting];
      }
    }

    // delete old task definitions
    fs.rmSync(path.join(folder, ".vscode", "tasks.json"), { force: true });

    // delete old launch configurations
    fs.rmSync(path.join(folder, ".vscode", "launch.json"), { force: true });
    // create new launch configurations
    fs.writeFileSync(
      path.join(folder, ".vscode", "launch.json"),
      JSON.stringify(launch, undefined, 4),
    );

    let settingsString = JSON.stringify(settings, undefined, 2);

    // replace old variable references with updated CFS variables
    settingsString = settingsString.replaceAll(
      "${config:MAXIM_PATH}",
      "${config:cfs.sdk.path}/SDK/MAX",
    );
    settingsString = settingsString.replaceAll(
      "${config:ARM_GCC_path}",
      "${config:cfs.toolchain.armAArch32GCC.path}",
    );

    // write settings to file
    fs.writeFileSync(settingsFile, settingsString);

    // update flash.gdb
    const flashDotGdb = path.join(folder, ".vscode", "flash.gdb");
    if (fs.existsSync(flashDotGdb)) {
      let contents = fs.readFileSync(flashDotGdb, { encoding: "utf-8" });
      contents = contents.replaceAll(
        "-f interface/$arg1 -f target/$arg2",
        "-f $arg1 -f $arg2",
      );

      fs.writeFileSync(flashDotGdb, contents);
    }

    // Update project.mk file
    const makefilePath = path.join(folder, "project.mk");
    if (fs.existsSync(makefilePath)) {
      // Read the project.mk
      let contents = fs.readFileSync(makefilePath, { encoding: "utf-8" });

      // Defining the flags for elf parser
      const elfParserFlags = [
        {
          name: "fdump-ipa-cgraph",
          value: "PROJ_CFLAGS += -fdump-ipa-cgraph",
          addFlag: true,
        },
        {
          name: "fstack-usage",
          value: "PROJ_CFLAGS += -fstack-usage",
          addFlag: true,
        },
        {
          name: "gdwarf-4",
          value: "PROJ_CFLAGS += -gdwarf-4",
          addFlag: true,
        },
      ];

      // Check for required PROJ_CFLAGS entries
      elfParserFlags.forEach((flag) => {
        if (contents.includes(flag.value)) {
          flag.addFlag = false;
        }
      });

      // Append missing flags to the project.mk file
      elfParserFlags.forEach((flag) => {
        if (flag.addFlag) {
          contents += `\n${flag.value}`;
        }
      });

      fs.writeFileSync(makefilePath, contents);
    }
  }
}

/**
 * Backup files from the given project folder
 * @param folder - the project folder path
 */
function backupSettings(folder: string) {
  // make a backup of the .vscode directory
  fs.cpSync(path.join(folder, ".vscode"), path.join(folder, ".vscode-backup"), {
    recursive: true,
  });
  rename(
    path.join(folder, ".vscode-backup"),
    path.join(folder, ".vscode", "backup"),
  );
}

/**
 * Rename the given file from `oldPath` to `newPath` if `oldPath` exists
 * @param oldPath - the file to rename
 * @param newPath - the new file path
 */
function rename(oldPath: string, newPath: string) {
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
  }
}

function openUserGuide(): void {
  vscode.commands.executeCommand(
    "simpleBrowser.show",
    "https://analogdevicesinc.github.io/msdk/USERGUIDE/",
  );
}

function openInstallationInstructions() {
  // A separate function is used for opening specific ug sections because passing
  // arguments on registration means we'd need to retrieve the section as input from the user
  // and/or a global variable.  TODO: Implement openUserGuide(section)

  // Additionally, the analog.com site does not open with VS Code's simple browser, which needs pure HTML/CSS
  vscode.env.openExternal(
    vscode.Uri.parse(
      "https://analogdevicesinc.github.io/msdk/USERGUIDE/#installation",
    ),
  );
}

/**
 * Activate the MSDK integration.
 * @param context - the extension context
 */
export function activate(context: vscode.ExtensionContext): void {
  // Register command handlers
  context.subscriptions.push(
    vscode.commands.registerCommand("cfs.MSDK.openuserguide", openUserGuide),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cfs.MSDK.openuserguide-installation",
      openInstallationInstructions,
    ),
  );
}
