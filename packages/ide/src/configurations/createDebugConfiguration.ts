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

import * as vscode from "vscode";

import {
  SET_JLINK_PATH_COMMAND_ID,
  SET_JLINK_DEVICE_COMMAND_ID,
  VSCODE_OPEN_SETTINGS_COMMAND_ID,
} from "../commands/constants";
import {
  CMSIS,
  DEBUG_PATH,
  EXTENSION_ID,
  JLINK_PATH,
  JLINK_DEVICE,
  OPENOCD,
  OPENOCD_INTERFACE,
  OPENOCD_PATH,
  OPENOCD_RISCV_INTERFACE,
  OPENOCD_RISCV_TARGET,
  OPENOCD_TARGET,
  PACK,
  PROGRAM_FILE,
  PROJECT,
  RISCV_DEBUG_PATH,
  RISCV_PROGRAM_FILE,
  ROOT,
  SVD_FILE,
  TARGET,
} from "../constants";
import { WARNING } from "../messages";
import {
  CORTEX_DEBUG_ARM_EMBEDDED_DEBUG_CONFIGURATION,
  CPP_RISCV_DEBUG_CONFIGURATION,
} from "../resources/debugConfigurations";
import {
  ARM_NONE_EABI_TOOLCHAIN_NAME,
  RISCV_NONE_ELF_TOOLCHAIN_NAME,
} from "../toolchains/constants";
import { getPreferredToolchain } from "../toolchains/toolchain";
import { resolveVariables } from "../utils/resolveVariables";
import { Utils } from "../utils/utils";

import { SELECT_TOOLCHAIN } from "./constants";
import { MSDKToolchain } from "../toolchains/msdk";
import path from "path";
import { SocDataType } from "../webview/common/types/soc-data";
import { SocDataObj } from "../panels/data/soc-data-obj";

const BROWSE_STRING = "Browse...";
const NONE_STRING = "None";
const SELECT_SVD_FILE = "Choose an SVD file";
const SET_JLINK_PATH = "Set Jlink path";
const SET_JLINK_DEVICE = "Set JLink device";

export class CreateDebugConfiguration {
  resolveDebugConfiguration(
    config: vscode.DebugConfiguration,
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    //Does nothing but if we need to add some required properties
    return config;
  }

  /**
   * Creates a Debug configuration using the toolchain selected
   * @param workspaceFolders - All the workspace folders in the window.
   * @returns promise which resolves to vscode.DebugConfigurations
   */
  static async createDebugConfigurationForProject(
    workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
  ): Promise<vscode.DebugConfiguration[]> {
    let debugConfigArr: vscode.ProviderResult<vscode.DebugConfiguration[]> = [];
    //Proceeding if there are folders present the workspace
    if (workspaceFolders) {
      await CreateDebugConfiguration.getDebugConfigurationUsingSelectedToolchain();
    } else {
      Utils.displayAndLogWarning("Workspace not defined.");
    }

    if (debugConfigArr === undefined || debugConfigArr.length === 0) {
      debugConfigArr =
        await CreateDebugConfiguration.getDebugConfigurationUsingSelectedToolchain();
    }
    return debugConfigArr;
  }

  /**
   * This function returns a debug configuration based on the selected toolchain.
   * If the toolchain is not selected it prompts the user to select one.
   * @returns Promise that resolves to a Debug Configuration
   */
  static async getDebugConfigurationUsingSelectedToolchain(): Promise<
    vscode.DebugConfiguration[]
  > {
    const debugConfigArr: vscode.ProviderResult<vscode.DebugConfiguration[]> =
      [];

    const selectedToolchain = await getPreferredToolchain();
    if (selectedToolchain && selectedToolchain !== "") {
      switch (selectedToolchain) {
        case ARM_NONE_EABI_TOOLCHAIN_NAME:
          debugConfigArr.push(CORTEX_DEBUG_ARM_EMBEDDED_DEBUG_CONFIGURATION);
          break;
        case RISCV_NONE_ELF_TOOLCHAIN_NAME:
          debugConfigArr.push(CPP_RISCV_DEBUG_CONFIGURATION);
          break;
      }
    } else {
      await vscode.window
        .showWarningMessage(
          WARNING.toolchainNotSelected,
          "Ok",
          SELECT_TOOLCHAIN,
        )
        .then(async (selection) => {
          if (selection === SELECT_TOOLCHAIN) {
            await getPreferredToolchain();
          }
        });
    }

    return debugConfigArr;
  }

  /**
   * Searches for svd file and adds it to the config:cfs.cmsis.svdFile
   */
  static async selectSvdFileForCortexDebug() {
    const searchDirectories: Set<string> = new Set<string>();

    // Start with an empty scope (null), which uses the current workspace
    let scopes: Array<vscode.WorkspaceFolder | null> = [null];
    if (vscode.workspace.workspaceFolders) {
      // Add any workspace folders to the scope
      scopes = scopes.concat(vscode.workspace.workspaceFolders);
    }

    for (const scope of scopes) {
      const configuration = vscode.workspace.getConfiguration(
        EXTENSION_ID,
        scope,
      );
      if (configuration) {
        const tempSvdFile = configuration.get(`${CMSIS}.${SVD_FILE}`);
        if (tempSvdFile !== null && tempSvdFile !== "") {
          // We found an SVD file, search no more.
          return;
        }

        const target = configuration.get(`${PROJECT}.${TARGET}`) as string;
        if (target === null) {
          continue;
        }

        // check the SDK/MAX directory for SVD files
        searchDirectories.add(
          Utils.normalizePath(
            `${await MSDKToolchain.getInstance().getMaximPath()}/Libraries/CMSIS/Device/Maxim/${target}/Include`,
          ),
        );
      }
    }

    const searchDirectoriesArray = Array.from(searchDirectories);
    if (searchDirectoriesArray.length == 0) {
      return;
    }

    let searchQuery =
      searchDirectoriesArray.length === 1
        ? searchDirectoriesArray[0]
        : `{${searchDirectoriesArray.join(",")}}`;

    searchQuery = `${searchQuery}/**/*.svd`;
    await Utils.findFiles(searchQuery)
      .then(async (matchedPaths: string[]) => {
        const configuration = vscode.workspace.getConfiguration(EXTENSION_ID);
        if (matchedPaths.length > 1) {
          await CreateDebugConfiguration.setSvdPathFromQuickPick(
            configuration,
            matchedPaths,
          );
        } else if (matchedPaths.length === 1) {
          await configuration.update(
            `${CMSIS}.${SVD_FILE}`,
            matchedPaths[0],
            false,
          );
        } else {
          CreateDebugConfiguration.showWarningMessageOnMissingSvdFile();
        }
      })
      .catch((err) => {
        console.error("Error while adding SVD file: " + err);
      });
  }

  /**
   * Allows users to browse and set the path for the JLink server executable used for Cortex debugging.
   */
  static async setJlinkServerExecutablePathForCortex() {
    const conf = vscode.workspace.getConfiguration(`${EXTENSION_ID}`);
    if (conf) {
      const jlinkExecutablePath = conf.get(JLINK_PATH);
      if (jlinkExecutablePath === "" || jlinkExecutablePath === null) {
        await CreateDebugConfiguration.setJlinkPathQuickPick(conf);
      }
    }
  }

  /**
   * Sets the jlink device for Cortex JLink debug configuration.
   */
  static async setTargetForCortexJlinkDebug() {
    const conf = vscode.workspace.getConfiguration(`${EXTENSION_ID}`);
    if (conf) {
      const device = conf.get(JLINK_DEVICE);
      if (device === "" || device === null) {
        await CreateDebugConfiguration.setProjectTargetFromQuickPick(conf);
      }
    }
  }

  /**
   * If there are multiple svd file options this function is called.
   * Shows a Quick pick once the option is selected form the user it sets the config:cfs.cmsis.svdFile
   * @param configuration - cfs configuration
   * @param svdFilePaths -  all the svd files available in the config:cfs.cmsis.root/config:cfs.cmsis.pack
   */
  static async setSvdPathFromQuickPick(
    configuration: vscode.WorkspaceConfiguration,
    svdFilePaths: string[],
  ): Promise<void> {
    const svdFileNames = svdFilePaths.map((filePath) =>
      path.basename(filePath),
    );
    svdFileNames.push(NONE_STRING);
    svdFileNames.push(BROWSE_STRING);
    await vscode.window
      .showQuickPick(svdFileNames, {
        canPickMany: false,
        placeHolder: "Select the SVD file.",
      })
      .then(async (result) => {
        if (result === BROWSE_STRING) {
          await CreateDebugConfiguration.browseAndSelectSvdFile(configuration);
        } else if (result) {
          // Updates workspace svd file setting with svd file path
          const selectedFilePath = svdFilePaths[svdFileNames.indexOf(result)];
          await configuration.update(
            `${CMSIS}.${SVD_FILE}`,
            selectedFilePath,
            false,
          );
        }
      });
  }

  /**
   * Function to set JLink Server Executable Path from a quick pick list.
   * @param conf - cfs.jlinkPath configuration
   */
  static async setJlinkPathQuickPick(
    conf: vscode.WorkspaceConfiguration,
  ): Promise<void> {
    const options = [BROWSE_STRING];
    const result = await vscode.window.showQuickPick(options, {
      placeHolder: "Set JLink Path",
    });
    if (result === BROWSE_STRING) {
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
      });

      if (uris && uris.length > 0) {
        const selectedPath = Utils.normalizePath(uris[0].fsPath);
        await conf.update(JLINK_PATH, selectedPath, true);
      } else {
        CreateDebugConfiguration.showErrorMessageForJlinkServerExecutablePath();
      }
    } else {
      CreateDebugConfiguration.showErrorMessageForJlinkServerExecutablePath();
    }
  }

  /**
   * Function to set the project target from a quick pick list.
   * @param conf - cfs.project.target configuration
   */
  static async setProjectTargetFromQuickPick(
    conf: vscode.WorkspaceConfiguration,
  ) {
    const socDataObj = SocDataObj.getInstance();
    const socs = socDataObj.getSocData();
    const socOptions: SocDataType.Data = socs;
    const targets = socOptions.data.soc.filter(
      (soc: { displayName: string }) => soc.displayName,
    );
    const targetOptions: vscode.QuickPickItem[] = targets.map(
      (target: { displayName: string }) => ({
        label: target.displayName,
      }),
    );
    const result = await vscode.window.showQuickPick(targetOptions, {
      placeHolder: "Select the JLink target device",
    });
    if (result) {
      if (result.label === "MAX78002") {
        await conf.update(JLINK_DEVICE, "MAX78000", false);
      } else {
        await conf.update(JLINK_DEVICE, result.label, false);
      }
    } else {
      CreateDebugConfiguration.showErrorMessageForProjectTarget();
    }
  }

  static async setCmsisPack(): Promise<void> {
    const confCMSIS = vscode.workspace.getConfiguration(
      `${EXTENSION_ID}.${CMSIS}`,
    );
    await confCMSIS.update(PACK, NONE_STRING, false);
  }

  /**
   * Allows the user to browse for svd files and select them before the launch of the debug session
   * @param configuration - cfs configuration
   */
  static async browseAndSelectSvdFile(
    configuration: vscode.WorkspaceConfiguration,
  ) {
    const options: vscode.OpenDialogOptions = {
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        "SVD File": ["svd"],
      },
    };

    await vscode.window
      .showOpenDialog(options)
      .then(async (uris: vscode.Uri[] | undefined) => {
        if (uris === undefined || uris[0] === undefined) {
          CreateDebugConfiguration.showWarningMessageOnMissingSvdFile();
          return;
        }

        const uri = uris[0];
        const svdFile = uri.fsPath;
        // Updates workspace svd file setting
        await configuration.update(`${CMSIS}.${SVD_FILE}`, svdFile, false);
      });
  }

  /**
   * Displays a warning message and gives the choice to the user to open the SVD file settings.
   */
  static showWarningMessageOnMissingSvdFile() {
    vscode.window
      .showWarningMessage(
        "CFS: SVD file not selected. Please select an SVD file to use the Cortex XPeripherals View.",
        SELECT_SVD_FILE,
      )
      .then((choice) => {
        if (choice === SELECT_SVD_FILE) {
          vscode.commands.executeCommand(
            VSCODE_OPEN_SETTINGS_COMMAND_ID,
            `${EXTENSION_ID}.${CMSIS}.${SVD_FILE}`,
          );
        }
      });
  }

  /**
   * Prompts an error message and gives the choice to the user to update the JLink server executable path.
   */
  static showErrorMessageForJlinkServerExecutablePath() {
    vscode.window
      .showErrorMessage(
        "CFS: JLink path not set. Please set the JLink path to debug with JLink.",
        SET_JLINK_PATH,
      )
      .then((choice) => {
        if (choice === SET_JLINK_PATH) {
          vscode.commands.executeCommand(SET_JLINK_PATH_COMMAND_ID);
        }
      });
  }

  /**
   * Prompts an error message and gives the user an option to update the project target.
   */
  static showErrorMessageForProjectTarget() {
    vscode.window
      .showErrorMessage(
        "CFS: JLink device not set. Please set the JLink device to debug with JLink.",
        SET_JLINK_DEVICE,
      )
      .then((choice) => {
        if (choice === SET_JLINK_DEVICE) {
          vscode.commands.executeCommand(SET_JLINK_DEVICE_COMMAND_ID);
        }
      });
  }

  /**
   * Searches for setting file/folder and allows user to select it via quickpick menu
   */
  static async selectSetting(
    settingType: string,
    currentWorkspaceFolder: vscode.WorkspaceFolder,
  ) {
    let confSetting: vscode.WorkspaceConfiguration;
    let canSelectFilesOption = true;
    let canSelectFoldersOption = false;
    let settingValue;
    let openOcdSearchQuery = "";
    let cmsisRootSearchQuery = "";
    let searchQuery = "";
    let browsePath = "";
    let placeHolderString = "";
    let isPack = false;
    let isProgramFile = false;
    let isTarget = false;
    const projectName = currentWorkspaceFolder.name;

    // Function configurations for each user prompt setting
    switch (settingType) {
      // Configuration for cmsis pack search
      case PACK:
        confSetting = vscode.workspace.getConfiguration(
          `${EXTENSION_ID}.${CMSIS}`,
          currentWorkspaceFolder.uri,
        );
        isPack = true;
        settingValue = confSetting.get(PACK);
        const cmsisRoot = confSetting.get(ROOT);
        const cmsisPack = cmsisRoot + "/AnalogDevices";
        const packResolvedPath = resolveVariables(cmsisPack);
        canSelectFilesOption = false;
        canSelectFoldersOption = true;
        browsePath = packResolvedPath;
        searchQuery = packResolvedPath + "/**/*.pdsc";
        placeHolderString = `Select CMSIS Pack for ${projectName}`;
        break;

      // Configuration for program file search
      case PROGRAM_FILE:
        confSetting = vscode.workspace.getConfiguration(
          `${EXTENSION_ID}`,
          currentWorkspaceFolder.uri,
        );
        settingValue = confSetting.get(PROGRAM_FILE);
        canSelectFilesOption = true;
        canSelectFoldersOption = false;
        isProgramFile = true;
        browsePath = currentWorkspaceFolder.uri.fsPath;
        searchQuery = "**/*.elf";
        placeHolderString = `Select ARM Program File for ${projectName}`;
        break;

      // Configuration for RISCV program file search
      case RISCV_PROGRAM_FILE:
        confSetting = vscode.workspace.getConfiguration(
          `${EXTENSION_ID}`,
          currentWorkspaceFolder.uri,
        );
        settingValue = confSetting.get(RISCV_PROGRAM_FILE);
        canSelectFilesOption = true;
        canSelectFoldersOption = false;
        isProgramFile = true;
        const desiredRiscvWorkspaceFolder =
          currentWorkspaceFolder.uri.fsPath + "/";
        browsePath = desiredRiscvWorkspaceFolder;
        searchQuery = "**/*.elf";
        placeHolderString = `Select RISCV Program File for ${projectName}`;
        break;

      // Configuration for openocd interface search
      case OPENOCD_INTERFACE:
        confSetting = vscode.workspace.getConfiguration(
          `${EXTENSION_ID}.${OPENOCD}`,
          currentWorkspaceFolder.uri,
        );
        settingValue = confSetting.get(OPENOCD_INTERFACE);
        const openocdPathInterface = confSetting.get(OPENOCD_PATH);
        const openocdScriptsInterface =
          openocdPathInterface + "/share/openocd/scripts";
        const interfaceResolvedPath = resolveVariables(openocdScriptsInterface);
        browsePath = interfaceResolvedPath + "/interface";
        searchQuery = interfaceResolvedPath + "/interface/*.cfg";
        placeHolderString = `Select ARM OpenOCD Interface for ${projectName}`;
        break;

      // Configuration for openocd target search
      case OPENOCD_TARGET:
        isTarget = true;
        confSetting = vscode.workspace.getConfiguration(
          `${EXTENSION_ID}.${OPENOCD}`,
          currentWorkspaceFolder.uri,
        );
        const confCmsisSetting = vscode.workspace.getConfiguration(
          `${EXTENSION_ID}.${CMSIS}`,
          currentWorkspaceFolder.uri,
        );
        settingValue = confSetting.get(OPENOCD_TARGET);
        const openocdPathTarget = confSetting.get(OPENOCD_PATH);
        const openocdScrptsTarget = openocdPathTarget + "/share/openocd";
        const cmsisRootTarget = confCmsisSetting.get(ROOT);
        const cmsisScriptsTarget = cmsisRootTarget + "/**/openocd";
        const openOcdTargetResolvedPath = resolveVariables(openocdScrptsTarget);
        const cmsisRootTargetResolvedPath =
          resolveVariables(cmsisScriptsTarget);
        browsePath = openOcdTargetResolvedPath + "/scripts";
        openOcdSearchQuery =
          openOcdTargetResolvedPath + "/scripts/**/{target,board}/*.cfg";
        cmsisRootSearchQuery = cmsisRootTargetResolvedPath + "/**/*.cfg";
        placeHolderString = `Select ARM OpenOCD Target for ${projectName}`;
        break;

      // Configuration for openocd interface search
      case OPENOCD_RISCV_INTERFACE:
        confSetting = vscode.workspace.getConfiguration(
          `${EXTENSION_ID}.${OPENOCD}`,
          currentWorkspaceFolder.uri,
        );
        settingValue = confSetting.get(OPENOCD_RISCV_INTERFACE);
        const openocdPathRiscvInterface = confSetting.get(OPENOCD_PATH);
        const openocdScriptsRiscvInterface =
          openocdPathRiscvInterface + "/share/openocd/scripts";
        const RiscvInterfaceResolvedPath = resolveVariables(
          openocdScriptsRiscvInterface,
        );
        browsePath = RiscvInterfaceResolvedPath + "/interface";
        searchQuery = RiscvInterfaceResolvedPath + "/interface/*.cfg";
        placeHolderString = `Select RISCV OpenOCD Interface for ${projectName}`;
        break;

      // Configuration for openocd target search
      case OPENOCD_RISCV_TARGET:
        isTarget = true;
        confSetting = vscode.workspace.getConfiguration(
          `${EXTENSION_ID}.${OPENOCD}`,
          currentWorkspaceFolder.uri,
        );
        const confCmsisRiscvSetting = vscode.workspace.getConfiguration(
          `${EXTENSION_ID}.${CMSIS}`,
          currentWorkspaceFolder.uri,
        );
        settingValue = confSetting.get(OPENOCD_RISCV_TARGET);
        const openocdPathRiscvTarget = confSetting.get(OPENOCD_PATH);
        const openocdScrptsRiscvTarget =
          openocdPathRiscvTarget + "/share/openocd";
        const cmsisRootRiscvTarget = confCmsisRiscvSetting.get(ROOT);
        const cmsisScriptsRiscvTarget = cmsisRootRiscvTarget + "/**/openocd";
        const openOcdRiscvTargetResolvedPath = resolveVariables(
          openocdScrptsRiscvTarget,
        );
        const cmsisRootRiscvTargetResolvedPath = resolveVariables(
          cmsisScriptsRiscvTarget,
        );
        browsePath = openOcdRiscvTargetResolvedPath + "/scripts";
        openOcdSearchQuery =
          openOcdRiscvTargetResolvedPath + "/scripts/**/{target,board}/*.cfg";
        cmsisRootSearchQuery = cmsisRootRiscvTargetResolvedPath + "/**/*.cfg";
        placeHolderString = `Select RISCV OpenOCD Target for ${projectName}`;
        break;

      default:
        break;
    }

    // Function operation
    if (
      settingValue === "" ||
      settingValue === null ||
      settingValue === undefined
    ) {
      let displayNames: string[] = [];
      let concatenatedPaths: string[];
      let resultPaths: string[];
      // If target setting is being updated then OpenOCD and CMSIS Pack paths are searched for .cfg files
      if (isTarget === true) {
        openOcdSearchQuery = Utils.normalizePath(openOcdSearchQuery);
        await Utils.findFiles(openOcdSearchQuery).then(
          async (openOcdMatchedPaths: string[]) => {
            cmsisRootSearchQuery = Utils.normalizePath(cmsisRootSearchQuery);
            await Utils.findFiles(cmsisRootSearchQuery).then(
              async (cmsisMatchedPaths: string[]) => {
                // Adds all .cfg file paths to single array
                concatenatedPaths = [
                  ...openOcdMatchedPaths,
                  ...cmsisMatchedPaths,
                ];
              },
            );

            // Isolates .cfg file names and parent folder names to be displayed on quick pick menu
            displayNames = concatenatedPaths.map((filePath) => {
              const fileName = path.basename(filePath);
              const parentFolder = path.basename(path.dirname(filePath));
              return `${parentFolder}/${fileName}`;
            });

            displayNames.push(BROWSE_STRING);
          },
        );
      } else if (isProgramFile) {
        try {
          const matchedUris = await vscode.workspace.findFiles(searchQuery);
          resultPaths = matchedUris.map((uri) => uri.fsPath);
          displayNames = resultPaths.map((filePath) => {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(
              vscode.Uri.file(filePath),
            );
            const availableProgramFiles = workspaceFolder
              ? path.relative(workspaceFolder.uri.fsPath, filePath)
              : filePath;
            return `${availableProgramFiles}`;
          });
          displayNames.push(BROWSE_STRING);
        } catch (error) {
          console.error("Error finding .elf files: ", error);
        }
      } else {
        // If updated setting is not OpenOCD target then only one path needs to be searched
        searchQuery = Utils.normalizePath(searchQuery);
        await Utils.findFiles(searchQuery).then(
          async (matchedPaths: string[]) => {
            resultPaths = matchedPaths;
            if (isPack === true) {
              // Isolates parent folder and grandparent folder names
              displayNames = matchedPaths.map((filePath) => {
                const parentFolder = path.basename(path.dirname(filePath));
                const grandParentFolder = path.basename(
                  path.dirname(path.dirname(filePath)),
                );
                return `${grandParentFolder}/${parentFolder}`;
              });
            } else {
              // Isolates appropriate file names and parent folder names
              displayNames = matchedPaths.map((filePath) => {
                const fileName = path.basename(filePath);
                const parentFolder = path.basename(path.dirname(filePath));
                return `${parentFolder}/${fileName}`;
              });
            }

            // If CMSIS Pack setting is being updated only the folder names are presented on quick pick menu
            displayNames.push(BROWSE_STRING);
            if (isPack === true) {
              displayNames.unshift(NONE_STRING);
            }
          },
        );
      }
      await vscode.window
        .showQuickPick(displayNames, {
          canPickMany: false,
          placeHolder: placeHolderString,
        })
        .then(async (result) => {
          if (result === BROWSE_STRING) {
            await Utils.browseAndSelect(
              confSetting,
              settingType,
              browsePath,
              canSelectFilesOption,
              canSelectFoldersOption,
            );
          } else if (result) {
            let selectedFilePath;
            if (result === NONE_STRING) {
              selectedFilePath = NONE_STRING;
            } else if (isTarget === true) {
              selectedFilePath =
                concatenatedPaths[displayNames.indexOf(result)];
            } else if (isPack === true) {
              displayNames.shift();
              const fullSelectedFilePath =
                resultPaths[displayNames.indexOf(result)];
              const newSelectedFilePath = path.dirname(fullSelectedFilePath);
              selectedFilePath = newSelectedFilePath;
            } else {
              selectedFilePath = resultPaths[displayNames.indexOf(result)];
            }
            await confSetting.update(
              settingType,
              Utils.normalizePath(selectedFilePath),
              null,
            );
          } else if (!result) {
            Utils.showErrorMessageOnMisselectionOfUserSetting(settingType);
            return;
          }
        });
    }
  }

  /**
   * Update debug path when debug path is null
   */
  static async updateDebugPath(currentWorkspaceFolder: vscode.WorkspaceFolder) {
    const configuration = vscode.workspace.getConfiguration(
      `${EXTENSION_ID}`,
      currentWorkspaceFolder,
    );
    const debugSetting = configuration.get(DEBUG_PATH);
    if (debugSetting === undefined || debugSetting === null) {
      const programPath = configuration.get(PROGRAM_FILE);
      if (programPath) {
        await configuration.update(
          DEBUG_PATH,
          Utils.normalizePath(path.join(programPath as string, "..")),
          null,
        );
      }
    }
  }

  /**
   * Update riscv debug path when riscv debug path is null
   */
  static async updateRiscvDebugPath(
    currentWorkspaceFolder: vscode.WorkspaceFolder,
  ) {
    const configuration = vscode.workspace.getConfiguration(
      `${EXTENSION_ID}`,
      currentWorkspaceFolder,
    );
    const riscvDebugSetting = configuration.get(RISCV_DEBUG_PATH);
    if (riscvDebugSetting === undefined || riscvDebugSetting === null) {
      const riscvProgramPath = configuration.get(RISCV_PROGRAM_FILE);
      if (riscvProgramPath) {
        await configuration.update(
          RISCV_DEBUG_PATH,
          Utils.normalizePath(path.join(riscvProgramPath as string, "..")),
          null,
        );
      }
    }
  }
}
