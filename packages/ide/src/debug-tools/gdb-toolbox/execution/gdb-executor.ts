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
import {
  GdbToolboxAction,
  GdbToolboxCommand,
  GdbToolboxInput,
} from "../types/types";
import { onResponseReceived } from "../services/debug-event-hooks";
import {
  substituteVars,
  convertRecordValuesToString,
} from "./utils/variable-utils";
import Jexl from "jexl";
import {
  handleLogAction,
  handleShowMessageAction,
  handleWriteFileAction,
  handleAppendFileAction,
  handleSetVariableAction,
  handleOpenFileAction,
  handleConditionalAction,
  handleOpenDisassemblyAction,
} from "./gdb-action-handlers";
import { Utils } from "../../../utils/utils";

/**
 * GDBExecutor is responsible for executing GDB Toolbox scripts and commands
 * within a VS Code debug session. It handles variable substitution, command
 * execution, response handling, and all supported script actions.
 */
export class GDBExecutor {
  private lastResponse: { command: string; response: any } | null = null;
  private variableContext: Record<string, string | number> = {};
  private responseBuffer: Record<string, any> = {};
  private readonly timeout: number;
  private extensionRoot: string;

  constructor(extensionRoot: string, timeout = 10000) {
    this.extensionRoot = extensionRoot;
    this.timeout = timeout;
    this.initializeResponseListener();
  }

  /**
   * Sets up a listener for GDB command responses.
   */
  private initializeResponseListener(): void {
    onResponseReceived(({ expression, response }) => {
      if (expression && expression.trim() !== "") {
        this.lastResponse = { command: expression, response };
        this.responseBuffer[expression] = response;
      }
    });
  }

  /**
   * Utility: Find all unique input placeholders in a string (e.g., ${input} or ${input:label})
   */
  private static findInputPlaceholders(str: string): string[] {
    const regex = /\$\{input(?::([a-zA-Z0-9_\-]+))?\}/g;
    const found = new Set<string>();
    let match;
    while ((match = regex.exec(str))) {
      found.add(match[1] ? match[1] : "");
    }
    return Array.from(found);
  }

  /**
   * Utility: Prompt user for all required inputs and update variableContext
   */
  private async promptForInputs(
    placeholders: string[],
    inputs: GdbToolboxInput[],
  ): Promise<void> {
    for (const label of placeholders) {
      const input = inputs.find((i) => i.id === label);
      if (input === undefined) throw new Error(`No input for ${label}`);

      let value;

      switch (input.type) {
        case "inputBox":
          value = await vscode.window.showInputBox({
            title: input.title,
            prompt: input.prompt,
          });
          break;

        case "quickPick":
          if (input.choices === undefined)
            throw new Error(`No choices defined for ${label}`);

          value = await vscode.window.showQuickPick(input.choices, {
            title: input.title,
            placeHolder: input.prompt,
          });
          break;

        default:
          throw new Error(`No type specified for input ${label}`);
      }

      if (value === undefined) throw new Error("User cancelled input");
      if (label) {
        this.variableContext[`input:${label}`] = value;
      } else {
        this.variableContext["input"] = value;
      }
    }
  }

  /**
   * Substitute input placeholders in a string using variableContext
   */
  private substituteInputs(str: string): string {
    return str.replace(/\$\{input(?::([a-zA-Z0-9_\-]+))?\}/g, (_m, label) => {
      if (label) {
        const val = this.variableContext[`input:${label}`];
        return typeof val === "number" ? String(val) : val || "";
      } else {
        const val = this.variableContext["input"];
        return typeof val === "number" ? String(val) : val || "";
      }
    });
  }

  /**
   * Executes a single GDB command in the debug session.
   * Handles variable substitution, user input, and waits for the response.
   */
  public async executeCommand(
    cmd: GdbToolboxCommand,
    inputs: GdbToolboxInput[],
    session: vscode.DebugSession,
  ): Promise<any> {
    // Find and prompt for input placeholders in the command
    const inputPlaceholders = GDBExecutor.findInputPlaceholders(cmd.command);
    if (inputPlaceholders.length > 0) {
      await this.promptForInputs(inputPlaceholders, inputs ?? []);
    }
    // Substitute user inputs
    const commandWithInputs = this.substituteInputs(cmd.command);
    const substitutedCommand = substituteVars(
      commandWithInputs,
      convertRecordValuesToString(this.variableContext),
    );

    return new Promise<any>((resolve, reject) => {
      let resolved = false;

      const disposable = onResponseReceived(({ expression, response }) => {
        if (expression === substitutedCommand && !resolved) {
          resolved = true;
          disposable.dispose();
          this.responseBuffer[substitutedCommand] = response; // Store in responseBuffer
          resolve(response);
        }
      });

      session
        .customRequest("evaluate", {
          expression: substitutedCommand,
          context: "repl",
        })
        .then(undefined, (error) => {
          if (!resolved) {
            resolved = true;
            disposable.dispose();
            reject(
              new Error(
                `Failed to execute command '${substitutedCommand}': ${error.message}`,
              ),
            );
          }
        });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          disposable.dispose();
          reject(
            new Error(`Timeout waiting for response to: ${substitutedCommand}`),
          );
        }
      }, this.timeout);
    });
  }

  /**
   * Executes a sequence of GDB Toolbox commands as a script.
   */
  public async executeScript(
    commands: GdbToolboxCommand[],
    inputs: GdbToolboxInput[],
    session: vscode.DebugSession,
  ): Promise<any[]> {
    const results: any[] = [];
    const cfsWorkspaceFolder = vscode.workspace.workspaceFolders?.find(
      (folder) => folder.name === ".cfs",
    );

    if (!cfsWorkspaceFolder) {
      throw new Error("Workspace folder 'cfs' not found.");
    }

    const defaultScriptsDir = Utils.joinWorkspacePath(
      cfsWorkspaceFolder.uri.fsPath,
      "gdb_toolbox",
      "gdb",
    );

    this.variableContext = {
      defaultScriptsDirectory: defaultScriptsDir,
    };

    for (const cmd of commands) {
      try {
        const substitutedCommand = substituteVars(
          cmd.command,
          convertRecordValuesToString(this.variableContext),
        );
        const commandObj = { ...cmd, command: substitutedCommand };
        const response = await this.executeCommand(commandObj, inputs, session);

        results.push(response);
        if (cmd.actions) {
          await this.executeActions(
            cmd.actions,
            inputs ?? [],
            response,
            session,
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to execute command '${cmd.command}': ${error}`,
        );
        results.push(undefined);
      }
    }
    return results;
  }

  /**
   * Executes a list of actions associated with a command.
   */
  private async executeActions(
    actions: GdbToolboxAction[],
    inputs: GdbToolboxInput[],
    response: any,
    session: vscode.DebugSession,
  ): Promise<void> {
    for (const action of actions) {
      // Find and prompt for input placeholders in action fields (filePath, content, etc)
      let actionInputFields: string[] = [];
      if (typeof action.filePath === "string") {
        actionInputFields = actionInputFields.concat(
          GDBExecutor.findInputPlaceholders(action.filePath),
        );
      }
      if (typeof action.content === "string") {
        actionInputFields = actionInputFields.concat(
          GDBExecutor.findInputPlaceholders(action.content),
        );
      }
      // Remove duplicates
      actionInputFields = Array.from(new Set(actionInputFields));
      if (actionInputFields.length > 0) {
        await this.promptForInputs(actionInputFields, inputs);
      }
      // Substitute user inputs in action fields
      if (typeof action.filePath === "string") {
        action.filePath = this.substituteInputs(action.filePath);
      }
      if (typeof action.content === "string") {
        action.content = this.substituteInputs(action.content);
      }
      await this.handleAction(action, inputs, response, session);
    }
  }

  /**
   * Handles a single action, dispatching based on its type.
   */
  private async handleAction(
    action: GdbToolboxAction,
    inputs: GdbToolboxInput[],
    response: any,
    session: vscode.DebugSession,
  ): Promise<void> {
    const context = {
      ...this.variableContext,
      gdbOutput: this.responseBuffer[action.command || ""] || response,
      command: action.command || "",
      timestamp: new Date().toISOString(),
    };

    // Use Jexl for all non-conditional action conditions
    if (action.type !== "conditional" && action.condition) {
      try {
        if (!Jexl.evalSync(action.condition, context)) {
          return;
        }
      } catch {
        return;
      }
    }

    // Handle the action based on its type
    switch (action.type) {
      case "log":
        handleLogAction(action, context.gdbOutput, this.variableContext);
        break;

      case "showMessage":
        handleShowMessageAction(
          action,
          this.variableContext,
          this.lastResponse,
        );
        break;

      case "writeFile":
        handleWriteFileAction(
          action,
          context,
          this.responseBuffer,
          this.variableContext,
        );
        break;

      case "appendFile":
        handleAppendFileAction(
          action,
          context,
          response,
          this.responseBuffer,
          this.variableContext,
        );
        break;

      case "setVariable":
        handleSetVariableAction(action, response, this.variableContext);
        break;

      case "openFile":
        await handleOpenFileAction(
          action,
          response,
          this.variableContext,
          session,
        );
        break;

      case "conditional":
        await handleConditionalAction(
          action,
          context,
          session,
          (actions, response, session) =>
            this.executeActions(actions, inputs, response, session),
        );
        break;

      case "openDisassembly":
        await handleOpenDisassemblyAction();
        break;

      default:
        vscode.window.showWarningMessage(`Unknown action type: ${action.type}`);
    }
  }
}
