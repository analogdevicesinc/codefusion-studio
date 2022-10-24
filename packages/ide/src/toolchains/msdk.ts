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

import * as fs from "fs";
import * as vscode from "vscode";
import { execSync } from "node:child_process";
import { platform } from "node:process";

import {
  ADI_CONFIGURE_WORKSPACE_SETTING,
  BOARD,
  EXTENSION_ID,
  FIRMWARE_PLATFORM,
  OPENOCD,
  OPENOCD_INTERFACE,
  OPENOCD_RISCV_INTERFACE,
  OPENOCD_RISCV_TARGET,
  OPENOCD_TARGET,
  PROGRAM_FILE,
  PROJECT,
  SDK_PATH,
  TARGET,
} from "../constants";
import { getPropertyName } from "../properties";
import { Utils } from "../utils/utils";
import { default as cCppProperties } from "../vscode-maxim/c_cpp_properties.json";
import { default as launch } from "../vscode-maxim/launch.json";
import { default as oldSettings } from "../vscode-maxim/settings-old.json";
import { default as msdkTasks } from "../vscode-maxim/tasks.json";

import { WIN32 } from "./constants";
import { ToolManager } from "./toolManager";
import path from "path";

// Globals
let msdkTaskProvider: vscode.Disposable | undefined;

const MAXIM_SDK_PATH = "/SDK/MAX";

function filterSdkPath(input: string): string {
  // The root SDK path settings may not have been passed
  // through VS Code's Uri API.  As a result we have to run it
  // through a conversion here in order to get string comparisons
  // to work.  Otherwise we get a mismatch between c:/... and C:/...
  const conf = vscode.workspace.getConfiguration();
  const sdkPathValue: string = conf.get(EXTENSION_ID + "." + SDK_PATH) ?? " ";
  const sdkFsPath = vscode.Uri.file(sdkPathValue).fsPath;
  const normalizedSdkPath = Utils.normalizePath(sdkFsPath);
  const inputFsPath = vscode.Uri.file(input).fsPath;
  const normalizedInput = Utils.normalizePath(inputFsPath);

  return normalizedInput.replace(normalizedSdkPath, getPropertyName(SDK_PATH));
}

// Filter the input path string.  This performs backslash replacement (\ -> /),
// path normalization, and replaces MAXIM_PATH/SDK_PATH with ${config:} variables.
// In general, any path this is written to a VS Code config file or setting should
// be filtered with this function to ensure everything is cleanly based off of the
// MAXIM_PATH variable and SDK_PATH variables.
function filterPath(input: string): string {
  return filterSdkPath(Utils.normalizePath(input));
}

export class MSDKToolchain {
  private static instance: MSDKToolchain;

  targets: string[] = [];

  /**
   * @returns the singleton instance
   */
  public static getInstance(): MSDKToolchain {
    if (!MSDKToolchain.instance) {
      MSDKToolchain.instance = new MSDKToolchain();
    }

    return MSDKToolchain.instance;
  }

  async getMaximPath() {
    const sdkPath = await Utils.getSdkPath();
    return sdkPath + MAXIM_SDK_PATH;
  }

  async getTargets(): Promise<string[]> {
    if (this.targets.length === 0) {
      await vscode.workspace.fs
        .readDirectory(
          vscode.Uri.joinPath(
            vscode.Uri.file(await this.getMaximPath()),
            "/Examples",
          ),
        )
        .then((result) => {
          for (const dir of result) {
            this.targets.push(path.parse(dir[0]).name); // filepath will be the first entry in each result
          }
          this.targets.push("MAX32666");
          this.targets.push("MAX32667");
          this.targets.push("MAX32668");

          this.targets.sort();
        });
    }
    return this.targets;
  }

  async getEnvironment() {
    const toolManager = await ToolManager.getInstance();
    return await toolManager.getShellEnvironment();
  }

  async getSVDFilePath(target: string): Promise<string> {
    return Utils.normalizePath(
      path.join(
        "${config:cfs.sdk.path}",
        "/Libraries/CMSIS/Device/Maxim",
        target.toUpperCase(),
        "Include",
        `${target.toLowerCase()}.svd`,
      ),
    );
  }
}

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

class MsdkTaskProvider implements vscode.TaskProvider {
  provideTasks(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Task[]> {
    return this.getMsdkTasks();
  }

  resolveTask(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _task: vscode.Task,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Task> {
    // Since we're providing fully resolved tasks, we don't need to implement this.
    return undefined;
  }

  async getMsdkTasks(): Promise<vscode.Task[]> {
    const result: vscode.Task[] = [];

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return result;
    }

    for (const workspaceFolder of workspaceFolders) {
      const makefiles = await Utils.findFilesInWorkspaceFolder(
        workspaceFolder,
        "Makefile",
      );
      const projectmks = await Utils.findFilesInWorkspaceFolder(
        workspaceFolder,
        "project.mk",
      );
      // Only contribute build tasks if there's a Makefile and a project.mk
      // file in the root of the workspace folder.
      if (makefiles.length < 1 || projectmks.length < 1) {
        continue;
      }

      // Load an environment dictionary from the MSDK class.
      // This is provided to each task's ShellExecution object
      // to set its Path and environment variables correctly.
      // Loading it via the class allows the toolchain to change dynamically.
      let environment: vscode.ShellExecutionOptions["env"] = {};
      environment = await MSDKToolchain.getInstance().getEnvironment();

      const cwd = path.dirname(makefiles[0]);
      const relDirPath = path.relative(workspaceFolder.uri.fsPath, cwd);

      const shellOptions: vscode.ShellExecutionOptions = {
        cwd: cwd,
        env: environment,
        executable: Utils.getShellExecutable(platform),
        shellArgs: Utils.getShellArgs(platform),
      };

      // Iterate across the src/vscode-maxim/tasks.json file to load definitions.
      // This reduces maintenance overhead and enables easy testing of tasks.json files.
      // New tasks should be added to the json file as opposed to manually creating them inside
      // this provider.
      for (const taskDef of msdkTasks.tasks) {
        let command = taskDef.command;
        if (command === undefined) {
          switch (platform) {
            case "win32":
              command = taskDef.windows?.command;
              break;
            case "darwin":
              command = taskDef.osx?.command;
              break;
            case "linux":
              command = taskDef.linux?.command;
              break;
          }
        }
        if (command === undefined) {
          continue;
        }

        let taskName = `${taskDef.label}`;
        if (relDirPath.length > 0) {
          taskName += ` (${relDirPath})`;
        }
        const task = new vscode.Task(
          {
            type: taskDef.type,
          },
          workspaceFolder,
          taskName,
          "CFS",
          new vscode.ShellExecution(command, shellOptions),
        );

        // Remove the task ID, which isn't supported in custom shell tasks.
        delete task.definition.id;
        task.definition.command = command;
        task.definition.options = {
          cwd: cwd,
          env: environment,
          shell: {
            args: shellOptions.shellArgs,
            executable: shellOptions.executable,
          },
        };

        task.presentationOptions = {
          reveal: vscode.TaskRevealKind.Always,
          clear: false,
        };

        if (taskDef.group !== undefined && taskDef.group === "build") {
          task.group = vscode.TaskGroup.Build;
        }
        result.push(task);
      }
    }

    return result;
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

async function refresh() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const isMsdkProject = await isMsdkProjectInWorkspace();
  if (!isMsdkProject) {
    return;
  }
  if (workspaceFolders) {
    for (let i = 0; i < workspaceFolders.length; i++) {
      await migrateProject(workspaceFolders[i].uri.fsPath, true);
      await updateCppConfig(workspaceFolders[i]);
    }
  }
}

async function updateSavedFiles(workspaceFolder: vscode.WorkspaceFolder) {
  const isMsdkProject = await isMsdkProjectInWorkspace();
  if (!isMsdkProject) {
    return;
  }
  await updateCppConfig(workspaceFolder);
}

// Parse a line from the output of a "make debug" command.  This command prints
// the value of build configuration variables as VARIABLE = VALUE1 VALUE2 VALUE3 ...
function parseMakeInfo(input: string): string[] {
  const ret: string[] = [];

  const values = input.split("=")[1].split(" ");
  for (const i of values) {
    if (platform === WIN32 && path.parse(i).root === "/") {
      console.error("Invalid windows path detected:" + i);
    } else {
      if (path.isAbsolute(i)) {
        const value = i.replace(/[\n\r]/g, "");
        ret.push(filterPath(value));
      }
    }
  }

  return ret;
}

async function updateCppConfig(workspaceFolder: vscode.WorkspaceFolder) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const isMsdkProject = await isMsdkProjectInWorkspace();
  if (!isMsdkProject) {
    return;
  }

  vscode.commands.executeCommand("workbench.output.action.clearOutput");

  if (workspaceFolders) {
    // The MSDK supports the 'make debug' command, which outputs the value
    // of key build configuration variables after fully resolving a project's Makefile.
    // Here, we leverage that to dynamically retrieve search paths for the
    // intellisense engine by running the command in a child process.
    const config = vscode.workspace.getConfiguration("", workspaceFolder.uri);
    const target = config.get("cfs.project.target");
    const board = config.get("cfs.project.board");

    const toolManager = await ToolManager.getInstance();
    const output = execSync(`make debug TARGET=${target} BOARD=${board}`, {
      env: await toolManager.getShellEnvironment(),
      cwd: workspaceFolders[0].uri.fsPath,
    });

    // TODO: Error handling here

    let vpaths: string[] = [];
    let ipaths: string[] = [];
    const lines = output.toString().split("\n");
    for (const line of lines) {
      if (line.includes("VPATH")) {
        vpaths = parseMakeInfo(line);
      } else if (line.includes("IPATH")) {
        ipaths = parseMakeInfo(line);
      }
    }

    // Load default c_cpp_properties options
    const cppDefaults = JSON.parse(JSON.stringify(cCppProperties)); // <- This makes a copy of the cpp JSON object...
    // If we don't do this, writes will modify the object persistently.
    // This results in unexpected behavior when attempting to remove a value (i.e. on project.mk save).
    // Making a copy of the JSON object ensures that we are starting purely from the default options every time.

    for (const c of cppDefaults.configurations) {
      c.browse.path = Array.from(new Set(c.browse.path.concat(vpaths))); // Using the Set constructor removes duplicates
      c.includePath = Array.from(new Set(c.includePath.concat(ipaths)));
      // Note:  GCC stdlib includes are not explicitly added here.  This is because the cpptools extenions
      // will find them based off of the compilerPath option.
    }

    const outputFile = ".vscode/c_cpp_properties.json"; // I want to write to this...
    const targetUri = vscode.Uri.joinPath(
      workspaceFolder.uri,
      "/" + outputFile,
    ); // ... But fs.writeFile seems to need this absolute path to work consistently.

    try {
      const uint8 = Buffer.from(JSON.stringify(cppDefaults, null, 4));
      // ^ writeFile requires a Buffer object, so we stringify the JSON settings first.  Specifying a space of 4
      //   gets us a cleanly indented output.
      vscode.workspace.fs.writeFile(targetUri, uint8).then(
        () => {
          // TODO:  Update some sort of progress indicator for loading a project
        },
        () => {
          Utils.displayAndLogError(`Failed to update ${outputFile}!`);
        },
      );
    } catch {
      console.log(`Failed to write to ${targetUri.fsPath}!`);
    }
  }
}

function openUserGuide(): void {
  vscode.commands.executeCommand(
    "simpleBrowser.show",
    "https://analog-devices-msdk.github.io/msdk/USERGUIDE/",
  );
}

function openInstallationInstructions() {
  // A separate function is used for opening specific ug sections because passing
  // arguments on registration means we'd need to retrieve the section as input from the user
  // and/or a global variable.  TODO: Implement openUserGuide(section)

  // Additionally, the analog.com site does not open with VS Code's simple browser, which needs pure HTML/CSS
  vscode.env.openExternal(
    vscode.Uri.parse(
      "https://analog-devices-msdk.github.io/msdk/USERGUIDE/#installation",
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

/**
 * Called when the workspace has been configured as a CFS project
 */
export async function configureWorkspace() {
  msdkTaskProvider = vscode.tasks.registerTaskProvider(
    "shell",
    new MsdkTaskProvider(),
  );

  //Update c_cpp_properties and launch.json when a change is made to the Makefile system
  // or project settings
  vscode.workspace.onDidSaveTextDocument(async (doc: vscode.TextDocument) => {
    const f = path.parse(doc.uri.fsPath);
    const i = doc.uri;
    if (
      (f.ext === ".mk" && f.name === "project") ||
      f.name === "Makefile" ||
      (f.ext === ".json" && f.name === "settings")
    ) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(i);
      if (workspaceFolder) {
        await updateSavedFiles(workspaceFolder);
      }
    }
  });

  await refresh();
}

/**
 * Determines if any opened workspace folder contains an MSDK project by checking for 'Makefile' and 'project.mk'.
 * @returns Promise<boolean> True if an MSDK project is found, otherwise false.
 */
async function isMsdkProjectInWorkspace(): Promise<boolean> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return false;
  }

  // MSDK projects have a Makefile and project.mk file in their
  // top level directory
  const makefiles = await Utils.findFilesInWorkspace("Makefile", "");
  const projectmks = await Utils.findFilesInWorkspace("project.mk", "");
  if (makefiles.length < 1 || projectmks.length < 1) {
    return false;
  }
  return true;
}

export function deactivate(): void {
  if (msdkTaskProvider) {
    msdkTaskProvider.dispose();
  }
}
