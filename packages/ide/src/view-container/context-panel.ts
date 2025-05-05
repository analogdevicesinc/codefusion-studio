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
import {
  EventEmitter,
  ProviderResult,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  workspace,
} from "vscode";
import { ViewContainerItem } from "./view-container-item";
import { CHANGE_CONTEXT } from "../commands/constants";
import { ACTIVE_CONTEXT, EXTENSION_ID, WORKSPACE_CONTEXT } from "../constants";
import { ContextBase } from "./context-base";

export class ContextPanelProvider
  extends ContextBase
  implements TreeDataProvider<TreeItem>
{
  refreshEvent = new EventEmitter<ViewContainerItem | null>();
  onDidChangeTreeData = this.refreshEvent.event;

  onContextChanged(): void {
    this.refreshEvent.fire(null);
  }

  static async setActiveContext(context: string) {
    const config = workspace.getConfiguration(EXTENSION_ID);
    await config.update(ACTIVE_CONTEXT, context);
  }

  getTreeItem(
    element: ViewContainerItem,
  ): ViewContainerItem | Thenable<ViewContainerItem> {
    return element;
  }

  getChildren(
    element?: ViewContainerItem | undefined,
  ): ProviderResult<ViewContainerItem[]> {
    const { workspaceFolders } = workspace;
    if (typeof workspaceFolders === "undefined") {
      return [
        new ViewContainerItem({
          label: "Please open a CFS Workspace or create a new CFS project.",
          collapsible: TreeItemCollapsibleState.None,
        }),
      ];
    }
    if (!element) {
      const folders = [
        WORKSPACE_CONTEXT,
        ...workspaceFolders
          .map((wf) => wf.name)
          .filter((name) => name !== ".cfs"),
      ];

      return folders.map((context) => {
        return new ViewContainerItem({
          label: context,
          collapsible: TreeItemCollapsibleState.None,
          ...(this.isActiveContext(context) && {
            icon: new ThemeIcon("check"),
          }),
          commandId: CHANGE_CONTEXT,
          commandArgs: [context],
        });
      });
    }
    return [];
  }

  isActiveContext(folder: string) {
    return (
      folder === this.activeContext ||
      (folder === WORKSPACE_CONTEXT && this.activeContext === "")
    );
  }
}
