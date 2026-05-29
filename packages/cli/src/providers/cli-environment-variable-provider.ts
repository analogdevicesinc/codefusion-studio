/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {homedir} from 'node:os';
import {basename, sep} from 'node:path';

/**
 * CLI implementation of VS Code predefined variable resolution.
 *
 * VS Code resolves these variables natively in the IDE; this provider
 * replicates that behavior for headless CLI execution.
 *
 * Supported variables (see https://code.visualstudio.com/docs/reference/variables-reference):
 * - ${workspaceFolderBasename} — basename of the workspace folder
 * - ${userHome} — user's home directory
 * - ${pathSeparator} / ${/} — OS path separator
 *
 * Not applicable in CLI context (no editor state):
 * - ${file}, ${fileBasename}, ${fileDirname}, ${relativeFile}, etc.
 * - ${lineNumber}, ${columnNumber}, ${selectedText}
 * - ${execPath}, ${defaultBuildTask}
 */
export class CliEnvironmentVariableProvider {
  private workspaceFolder: string;

  constructor(workspaceFolder: string) {
    this.workspaceFolder = workspaceFolder;
  }

  /**
   * Resolve a VS Code predefined variable by name.
   *
   * @param varName - Variable name without ${} wrapper (e.g., "workspaceFolderBasename")
   * @returns Resolved value or undefined if not a recognized predefined variable
   */
  public resolve(varName: string): string | undefined {
    switch (varName) {
      case 'workspaceFolderBasename': {
        return basename(this.workspaceFolder);
      }

      case 'userHome': {
        return homedir();
      }

      case 'pathSeparator':
      case '/': {
        return sep;
      }

      default: {
        return undefined;
      }
    }
  }

  /**
   * Update workspace folder context for task-scoped resolution.
   *
   * In multi-project workspaces, each task has its own cwd (e.g., m4/, riscv/).
   * Call this before resolving variables for each task so that
   * ${workspaceFolderBasename} resolves to the project folder name,
   * matching VS Code's multi-root workspace behavior.
   *
   * @param folder - Absolute path to the task's workspace folder
   * @returns void
   */
  public setWorkspaceFolder(folder: string): void {
    this.workspaceFolder = folder;
  }
}
