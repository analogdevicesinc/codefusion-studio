/**
 *
 * MIT License
 * Copyright (c) 2021 Dominic Vonk
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.

 * Portions Copyright (c) 2023-2026 Analog Devices, Inc. All Rights Reserved.
 */

import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

/**
 * This function resolves config names
 * @param string - Input of the config that needs to be resolved
 * @param recursive - Set true if you would like to resolve to final path
 */
export function resolveVariables(string: string, recursive = false): string {
  if (!string) {
    return string;
  }

  const hasUnresolvedVariables = (value: string): boolean =>
    /\${(workspaceFolder|workspaceFolderBasename|file|fileWorkspaceFolder|relativeFile|relativeFileDirname|fileBasename|fileBasenameNoExtension|fileExtname|fileDirname|cwd|pathSeparator|lineNumber|selectedText|userHome|env:(.*?)|config:(.*?))}/.test(
      value,
    );

  const maxPasses = recursive ? 25 : 1;
  const conf = vscode.workspace.getConfiguration();
  let resolved = string;

  for (let pass = 0; pass < maxPasses; pass++) {
    const previous = resolved;

    resolved = resolved.replace(
      /\${config:([^}]+)}/g,
      (_match, key: string) => {
        const value = conf.get<unknown>(key.trim());
        if (value === undefined || value === null) {
          return "";
        }
        return String(value);
      },
    );

    if (resolved.includes("${userHome}")) {
      resolved = resolveUserHomePath(resolved);
    }

    const workspaces = vscode.workspace.workspaceFolders;
    const workspace = workspaces?.length ? workspaces[0] : undefined;
    const activeFile = vscode.window.activeTextEditor?.document;
    const absoluteFilePath = activeFile?.uri.fsPath;

    if (workspace) {
      resolved = resolved.replace(/\${workspaceFolder}/g, workspace.uri.fsPath);
      resolved = resolved.replace(
        /\${workspaceFolderBasename}/g,
        workspace.name,
      );
      if (absoluteFilePath) {
        resolved = resolved.replace(/\${file}/g, absoluteFilePath);
      }
    }

    if (absoluteFilePath) {
      const activeWorkspace =
        (activeFile
          ? vscode.workspace.getWorkspaceFolder(activeFile.uri)
          : undefined) ?? workspace;
      const relativeFilePath = activeWorkspace
        ? path.relative(activeWorkspace.uri.fsPath, absoluteFilePath)
        : absoluteFilePath;

      const parsedPath = path.parse(absoluteFilePath);
      resolved = resolved.replace(
        /\${fileWorkspaceFolder}/g,
        activeWorkspace ? activeWorkspace.uri.fsPath : "",
      );
      resolved = resolved.replace(/\${relativeFile}/g, relativeFilePath);

      resolved = resolved.replace(
        /\${relativeFileDirname}/g,
        relativeFilePath.includes(path.sep)
          ? relativeFilePath.substring(
              0,
              relativeFilePath.lastIndexOf(path.sep),
            )
          : "",
      );

      resolved = resolved.replace(/\${fileBasename}/g, parsedPath.base);
      resolved = resolved.replace(
        /\${fileBasenameNoExtension}/g,
        parsedPath.name,
      );
      resolved = resolved.replace(/\${fileExtname}/g, parsedPath.ext);
      resolved = resolved.replace(
        /\${fileDirname}/g,
        parsedPath.dir.substring(parsedPath.dir.lastIndexOf(path.sep) + 1),
      );
      resolved = resolved.replace(/\${cwd}/g, parsedPath.dir);
      resolved = resolved.replace(/\${pathSeparator}/g, path.sep);

      const firstSelection = vscode.window.activeTextEditor?.selections?.[0];
      if (firstSelection) {
        resolved = resolved.replace(
          /\${lineNumber}/g,
          String(firstSelection.start.line + 1),
        );
        resolved = resolved.replace(
          /\${selectedText}/g,
          activeFile.getText(
            new vscode.Range(firstSelection.start, firstSelection.end),
          ),
        );
      }
    }

    resolved = resolved.replace(
      /\${env:([^}]+)}/g,
      (_match, envName: string) => {
        return process.env[envName] || "";
      },
    );

    if (
      !recursive ||
      resolved === previous ||
      !hasUnresolvedVariables(resolved)
    ) {
      break;
    }
  }

  return resolved;
}

/**
 * Resolves user home path variables in the format ${userHome}
 * @param string - Input string that may contain user home variables
 * @returns String with user home paths resolved
 */
export function resolveUserHomePath(string: string): string {
  return string.replace(/\${userHome}/g, os.homedir());
}
