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
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { substituteVars } from "./variable-utils";

/**
 * FileUtils provides utility functions for reading, writing, and resolving
 * file paths within the workspace. It handles variable substitution and ensures
 * directories exist before writing or appending files.
 */
export class FileUtils {
  /**
   * Returns the root path of the first workspace folder.
   */
  static getWorkspaceRoot(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error("No workspace folder is open.");
    }
    return workspaceFolders[0].uri.fsPath;
  }

  /**
   * Resolves a file path relative to the workspace, applying variable substitution.
   */
  static resolveFilePath(
    filePath: string,
    context: Record<string, string>,
  ): string {
    const workspaceRoot = this.getWorkspaceRoot();
    const resolvedPath = substituteVars(filePath, context);
    return path.resolve(workspaceRoot, resolvedPath);
  }

  /**
   * Writes content to a file, creating directories as needed.
   * Applies variable substitution to both path and content.
   */
  static writeFile(
    filePath: string,
    content: string,
    context: Record<string, string>,
    lastResponse: { command: string; response: any } | null,
  ): void {
    const resolvedPath = path.resolve(substituteVars(filePath, context));
    const resolvedContent = substituteVars(content, {
      ...context,
      gdbOutput: lastResponse?.response || "",
    });

    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolvedPath, resolvedContent, "utf8");
  }

  /**
   * Resolves a file path relative to the workspace root.
   */
  static resolveWorkspaceFilePath(filePath: string): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error("No workspace folder is open.");
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    return path.resolve(workspaceRoot, filePath);
  }

  /**
   * Appends content to a file, creating directories as needed.
   * Applies variable substitution to both path and content.
   */
  static appendFile(
    filePath: string,
    content: string,
    response: any,
    context: Record<string, string>,
  ): void {
    const resolvedPath = this.resolveFilePath(filePath, context);
    const resolvedContent = substituteVars(content, {
      ...context,
      response: JSON.stringify(response),
    });

    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.appendFileSync(resolvedPath, resolvedContent, "utf8");
  }
}
