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

import * as vscode from "vscode";

import {
  RUN_BUILD_TASK_COMMAND_ID,
  RUN_OPENOCD_FLASH_TASK_COMMAND_ID,
  RUN_CLEAN_TASK_COMMAND_ID,
  RUN_OPENOCD_ERASE_FLASH_TASK_COMMAND_ID,
  RUN_JLINK_ERASE_FLASH_TASK_COMMAND_ID,
  RUN_JLINK_FLASH_TASK_COMMAND_ID,
  VSCODE_START_DEBUG_COMMAND_ID,
} from "../commands/constants";
import {
  BEAKER,
  BUILD_ACTION,
  CLEAN_ACTION,
  DEBUG,
  DEBUG_ACTION,
  DEBUG_ALT,
  DEBUG_LAUNCH_CONTEXT,
  ERASE_ACTION,
  ERASE_JLINK_ACTION,
  ERASE_OPENOCD_ACTION,
  FLASH_ACTION,
  FLASH_JLINK_ACTION,
  FLASH_OPENOCD_ACTION,
  OZONE_DEBUG_ACTION,
  TOOLS,
  TRASH,
  ZAP,
} from "../constants";
import { Utils } from "../utils/utils";

/**
 * The ActionItem class extends the vscode.TreeItem class and is used to create action items for the viewContainer Actions panel.
 * The constructor takes in parameters for icon, label, commandId, collapsible state, and context value.
 * It sets these properties on the instance and initializes the command and iconPath properties used by the tree view.
 */

export class ActionItem extends vscode.TreeItem {
  constructor(
    icon: vscode.ThemeIcon,
    public readonly label: string,
    public readonly commandId: undefined | string,
    public readonly commandArgs: any[],
    public readonly collapsible?: vscode.TreeItemCollapsibleState,
    public readonly contextValue?: string,
  ) {
    super(label, collapsible);
    if (commandId) {
      this.command = {
        command: commandId,
        title: label,
        arguments: commandArgs,
      };
    }
    this.iconPath = icon;
    this.contextValue = contextValue;
  }
}

/**
 * The ActionTree class extends the vscode.TreeItem class and is used to create action trees for the viewContainer Actions panel.
 * The constructor takes in parameters for icon, label, and collapsible state.
 * It sets these properties on the instance and initializes the iconPath property used by the tree view.
 */
class ActionTree extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsible?: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsible);
  }
}

/**
 * This provider is responsible for supplying data in the Actions panel tree structure within the view container.
 */
export class ActionsViewProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private actionItems: vscode.TreeItem[] = [
    new ActionItem(
      new vscode.ThemeIcon(TOOLS),
      BUILD_ACTION,
      RUN_BUILD_TASK_COMMAND_ID,
      [],
      vscode.TreeItemCollapsibleState.None,
    ),
    new ActionItem(
      new vscode.ThemeIcon(BEAKER),
      CLEAN_ACTION,
      RUN_CLEAN_TASK_COMMAND_ID,
      [],
      vscode.TreeItemCollapsibleState.None,
    ),
    new ActionTree(ERASE_ACTION, vscode.TreeItemCollapsibleState.Expanded),
    new ActionTree(FLASH_ACTION, vscode.TreeItemCollapsibleState.Expanded),
    new ActionTree(DEBUG_ACTION, vscode.TreeItemCollapsibleState.Expanded),
    // new ActionItem(
    //   new vscode.ThemeIcon(DEBUG),
    //   OZONE_DEBUG_ACTION,
    //   VSCODE_START_DEBUG_COMMAND_ID,
    //   [],
    //   vscode.TreeItemCollapsibleState.None,
    // ),
  ];

  private flashItems: vscode.TreeItem[] = [
    new ActionItem(
      new vscode.ThemeIcon(ZAP),
      FLASH_OPENOCD_ACTION,
      RUN_OPENOCD_FLASH_TASK_COMMAND_ID,
      [],
      vscode.TreeItemCollapsibleState.None,
    ),
    new ActionItem(
      new vscode.ThemeIcon(ZAP),
      FLASH_JLINK_ACTION,
      RUN_JLINK_FLASH_TASK_COMMAND_ID,
      [],
      vscode.TreeItemCollapsibleState.None,
    ),
  ];

  private msdkEraseItems: vscode.TreeItem[] = [
    new ActionItem(
      new vscode.ThemeIcon(TRASH),
      ERASE_OPENOCD_ACTION,
      RUN_OPENOCD_ERASE_FLASH_TASK_COMMAND_ID,
      [],
      vscode.TreeItemCollapsibleState.None,
    ),
    new ActionItem(
      new vscode.ThemeIcon(TRASH),
      ERASE_JLINK_ACTION,
      RUN_JLINK_ERASE_FLASH_TASK_COMMAND_ID,
      [],
      vscode.TreeItemCollapsibleState.None,
    ),
  ];

  private zephyrEraseItems: vscode.TreeItem[] = [
    new ActionItem(
      new vscode.ThemeIcon(TRASH),
      ERASE_JLINK_ACTION,
      RUN_JLINK_ERASE_FLASH_TASK_COMMAND_ID,
      [],
      vscode.TreeItemCollapsibleState.None,
    ),
  ];

  refreshEvent: vscode.EventEmitter<ActionItem> =
    new vscode.EventEmitter<ActionItem>();

  onDidChangeTreeData: vscode.Event<ActionItem> = this.refreshEvent.event;

  /**
   * Gets the tree item associated with the specified element.
   * @param element - The element for which the UI representation is needed.
   * @returns - The tree item representation of the provided element.
   */
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * Retrieves the children for the element in the tree view.
   * @param element - The parent element for which child elements are being requested.
   * @returns A promise that resolves to an array of ActionItem instances representing the children.
   */
  async getChildren(element?: ActionItem) {
    if (element) {
      let workspaceFolders = vscode.workspace.workspaceFolders;
      let actions: ActionItem[] = [];
      switch (element.label) {
        case ERASE_ACTION:
          if (workspaceFolders) {
            for (const workspaceFolder of workspaceFolders) {
              const prjConf = await Utils.findFilesInWorkspaceFolder(
                workspaceFolder,
                "prj.conf",
              );
              // Verifies if the workspace folder contains a prj.conf file to determine which erase options to display
              if (prjConf.length < 1) {
                return Promise.resolve(this.msdkEraseItems);
              } else {
                return Promise.resolve(this.zephyrEraseItems);
              }
            }
          }
        case FLASH_ACTION:
          return Promise.resolve(this.flashItems);
        case DEBUG_ACTION:
          workspaceFolders?.forEach(
            (workspaceFolder: vscode.WorkspaceFolder) => {
              const configuration = vscode.workspace.getConfiguration(
                "launch",
                workspaceFolder,
              );
              const launchConfigs = configuration.get(
                "configurations",
              ) as vscode.DebugConfiguration[];
              launchConfigs.forEach(
                (launchConfig: vscode.DebugConfiguration) => {
                  actions.push(
                    new ActionItem(
                      new vscode.ThemeIcon(DEBUG_ALT),
                      launchConfig.name,
                      undefined,
                      [workspaceFolder, launchConfig.name],
                      vscode.TreeItemCollapsibleState.None,
                      DEBUG_LAUNCH_CONTEXT,
                    ),
                  );
                },
              );
            },
          );

          actions.push(
            new ActionItem(
              new vscode.ThemeIcon("add"),
              "Add configuration...",
              "debug.addConfiguration",
              [],
              vscode.TreeItemCollapsibleState.None,
            ),
          );

          return Promise.resolve(actions);
        default:
          return Promise.resolve([]);
      }
    } else {
      return Promise.resolve(this.actionItems);
    }
  }
}
