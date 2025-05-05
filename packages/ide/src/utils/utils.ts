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
import * as fs from "fs";
import { glob } from "glob";
import * as path from "path";
import * as vscode from "vscode";
import { tmpdir } from "os";

import {
  SELECT_CMSIS_PACK_COMMAND_ID,
  SELECT_OPENOCD_INTERFACE_COMMAND_ID,
  SELECT_OPENOCD_RISCV_INTERFACE_COMMAND_ID,
  SELECT_OPENOCD_RISCV_TARGET_COMMAND_ID,
  SELECT_OPENOCD_TARGET_COMMAND_ID,
  SELECT_PROGRAM_FILE_COMMAND_ID,
  SELECT_RISCV_PROGRAM_FILE_COMMAND_ID,
  SELECT_SDK_PATH_COMMAND_ID,
  SET_JLINK_PATH_COMMAND_ID,
  SET_SDK_PATH_COMMAND_ID,
} from "../commands/constants";
import {
  EXTENSION_ID,
  JLINK_PATH,
  OPENOCD_INTERFACE,
  OPENOCD_RISCV_INTERFACE,
  OPENOCD_RISCV_TARGET,
  OPENOCD_TARGET,
  PACK,
  PROGRAM_FILE,
  RISCV_PROGRAM_FILE,
  SDK_PATH,
} from "../constants";
import { ERROR } from "../messages";
import { PropertyNode } from "../properties";
import { resolveVariables } from "./resolveVariables";

import {
  DOWNLOAD_SDK,
  SDK_DOWNLOAD_URL,
  SELECT_JLINK_PATH,
  SELECT_SDK_PATH,
} from "./constants";
import { openFileAtLocation } from "./open-file-location";
import { ViewContainerItem } from "../view-container";

const SELECT_OPENOCD_TARGET = "Choose OpenOCD Target";
const SELECT_OPENOCD_INTERFACE = "Choose OpenOCD Interface";
const SELECT_OPENOCD_RISCV_TARGET = "Choose OpenOCD RISCV Target";
const SELECT_OPENOCD_RISCV_INTERFACE = "Choose OpenOCD RISCV Interface";
const SELECT_CMSIS_PACK = "Choose CMSIS Pack";
const SELECT_PROGRAM_FILE = "Choose Program File";
const SELECT_RISCV_PROGRAM_FILE = "Choose Program File";

export enum ToolchainType {
  ARM = "arm.none.elf",
  RISCV = "riscv.none.elf",
}

import { executeTask } from "../commands/commands";
export class Utils {
  /**
   * Find files within the current workspace
   * @param pattern - the pattern to search for
   * @param exclude - the files and folders to exclude
   * @returns a thenable with the search results
   */
  static findFilesInWorkspace(pattern: string, exclude?: string) {
    return new Promise<string[]>((resolve) => {
      const files: string[] = [];
      vscode.workspace
        .findFiles(pattern, exclude)
        .then((uris: vscode.Uri[]) => {
          for (const uri of uris) {
            files.push(Utils.normalizePath(uri.fsPath));
          }
          resolve(files);
        });
    });
  }

  /**
   * Find files within the given workspace
   * @param workspaceFolder - the workspace folder to search in
   * @param relativePattern - the relative pattern to search for
   * @param exclude - the files and folders to exclude
   * @returns a thenable with the search results
   */
  static findFilesInWorkspaceFolder(
    workspaceFolder: vscode.WorkspaceFolder,
    relativePattern: string,
    exclude?: string,
  ) {
    return new Promise<string[]>((resolve) => {
      const pattern = new vscode.RelativePattern(
        workspaceFolder,
        relativePattern,
      );
      const files: string[] = [];
      vscode.workspace
        .findFiles(pattern, exclude)
        .then((uris: vscode.Uri[]) => {
          for (const uri of uris) {
            files.push(Utils.normalizePath(uri.fsPath));
          }
          resolve(files);
        });
    });
  }

  /**
   * Find files on the system
   * @param pattern - the pattern to search for
   * @returns a thenable with the search results
   */
  static findFiles(pattern: string) {
    return glob(pattern);
  }

  /**
   * Recursively find all files in the given directory with the
   * given filename.
   * @param dir - The directory to start searching
   * @param filenames - The names of the files to find
   * @returns An array of file paths of each file found
   */
  static findFilesInDir(dir: string, ...filenames: string[]): string[] {
    let matchedFiles: string[] = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach((file) => {
      if (filenames.includes(file.name)) {
        matchedFiles.push([dir, file.name].join("/"));
      }
      if (file.isDirectory() && !file.name.startsWith(".")) {
        // don't search in hidden "." folders
        matchedFiles = matchedFiles.concat(
          this.findFilesInDir([dir, file.name].join("/"), ...filenames),
        );
      }
    });
    return matchedFiles;
  }

  /**
   * Determine if a file exists
   * @param file - the file to look for
   * @returns a thenable with a boolean representing if the file was found
   */
  static doesFileExist(file: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      fs.access(file, (err: NodeJS.ErrnoException | null) => {
        resolve(!err);
      });
    });
  }

  /**
   * Displays the message as a warning and logs the message as a warning
   * @param message - A string input
   */
  static displayAndLogWarning = (message: string): void => {
    vscode.window.showWarningMessage(message);
    console.warn(message);
  };

  /**
   * Displays the message as an error and logs the message as an error
   * @param message - A string input
   */
  static displayAndLogError = (message: string): void => {
    vscode.window.showErrorMessage(message);
    console.error(message);
  };

  /**
   * Displays the message and logs the message
   * @param message - A string input
   */
  static displayAndLogMessage = (message: string): void => {
    vscode.window.showInformationMessage(message);
    console.log(message);
  };
  /**
   * This function performs a backslash replacement
   * @param stringPath - Path with \\
   * @returns Path with /
   */
  static normalizePath = (stringPath: string): string => {
    return path.normalize(stringPath).split("\\").join("/");
  };

  /**
   * This function is a wrapper that replaces \\\\ with / in properties
   * @param conf - Configuration with the property
   * @param property - Name of the property
   * @returns path or array of paths
   */
  static filterPathProperty = (
    conf: vscode.WorkspaceConfiguration,
    property: string,
  ): string | string[] => {
    const pathSetting = conf.get(property);
    let returnVal: string | string[] = "";
    if (pathSetting && pathSetting !== undefined) {
      if (typeof pathSetting === "string") {
        returnVal = this.normalizePath(pathSetting);
      } else if (
        typeof pathSetting === "object" &&
        Array.isArray(pathSetting) &&
        pathSetting.length > 0 &&
        typeof pathSetting[0] === "string"
      ) {
        returnVal = [];
        for (const pathProperty of pathSetting) {
          returnVal.push(this.normalizePath(pathProperty));
        }
      }
    }

    return returnVal;
  };

  /**
   * This function that replaces \\\\ with / in properties in given configuration
   * @param conf - Configuration with the property
   * @param property - Name of the property
   */
  static updateFilteredPathProperty = (
    conf: vscode.WorkspaceConfiguration,
    propertyNode: PropertyNode,
  ) => {
    const filteredPath = Utils.filterPathProperty(
      conf,
      propertyNode.propertyName,
    );
    if (filteredPath) {
      conf.update(propertyNode.propertyName, filteredPath, propertyNode.scope);
    }
  };

  /**
   * Allows the user to browse for files and folder associated with settings and select them before the launch of the debug session
   * @param confSetting - cfs configuration
   */
  static async browseAndSelect(
    confSetting: vscode.WorkspaceConfiguration,
    settingUpdate: string,
    browsePath: string,
    canSelectFilesOption: boolean,
    canselectFoldersOption: boolean,
  ) {
    const options: vscode.OpenDialogOptions = {
      defaultUri: vscode.Uri.file(browsePath),
      title: "CFS: Please select the " + settingUpdate,
      canSelectFiles: canSelectFilesOption,
      canSelectFolders: canselectFoldersOption,
      canSelectMany: false,
      filters: {},
    };
    await vscode.window
      .showOpenDialog(options)
      .then(async (uris: vscode.Uri[] | undefined) => {
        if (uris === undefined || uris[0] === undefined) {
          return;
        }
        const uri = uris[0];
        const newSetting = uri.fsPath;
        await confSetting.update(settingUpdate, newSetting, false);
      });
  }

  /**
   * Prompts an error message and gives the choice to the user to add the missing selected setting.
   */
  static showErrorMessageOnMisselectionOfUserSetting(settingsType: string) {
    let settingsMessage = "";
    let settingsCommand: string;
    switch (settingsType) {
      case OPENOCD_TARGET:
        settingsMessage = SELECT_OPENOCD_TARGET;
        settingsCommand = SELECT_OPENOCD_TARGET_COMMAND_ID;
        break;

      case OPENOCD_INTERFACE:
        settingsMessage = SELECT_OPENOCD_INTERFACE;
        settingsCommand = SELECT_OPENOCD_INTERFACE_COMMAND_ID;
        break;

      case OPENOCD_RISCV_TARGET:
        settingsMessage = SELECT_OPENOCD_RISCV_TARGET;
        settingsCommand = SELECT_OPENOCD_RISCV_TARGET_COMMAND_ID;
        break;

      case OPENOCD_RISCV_INTERFACE:
        settingsMessage = SELECT_OPENOCD_RISCV_INTERFACE;
        settingsCommand = SELECT_OPENOCD_RISCV_INTERFACE_COMMAND_ID;
        break;

      case PACK:
        settingsMessage = SELECT_CMSIS_PACK;
        settingsCommand = SELECT_CMSIS_PACK_COMMAND_ID;
        break;

      case PROGRAM_FILE:
        settingsMessage = SELECT_PROGRAM_FILE;
        settingsCommand = SELECT_PROGRAM_FILE_COMMAND_ID;
        break;

      case RISCV_PROGRAM_FILE:
        settingsMessage = SELECT_RISCV_PROGRAM_FILE;
        settingsCommand = SELECT_RISCV_PROGRAM_FILE_COMMAND_ID;
        break;

      default:
        break;
    }
    vscode.window
      .showErrorMessage(
        "CFS: " +
          settingsType +
          " not selected. Please select a " +
          settingsType +
          ".",
        settingsMessage,
      )
      .then((choice) => {
        if (choice === settingsMessage) {
          vscode.commands.executeCommand(settingsCommand);
        }
      });
  }

  static async getSdkPath(): Promise<string | undefined> {
    let conf = vscode.workspace.getConfiguration(EXTENSION_ID);
    let sdkPath: string | undefined = conf.get(SDK_PATH);

    if (!sdkPath) {
      // If sdk path is missing the user will be prompted to select the appropriate sdk path
      await vscode.commands.executeCommand(SET_SDK_PATH_COMMAND_ID);
      conf = vscode.workspace.getConfiguration(EXTENSION_ID);
      sdkPath = conf.get(SDK_PATH);
    }

    if (!sdkPath) {
      await vscode.window
        .showWarningMessage(
          "The path to the CFS SDK is missing or not valid and this prevented the extension from loading correctly. Please download and install the CFS SDK, or set the path to the CFS SDK through the CodeFusion Studio extension settings.",
          DOWNLOAD_SDK,
          SELECT_SDK_PATH,
        )
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

    return sdkPath;
  }

  static async getJlinkExecutablePath(): Promise<string | undefined> {
    let conf = vscode.workspace.getConfiguration(EXTENSION_ID);
    let jlinkPath: string | undefined = conf.get(JLINK_PATH);

    if (!jlinkPath) {
      // If jlink executable path is missing the user will be prompted to select the appropriate jlink executable path
      await vscode.commands.executeCommand(SET_JLINK_PATH_COMMAND_ID);
      conf = vscode.workspace.getConfiguration(EXTENSION_ID);
      jlinkPath = conf.get(JLINK_PATH);
    }

    if (!jlinkPath) {
      vscode.window
        .showErrorMessage(ERROR.jlinkExecutablePathMissing, SELECT_JLINK_PATH)
        .then((choice) => {
          if (choice === SELECT_JLINK_PATH) {
            vscode.commands.executeCommand(SET_JLINK_PATH_COMMAND_ID);
          }
        });
    }

    return jlinkPath;
  }

  /**
   * Get the appropriate shell executable for the given platform
   * @param platform - the node:process platform
   * @returns The shell executable, e.g. "bash", or undefined for unsupported platforms
   */
  static getShellExecutable(platform: string): string | undefined {
    switch (platform) {
      case "win32":
        return "${env:windir}\\System32\\cmd.exe";
      case "darwin":
        return "zsh";
      case "linux":
        return "bash";
    }

    return undefined;
  }

  /**
   * Get the appropriate shell arguments for the given platform
   * @param platform - the node:process platform
   * @returns The shell arguments, e.g. ["-c"] or ["/c"]
   */
  static getShellArgs(platform: string): string[] {
    switch (platform) {
      case "win32":
        return ["/c"];
      case "darwin":
        return ["-c"];
      case "linux":
        return ["-c"];
    }

    return [];
  }

  /**
   * Executes the tasks, indicates an error if the task is not defined.
   * @param _taskType - string to identify task type
   * @param taskName - string to identify task name
   */
  static async executeTask(_taskType: string, taskName: string) {
    const tasks = (await vscode.tasks.fetchTasks()).filter((task) => {
      return task.group === vscode.TaskGroup.Build && task.source === "CFS";
    });
    const selectedTask = tasks.find((task) => task.name === taskName);
    if (selectedTask) {
      return vscode.tasks.executeTask(selectedTask);
    } else {
      console.error(`Error: Task '${taskName}' not found`);
    }
  }

  static getDefaultLocation() {
    const userHome = resolveVariables("${userHome}");
    const version = this.getExtensionVersion();

    const defaultLocation = Utils.normalizePath(
      `${userHome}/cfs${version !== undefined ? `/${version}` : ""}`,
    );

    return defaultLocation;
  }

  static getExtensionVersion(): string | undefined {
    const extension = vscode.extensions.getExtension("analogdevices.cfs-ide");

    if (!extension) {
      return undefined;
    }

    return extension.packageJSON.version.split("-")[0];
  }

  static async runDefaultBuildTasks() {
    const allTasks = await vscode.tasks.fetchTasks();
    const defaultBuildTasks = allTasks.filter(
      (task) => task.group?.isDefault === true,
    );
    for (const task of defaultBuildTasks) {
      await vscode.tasks.executeTask(task);
      await new Promise<void>((resolve) => {
        const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
          if (e.execution.task === task) {
            disposable.dispose();
            resolve();
          }
        });
      });
    }
  }

  /**
   * Adds a task to the tasks.json file in the .vscode directory of the workspace.
   * If the tasks.json file does not exist, it creates one with the appropriate structure.
   * The task is added based on the provided action item.
   *
   * @param actionItem - The action item containing the task details to be added.
   * @returns A promise that resolves when the task has been added to the tasks.json file.
   */
  static async addTaskToTasksJson(actionItem: ViewContainerItem) {
    if (!vscode.workspace.workspaceFolders) return;
    let taskFolder = vscode.workspace.workspaceFolders[0];
    for (const folder of vscode.workspace.workspaceFolders) {
      if (actionItem.label.includes(folder.name)) {
        taskFolder = folder;
        break;
      }
    }
    const filePath = `${taskFolder.uri.fsPath}/.vscode/tasks.json`;
    const taskLabelMatch = /(CFS: )?([\w \&]+) (\(\w+\))( \((\w+)\))?/.exec(
      actionItem.label,
    );

    if (!taskLabelMatch) return;

    if (taskLabelMatch[1]?.includes("CFS")) {
      openFileAtLocation(
        filePath,
        `CFS: ${taskLabelMatch[2]}${taskLabelMatch[4] ? " " + taskLabelMatch[3] : ""}`,
      );
      return;
    }

    this.ensureTasksJsonExists(filePath);

    const task = this.createTaskDefinition(actionItem.commandArgs[0]);
    const taskJson = await this.getTaskJson(filePath);

    taskJson.tasks.push(task);
    await this.updateTasksJson(filePath, taskJson);

    setTimeout(() => openFileAtLocation(filePath, task.label), 200);
  }

  /**
   * Ensures that the tasks.json file exists at the specified file path.
   * If the file does not exist, it creates a new tasks.json file with the appropriate structure.
   *
   * @param filePath - The path to the tasks.json file.
   */
  static ensureTasksJsonExists(filePath: string) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        JSON.stringify({ version: "2.0.0", tasks: [] }),
        { encoding: "utf-8" },
      );
    }
  }

  /**
   * Creates a task definition object based on the provided command arguments.
   *
   * @param cmdArgs - The command arguments containing the task definition and execution
   * @returns A task definition object.
   **/
  static createTaskDefinition(cmdArgs: any): vscode.TaskDefinition {
    const execution = cmdArgs.execution as vscode.ShellExecution;
    return {
      type: cmdArgs.definition.type,
      command: execution.commandLine,
      options: {
        cwd: execution.options?.cwd,
        env: execution.options?.env,
        shell: {
          args: execution.options?.shellArgs,
          executable: execution.options?.executable,
        },
      },
      group: cmdArgs.group.id,
      label: `CFS: ${cmdArgs.name}`,
    };
  }

  /**
   * Reads a JSON file from the given file path and parses its content.
   * If the file cannot be read or parsed, returns a default JSON object.
   *
   * @param filePath - The path to the JSON file.
   * @returns A promise that resolves to the parsed JSON object, or a default object if an error occurs.
   */
  static async getTaskJson(filePath: string) {
    try {
      const doc = await vscode.workspace.openTextDocument(filePath);
      return JSON.parse(doc.getText());
    } catch {
      return { version: "2.0.0", tasks: [] };
    }
  }

  /**
   * Updates the JSON content of a file at the given file path with the provided task JSON object.
   * Opens the file, replaces its content with the new JSON, and saves the file.
   *
   * @param filePath - The path to the JSON file to be updated.
   * @param taskJson - The new JSON object to write to the file.
   */
  static async updateTasksJson(filePath: string, taskJson: any) {
    const doc = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(doc, 1, false);
    await editor.edit((e) =>
      e.replace(
        new vscode.Range(0, 0, doc.lineCount, 0),
        JSON.stringify(taskJson, null, 2),
      ),
    );
    await doc.save();
  }

  public static async directoryExists(path: fs.PathLike): Promise<boolean> {
    try {
      fs.accessSync(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   *
   * @param fn - Function to retry calling
   * @param finalError - Error message
   * @param retries - Number of retries
   * @param delay - Amount of delay in ms
   * @returns - Promise with T type result
   */
  static async retryWithDelay<T>(
    fn: () => Promise<T>,
    retries: number = 10,
    delay: number = 200,
  ): Promise<T> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const attempt = () => {
        fn()
          .then((results: T) => {
            resolve(results);
          })
          .catch(() => {
            attempts += 1;
            if (attempts >= retries) {
              // Reached maximum number of attempts.
              console.log("Max retries reached.");
              reject();
            } else {
              const newDelay = delay * Math.pow(2, attempts);
              console.log(
                `Attempt ${attempts} failed. Retrying in ${newDelay}ms.`,
              );
              setTimeout(attempt, newDelay);
            }
          });
      };

      attempt();
    });
  }

  /**
   * Returns context from tasks.json file path
   * @param filePath
   * @returns {string} context
   */
  static getContextFromFullPath = (filePath: string): string => {
    const loc = filePath.split("/");
    let context = "";

    for (const c of loc) {
      if (c === ".vscode") {
        break;
      }
      context = c;
    }

    return context;
  };

  /**
   * Returns .cfsworkspace URI path in os temporary folder
   * @returns {string} .cfsworkspace URI path
   */
  static getTempCfsWorkspacePath(): vscode.Uri {
    const tmpDir = tmpdir().replace(/\\/g, "/");
    const defaultLocation = `${tmpDir}/cfs`;
    const filePath = `${defaultLocation}/.cfsworkspace`;
    const dotCfsWorkspace = vscode.Uri.file(filePath);

    return dotCfsWorkspace;
  }

  /**
   * Executes a task from the Status Bar based on the context and task name.
   * @param context - The context in which to execute the task.
   * @param taskName - The name of the task to execute.
   */
  static async executeStatusBarTask(taskName: string, context: any) {
    const workspaceFolders = vscode.workspace.workspaceFolders || [];

    if (context === "Workspace") {
      const targetFolderName = this.getTargetFolderName([...workspaceFolders]);

      if (!targetFolderName) {
        vscode.window.showWarningMessage(
          `Please select a project context in the CFS Context view. Available projects: ${this.getFolderNames([...workspaceFolders]).join(", ")}`,
        );
        return;
      }

      await this.executeTaskForFolder(taskName, targetFolderName, "CFS");
    } else {
      await this.executeTaskForFolder(taskName, context.name, "CFS");
    }
  }

  /**
   * Retrieves the target folder name, ignoring `.cfs` folders.
   * @param workspaceFolders - List of workspace folders.
   * @returns The name of the target folder or null if no valid folder is found.
   */
  private static getTargetFolderName(
    workspaceFolders: vscode.WorkspaceFolder[],
  ): string | null {
    const folderNames = this.getFolderNames(workspaceFolders);

    if (folderNames.length < 1) {
      vscode.window.showWarningMessage(`Please add projects to workspace.`);
      return null;
    }

    if (folderNames.length === 1) {
      return folderNames[0];
    }

    if (folderNames.length === 2 && folderNames.includes(".cfs")) {
      return folderNames.find((folder) => folder !== ".cfs") || null;
    }

    return null;
  }

  /**
   * Extracts folder names from the workspace folders, excluding `.cfs`.
   * @param workspaceFolders - List of workspace folders.
   * @returns An array of folder names.
   */
  private static getFolderNames(
    workspaceFolders: vscode.WorkspaceFolder[],
  ): string[] {
    return workspaceFolders
      .filter((folder) => folder.name !== ".cfs")
      .map((folder) => folder.name);
  }

  /**
   * Executes a task for a specific folder and source.
   * @param taskName - The name of the task to execute.
   * @param folderName - The name of the folder to execute the task in.
   * @param source - The source of the task (e.g., "CFS").
   */
  private static async executeTaskForFolder(
    taskName: string,
    folderName: string,
    source: string,
  ) {
    const filteredTasks = (await vscode.tasks.fetchTasks()).filter(
      (task) =>
        task.name === taskName &&
        task.source === source &&
        (task.scope as vscode.WorkspaceFolder)?.name === folderName,
    );

    if (filteredTasks.length > 0) {
      await vscode.tasks.executeTask(filteredTasks[0]);
    } else {
      vscode.window.showErrorMessage(
        `Task '${taskName}' not found in project '${folderName}'.`,
      );
    }
  }
}
