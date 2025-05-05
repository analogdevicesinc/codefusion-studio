/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";

/**
 * The ViewContainerItem class extends the vscode.TreeItem class and is used to create items for the viewContainer Actions panel.
 * The constructor takes in parameters for icon, label, commandId, collapsible state, and context value.
 * It sets these properties on the instance and initializes the command and iconPath properties used by the tree view.
 */
export class ViewContainerItem extends TreeItem {
  public readonly commandId: string | undefined;
  public readonly label: string;
  public readonly commandArgs: Array<any>;

  constructor(data: {
    label: string;
    tooltip?: string;
    commandId?: string;
    commandArgs?: Array<any>;
    icon?: ThemeIcon;
    collapsible: TreeItemCollapsibleState;
    contextValue?: string;
    description?: string;
    id?: string;
  }) {
    super(data.label, data.collapsible);
    if (data.commandId) {
      this.command = {
        command: data.commandId,
        title: data.label,
        arguments: data.commandArgs,
      };
    }
    this.description = data.description;
    this.label = data.label;
    this.iconPath = data.icon;
    this.commandId = data.commandId;
    this.commandArgs = data.commandArgs ?? [];
    this.tooltip = data.tooltip;
    this.contextValue = data.contextValue;
    this.id = data.id;
  }
}
