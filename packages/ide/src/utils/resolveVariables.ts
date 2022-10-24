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

 * Portions Copyright (c) 2023-2024 Analog Devices, Inc. All Rights Reserved.
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
  if (string && string.includes("${config")) {
    string = string.replace("config:", "");
    const start = string.indexOf("{");
    const end = string.indexOf("}");
    const confSettingName = string.substring(start + 1, end);

    if (confSettingName) {
      const conf = vscode.workspace.getConfiguration();
      const replaceStr = "${" + confSettingName + "}";
      if (replaceStr.match(/\${(config:(.*?))}/)) {
        string = string.replace(
          replaceStr,
          "${" + conf.get(confSettingName) + "}",
        );
      } else {
        string = string.replace(
          replaceStr,
          "" + conf.get(confSettingName) + "",
        );
      }
    }
  }
  if (string.includes("${userHome}")) {
    string = string.replace(/\${userHome}/g, os.homedir());
  }
  if (vscode.workspace.workspaceFolders) {
    const workspaces = vscode.workspace.workspaceFolders;
    const workspace = vscode.workspace.workspaceFolders.length
      ? vscode.workspace.workspaceFolders[0]
      : null;
    const activeFile = vscode.window.activeTextEditor?.document;
    const absoluteFilePath = activeFile?.uri.fsPath;

    if (workspace) {
      string = string.replace(/\${workspaceFolder}/g, workspace.uri.fsPath);
      string = string.replace(/\${workspaceFolderBasename}/g, workspace.name);
      string = absoluteFilePath
        ? string.replace(/\${file}/g, absoluteFilePath)
        : string;
    }

    let activeWorkspace = workspace;
    let relativeFilePath = absoluteFilePath;
    if (absoluteFilePath) {
      for (const tempWorkspace1 in workspaces) {
        const tempWorkspace = vscode.Uri.file(tempWorkspace1);
        if (
          absoluteFilePath.replace(tempWorkspace.fsPath, "") !==
          absoluteFilePath
        ) {
          activeWorkspace = workspace;
          relativeFilePath = absoluteFilePath
            .replace(tempWorkspace.fsPath, "")
            .substring(path.sep.length);
          break;
        }
      }

      const parsedPath = path.parse(absoluteFilePath);
      string = string.replace(
        /\${fileWorkspaceFolder}/g,
        activeWorkspace ? activeWorkspace.uri.fsPath : "",
      );
      string = string.replace(
        /\${relativeFile}/g,
        relativeFilePath ? relativeFilePath : "",
      );

      string = string.replace(
        /\${relativeFileDirname}/g,
        relativeFilePath
          ? relativeFilePath.substring(
              0,
              relativeFilePath.lastIndexOf(path.sep),
            )
          : "",
      );

      string = string.replace(/\${fileBasename}/g, parsedPath.base);
      string = string.replace(/\${fileBasenameNoExtension}/g, parsedPath.name);
      string = string.replace(/\${fileExtname}/g, parsedPath.ext);
      string = string.replace(
        /\${fileDirname}/g,
        parsedPath.dir.substring(parsedPath.dir.lastIndexOf(path.sep) + 1),
      );
      string = string.replace(/\${cwd}/g, parsedPath.dir);
      string = string.replace(/\${pathSeparator}/g, path.sep);
      if (
        vscode.window.activeTextEditor &&
        vscode.window.activeTextEditor.selections
      ) {
        const firstSelection = vscode.window.activeTextEditor.selections[0];
        const lineReplace = String(firstSelection.start.line + 1);
        string = string.replace(/\${lineNumber}/g, lineReplace);
        string = string.replace(
          /\${selectedText}/g,
          vscode.window.activeTextEditor.document.getText(
            new vscode.Range(firstSelection.start, firstSelection.end),
          ),
        );
      }
      string = string.replace(/\${env:(.*?)}/g, function (variable: string) {
        const variableMatch = variable.match(/\${env:(.*?)}/);

        if (variableMatch && variableMatch.length > 1) {
          return process.env[variableMatch[1]] || "";
        } else {
          return "";
        }
      });
    }
  }
  if (
    recursive &&
    string.match(
      /\${(workspaceFolder|workspaceFolderBasename|fileWorkspaceFolder|relativeFile|fileBasename|fileBasenameNoExtension|fileExtname|fileDirname|cwd|pathSeparator|lineNumber|selectedText|env:(.*?)|config:(.*?))}/,
    )
  ) {
    string = resolveVariables(string, recursive);
  }
  return string;
}
