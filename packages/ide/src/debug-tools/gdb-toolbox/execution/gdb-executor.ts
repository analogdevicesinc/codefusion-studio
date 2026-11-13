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
import {
  GdbToolboxAction,
  GdbToolboxCommand,
  GdbToolboxInput,
} from "../types/types";
import { CfsDebugManager, GdbCommandOptions } from "../../debug-manager";
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
import {
  SessionArchitectureStore,
  UNKNOWN_ARCHITECTURE,
} from "../core/session-architecture-store";

/**
 * GDBExecutor is responsible for executing GDB Toolbox scripts and commands
 * within a VS Code debug session. It handles variable substitution, command
 * execution, response handling, and all supported script actions.
 */
export class GDBExecutor {
  private debugManager: CfsDebugManager;
  private sessionArchitecture: SessionArchitectureStore;
  constructor(
    debugManager: CfsDebugManager,
    sessionArchitecture: SessionArchitectureStore,
  ) {
    this.debugManager = debugManager;
    this.sessionArchitecture = sessionArchitecture;
  }

  /**
   * Utility: Find all unique input placeholders in a string (e.g., ${input} or ${input:label})
   */
  private static findInputPlaceholders(str: string): string[] {
    const regex = /\$\{input(?::([a-zA-Z0-9_-]+))?\}/g;
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
    variableContext: Record<string, string | number>,
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
        variableContext[`input:${label}`] = value;
      } else {
        variableContext["input"] = value;
      }
    }
  }

  /**
   * Substitute input placeholders in a string using variableContext
   */
  private substituteInputs(
    str: string,
    variableContext: Record<string, string | number>,
  ): string {
    return str.replace(/\$\{input(?::([a-zA-Z0-9_-]+))?\}/g, (_m, label) => {
      if (label) {
        const val = variableContext[`input:${label}`];
        return typeof val === "number" ? String(val) : val || "";
      } else {
        const val = variableContext["input"];
        return typeof val === "number" ? String(val) : val || "";
      }
    });
  }
  /**
   * Executes a single GDB command in the debug session.
   * Handles variable substitution, user input, and waits for the response.
   * @param cmd - The command to execute.
   * @param inputs - Input definitions used to resolve `${input}` placeholders.
   * @param session - The debug session to run the command in.
   * @param variableContext - Variables available for substitution.
   * @param options - Options forwarded to the debug session, e.g. whether the
   * output must be echoed to the Debug Console.
   * @returns A promise that resolves to the command output.
   */
  public async executeCommand(
    cmd: GdbToolboxCommand,
    inputs: GdbToolboxInput[],
    session: vscode.DebugSession,
    variableContext: Record<string, string | number> = {},
    options: GdbCommandOptions = {},
  ): Promise<string> {
    // Get the CFS debug session from the manager
    const cfsSession = this.debugManager.getSession(session.id);
    if (!cfsSession) {
      throw new Error(
        `No CFS debug session found for session ${session.id}. The debug manager may not be properly initialized.`,
      );
    }

    // Find and prompt for input placeholders in the command
    const inputPlaceholders = GDBExecutor.findInputPlaceholders(cmd.command);
    if (inputPlaceholders.length > 0) {
      await this.promptForInputs(
        inputPlaceholders,
        inputs ?? [],
        variableContext,
      );
    }
    // Substitute user inputs
    const commandWithInputs = this.substituteInputs(
      cmd.command,
      variableContext,
    );
    const substitutedCommand = substituteVars(
      commandWithInputs,
      convertRecordValuesToString(variableContext),
    );

    return await cfsSession.evaluateGdbCommand(substitutedCommand, options);
  }
  /**
   * Executes a sequence of GDB Toolbox commands as a script.
   * @param commands - The commands to execute in order.
   * @param inputs - Input definitions used to resolve `${input}` placeholders.
   * @param session - The debug session to run the script in.
   * @param options - Options forwarded to each command, e.g. whether the
   * output must be echoed to the Debug Console.
   * @returns A promise that resolves to the output of each command.
   */
  public async executeScript(
    commands: GdbToolboxCommand[],
    inputs: GdbToolboxInput[],
    session: vscode.DebugSession,
    options: GdbCommandOptions = {},
  ): Promise<string[]> {
    const results: string[] = [];
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

    // Execution-local context so concurrent scripts on different sessions do
    // not clobber each other's variables (this executor is a singleton).
    const variableContext: Record<string, string | number> = {
      defaultScriptsDirectory: defaultScriptsDir,
    };

    // Expose the session's detected architecture so scripts can source
    // arch-specific helpers, e.g. `{defaultScriptsDirectory}/fault-analyzer-{arch}.gdb`.
    // Skip the unknown sentinel so it is never substituted as a real arch.
    const sessionArch = this.sessionArchitecture.get(session.id);
    if (sessionArch && sessionArch !== UNKNOWN_ARCHITECTURE) {
      variableContext.arch = sessionArch;
    }

    for (const cmd of commands) {
      try {
        const substitutedCommand = substituteVars(
          cmd.command,
          convertRecordValuesToString(variableContext),
        );
        const commandObj = { ...cmd, command: substitutedCommand };
        const response = await this.executeCommand(
          commandObj,
          inputs,
          session,
          variableContext,
          options,
        );

        results.push(response);
        if (cmd.actions) {
          await this.executeActions(
            cmd.actions,
            inputs ?? [],
            response,
            session,
            variableContext,
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to execute command '${cmd.command}': ${error}`,
        );
        results.push("");
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
    response: string,
    session: vscode.DebugSession,
    variableContext: Record<string, string | number>,
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
        await this.promptForInputs(actionInputFields, inputs, variableContext);
      }
      // Substitute user inputs into a copy so the cached ScriptManager action
      // keeps its ${input...} placeholders for reruns and concurrent runs.
      const resolvedAction: GdbToolboxAction = { ...action };
      if (typeof resolvedAction.filePath === "string") {
        resolvedAction.filePath = this.substituteInputs(
          resolvedAction.filePath,
          variableContext,
        );
      }
      if (typeof resolvedAction.content === "string") {
        resolvedAction.content = this.substituteInputs(
          resolvedAction.content,
          variableContext,
        );
      }
      await this.handleAction(
        resolvedAction,
        inputs,
        response,
        session,
        variableContext,
      );
    }
  }
  /**
   * Handles a single action, dispatching based on its type.
   */
  private async handleAction(
    action: GdbToolboxAction,
    inputs: GdbToolboxInput[],
    response: string,
    session: vscode.DebugSession,
    variableContext: Record<string, string | number>,
  ): Promise<void> {
    const context = {
      ...variableContext,
      gdbOutput: response,
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
        handleLogAction(action, context.gdbOutput, variableContext);
        break;

      case "showMessage":
        handleShowMessageAction(action, variableContext, response);
        break;

      case "writeFile":
        handleWriteFileAction(action, context, variableContext, response);
        break;

      case "appendFile":
        handleAppendFileAction(action, context, variableContext, response);
        break;

      case "setVariable":
        handleSetVariableAction(action, response, variableContext);
        break;

      case "openFile":
        await handleOpenFileAction(action, response, variableContext, session);
        break;

      case "conditional":
        await handleConditionalAction(
          action,
          context,
          session,
          (actions, response, session) =>
            this.executeActions(
              actions,
              inputs,
              response,
              session,
              variableContext,
            ),
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
