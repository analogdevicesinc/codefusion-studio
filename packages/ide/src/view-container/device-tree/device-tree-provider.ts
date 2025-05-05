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

import { TreeDataProvider, workspace, EventEmitter } from "vscode";

import { DtsTree } from "./dts-tree";
import { ViewContainerItem } from "../view-container-item";
import { ZephyrTree } from "./zephyr-tree";
import { ContextBase } from "../context-base";

export class DeviceTreeProvider
  extends ContextBase
  implements TreeDataProvider<ViewContainerItem>
{
  private approvedExtensions = [".dts", ".dtsi", ".overlay"];
  private dtsTrees = new Map<string, DtsTree>();
  private zephyrTrees = new Map<string, DtsTree>();

  refreshEvent: EventEmitter<null> = new EventEmitter();
  onDidChangeTreeData = this.refreshEvent.event;

  constructor() {
    super();
    workspace.onDidOpenTextDocument((e) => {
      const path = e.uri.fsPath.replace(/\\/g, "/");
      const fileExt = getFileExtension(e.uri.fsPath);
      if (
        this.approvedExtensions.includes(fileExt) &&
        !this.zephyrTrees.has(path) &&
        !this.dtsTrees.has(path)
      ) {
        this.dtsTrees.set(
          path,
          new DtsTree({
            filePath: path,
            refresh: this.refreshEvent,
            rootLabel: getFilenameFromFsPath(path),
          }),
        );
        this.refreshEvent.fire(null);
      }
    });

    workspace.onDidCloseTextDocument((e) => {
      const path = e.uri.fsPath.replace(/\\/g, "/");
      if (this.dtsTrees.has(path)) {
        this.dtsTrees.delete(path);
        this.refreshEvent.fire(null);
      }
    });

    workspace.workspaceFolders?.forEach((folder) => {
      const buildFolder = `${this.getBasePath()}/${folder.name}/build`;
      const filePath = `${buildFolder}/zephyr/zephyr.dts`;
      this.zephyrTrees.set(
        filePath,
        new ZephyrTree({
          filePath,
          refresh: this.refreshEvent,
          buildFolder,
          context: folder.name,
        }),
      );
    });
  }

  onContextChanged(): void {
    this.zephyrTrees.forEach((tree) => {
      if (tree.id === `build-${this.activeContext}`) {
        tree.show();
      } else {
        tree.hide();
      }
    });

    this.refreshEvent.fire(null);
  }

  getTreeItem(element: ViewContainerItem): ViewContainerItem {
    return element;
  }

  async getChildren(
    element?: ViewContainerItem | undefined,
  ): Promise<ViewContainerItem[]> {
    const trees = Array.from(this.zephyrTrees.values()).concat(
      Array.from(this.dtsTrees.values()),
    );
    if (!element) {
      const results = await Promise.all(
        trees.map(async (tree) => {
          await tree.readDtsData();
          if (tree.treeExists && !tree.isHidden) {
            return tree.getRootElement();
          }
          return null;
        }),
      );

      const filteredResults = results.filter((result) => result !== null);

      return filteredResults;
    }

    if (element && element.contextValue && trees.length > 0) {
      let currentTree = trees.find((tree) => element.contextValue === tree.id);

      if (currentTree) {
        return currentTree.getRootChildren();
      }

      currentTree = trees.find((tree) =>
        element.contextValue?.includes(tree.id),
      );

      if (!currentTree) {
        return [];
      }

      return currentTree.getChildren(element.contextValue);
    }

    return [];
  }

  private getBasePath() {
    const { workspaceFolders } = workspace;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return "";
    }

    const path = workspaceFolders[0].uri.fsPath.replace(/\\/g, "/");
    const lastIndexOfSlash = path.lastIndexOf("/");

    if (lastIndexOfSlash === -1) {
      return "";
    }

    return path.slice(0, lastIndexOfSlash);
  }
}

const getFilenameFromFsPath = (fsPath: string) => {
  let index = fsPath.lastIndexOf("/");
  if (index !== -1) {
    return fsPath.slice(index + 1);
  }
  index = fsPath.lastIndexOf("\\");
  return fsPath.slice(index + 1);
};

const getFileExtension = (filename: string) => {
  const index = filename.lastIndexOf(".");

  return filename.slice(index);
};
