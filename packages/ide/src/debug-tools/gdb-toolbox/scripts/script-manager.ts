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
import * as fs from "fs";
import * as path from "path";
import { GdbToolboxScript } from "../types/types";
import {
  ADI_CONFIGURE_WORKSPACE_SETTING,
  EXTENSION_ID,
} from "../../../constants";

/**
 * ScriptManager handles loading, validating, and watching both default and user GDB Toolbox scripts.
 * - Default scripts are loaded from the extension's configs directory.
 * - User scripts are loaded from the workspace's gdb_toolbox/configs directory.
 * - Emits events when scripts change so the UI can refresh.
 */
export class ScriptManager {
  private scriptsDir: string;
  private userDebugConfigsDir: string;
  private _onScriptsChanged = new vscode.EventEmitter<void>();
  public readonly onScriptsChanged = this._onScriptsChanged.event;
  private scripts: Array<GdbToolboxScript & { filePath: string }> = [];

  constructor() {
    // Determine the workspace root or set to undefined if no workspace is open
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspaceRoot =
      workspaceFolders && workspaceFolders.length > 0
        ? workspaceFolders[0].uri.fsPath.replace(/\\/g, "/")
        : undefined;

    // User scripts are stored in the workspace's gdb_toolbox/configs directory
    this.scriptsDir = workspaceRoot
      ? `${workspaceRoot}/gdb_toolbox/configs`
      : "";

    // Also watch <userHome>/cfs/gdb_toolbox/configs for scripts
    const userHome = require("os").homedir().replace(/\\/g, "/");
    this.userDebugConfigsDir = `${userHome}/cfs/gdb_toolbox/configs`;

    const conf = vscode.workspace.getConfiguration(EXTENSION_ID);
    const configureWorkspaceSetting =
      conf.get(ADI_CONFIGURE_WORKSPACE_SETTING) === "Yes";

    if (
      configureWorkspaceSetting &&
      !fs.existsSync(this.userDebugConfigsDir) &&
      this.userDebugConfigsDir !== ""
    ) {
      fs.mkdirSync(this.userDebugConfigsDir, { recursive: true });
    }

    // Ensure the user scripts directory exists
    if (
      configureWorkspaceSetting &&
      !fs.existsSync(this.scriptsDir) &&
      this.scriptsDir !== ""
    ) {
      fs.mkdirSync(this.scriptsDir, { recursive: true });
    }

    this.loadScripts();
    this.watchScripts();
  }

  /**
   * Loads all scripts from the workspace's gdb_toolbox/configs directory and <userHome>/cfs/debug/configs.
   */
  public loadScripts(): void {
    this.scripts = [];
    const loadFromDir = (dir: string) => {
      try {
        const scriptFiles = fs.readdirSync(dir);
        for (const file of scriptFiles) {
          const filePath = path.join(dir, file);
          if (file.endsWith(".json")) {
            try {
              const content = fs.readFileSync(filePath, "utf-8");
              if (content.replace(/\s/g, "").length === 0) {
                vscode.window.showWarningMessage(
                  `Script file is empty: ${file}`,
                );
                continue;
              }
              const scriptData = JSON.parse(content);
              if (this.isValidScript(scriptData)) {
                this.scripts.push({ ...scriptData, filePath });
              } else {
                vscode.window.showWarningMessage(
                  `Invalid script format in file: ${file}`,
                );
              }
            } catch (error) {
              vscode.window.showWarningMessage(
                `Failed to load script: ${file} (${error})`,
              );
            }
          }
        }
      } catch (error) {
        // Only show error if the directory exists
        if (fs.existsSync(dir)) {
          vscode.window.showErrorMessage(
            `Failed to load scripts from ${dir}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    };
    loadFromDir(this.scriptsDir);
    loadFromDir(this.userDebugConfigsDir);
    this._onScriptsChanged.fire();
  }

  /**
   * Returns all scripts as a single list.
   */
  getAllScripts(): Array<GdbToolboxScript & { filePath: string }> {
    return this.scripts;
  }

  /**
   * Watches the scripts directory for changes and reloads scripts when files change.
   * Also watches <userHome>/cfs/debug/configs.
   */
  private watchScripts(): void {
    if (this.scriptsDir && fs.existsSync(this.scriptsDir)) {
      fs.watch(this.scriptsDir, () => {
        this.loadScripts();
      });
    }
    if (this.userDebugConfigsDir && fs.existsSync(this.userDebugConfigsDir)) {
      fs.watch(this.userDebugConfigsDir, () => {
        this.loadScripts();
      });
    }
  }

  /**
   * Validates the structure of a script object.
   */
  private isValidScript(script: any): script is GdbToolboxScript {
    const validActionTypes = [
      "log",
      "openFile",
      "showMessage",
      "writeFile",
      "appendFile",
      "setVariable",
      "conditional",
      "openDisassembly",
    ];
    return (
      typeof script.name === "string" &&
      typeof script.description === "string" &&
      Array.isArray(script.commands) &&
      script.commands.every(
        (cmd: any) =>
          typeof cmd.command === "string" &&
          (!cmd.actions ||
            (Array.isArray(cmd.actions) &&
              cmd.actions.every(
                (action: any) =>
                  typeof action.type === "string" &&
                  validActionTypes.includes(action.type) &&
                  (!action.condition || typeof action.condition === "string"),
              ))),
      )
    );
  }
}
