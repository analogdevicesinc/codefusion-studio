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

import * as vscode from "vscode";
import { CORE_DUMP_NODE_CLICK_COMMAND_ID } from "../commands/constants";

/**
 * CoreDumpNode represents a single item in the Core Dump Analysis tree view.
 * Extends vscode.TreeItem to provide label and optional collapsible state.
 */
export class CoreDumpNode extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode
      .TreeItemCollapsibleState.None,
    contextValue?: string,
    public coreInfo?: any,
    public children: CoreDumpNode[] = [],
    public clickData?: any,
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    this.coreInfo = coreInfo;
    this.children = children;
    this.clickData = clickData;

    this.command = {
      command: CORE_DUMP_NODE_CLICK_COMMAND_ID,
      title: "Handle CoreDumpNode Click",
      arguments: [this],
    };

    // Add visual cues for clickable items - no descriptions, just tooltip
    if (contextValue === "crash-location" || contextValue === "crash-address") {
      // Set tooltip to indicate clickability
      this.tooltip =
        contextValue === "crash-location"
          ? "Click to Open file"
          : "Click to View Memory";
    }
  }
}
