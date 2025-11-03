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
import { ScriptManager } from "../scripts/script-manager";
import { onBreakpointChanged } from "../services/debug-event-hooks";
import { EXECUTE_GDB_SCRIPT_COMMAND_ID } from "../../../commands/constants";
import { EXECUTE_SCRIPT } from "./constants";
import { extractSessionId } from "../../../utils/utils";
import { GDBToolbox } from "../core/gdb-toolbox";

/**
 * GdbToolboxPanel provides the tree view for the GDB Toolbox in the VS Code UI.
 * It displays default scripts, user scripts, and handles refreshes on debug events.
 */
export class GdbToolboxPanel
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<vscode.TreeItem | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // Map session id -> breakpoint hit state
  private breakpointState: Map<string, boolean> = new Map();
  private activeSession: vscode.DebugSession | undefined =
    vscode.debug.activeDebugSession;

  // Add filter state
  public filters: Map<string, string> = new Map();

  getFilter(sessionId: any): string {
    const sid = extractSessionId(sessionId);
    if (!sid) return "";
    return this.filters.get(sid) ?? "";
  }

  setFilter(sessionId: any, query: string) {
    const sid = extractSessionId(sessionId);
    if (!sid) return;
    if (query) {
      this.filters.set(sid, query);
    } else {
      this.filters.delete(sid);
    }
    this.refresh();
  }

  constructor(private scriptManager: ScriptManager) {
    // Refresh the panel when scripts change or debug session events occur
    this.scriptManager.onScriptsChanged(() => this.refresh());
    vscode.debug.onDidChangeActiveDebugSession((session) => {
      this.activeSession = session ?? undefined;
      this.refresh();
    });
    vscode.debug.onDidTerminateDebugSession((session) => {
      if (session?.id) {
        this.breakpointState.delete(session.id);
      }
      if (this.activeSession?.id === session?.id) {
        this.activeSession = undefined;
      }
      this.refresh();
    });
    vscode.debug.onDidStartDebugSession((session) => {
      if (
        session &&
        this.activeSession &&
        this.filters.has(this.activeSession.id)
      ) {
        this.filters.set(session.id, this.filters.get(this.activeSession.id)!);
      }
      this.activeSession = session;
      this.refresh();
    });

    // Listen for breakpoint changes to update the panel, session-specific
    onBreakpointChanged(async ({ sessionId, isHit }) => {
      if (sessionId) {
        this.breakpointState.set(sessionId, isHit);
        // --- Detect and store core type on breakpoint event ---
        try {
          if (!(globalThis as any).sessionCoreMap) {
            (globalThis as any).sessionCoreMap = new Map();
          }
          let session: vscode.DebugSession | undefined = undefined;
          if (this.activeSession && this.activeSession.id === sessionId) {
            session = this.activeSession;
          }
          if (session) {
            const executor = GDBToolbox.getInstance().getExecutor();
            const result = await executor.executeCommand(
              { command: "show architecture" },
              session,
            );
            let core = "";
            if (typeof result === "string") {
              const lower = result.toLowerCase();
              if (lower.includes("arm")) core = "arm";
              else if (lower.includes("riscv")) core = "riscv";
              else if (lower.includes("xtensa")) core = "xtensa";
              else core = lower.split(" ")[0];
            }
            (globalThis as any).sessionCoreMap.set(sessionId, core);
          }
        } catch (err) {
          if ((globalThis as any).sessionCoreMap) {
            (globalThis as any).sessionCoreMap.delete(sessionId);
          }
        }
      }
      this.refresh();
    });
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    const session = this.activeSession;

    if (!session) {
      // Clear the context key if no session
      vscode.commands.executeCommand(
        "setContext",
        "cfs.gdbToolbox.hasScripts",
        false,
      );
      return [
        new vscode.TreeItem(
          "No active debug session. Start a debug session to use the GDB Toolbox.",
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }

    const workspaceFolder = session.workspaceFolder;
    const config = vscode.workspace.getConfiguration("", workspaceFolder?.uri);
    const firmwarePlatform = config
      .get<string>("cfs.project.firmwarePlatform")
      ?.toLowerCase();
    const soc = config.get<string>("cfs.project.target")?.toLowerCase();

    // Clear the context key if not at a breakpoint
    vscode.commands.executeCommand(
      "setContext",
      "cfs.gdbToolbox.hasScripts",
      false,
    );
    if (!this.breakpointState.get(session.id)) {
      return [
        new vscode.TreeItem(
          "Halt the debug session or hit a breakpoint to view available scripts.",
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }

    // Unified script list
    if (!element) {
      let scripts = this.scriptManager.getAllScripts();

      scripts = scripts.filter((s: any) => {
        if (
          (!s.soc ||
            s.soc == "" ||
            (typeof s.soc == "string" && s.soc.toLowerCase() == soc) ||
            (Array.isArray(s.soc) &&
              s.soc.some((obj: string) => obj.toLowerCase() == soc))) &&
          (!s.firmwarePlatform ||
            s.firmwarePlatform == "" ||
            (typeof s.firmwarePlatform == "string" &&
              s.firmwarePlatform.toLowerCase() == firmwarePlatform) ||
            (Array.isArray(s.firmwarePlatform) &&
              s.firmwarePlatform.some(
                (obj: string) => obj.toLowerCase() == firmwarePlatform,
              )))
        ) {
          return true;
        } else {
          return false;
        }
      });

      // --- Filter scripts by core if session has a core value ---
      const sessionCore = (globalThis as any).sessionCoreMap?.get(session.id);
      if (sessionCore) {
        scripts = scripts.filter(
          (s: any) => !s.core || s.core.includes(sessionCore),
        );
      }
      const filter = this.getFilter(session.id);
      if (filter) {
        const q = filter.toLowerCase();
        scripts = scripts.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.description && s.description.toLowerCase().includes(q)),
        );
      }

      scripts.sort((a, b) => a.name.localeCompare(b.name));

      vscode.commands.executeCommand(
        "setContext",
        "cfs.gdbToolbox.hasScripts",
        scripts.length > 0,
      );

      const items: vscode.TreeItem[] = [];

      // Add filter banner if filter is active
      if (filter) {
        const filterBanner = new vscode.TreeItem(
          `Filter: ${filter} (click to edit/clear)`,
          vscode.TreeItemCollapsibleState.None,
        );
        filterBanner.command = {
          command: "cfs.filterGdbToolboxScripts",
          title: "Edit or Clear Filter",
          arguments: [session.id], // Pass sessionId
        };
        filterBanner.iconPath = new vscode.ThemeIcon("filter");
        filterBanner.contextValue = "gdbToolboxFilterBanner";
        items.push(filterBanner);
      }

      // Add script items (still executable)
      items.push(
        ...scripts.map((script) => {
          const treeItem = new vscode.TreeItem(
            script.name,
            vscode.TreeItemCollapsibleState.None,
          );
          treeItem.command = {
            command: EXECUTE_GDB_SCRIPT_COMMAND_ID,
            title: EXECUTE_SCRIPT,
            arguments: [script, session],
          };
          treeItem.contextValue = "gdbScript";
          treeItem.iconPath = new vscode.ThemeIcon("file-code");
          treeItem.tooltip = script.description;
          (treeItem as any).script = script;
          treeItem.resourceUri = vscode.Uri.file(script.filePath);
          return treeItem;
        }),
      );

      return items;
    }

    vscode.commands.executeCommand(
      "setContext",
      "cfs.gdbToolbox.hasScripts",
      false,
    );

    return [];
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }
}
