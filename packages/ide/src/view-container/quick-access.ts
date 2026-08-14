/**
 *
 * Copyright (c) 2023-2026 Analog Devices, Inc.
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
  BROWSE_MSDK_EXAMPLES_COMMAND_ID,
  OPEN_REPORT_FILE_COMMAND_ID,
  OPEN_PACKAGE_MANAGER_COMMAND_ID,
  QUICK_ACCESS_ITEM_INVOKED_COMMAND_ID,
} from "../commands/constants";
import {
  HOME as HOMEPAGE,
  CONFIG_TOOLS,
  ELF_FILE_EXPLORER,
  CFS_WORKSPACE,
  CONFIGURE_WORKSPACE,
  OPEN_WORKSPACE,
  BROWSE_EXAMPLES,
  HELP_AND_SUPPORT,
} from "./constants";
import { ViewContainerItem } from "./view-container-item";
import { AI_TOOLS } from "../constants";

/**
 * Wraps a command so that clicking the associated Quick Access tree item is
 * reported via telemetry before the underlying command is executed.
 * @param label - The label of the tree item, used to identify it in telemetry.
 * @param commandId - The id of the command to run when the item is clicked.
 * @param commandArgs - Optional arguments to forward to the command.
 * @returns The `commandId`/`commandArgs` pair to assign to a `ViewContainerItem`.
 */
function trackedCommand(
  label: string,
  commandId: string,
  commandArgs: unknown[] = [],
): { commandId: string; commandArgs: unknown[] } {
  return {
    commandId: QUICK_ACCESS_ITEM_INVOKED_COMMAND_ID,
    commandArgs: [label, commandId, commandArgs],
  };
}

/**
 * This provider is responsible for supplying data in a tree structure to the welcome view container.
 */
export class QuickAccessProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  helpAndSupportTreeItems: vscode.TreeItem[] = [
    new ViewContainerItem({
      label: "Walkthrough",
      tooltip: "Get started with the CodeFusion Studio VS Code extension",
      ...trackedCommand("Walkthrough", OPEN_WALKTHROUGH_COMMAND_ID),
      icon: new vscode.ThemeIcon("compass"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: "Online Help",
      tooltip: "Open the CodeFusion Studio online documentation",
      ...trackedCommand("Online Help", "vscode.open", [
        vscode.Uri.parse(
          "https://developer.analog.com/docs/codefusion-studio/latest/",
        ),
      ]),
      icon: new vscode.ThemeIcon("book"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: "Engineer Zone",
      tooltip: "Open the CodeFusion Studio EngineerZone",
      ...trackedCommand("Engineer Zone", "vscode.open", [
        vscode.Uri.parse(
          "https://ez.analog.com/dsp/software-and-development-tools/codefusion-studio/",
        ),
      ]),
      icon: new vscode.ThemeIcon("comment-discussion"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: "Technical Support",
      tooltip: "Open Analog Devices technical support",
      ...trackedCommand("Technical Support", "vscode.open", [
        vscode.Uri.parse("https://www.analog.com/en/support.html"),
      ]),
      icon: new vscode.ThemeIcon("question"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
  ];

  workspaceTreeItems: vscode.TreeItem[] = [
    new ViewContainerItem({
      label: "New Workspace",
      tooltip: "Create a New Workspace",
      ...trackedCommand(
        "New Workspace",
        WORKSPACE_CREATION_COMMANDS.NEW_WORKSPACE,
      ),
      icon: new vscode.ThemeIcon("new-file"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: OPEN_WORKSPACE.label,
      tooltip: OPEN_WORKSPACE.tooltip,
      ...trackedCommand(
        OPEN_WORKSPACE.label,
        WORKSPACE_CREATION_COMMANDS.OPEN_CFS_WORKSPACE_COMMAND_ID,
      ),
      icon: new vscode.ThemeIcon("go-to-file"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: BROWSE_EXAMPLES.label,
      tooltip: BROWSE_EXAMPLES.tooltip,
      ...trackedCommand(BROWSE_EXAMPLES.label, BROWSE_MSDK_EXAMPLES_COMMAND_ID),
      icon: new vscode.ThemeIcon("go-to-file"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: CONFIGURE_WORKSPACE.label,
      tooltip: CONFIGURE_WORKSPACE.tooltip,
      ...trackedCommand(
        CONFIGURE_WORKSPACE.label,
        WORKSPACE_CREATION_COMMANDS.CONFIG_CFS_WORKSPACE_COMMAND_ID,
      ),
      icon: new vscode.ThemeIcon("gear"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: "Create Workspace from AI Model",
      tooltip: "Create a new workspace from an AI model",
      ...trackedCommand(
        "Create Workspace from AI Model",
        WORKSPACE_CREATION_COMMANDS.NEW_MODEL_WORKSPACE,
      ),
      icon: new vscode.ThemeIcon("new-file"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
  ];

  configTreeItems: vscode.TreeItem[] = [
    new ViewContainerItem({
      label: "Open Config File",
      tooltip: "Open an existing config file",
      ...trackedCommand(
        "Open Config File",
        CONFIG_TOOLS_COMMANDS.LOAD_CONFIG_FILE,
      ),
      icon: new vscode.ThemeIcon("go-to-file"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
    new ViewContainerItem({
      label: "Config Tools Guide",
      tooltip: "Help getting set up or using the pin and clock config tool",
      ...trackedCommand(
        "Config Tools Guide",
        OPEN_CONFIG_TOOLS_GETTING_STARTED_COMMAND_ID,
      ),
      icon: new vscode.ThemeIcon("question"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
  ];

  elfFileExplorerTreeItems: vscode.TreeItem[] = [
    new ViewContainerItem({
      label: "Open ELF File",
      tooltip: "Open an ELF file to examine",
      ...trackedCommand("Open ELF File", ELF_EXPLORER_COMMANDS.LOAD_ELF_FILE),
      icon: new vscode.ThemeIcon("go-to-file"),
      collapsible: vscode.TreeItemCollapsibleState.None,
    }),
  ];

  aiToolsTreeItems: vscode.TreeItem[] = [
    new ViewContainerItem({
      label: "Open Report",
      tooltip: "Open an AI Model Insight report file",
      ...trackedCommand("Open Report", OPEN_REPORT_FILE_COMMAND_ID),
      icon: new vscode.ThemeIcon("go-to-file"),
    }),
    new ViewContainerItem({
      label: "New Workspace from AI model",
      tooltip: "Create a new workspace from an AI model",
      ...trackedCommand(
        "New Workspace from AI model",
        WORKSPACE_CREATION_COMMANDS.NEW_MODEL_WORKSPACE,
      ),
      icon: new vscode.ThemeIcon("new-file"),
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
        case HELP_AND_SUPPORT:
          return Promise.resolve(this.helpAndSupportTreeItems);
        case CFS_WORKSPACE:
          return Promise.resolve(this.workspaceTreeItems);
        case CONFIG_TOOLS:
          return Promise.resolve(this.configTreeItems);
        case ELF_FILE_EXPLORER:
          return Promise.resolve(this.elfFileExplorerTreeItems);
        case AI_TOOLS:
          return Promise.resolve(this.aiToolsTreeItems);
        default:
          return Promise.resolve([]);
      }
    } else {
      return Promise.resolve([
        new ViewContainerItem({
          label: HOMEPAGE,
          tooltip: "Open the CFS Home Page",
          ...trackedCommand(HOMEPAGE, OPEN_HOME_PAGE_COMMAND_ID),
          icon: new vscode.ThemeIcon("home"),
          collapsible: vscode.TreeItemCollapsibleState.None,
        }),
        new ViewContainerItem({
          label: "Manage Packages",
          tooltip: "Open the CFS Package Manager",
          ...trackedCommand("Manage Packages", OPEN_PACKAGE_MANAGER_COMMAND_ID),
          icon: new vscode.ThemeIcon("package"),
          collapsible: vscode.TreeItemCollapsibleState.None,
        }),
        new ViewContainerItem({
          label: HELP_AND_SUPPORT,
          tooltip: "CodeFusion Studio help and support",
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
        new ViewContainerItem({
          label: AI_TOOLS,
          tooltip: "AI Tools actions",
          collapsible: vscode.TreeItemCollapsibleState.Expanded,
          contextValue: "aiTools",
        }),
      ]);
    }
  }
}
