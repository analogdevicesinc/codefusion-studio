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
import { GdbToolboxAction } from "../types/types";
import { FileUtils } from "./utils/file-utils";
import {
  convertRecordValuesToString,
  substituteVars,
  substituteVarsWithGroups,
} from "./utils/variable-utils";
import Jexl from "jexl";
import path from "path";
import { OPEN_DISASSEMBLY_COMMAND_ID } from "../../../commands/constants";
import { formatGdbOutputForMarkdown } from "./utils/markdown-report";

/**
 * Handles the "writeFile" action, writing content to a file.
 */
export function handleWriteFileAction(
  action: GdbToolboxAction,
  context: Record<string, string>,
  variableContext: Record<string, string | number>,
  responseBuffer: Record<string, any>,
): void {
  try {
    const activeDebugSession = vscode.debug.activeDebugSession;

    if(!activeDebugSession || !activeDebugSession.workspaceFolder) {
      throw new Error("No project folder is open.");
    }

    const resolvedFilePath = path.resolve(
      activeDebugSession.workspaceFolder.uri.fsPath, 
      substituteVars(
        action.filePath || "",
        convertRecordValuesToString(context)
      )
    );

    const sourceKey = action.sourceCommand
      ? substituteVars(
          action.sourceCommand,
          convertRecordValuesToString(variableContext),
        )
      : context.command;
    const gdbResponse =
      sourceKey && responseBuffer[sourceKey]
        ? responseBuffer[sourceKey]
        : context.gdbOutput || "";

    let resolvedContent: string;
    if ((action.content || "").trim() === "${markdownReport}") {
      resolvedContent = formatGdbOutputForMarkdown({
        gdbOutput: context.gdbOutput || gdbResponse,
      });
    } else {
      resolvedContent = substituteVars(action.content || "", {
        gdbOutput: gdbResponse,
        ...convertRecordValuesToString(context),
      });
    }
    FileUtils.writeFile(
      resolvedFilePath,
      resolvedContent,
      convertRecordValuesToString(variableContext),
      { command: sourceKey || "", response: gdbResponse },
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to write file: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Handles the "appendFile" action, appending content to a file.
 */
export function handleAppendFileAction(
  action: GdbToolboxAction,
  context: Record<string, string>,
  responseBuffer: Record<string, any>,
  variableContext: Record<string, string | number>,
  response: any,
): void {
  try {
    const activeDebugSession = vscode.debug.activeDebugSession;

    if(!activeDebugSession || !activeDebugSession.workspaceFolder) {
      throw new Error("No project folder is open.");
    }

    const resolvedFilePath = path.resolve(
      activeDebugSession.workspaceFolder.uri.fsPath, 
      substituteVars(action.filePath || "", context)
    );

    const sourceKey = action.sourceCommand
      ? substituteVars(
          action.sourceCommand,
          convertRecordValuesToString(variableContext),
        )
      : context.command;
    const gdbResponse =
      sourceKey && responseBuffer[sourceKey]
        ? responseBuffer[sourceKey]
        : typeof response === "string"
          ? response
          : JSON.stringify(response);

    let resolvedContent: string;
    if ((action.content || "").trim() === "${markdownReport}") {
      resolvedContent = formatGdbOutputForMarkdown({
        gdbOutput: context.gdbOutput || gdbResponse,
      });
    } else {
      resolvedContent = substituteVars(action.content || "", {
        gdbOutput: gdbResponse,
        ...context,
      });
    }
    FileUtils.appendFile(
      resolvedFilePath,
      resolvedContent,
      response,
      convertRecordValuesToString(variableContext),
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to append to file: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Handles the "log" action, logging output to the debug console.
 */
export function handleLogAction(
  action: GdbToolboxAction,
  gdbOutput: any,
  variableContext: Record<string, string | number>,
): void {
  if (action.message) {
    const msg = substituteVars(action.message, {
      gdbOutput,
      ...convertRecordValuesToString(variableContext),
    });
    vscode.debug.activeDebugConsole.appendLine(
      msg.replace("{response}", JSON.stringify(gdbOutput)),
    );
  }
}

/**
 * Handles the "openFile" action, opening a file in the editor.
 */
export async function handleOpenFileAction(
  action: GdbToolboxAction,
  _response: any,
  variableContext: Record<string, string | number>,
  session?: vscode.DebugSession,
): Promise<void> {
  if (!action.filePath) {
    vscode.window.showWarningMessage(
      "No filePath provided for openFile action.",
    );
    return;
  }

  // Substitute variables in the file path
  const substitutedFilePath = substituteVarsWithGroups(
    action.filePath,
    convertRecordValuesToString(variableContext),
    null,
  );

  // Substitute variables in the line number (ensure it's a string)
  const substitutedLineNumber = substituteVarsWithGroups(
    String(action.lineNumber ?? "1"),
    convertRecordValuesToString(variableContext),
    null,
  );
  const lineNumber = Number(substitutedLineNumber) || 1;

  let uri: vscode.Uri | undefined;

  // Use path.isAbsolute to distinguish between absolute and relative paths
  if (path.isAbsolute(substitutedFilePath)) {
    uri = vscode.Uri.file(substitutedFilePath);
  } else {
    // Resolve relative to workspace
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showErrorMessage(
        `Failed to open file: ${substitutedFilePath}. No workspace folder found.`,
      );
      return;
    }
    // Use the first workspace folder as default
    let workspaceFolder = folders[0];
    if (session?.workspaceFolder) {
      const sessionFolderUri = session.workspaceFolder.uri;
      const folder = folders.find(
        (f) => f.uri.toString() === sessionFolderUri.toString(),
      );
      if (folder) {
        workspaceFolder = folder;
      }
    }
    const candidatePath = vscode.Uri.joinPath(
      workspaceFolder.uri,
      substitutedFilePath.replace(/^(\$|\.\/|\/)/, ""),
    );

    try {
      await vscode.workspace.fs.stat(candidatePath);
      uri = candidatePath;
    } catch {
      vscode.window.showErrorMessage(
        `Failed to open file: ${substitutedFilePath}. File not found in workspace folder (${workspaceFolder.name}).`,
      );
      return;
    }
  }

  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    vscode.window.showTextDocument(doc, {
      selection: new vscode.Range(lineNumber - 1, 0, lineNumber - 1, 0),
    });
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to open file: ${substitutedFilePath}. Error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Handles the "showMessage" action, displaying a message to the user.
 */
export function handleShowMessageAction(
  action: GdbToolboxAction,
  variableContext: Record<string, string | number>,
  lastResponse: { command: string; response: any } | null,
): void {
  if (action.message) {
    const msg = substituteVars(action.message, {
      gdbOutput: lastResponse?.response,
      ...convertRecordValuesToString(variableContext),
    });
    const level = action.level || "info";
    if (level === "info") {
      vscode.window.showInformationMessage(msg);
    } else if (level === "warning") {
      vscode.window.showWarningMessage(msg);
    } else if (level === "error") {
      vscode.window.showErrorMessage(msg);
    }
  }
}

/**
 * Handles the "setVariable" action, extracting a value from the response.
 */
export function handleSetVariableAction(
  action: GdbToolboxAction,
  response: any,
  variableContext: Record<string, string | number>,
): void {
  if (action.name && action.regex) {
    const regex = new RegExp(action.regex);
    const target =
      typeof response === "string" ? response : JSON.stringify(response);
    const match = regex.exec(target);
    if (match && match[1]) {
      const value = match[1];
      const trimmed = value.trim();
      variableContext[action.name] =
        trimmed !== "" && !isNaN(Number(trimmed)) ? Number(trimmed) : value;
    }
  }
}

/**
 * Handles the "conditional" action, executing "then" or "else" actions using Jexl for condition evaluation.
 */
export async function handleConditionalAction(
  action: GdbToolboxAction,
  context: Record<string, any>,
  session: vscode.DebugSession,
  executeActions: (
    actions: GdbToolboxAction[],
    response: any,
    session: vscode.DebugSession,
  ) => Promise<void>,
): Promise<void> {
  const condition = action.condition || "";
  let result = false;
  result = Jexl.evalSync(condition, context);

  if (result && Array.isArray(action.then)) {
    await executeActions(action.then, context.gdbOutput, session);
  } else if (!result && Array.isArray(action.else)) {
    await executeActions(action.else, context.gdbOutput, session);
  }
}

export async function handleOpenDisassemblyAction(): Promise<void> {
  // Open the disassembly view
  await vscode.commands.executeCommand(OPEN_DISASSEMBLY_COMMAND_ID);
}
