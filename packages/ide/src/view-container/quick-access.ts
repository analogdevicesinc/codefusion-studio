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
  ELF_EXPLORER_COMMANDS,
  OPEN_HOME_PAGE_COMMAND_ID,
  OPEN_CONFIG_TOOLS_GETTING_STARTED_COMMAND_ID,
  OPEN_WALKTHROUGH_COMMAND_ID,
  CONFIG_TOOLS_COMMANDS,
  WORKSPACE_CREATION_COMMANDS,
} from "../commands/constants";
import {
  HOME as HOMEPAGE,
  CONFIG_TOOLS,
  PROJECTS,
  ELF_FILE_EXPLORER,
  CFS_WORKSPACE,
  CONFIGURE_WORKSPACE,
  OPEN_WORKSPACE,
} from "./constants";
import { ViewContainerItem } from "./view-container-item";

/**
 * This provider is responsible for supplying data in a tree structure to the welcome view container.
 */
export class QuickAccessProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  homePageItems: vscode.TreeItem[] = [
    new ViewContainerItem({
      label: "Open Home Page",
      tooltip: "Open the CFS Home Page",
      commandId: OPEN_HOME_PAGE_COMMAND_ID,
      icon: new vscode.ThemeIcon("home"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: "Walkthrough",
      tooltip: "Get started with the CodeFusion Studio VS Code extension",
      commandId: OPEN_WALKTHROUGH_COMMAND_ID,
      icon: new vscode.ThemeIcon("compass"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
  ];

  workspaceTreeItems: vscode.TreeItem[] = [
    new ViewContainerItem({
      label: "New Workspace",
      tooltip: "Create a New Workspace",
      commandId: WORKSPACE_CREATION_COMMANDS.NEW_WORKSPACE,
      icon: new vscode.ThemeIcon("new-file"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: OPEN_WORKSPACE.label,
      tooltip: OPEN_WORKSPACE.tooltip,
      commandId: WORKSPACE_CREATION_COMMANDS.OPEN_CFS_WORKSPACE_COMMAND_ID,
      icon: new vscode.ThemeIcon("go-to-file"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: CONFIGURE_WORKSPACE.label,
      tooltip: CONFIGURE_WORKSPACE.tooltip,
      commandId: WORKSPACE_CREATION_COMMANDS.CONFIG_CFS_WORKSPACE_COMMAND_ID,
      icon: new vscode.ThemeIcon("gear"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
  ];

  configTreeItems: vscode.TreeItem[] = [
    new ViewContainerItem({
      label: "Open Config File",
      tooltip: "Open an existing config file",
      commandId: CONFIG_TOOLS_COMMANDS.LOAD_CONFIG_FILE,
      icon: new vscode.ThemeIcon("go-to-file"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: "Config Tools Guide",
      tooltip: "Help getting set up or using the pin and clock config tool",
      commandId: OPEN_CONFIG_TOOLS_GETTING_STARTED_COMMAND_ID,
      icon: new vscode.ThemeIcon("question"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
  ];

  elfFileExplorerTreeItems: vscode.TreeItem[] = [
    new ViewContainerItem({
      label: "Open ELF File",
      tooltip: "Open an ELF file to examine",
      commandId: ELF_EXPLORER_COMMANDS.LOAD_ELF_FILE,
      icon: new vscode.ThemeIcon("go-to-file"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
  ];

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
   * @returns A promise that resolves to an array of viewContainerItem instances representing the children.
   */
  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    if (element) {
      switch (element.label) {
        case HOMEPAGE:
          return Promise.resolve(this.homePageItems);
        case CFS_WORKSPACE:
          return Promise.resolve(this.workspaceTreeItems);
        case CONFIG_TOOLS:
          return Promise.resolve(this.configTreeItems);
        case ELF_FILE_EXPLORER:
          return Promise.resolve(this.elfFileExplorerTreeItems);
        default:
          return Promise.resolve([]);
      }
    } else {
      return Promise.resolve([
        new ViewContainerItem({
          label: HOMEPAGE,
          tooltip: "Get started with CFS",
          collapsible: vscode.TreeItemCollapsibleState.Expanded,
        }),
        new ViewContainerItem({
          label: CFS_WORKSPACE,
          tooltip: "Workspace actions",
          collapsible: vscode.TreeItemCollapsibleState.Expanded,
          contextValue: "workspaceActions",
        }),
        new ViewContainerItem({
          label: CONFIG_TOOLS,
          tooltip: "Config tool actions",
          collapsible: vscode.TreeItemCollapsibleState.Expanded,
          contextValue: "configTools",
        }),
        new ViewContainerItem({
          label: ELF_FILE_EXPLORER,
          tooltip: "ELF file explorer actions",
          collapsible: vscode.TreeItemCollapsibleState.Expanded,
          contextValue: "elfExplorer",
        }),
      ]);
    }
  }
}
