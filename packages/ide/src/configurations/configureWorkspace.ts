/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
  GET_CONTEXT_COMMAND_ID,
  OPEN_WALKTHROUGH_COMMAND_ID,
  SELECT_CMSIS_PACK_COMMAND_ID,
  SELECT_OPENOCD_INTERFACE_COMMAND_ID,
  SELECT_OPENOCD_RISCV_INTERFACE_COMMAND_ID,
  SELECT_OPENOCD_RISCV_TARGET_COMMAND_ID,
  SELECT_OPENOCD_TARGET_COMMAND_ID,
  SELECT_SVD_FILE_COMMAND_ID,
  SET_DEBUG_PATH_COMMAND_ID,
  SET_JLINK_PATH_COMMAND_ID,
  SET_RISCV_DEBUG_PATH_COMMAND_ID,
} from "../commands/constants";
import {
  ADI_CONFIGURE_WORKSPACE_SETTING,
  CMSIS,
  DEBUG_PATH,
  EXTENSION_ID,
  JLINK_PATH,
  OPENOCD,
  OPENOCD_INTERFACE,
  OPENOCD_RISCV_INTERFACE,
  OPENOCD_RISCV_TARGET,
  OPENOCD_TARGET,
  PACK,
  PROJECT,
  RISCV_DEBUG_PATH,
  SVD_FILE,
  TOOLCHAIN_ID,
  ZEPHYR_WORKSPACE,
} from "../constants";
import { INFO } from "../messages";
import {
  getAllAdiSdkProperties,
  getPropertyName,
  PropertyNode,
} from "../properties";
import { Utils } from "../utils/utils";
import { resolveVariables } from "../utils/resolveVariables";

import { CreateDebugConfiguration } from "./createDebugConfiguration";
import { CfsToolManager } from "cfs-lib";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "node:path";

export enum ConfigureWorkspaceOptionEnum {
  Yes = 0,
  No,
  Never,
}

export enum YesNoEnum {
  Yes,
  No,
}

/**
 * Command handler for configureWorkspace command.
 */
export async function configureWorkspaceCommandHandler(
  toolManager: CfsToolManager,
) {
  const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
  // Skip configuration if we are already configured as a CFS project
  if (
    conf.get(ADI_CONFIGURE_WORKSPACE_SETTING) ===
    ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.Yes]
  ) {
    Utils.displayAndLogMessage(INFO.workspaceAlreadyConfigured);
    return undefined;
  }
  vscode.commands.executeCommand(OPEN_WALKTHROUGH_COMMAND_ID);

  conf.update(
    ADI_CONFIGURE_WORKSPACE_SETTING,
    ConfigureWorkspaceOptionEnum[ConfigureWorkspaceOptionEnum.Yes],
    false,
  );
  const context: vscode.ExtensionContext = await vscode.commands.executeCommand(
    GET_CONTEXT_COMMAND_ID,
  );

  configureWorkspace(context, toolManager);
}

/**
 * Configures workspace for CodeFusion projects by adding commands and make tasks
 * @param context - The extension context
 */
export function configureWorkspace(
  context: vscode.ExtensionContext,
  toolManager: CfsToolManager,
  silent = false,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(SELECT_SVD_FILE_COMMAND_ID, async () => {
      await CreateDebugConfiguration.selectSvdFileForCortexDebug(toolManager);
      return getPropertyName(CMSIS, SVD_FILE);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(SET_JLINK_PATH_COMMAND_ID, async () => {
      await CreateDebugConfiguration.setJlinkServerExecutablePathForCortex();
      return resolveVariables(getPropertyName(JLINK_PATH), true);
    }),
  );

  // Adding command for OpenOCD Target selection
  context.subscriptions.push(
    vscode.commands.registerCommand(
      SELECT_OPENOCD_TARGET_COMMAND_ID,
      async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          for (let i = 0; i < workspaceFolders.length; i++) {
            await CreateDebugConfiguration.selectSetting(
              OPENOCD_TARGET,
              workspaceFolders[i],
            );
          }
        }
        return getPropertyName(OPENOCD, OPENOCD_TARGET);
      },
    ),
  );

  // Adding command for OpenOCD Interface selection
  context.subscriptions.push(
    vscode.commands.registerCommand(
      SELECT_OPENOCD_INTERFACE_COMMAND_ID,
      async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          for (let i = 0; i < workspaceFolders.length; i++) {
            await CreateDebugConfiguration.selectSetting(
              OPENOCD_INTERFACE,
              workspaceFolders[i],
            );
          }
        }
        return getPropertyName(OPENOCD, OPENOCD_INTERFACE);
      },
    ),
  );

  // Adding command for CMSIS Pack selection
  context.subscriptions.push(
    vscode.commands.registerCommand(SELECT_CMSIS_PACK_COMMAND_ID, async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders) {
        for (let i = 0; i < workspaceFolders.length; i++) {
          await CreateDebugConfiguration.selectSetting(
            PACK,
            workspaceFolders[i],
          );
        }
      }
      return getPropertyName(CMSIS, PACK);
    }),
  );

  // Adding command for OpenOCD RISCV Target selection
  context.subscriptions.push(
    vscode.commands.registerCommand(
      SELECT_OPENOCD_RISCV_TARGET_COMMAND_ID,
      async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          for (let i = 0; i < workspaceFolders.length; i++) {
            await CreateDebugConfiguration.selectSetting(
              OPENOCD_RISCV_TARGET,
              workspaceFolders[i],
            );
          }
        }
        return getPropertyName(OPENOCD, OPENOCD_RISCV_TARGET);
      },
    ),
  );

  // Adding command for OpenOCD RISCV Interface selection
  context.subscriptions.push(
    vscode.commands.registerCommand(
      SELECT_OPENOCD_RISCV_INTERFACE_COMMAND_ID,
      async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          for (let i = 0; i < workspaceFolders.length; i++) {
            await CreateDebugConfiguration.selectSetting(
              OPENOCD_RISCV_INTERFACE,
              workspaceFolders[i],
            );
          }
        }
        return getPropertyName(OPENOCD, OPENOCD_RISCV_INTERFACE);
      },
    ),
  );

  // Adding command for debug path selection
  context.subscriptions.push(
    vscode.commands.registerCommand(SET_DEBUG_PATH_COMMAND_ID, async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders) {
        for (let i = 0; i < workspaceFolders.length; i++) {
          await CreateDebugConfiguration.updateDebugPath(workspaceFolders[i]);
        }
      }
      return getPropertyName(DEBUG_PATH);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      SET_RISCV_DEBUG_PATH_COMMAND_ID,
      async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          for (let i = 0; i < workspaceFolders.length; i++) {
            await CreateDebugConfiguration.updateRiscvDebugPath(
              workspaceFolders[i],
            );
          }
        }
        return getPropertyName(RISCV_DEBUG_PATH);
      },
    ),
  );

  if (!silent) {
    Utils.displayAndLogMessage(INFO.workspaceConfigured);
  }

  //Calling function when there is a configuration change.
  vscode.workspace.onDidChangeConfiguration((event) => {
    updatePropertyPath(event);
  });
}

/**
 * This function replaces the property path configured with \\\\
 * with / in properties in given configuration.
 * @param event - Event emitted on configuration change
 */
export const updatePropertyPath = (event: vscode.ConfigurationChangeEvent) => {
  const conf = vscode.workspace.getConfiguration(EXTENSION_ID);

  const properties: Array<PropertyNode> = getAllAdiSdkProperties();

  for (const propertyNode of properties) {
    const property = EXTENSION_ID + "." + propertyNode.propertyName;
    if (propertyNode.isPath && event.affectsConfiguration(property)) {
      Utils.updateFilteredPathProperty(conf, propertyNode);
    }
  }
};

/**
 * Updates the paths in c_cpp_properties.json to reflect the toolchain path
 * provided by the Tool Manager.
 */
export const updateCppProperties = async (toolManager: CfsToolManager) => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const workspaceFolder of workspaceFolders) {
      const config = vscode.workspace.getConfiguration(
        EXTENSION_ID,
        workspaceFolder,
      );

      const configureWorkspace =
        config.get<string>(ADI_CONFIGURE_WORKSPACE_SETTING) === "Yes";

      if (!configureWorkspace) {
        continue;
      }

      const cppProperties = path.join(
        workspaceFolder.uri.fsPath,
        ".vscode",
        "c_cpp_properties.json",
      );

      if (!existsSync(cppProperties)) {
        continue;
      }

      const cppPropertiesUri = vscode.Uri.file(cppProperties);

      await vscode.workspace.fs
        .readFile(cppPropertiesUri)
        .then(async (data) => {
          const jsonContents = JSON.parse(data.toString());

          if (!jsonContents["env"]) {
            return;
          }

          let updated = false;

          // Resolve cfs.project.toolchain.path
          if ("cfs.project.toolchain.path" in jsonContents["env"]) {
            const toolchainPath = await getProjectToolchainPath(
              toolManager,
              workspaceFolder,
            );
            if (toolchainPath) {
              jsonContents["env"]["cfs.project.toolchain.path"] = toolchainPath;
              updated = true;
            }
          }

          // Resolve cfs.zephyr.workspace.path
          if ("cfs.zephyr.workspace.path" in jsonContents["env"]) {
            const zephyrWorkspacePath = await getZephyrWorkspacePath(
              toolManager,
              workspaceFolder,
            );

            if (zephyrWorkspacePath) {
              jsonContents["env"]["cfs.zephyr.workspace.path"] =
                zephyrWorkspacePath;
              updated = true;
            }
          }

          // Resolve cfs.msdk.path
          if ("cfs.msdk.path" in jsonContents["env"]) {
            const msdkPath = await toolManager.getToolPath("msdk");

            if (msdkPath) {
              jsonContents["env"]["cfs.msdk.path"] = msdkPath;
              updated = true;
            }
          }

          if (updated) {
            const updatedData = JSON.stringify(jsonContents, null, 2);

            await vscode.workspace.fs.writeFile(
              cppPropertiesUri,
              Buffer.from(updatedData, "utf8"),
            );
          }
        });
    }
  }
};

async function getProjectToolchainPath(
  toolManager: CfsToolManager,
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration(
    EXTENSION_ID,
    workspaceFolder,
  );
  const toolchainId = config.get<string>(`${PROJECT}.${TOOLCHAIN_ID}`);

  if (!toolchainId) {
    console.warn(
      "Property cfs.project.toolchain.id not defined in project's settings file.",
    );

    return undefined;
  }

  return await toolManager.getToolPath(toolchainId);
}

async function getZephyrWorkspacePath(
  toolManager: CfsToolManager,
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration(
    EXTENSION_ID,
    workspaceFolder,
  );
  const userDefinedZephyrWorkspace = config.get<string>(ZEPHYR_WORKSPACE);

  if (userDefinedZephyrWorkspace) {
    return userDefinedZephyrWorkspace;
  }

  const zephyrPath = await toolManager.getToolPath("zephyr");
  return zephyrPath ? `${zephyrPath}/zephyr` : undefined;
}
