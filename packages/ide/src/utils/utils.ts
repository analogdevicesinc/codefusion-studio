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
import { glob } from "glob";
import * as path from "path";
import * as vscode from "vscode";
import * as xml2js from "xml2js";

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

import { SELECT_JLINK_PATH, SELECT_SDK_PATH } from "./constants";

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

export class Utils {
  /**
   * This function pushes all elements of source array into destination while avoiding duplicate entries.
   * @param destination - the array you want to add entries.
   * @param source - the array which is the source of the entries.
   */
  static pushElementsInArray(destination: unknown[], source: unknown[]) {
    for (const obj of source) {
      if (!destination.includes(obj)) {
        destination.push(obj);
      }
    }
  }

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
   * @param xmlstr - XML in string format
   * @returns json object of the type 'object'
   */
  static parseXMLToJson(xmlstr: string): object {
    let jsonObject: object = {};
    xml2js.parseString(xmlstr, (_err, results) => {
      jsonObject = results;
    });
    return jsonObject;
  }

  /**
   * @param searchQuery - the file name
   * @param exclude - the folders you want to exclude
   * @returns - Array of files with full path.
   */
  static getCprojectFiles = async (exclude?: string) => {
    const cprojectFiles = await Utils.findFilesInWorkspace(
      "**/.cproject",
      exclude,
    );
    return cprojectFiles;
  };

  /**
   * Takes .cproject file in json format as input and returns the project type as string
   * @param jsonData - .cproject file in JSON format
   * @returns the toolchain used.
   */
  static getProjectTypeFromCprojectJsonData = (jsonData: object): string => {
    //Using try catch access to json in try catch because of uncertainity of json file
    try {
      const cproject = jsonData["cproject" as keyof object];
      const storageModuleArr: object[] =
        cproject["storageModule" as keyof object];
      for (const storageModule of storageModuleArr) {
        const cconfigurationArr: object[] =
          storageModule["cconfiguration" as keyof object];
        for (const cconfiguration of cconfigurationArr) {
          const configId = cconfiguration["$" as keyof object];
          const toolchainId: string = configId["id" as keyof object];
          if (toolchainId.includes("toolchain")) {
            if (toolchainId.includes(ToolchainType.ARM)) {
              return ToolchainType.ARM;
            } else if (toolchainId.match(ToolchainType.RISCV)) {
              return ToolchainType.RISCV;
            }
          }
        }
      }
      return "Not Found";
    } catch (error: unknown) {
      if (typeof error === "string") {
        error = error.toUpperCase(); // works, `e` narrowed to string
      } else if (error instanceof Error) {
        error = error.message; // works, `e` narrowed to Error
      }
      console.error(error);
      return "Error encountered while traversing the .cproject file.";
    }
  };

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
      await vscode.commands.executeCommand(SELECT_SDK_PATH_COMMAND_ID);
      conf = vscode.workspace.getConfiguration(EXTENSION_ID);
      sdkPath = conf.get(SDK_PATH);
    }

    if (!sdkPath) {
      vscode.window
        .showErrorMessage(ERROR.sdkPathMissing, SELECT_SDK_PATH)
        .then((choice) => {
          if (choice === SELECT_SDK_PATH) {
            vscode.commands.executeCommand(SELECT_SDK_PATH_COMMAND_ID);
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
}
