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

import {
  EventEmitter,
  FileSystemWatcher,
  ThemeIcon,
  TreeItemCollapsibleState,
  Uri,
  workspace,
} from "vscode";
import { ViewContainerItem } from "../view-container-item";
import { DtParser } from "cfs-lib";
import { randomBytes } from "node:crypto";

class FileNotFoundError extends Error {
  constructor() {
    super("File not found.");
  }
}

export enum ItemType {
  Array,
  Value,
  Tree,
  Boolean,
}

export class DtsTree {
  private parser = new DtParser();
  protected tree: Record<string, any> | null = null;
  private parseError: Error | null = null;
  private dtWatcher: FileSystemWatcher;

  protected _filePath: string;
  private _id: string;
  private _rootLabel: string;
  private hidden = false;

  constructor(props: {
    filePath: string;
    id?: string;
    rootLabel: string;
    refresh: EventEmitter<null>;
  }) {
    this._filePath = props.filePath;
    this._id = !props.id ? randomBytes(3).toString() : props.id;
    this._rootLabel = props.rootLabel;

    this.dtWatcher = workspace.createFileSystemWatcher(this.filePath);

    this.dtWatcher.onDidChange(async () => {
      await this.readDtsData();
      props.refresh.fire(null);
    });

    this.dtWatcher.onDidDelete(async () => {
      this.tree = null;
      props.refresh.fire(null);
    });
  }

  get id() {
    return this._id;
  }

  get rootLabel() {
    return this._rootLabel;
  }

  get treeExists() {
    return this.tree !== null;
  }

  get filePath() {
    return this._filePath;
  }

  hide() {
    this.hidden = true;
  }

  show() {
    if (this.treeExists) {
      this.hidden = false;
    }
  }

  get isHidden() {
    return this.hidden;
  }

  dispose() {
    this.dtWatcher.dispose();
  }

  async readDtsData() {
    try {
      let doc;
      try {
        await workspace.fs.stat(Uri.file(this.filePath));
        doc = await workspace.openTextDocument(this.filePath);
      } catch (error) {
        throw new FileNotFoundError();
      }
      const content = doc.getText();
      this.tree = await this.parser.jsonFromString(content);
      this.parseError = null;
    } catch (error) {
      this.parseError = error as Error;
    }
  }

  getRootElement() {
    return new ViewContainerItem({
      label: this.rootLabel,
      collapsible: TreeItemCollapsibleState.Collapsed,
      contextValue: this.id,
      icon: new ThemeIcon("folder"),
    });
  }

  getRootChildren() {
    if (this.parseError) {
      if (this.parseError instanceof FileNotFoundError) {
        return [];
      }

      const message = this.parseError?.message;
      return [
        new ViewContainerItem({
          label: "There was an error parsing the file.",
          tooltip: message ?? "",
          collapsible: TreeItemCollapsibleState.None,
        }),
      ];
    }

    if (!this.tree) {
      return [];
    }

    return this.getChildrenOf({
      node: this.tree,
      isRoot: true,
      contextValue: this.id,
    });
  }

  getChildren(contextValue: string) {
    const node = this.findItemInTree(contextValue);
    if (node === null) {
      return [];
    }
    return this.getChildrenOf({ node, contextValue });
  }

  findItemInTree(labelPath: string) {
    const labels = labelPath.split(",").slice(1).reverse();
    let obj = this.tree;

    let node: string | undefined;
    while ((node = labels.pop())) {
      if (obj === null) {
        break;
      }
      obj = obj[node];
    }

    return obj;
  }

  private getIcon(label: string) {
    if (label === "model") {
      return new ThemeIcon("circuit-board");
    }

    if (label === "aliases") {
      return new ThemeIcon("mention");
    }

    if (label === "chosen") {
      return new ThemeIcon("references");
    }

    if (label === "connector") {
      return new ThemeIcon("debug-disconnect");
    }

    if (label === "cpus") {
      return new ThemeIcon("chip");
    }

    if (label === "gpio_keys") {
      return new ThemeIcon("keyboard");
    }

    if (label === "leds") {
      return new ThemeIcon("lightbulb");
    }

    if (label.startsWith("memory")) {
      return new ThemeIcon("file-binary");
    }

    if (label === "pinctrl") {
      return new ThemeIcon("settings");
    }

    if (label === "soc") {
      return new ThemeIcon("chip");
    }

    if (label.startsWith("temp")) {
      return new ThemeIcon("dashboard");
    }

    if (label === "includedFiles") {
      return new ThemeIcon("folder");
    }

    return new ThemeIcon("symbol-field");
  }

  private getChildrenOf({
    node,
    contextValue,
    isRoot,
  }: {
    node: Record<string, any>;
    contextValue?: string;
    isRoot?: boolean;
  }) {
    return Object.entries(node).map(([key, value]) => {
      switch (this.getItemType(value)) {
        case ItemType.Array:
          return new ViewContainerItem({
            label: key,
            description: value.join(", "),
            collapsible: TreeItemCollapsibleState.None,
            icon: isRoot ? this.getIcon(key) : undefined,
          });

        case ItemType.Tree:
          return new ViewContainerItem({
            label: key,
            collapsible: TreeItemCollapsibleState.Collapsed,
            contextValue: `${contextValue},${key}`,
            icon: isRoot ? this.getIcon(key) : undefined,
          });

        case ItemType.Boolean:
          return new ViewContainerItem({
            label: key,
            description: value ? "true" : "false",
            collapsible: TreeItemCollapsibleState.None,
            icon: isRoot ? this.getIcon(key) : undefined,
          });

        case ItemType.Value:
          return new ViewContainerItem({
            label: key,
            description: value,
            collapsible: TreeItemCollapsibleState.None,
            icon: isRoot ? this.getIcon(key) : undefined,
          });
        default:
          return new ViewContainerItem({
            label: key,
            collapsible: TreeItemCollapsibleState.None,
            icon: isRoot ? this.getIcon(key) : undefined,
          });
      }
    });
  }

  private getItemType(value: any) {
    if (typeof value === "string") {
      return ItemType.Value;
    }

    if (typeof value === "boolean") {
      return ItemType.Boolean;
    }

    if (Array.isArray(value)) {
      return ItemType.Array;
    }

    return ItemType.Tree;
  }
}
