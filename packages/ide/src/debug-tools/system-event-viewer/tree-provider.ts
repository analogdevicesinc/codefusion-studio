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
import { TraceManager } from "./hardware/trace-manager";
import { CfsDebugManager } from "../debug-manager";

export interface EventNode {
  name: string;
  path: string;
  isGroup: boolean;
}

export interface SevTreeItem extends vscode.TreeItem {
  /**
   * When true, the item is shown grayed out and cannot be clicked.
   */
  isDisabled?: boolean;
}

/*
 * This class implements the tree view for event configuration on VS code debug view.
 *
 * For the moment it is mostly a placeholder implementation until we define a clear path
 * for custom SoC event support on CFSIO-14904.
 */
export class EventTreeDataProvider
  implements vscode.TreeDataProvider<EventNode>
{
  private _onDidChangeTreeData: vscode.EventEmitter<EventNode | void> =
    new vscode.EventEmitter<EventNode | void>();
  readonly onDidChangeTreeData: vscode.Event<EventNode | void> =
    this._onDidChangeTreeData.event;

  private traceManager: TraceManager;

  constructor(traceManager: TraceManager, debugManager: CfsDebugManager) {
    this.traceManager = traceManager;

    vscode.debug.onDidChangeActiveDebugSession(async () => {
      this._onDidChangeTreeData.fire();
    });

    debugManager.onStartSession(async (session) => {
      const disposables: vscode.Disposable[] = [];
      disposables.push(
        session.onHalt(() => {
          this._onDidChangeTreeData.fire();
        }),
      );
      disposables.push(
        session.onContinue(() => {
          this._onDidChangeTreeData.fire();
        }),
      );
      disposables.push(
        // No need to fire, already handled by onDidChangeActiveDebugSession
        session.onStop(() => {
          disposables.forEach((d) => d.dispose());
        }),
      );
    });
  }

  public async getTreeItem(element: EventNode): Promise<SevTreeItem> {
    if (element.isGroup) {
      return {
        label: element.name,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        checkboxState: undefined,
      };
    } else {
      try {
        if (await this.traceManager.isEventEnabled(`*.${element.path}`)) {
          return {
            label: element.name,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            checkboxState: vscode.TreeItemCheckboxState.Checked,
          };
        } else {
          // TODO: add mechanism to report why it cannot be enabled,
          // some idea: repurpose canBeRoutedToSink to a "dry run"
          // of a connection that doesn't actually connect anything
          // and throws if not possible
          const canBeEnabled = await this.traceManager.canEventBeEnabled(
            `*.${element.path}`,
          );

          return {
            label: element.name,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            checkboxState: canBeEnabled
              ? vscode.TreeItemCheckboxState.Unchecked
              : undefined,
            isDisabled: !canBeEnabled,
            tooltip: canBeEnabled
              ? undefined
              : `Cannot be routed to trace buffer`,
          };
        }
      } catch (error) {
        return {
          label: element.name,
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          checkboxState: undefined,
          isDisabled: true,
          tooltip: `Cannot be enabled: ${(error as Error).message}`,
        };
      }
    }
  }

  public getChildren(element?: EventNode): EventNode[] {
    if (vscode.debug.activeDebugSession === undefined) {
      // Do not show events unless we are on a debug session.
      return [];
    }

    return this.traceManager.getEventSources(element?.path).map((source) => {
      return {
        name: source.name,
        path:
          element === undefined
            ? source.name
            : `${element?.path}.${source.name}`,
        isGroup: source.isGroup,
      };
    });
  }
}
