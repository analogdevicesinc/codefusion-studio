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
import { CoreDumpInfo } from "../types";
import { CoreDumpNode } from "./core-dump-node";
import { onCoreDumpSessionStarted } from "../../gdb-toolbox/services/debug-event-hooks";
import { SessionManager } from "../services/core-dump-session-manager";
import { CORE_DUMP_VIEW_VISIBLE_COMMAND_ID } from "../commands/constants";

/**
 * CoreDumpTreeProvider implements the tree view for core dump analysis results.
 * Handles UI updates, node creation, and context management for parsed core dump data.
 */
export class CoreDumpTreeProvider
  implements vscode.TreeDataProvider<CoreDumpNode>
{
  // Event emitter for tree data changes
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  // Stores the latest core dump info
  private info: CoreDumpInfo | null = null;

  private activeSessionId: string | undefined;
  private sessionManager: SessionManager;
  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;

    // Listen for core dump session events
    onCoreDumpSessionStarted(({ sessionId }) => {
      this.sessionManager.markSessionActive(sessionId);
      this.activeSessionId = sessionId;
      // Don't refresh here - wait for session data to be available
    }); // Listen for session data changes - this is when we actually have data to display
    this.sessionManager.onDidSessionDataChange(({ sessionId, data }) => {
      // Update if this is an active core dump session
      const activeSessions = this.sessionManager.getActiveSessions();
      if (activeSessions.includes(sessionId)) {
        this.activeSessionId = sessionId;
        this.setCoreDumpInfo(data);
      } else {
      }
    });

    // Add detailed logging to track the flow of session data and tree updates
    vscode.debug.onDidChangeActiveDebugSession((session) => {
      if (!session) {
        this.clear(); // No active session
        return;
      }

      const activeSessions = this.sessionManager.getActiveSessions();
      if (activeSessions.includes(session.id)) {
        // Core dump session selected
        const sessionData = this.sessionManager.getSessionData(session.id);
        if (sessionData) {
          this.setCoreDumpInfo(sessionData);
        } else {
          this.clear();
        }
      } else {
        this.showActiveDebugSessionMessage();
      }
    });
  }

  /**
   * Updates the tree with new core dump info and refreshes the view.
   */
  setCoreDumpInfo(info: CoreDumpInfo) {
    this.info = info;
    this._onDidChangeTreeData.fire();
    // Set context to make views visible
    vscode.commands.executeCommand(
      "setContext",
      CORE_DUMP_VIEW_VISIBLE_COMMAND_ID,
      true,
    );
  }

  /**
   * Clears the tree and hides core dump views in the UI.
   */
  clear() {
    this.info = null;
    this._onDidChangeTreeData.fire();
    vscode.commands.executeCommand(
      "setContext",
      CORE_DUMP_VIEW_VISIBLE_COMMAND_ID,
      false,
    );
  }

  /**
   * Displays a message in the tree view for non-core dump sessions.
   */
  private showActiveDebugSessionMessage(): void {
    this.info = null;
    this._onDidChangeTreeData.fire();
    vscode.commands.executeCommand(
      "setContext",
      CORE_DUMP_VIEW_VISIBLE_COMMAND_ID,
      false,
    );
  }

  /**
   * Returns the TreeItem for a given node.
   */
  getTreeItem(element: CoreDumpNode): vscode.TreeItem {
    return element;
  }

  public getCoreDumpInfo(): CoreDumpInfo | null {
    return this.info;
  }

  /**
   * Returns child nodes for a given parent node, or root nodes if none provided.
   * Uses guard clauses and clear logic for maintainability.
   */

  getChildren(element?: CoreDumpNode): vscode.ProviderResult<CoreDumpNode[]> {
    if (!this.info) {
      const workspaceFolders = vscode.workspace.workspaceFolders;

      //Checking if folders are present in the workspace
      if (workspaceFolders === undefined || workspaceFolders.length === 0) {
        return [
          new CoreDumpNode("Open a CFS Workspace to use Core Dump Analysis"),
        ];
      }

      const cfsConfig = vscode.workspace.getConfiguration(
        "cfs",
        workspaceFolders[0],
      );

      if (cfsConfig.get("configureWorkspace") !== "Yes") {
        return [
          new CoreDumpNode("Open a CFS Workspace to use Core Dump Analysis"),
        ];
      }

      const session = vscode.debug.activeDebugSession;

      if (
        session &&
        !this.sessionManager.getActiveSessions().includes(session.id)
      ) {
        return [
          new CoreDumpNode(
            "Live debug session selected - switch to or load core dump session for analysis.",
          ),
        ];
      }
      return [
        new CoreDumpNode(
          "No core dump loaded. Run Retrieve and Analyze Core Dump, Analyze Existing Core Dump, or Retrieve Core Dump",
        ),
      ];
    }

    if (element?.children?.length) {
      return element.children;
    }

    // Handle specific element contexts
    if (element?.contextValue) {
      switch (element.contextValue) {
        case "crashCause":
          return this.getCrashCauseNodes();
        case "tasksStack":
          return this.getTaskStackNodes();
        case "heapUsage":
          return this.getHeapUsageNodes();
        default:
          if (element.contextValue.startsWith("thread:")) {
            const threadName = element.contextValue.substring(7);
            const tasks = this.info.details.tasks;
            if (Array.isArray(tasks)) {
              const task = tasks.find((t: any) => t.name === threadName);
              if (task) {
                return this.getThreadDetailNodes(task);
              }
            }
          }
          break;
      }
    }

    const tasks = this.info.details.tasks;
    const hasErrorThread =
      Array.isArray(tasks) &&
      tasks.some((task: any) => String(task.status).toLowerCase() === "error");

    const rootNodes = [
      new CoreDumpNode(
        "Crash Cause",
        vscode.TreeItemCollapsibleState.Expanded,
        "crashCause",
      ),
      new CoreDumpNode(
        "Tasks Stack",
        hasErrorThread
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
        "tasksStack",
      ),
      new CoreDumpNode(
        "Global Heap",
        vscode.TreeItemCollapsibleState.Collapsed,
        "heapUsage",
      ),
    ];

    return rootNodes;
  }

  /**
   * Creates nodes for crash cause entries.
   */
  private getCrashCauseNodes(): CoreDumpNode[] {
    const crash = this.info?.details.crashCause;
    if (!Array.isArray(crash) || crash.length === 0)
      return [new CoreDumpNode("No crash cause info available")];

    return crash.map((entry: any, idx: number) => {
      // Create clickable faulting location node
      const faultingLocationNode =
        entry.symtab && entry.symtab !== "?"
          ? new CoreDumpNode(
              `Faulting Location: ${entry.symtab}:${entry.line}`,
              vscode.TreeItemCollapsibleState.None,
              "crash-location", // This makes it clickable
              undefined,
              [],
              { symtab: entry.symtab, line: entry.line },
            )
          : new CoreDumpNode(
              `Faulting Location: ${entry.symtab ?? "?"}:${entry.line ?? "?"}`,
            );

      // Create address node
      const addressNode = new CoreDumpNode(
        `Address: ${entry.address ?? "Unavailable"}`,
        vscode.TreeItemCollapsibleState.None,
        "crash-address",
        undefined,
        [],
        { address: entry.address },
      );

      const node = new CoreDumpNode(
        `Crash Cause ${idx + 1}`,
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        entry,
        [
          new CoreDumpNode(`Type: ${entry.type ?? "Unavailable"}`),
          addressNode,
          new CoreDumpNode(`Faulting IP: ${entry.pc ?? "Unavailable"}`),
          faultingLocationNode, // Use the clickable location node
          new CoreDumpNode(`Details: ${entry.details ?? "Unavailable"}`),
        ],
      );
      node.iconPath = new vscode.ThemeIcon(
        "error",
        new vscode.ThemeColor("testing.iconFailed"),
      );
      return node;
    });
  }

  /**
   * Creates nodes for each task/thread in the core dump.
   */
  private getTaskStackNodes(): CoreDumpNode[] {
    const tasks = this.info?.details.tasks;
    if (!Array.isArray(tasks))
      return [new CoreDumpNode("No task stack info available")];
    return tasks.map((task: any) => {
      const isError = String(task.status).toLowerCase() === "error";
      const node = new CoreDumpNode(
        `${task.name ?? "Unknown"}`,
        isError
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
        `thread:${task.name ?? "unknown"}`,
        task,
      );
      node.iconPath = new vscode.ThemeIcon(
        isError ? "error" : "pass",
        isError
          ? new vscode.ThemeColor("testing.iconFailed")
          : new vscode.ThemeColor("testing.iconPassed"),
      );
      return node;
    });
  }

  /**
   * Creates nodes for heap usage details.
   */
  private getHeapUsageNodes(): CoreDumpNode[] {
    const heap = this.info?.details.heap;
    if (
      !heap ||
      typeof heap !== "object" ||
      !("total" in heap) ||
      !("used" in heap) ||
      !("max" in heap)
    )
      return [new CoreDumpNode("No heap usage info available")];

    const heapInfo = heap as {
      total?: number | string;
      used?: number | string;
      max?: number | string;
      message?: string;
    };

    const total =
      typeof heapInfo.total === "string"
        ? Number(heapInfo.total)
        : heapInfo.total;
    const used =
      typeof heapInfo.used === "string" ? Number(heapInfo.used) : heapInfo.used;
    const max =
      typeof heapInfo.max === "string" ? Number(heapInfo.max) : heapInfo.max;

    const nodes: CoreDumpNode[] = [
      new CoreDumpNode(
        `Total: ${typeof total === "number" && !isNaN(total) ? total + " KB" : "Unavailable"}`,
      ),
      new CoreDumpNode(
        `Used: ${typeof used === "number" && !isNaN(used) ? used + " KB" : "Unavailable"}`,
      ),
      new CoreDumpNode(
        `Peak: ${typeof max === "number" && !isNaN(max) ? max + " KB" : "Unavailable"}`,
      ),
    ];

    if (heapInfo.message) {
      const msgNode = new CoreDumpNode(heapInfo.message);
      msgNode.iconPath = new vscode.ThemeIcon("error");
      nodes.push(msgNode);
    }

    return nodes;
  }

  /**
   * Creates detailed nodes for a specific thread/task.
   */
  private getThreadDetailNodes(task: any): CoreDumpNode[] {
    const threadAddress =
      !task.address || task.address === "" ? "Unknown" : task.address;

    let threadAddressHex =
      threadAddress !== "Unknown"
        ? threadAddress.match(/^0x\S*/)?.[0] || "Unknown"
        : "Unknown";

    const stackFrame: CoreDumpNode[] = [];

    // Handle multiple trace entries
    if (Array.isArray(task.trace) && task.trace.length > 0) {
      task.trace.forEach((traceEntry: any) => {
        const frameNodes: CoreDumpNode[] = [];

        // Add frame number and function name
        const functionName = traceEntry.name || "Unknown Function";
        frameNodes.push(new CoreDumpNode(`Function: ${functionName}`));

        // Add PC (Program Counter)
        if (traceEntry.pc) {
          frameNodes.push(new CoreDumpNode(`PC: ${traceEntry.pc}`));
        }

        // Add SP (Stack Pointer)
        if (traceEntry.sp) {
          frameNodes.push(
            new CoreDumpNode(`SP: 0x${traceEntry.sp.toString(16)}`),
          );
        }

        // Add clickable source location if available
        if (
          traceEntry.symtab &&
          traceEntry.symtab !== "?" &&
          traceEntry.symtab !== "None"
        ) {
          const clickableNode = new CoreDumpNode(
            `Source: ${traceEntry.symtab}:${traceEntry.line || 0}`,
            vscode.TreeItemCollapsibleState.None,
            "crash-location", // Makes it clickable
            undefined,
            [],
            {
              symtab: traceEntry.symtab,
              line: traceEntry.line || 0,
            },
          );
          frameNodes.push(clickableNode);
        } else {
          frameNodes.push(
            new CoreDumpNode(
              `Source: ${traceEntry.symtab || "Unknown"}:${traceEntry.line || 0}`,
            ),
          );
        }

        // Create a collapsible node for each stack frame
        const frameNode = new CoreDumpNode(
          `${functionName}`,
          vscode.TreeItemCollapsibleState.Collapsed,
          undefined,
          undefined,
          frameNodes,
        );

        stackFrame.push(frameNode);
      });
    } else {
      stackFrame.push(new CoreDumpNode("No stack trace available"));
    }

    const stackTrace = new CoreDumpNode(
      "Stack Trace",
      vscode.TreeItemCollapsibleState.Collapsed,
      undefined,
      undefined,
      stackFrame,
    );

    return [
      new CoreDumpNode(`Status: ${task.status ?? "Unavailable"}`),
      new CoreDumpNode(`Thread Address: ${threadAddress}`),
      new CoreDumpNode(
        "Stack Usage",
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        undefined,
        [
          new CoreDumpNode(
            `Used: ${task.stack?.used !== undefined ? task.stack.used + " KB" : "Unavailable"}`,
          ),
          new CoreDumpNode(
            `Total Allocated: ${task.stack?.total !== undefined ? task.stack.total + " KB" : "Unavailable"}`,
          ),
          new CoreDumpNode(
            `Watermark (Peak Usage %): ${task.stack?.max_usage_percent !== undefined ? task.stack.max_usage_percent + "%" : "Unavailable"}`,
          ),
        ],
      ),
      new CoreDumpNode(
        "Execution Info",
        vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        undefined,
        [
          new CoreDumpNode(`PC: ${task.execution_info?.pc ?? "Unavailable"}`),
          new CoreDumpNode(`SP: ${task.execution_info?.sp ?? "Unavailable"}`),
          new CoreDumpNode(`LR: ${task.execution_info?.lr ?? "Unavailable"}`),
        ],
      ),
      stackTrace,
      new CoreDumpNode(
        `Reason: ${task.reason?.message ?? "Unavailable"} (code: ${task.reason?.code ?? "?"})`,
      ),
    ];
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Dispose method to clean up resources.
   */
  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
