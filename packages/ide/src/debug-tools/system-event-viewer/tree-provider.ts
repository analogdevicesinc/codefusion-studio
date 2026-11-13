/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import { TraceManager } from "../trace/trace-manager";
import { CfsDebugManager } from "../debug-manager";
import { TELEMETRY_ACTIONS } from "../../telemetry/action-names";
import { getTelemetryManager } from "../../telemetry/telemetry";

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
export class EventTreeDataProvider implements vscode.TreeDataProvider<EventNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<EventNode | void> =
    new vscode.EventEmitter<EventNode | void>();
  readonly onDidChangeTreeData: vscode.Event<EventNode | void> =
    this._onDidChangeTreeData.event;

  private readonly traceManager: TraceManager;
  private readonly checkboxStateCache = new Map<
    string,
    vscode.TreeItemCheckboxState | undefined
  >();

  constructor(traceManager: TraceManager, debugManager: CfsDebugManager) {
    this.traceManager = traceManager;

    debugManager.onStartSession(async (session) => {
      const isFirstSession = debugManager.getAllSessions().length === 1;
      if (isFirstSession) {
        this.checkboxStateCache.clear();
      }
      this._onDidChangeTreeData.fire();

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
        session.onStop(() => {
          disposables.forEach((d) => d.dispose());
          const isLastSession = debugManager.getAllSessions().length === 0;
          if (isLastSession) {
            this.checkboxStateCache.clear();
          }
          this._onDidChangeTreeData.fire();
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
          const checkboxState = vscode.TreeItemCheckboxState.Checked;
          this.checkboxStateCache.set(element.path, checkboxState);
          return {
            label: element.name,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            checkboxState,
          };
        } else {
          // TODO: add mechanism to report why it cannot be enabled,
          // some idea: repurpose canBeRoutedToSink to a "dry run"
          // of a connection that doesn't actually connect anything
          // and throws if not possible
          const canBeEnabled = await this.traceManager.canEventBeEnabled(
            `*.${element.path}`,
          );
          const checkboxState = canBeEnabled
            ? vscode.TreeItemCheckboxState.Unchecked
            : undefined;
          this.checkboxStateCache.set(element.path, checkboxState);
          return {
            label: element.name,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            checkboxState,
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
          checkboxState: this.checkboxStateCache.get(element.path),
          isDisabled: true,
          tooltip: `Could not determine current state due to error: ${(error as Error).message}`,
        };
      }
    }
  }

  public async getChildren(element?: EventNode): Promise<EventNode[]> {
    if (vscode.debug.activeDebugSession === undefined) {
      // Do not show events unless we are on a debug session.
      return [];
    }

    const eventsources = await this.traceManager.getEventSources(element?.path);

    return eventsources.map((source) => {
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

  public refresh(node?: EventNode): void {
    this._onDidChangeTreeData.fire(node);
  }

  /**
   * Enables a trace event and activates trace collection.
   * @param eventPath The dot-separated event path to enable.
   */
  public async enableEvent(eventPath: string): Promise<void> {
    const startTime = Date.now();
    await this.traceManager.enableEvent(`*.${eventPath}`);
    // Enable all trace. Temporary until proper trace configuration management is in place.
    await this.traceManager.enableTrace();
    void getTelemetryManager().then((telemetryManager) => {
      telemetryManager.logAction(TELEMETRY_ACTIONS.SEV_EVENT_ENABLED, {
        eventPath,
        durationMs: Date.now() - startTime,
      });
    });
  }

  /**
   * Disables a trace event.
   * @param eventPath The dot-separated event path to disable.
   */
  public async disableEvent(eventPath: string): Promise<void> {
    const startTime = Date.now();
    await this.traceManager.disableEvent(`*.${eventPath}`);
    void getTelemetryManager().then((telemetryManager) => {
      telemetryManager.logAction(TELEMETRY_ACTIONS.SEV_EVENT_DISABLED, {
        eventPath,
        durationMs: Date.now() - startTime,
      });
    });
  }
}
