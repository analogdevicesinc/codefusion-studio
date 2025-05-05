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

import { EventEmitter, FileSystemWatcher, workspace } from "vscode";
import { DtsTree } from "./dts-tree";

export class ZephyrTree extends DtsTree {
  private zephyrWatcher: FileSystemWatcher;
  private buildFolderWatcher: FileSystemWatcher;
  private buildFolder: string;

  constructor(props: {
    refresh: EventEmitter<null>;
    filePath: string;
    buildFolder: string;
    context: string;
  }) {
    super({
      id: `build-${props.context}`,
      refresh: props.refresh,
      filePath: props.filePath,
      rootLabel: `${props.context}/build/zephyr/zephyr.dts`,
    });

    this.buildFolder = props.buildFolder;

    this.zephyrWatcher = workspace.createFileSystemWatcher(
      this.filePath,
      false,
      true,
      true,
    );

    this.zephyrWatcher.onDidCreate(async () => {
      await this.readDtsData();
      setTimeout(() => {
        props.refresh.fire(null);
      }, 200);
    });

    this.buildFolderWatcher = workspace.createFileSystemWatcher(
      this.buildFolder,
      true,
      true,
      false,
    );

    this.buildFolderWatcher.onDidDelete(() => {
      this.tree = null;
      props.refresh.fire(null);
    });
  }
}
