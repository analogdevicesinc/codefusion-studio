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
  BROWSE_MAXIM_EXAMPLES_COMMAND_ID,
  ELF_EXPLORER_COMMANDS,
  NEW_PROJECT_COMMAND_ID,
  OPEN_HOME_PAGE_COMMAND_ID,
  OPEN_CONFIG_TOOLS_GETTING_STARTED_COMMAND_ID,
  OPEN_PROJECT_COMMAND_ID,
  OPEN_WALKTHROUGH_COMMAND_ID,
  CONFIG_TOOLS_COMMANDS,
} from "../commands/constants";
import {
  EXAMPLES,
  HOME as HOMEPAGE,
  CONFIG_TOOLS,
  PROJECTS,
  ELF_FILE_EXPLORER,
} from "../constants";

class ViewContainerItemLink extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly tooltip: string,
    public readonly commandId?: string,
    public readonly iconPath?: string | vscode.ThemeIcon,
    public readonly collapsible: vscode.TreeItemCollapsibleState = vscode
      .TreeItemCollapsibleState.None,
    public readonly contextValue?: string,
  ) {
    super(label, collapsible);
    if (commandId) {
      this.command = {
        command: commandId,
        title: label,
        arguments: [],
      };
    }
    this.iconPath = iconPath;
    this.tooltip = tooltip;
    this.contextValue = contextValue;
  }
}

/**
 * This provider is responsible for supplying data in a tree structure to the welcome view container.
 */
export class QuickAccessProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  homePageItems: vscode.TreeItem[] = [
    new ViewContainerItemLink(
      "Open Home Page",
      "Open the CFS Home Page",
      OPEN_HOME_PAGE_COMMAND_ID,
      new vscode.ThemeIcon("home"),
    ),
    new ViewContainerItemLink(
      "Walkthrough",
      "Get started with the CodeFusion Studio VS Code extension",
      OPEN_WALKTHROUGH_COMMAND_ID,
      new vscode.ThemeIcon("compass"),
    ),
  ];

  projectTreeItems: vscode.TreeItem[] = [
    new ViewContainerItemLink(
      "New Project",
      "Create a new project",
      NEW_PROJECT_COMMAND_ID,
      new vscode.ThemeIcon("file-add"),
    ),
    new ViewContainerItemLink(
      "Open Project",
      "Open an existing project",
      OPEN_PROJECT_COMMAND_ID,
      new vscode.ThemeIcon("go-to-file"),
    ),
    new ViewContainerItemLink(
      EXAMPLES,
      "Browse existing examples",
      BROWSE_MAXIM_EXAMPLES_COMMAND_ID,
      new vscode.ThemeIcon("file-code"),
    ),
  ];

  configTreeItems: vscode.TreeItem[] = [
    new ViewContainerItemLink(
      "Open Config File",
      "Open an existing config file",
      CONFIG_TOOLS_COMMANDS.LOAD_CONFIG_FILE,
      new vscode.ThemeIcon("go-to-file"),
    ),
    new ViewContainerItemLink(
      "Config Tools Guide",
      "Help getting set up or using the pin and clock config tool",
      OPEN_CONFIG_TOOLS_GETTING_STARTED_COMMAND_ID,
      new vscode.ThemeIcon("question"),
    ),
  ];

  elfFileExplorerTreeItems: vscode.TreeItem[] = [
    new ViewContainerItemLink(
      "Open ELF File",
      "Open an ELF file to examine",
      ELF_EXPLORER_COMMANDS.LOAD_ELF_FILE,
      new vscode.ThemeIcon("go-to-file"),
    ),
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
        case PROJECTS:
          return Promise.resolve(this.projectTreeItems);
        case CONFIG_TOOLS:
          return Promise.resolve(this.configTreeItems);
        case ELF_FILE_EXPLORER:
          return Promise.resolve(this.elfFileExplorerTreeItems);
        default:
          return Promise.resolve([]);
      }
    } else {
      return Promise.resolve([
        new ViewContainerItemLink(
          HOMEPAGE,
          "Get started with CFS",
          undefined,
          undefined,
          vscode.TreeItemCollapsibleState.Expanded,
        ),
        new ViewContainerItemLink(
          PROJECTS,
          "Project actions",
          undefined,
          undefined,
          vscode.TreeItemCollapsibleState.Expanded,
          "projectActions",
        ),
        new ViewContainerItemLink(
          CONFIG_TOOLS,
          "Config tool actions",
          undefined,
          undefined,
          vscode.TreeItemCollapsibleState.Expanded,
          "configTools",
        ),
        new ViewContainerItemLink(
          ELF_FILE_EXPLORER,
          "ELF file explorer actions",
          undefined,
          undefined,
          vscode.TreeItemCollapsibleState.Expanded,
          "elfExplorer",
        ),
      ]);
    }
  }
}
