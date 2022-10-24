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
  GET_CONTEXT_COMMAND_ID,
  OPEN_WALKTHROUGH_COMMAND_ID,
  SELECT_CMSIS_PACK_COMMAND_ID,
  SELECT_OPENOCD_INTERFACE_COMMAND_ID,
  SELECT_OPENOCD_RISCV_INTERFACE_COMMAND_ID,
  SELECT_OPENOCD_RISCV_TARGET_COMMAND_ID,
  SELECT_OPENOCD_TARGET_COMMAND_ID,
  SELECT_PROGRAM_FILE_COMMAND_ID,
  SELECT_RISCV_PROGRAM_FILE_COMMAND_ID,
  SELECT_SVD_FILE_COMMAND_ID,
  SET_DEBUG_PATH_COMMAND_ID,
  SET_JLINK_PATH_COMMAND_ID,
  SET_JLINK_DEVICE_COMMAND_ID,
  SET_RISCV_DEBUG_PATH_COMMAND_ID,
} from "../commands/constants";
import {
  ADI_CONFIGURE_WORKSPACE_SETTING,
  CMSIS,
  DEBUG_PATH,
  EXTENSION_ID,
  JLINK_PATH,
  JLINK_DEVICE,
  OPENOCD,
  OPENOCD_INTERFACE,
  OPENOCD_RISCV_INTERFACE,
  OPENOCD_RISCV_TARGET,
  OPENOCD_TARGET,
  PACK,
  PROGRAM_FILE,
  RISCV_DEBUG_PATH,
  RISCV_PROGRAM_FILE,
  SVD_FILE,
} from "../constants";
import { INFO } from "../messages";
import {
  getAllAdiSdkProperties,
  getPropertyName,
  PropertyNode,
} from "../properties";
import {
  CORTEX_DEBUG_CONFIGURATIONS,
  CPP_DEBUG_CONFIGURATIONS,
} from "../resources/debugConfigurations";
import * as msdk from "../toolchains/msdk";
import { configureWorkspaceForZephyr } from "../toolchains/zephyr/zephyr";
import { Utils } from "../utils/utils";

import { CreateDebugConfiguration } from "./createDebugConfiguration";
import { resolveVariables } from "../utils/resolveVariables";

export enum ConfigureWorkspaceOptionEnum {
  Yes = 0,
  No,
  Never,
}

export enum ShowHomePageAtStartupOptionEnum {
  Yes,
  No,
}

/**
 * Command handler for configureWorkspace command.
 */
export async function configureWorkspaceCommandHandler() {
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

  configureWorkspace(context);
}

/**
 * Configures workspace for CodeFusion projects by adding commands and make tasks
 * @param context - The extension context
 */
export function configureWorkspace(
  context: vscode.ExtensionContext,
  silent = false,
) {
  //Adding debug configurations for Cpp
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("cppdbg", {
      provideDebugConfigurations(): vscode.ProviderResult<
        vscode.DebugConfiguration[]
      > {
        return CPP_DEBUG_CONFIGURATIONS;
      },
    }),
  );

  //Adding Debug Configuration for Cortex
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider("cortex-debug", {
      provideDebugConfigurations(): vscode.ProviderResult<
        vscode.DebugConfiguration[]
      > {
        return CORTEX_DEBUG_CONFIGURATIONS;
      },
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(SELECT_SVD_FILE_COMMAND_ID, async () => {
      await CreateDebugConfiguration.selectSvdFileForCortexDebug();
      return getPropertyName(CMSIS, SVD_FILE);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(SET_JLINK_PATH_COMMAND_ID, async () => {
      await CreateDebugConfiguration.setJlinkServerExecutablePathForCortex();
      return resolveVariables(getPropertyName(JLINK_PATH), true);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(SET_JLINK_DEVICE_COMMAND_ID, async () => {
      await CreateDebugConfiguration.setTargetForCortexJlinkDebug();
      return resolveVariables(getPropertyName(JLINK_DEVICE), true);
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

  // Adding command for Program File selection
  context.subscriptions.push(
    vscode.commands.registerCommand(
      SELECT_PROGRAM_FILE_COMMAND_ID,
      async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          for (let i = 0; i < workspaceFolders.length; i++) {
            await CreateDebugConfiguration.selectSetting(
              PROGRAM_FILE,
              workspaceFolders[i],
            );
          }
        }
        return getPropertyName(PROGRAM_FILE);
      },
    ),
  );

  // Adding command for RISCV Program File selection
  context.subscriptions.push(
    vscode.commands.registerCommand(
      SELECT_RISCV_PROGRAM_FILE_COMMAND_ID,
      async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
          for (let i = 0; i < workspaceFolders.length; i++) {
            await CreateDebugConfiguration.selectSetting(
              RISCV_PROGRAM_FILE,
              workspaceFolders[i],
            );
          }
        }
        return getPropertyName(RISCV_PROGRAM_FILE);
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

  msdk.configureWorkspace();

  configureWorkspaceForZephyr();

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
