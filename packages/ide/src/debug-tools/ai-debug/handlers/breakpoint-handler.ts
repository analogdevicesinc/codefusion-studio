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

import * as vscode from "vscode";

export interface BreakpointLocation {
  file: string;
  line: number;
  condition?: string;
}

/**
 * Handles breakpoint-related commands from chat.
 */
export class BreakpointHandler {
  /**
   * Handles breakpoint commands (set, remove, list).
   * @returns true if the command was handled, false otherwise
   */
  async handle(
    prompt: string,
    stream: vscode.ChatResponseStream,
  ): Promise<boolean> {
    const lowerPrompt = prompt.toLowerCase();

    // Check for remove breakpoint intent FIRST (before set, since "breakpoint at" matches both)
    if (
      lowerPrompt.includes("remove breakpoint") ||
      lowerPrompt.includes("delete breakpoint") ||
      lowerPrompt.includes("clear breakpoint") ||
      lowerPrompt.includes("all breakpoint") ||
      lowerPrompt.includes("clear all")
    ) {
      return this.handleRemove(prompt, lowerPrompt, stream);
    }

    // Check for set breakpoint intent (after remove check)
    if (
      lowerPrompt.includes("set breakpoint") ||
      lowerPrompt.includes("add breakpoint") ||
      lowerPrompt.includes("breakpoint at")
    ) {
      return this.handleSet(prompt, stream);
    }

    // Check for list breakpoints intent
    if (
      lowerPrompt.includes("list breakpoint") ||
      lowerPrompt.includes("show breakpoint") ||
      lowerPrompt === "breakpoints"
    ) {
      return this.handleList(stream);
    }

    return false;
  }

  private async handleRemove(
    prompt: string,
    lowerPrompt: string,
    stream: vscode.ChatResponseStream,
  ): Promise<boolean> {
    // Check for "all breakpoints" or "clear all"
    if (
      lowerPrompt.includes("all breakpoint") ||
      lowerPrompt.includes("clear all")
    ) {
      const breakpoints = vscode.debug.breakpoints;
      if (breakpoints.length > 0) {
        vscode.debug.removeBreakpoints(breakpoints);
        stream.markdown(`✓ Removed all ${breakpoints.length} breakpoint(s)\n`);
      } else {
        stream.markdown("No breakpoints to remove\n");
      }
      return true;
    }

    const location = this.parseLocation(prompt);
    if (location) {
      const success = await this.removeBreakpoint(location.file, location.line);
      if (success) {
        stream.markdown(
          `✓ Breakpoint removed from **${location.file}:${location.line}**\n`,
        );
      } else {
        stream.markdown(
          `❌ No breakpoint found at ${location.file}:${location.line}\n`,
        );
      }
    } else {
      // Show current breakpoints and ask which to remove
      const breakpoints = vscode.debug.breakpoints.filter(
        (bp) => bp instanceof vscode.SourceBreakpoint,
      ) as vscode.SourceBreakpoint[];

      if (breakpoints.length === 0) {
        stream.markdown("No breakpoints to remove\n");
      } else {
        stream.markdown(
          "**Current breakpoints** - specify which to remove:\n\n",
        );
        breakpoints.forEach((bp, index) => {
          const fileName = bp.location.uri.fsPath.split(/[/\\]/).pop();
          const line = bp.location.range.start.line + 1;
          stream.markdown(`${index + 1}. ${fileName}:${line}\n`);
        });
        stream.markdown(
          '\nSay "remove breakpoint at <file>:<line>" or "clear all breakpoints"\n',
        );
      }
    }
    return true;
  }

  private async handleSet(
    prompt: string,
    stream: vscode.ChatResponseStream,
  ): Promise<boolean> {
    const location = this.parseLocation(prompt);

    if (location) {
      const success = await this.setBreakpoint(
        location.file,
        location.line,
        location.condition,
      );
      if (success) {
        stream.markdown(
          `✓ Breakpoint set at **${location.file}:${location.line}**\n`,
        );
        if (location.condition) {
          stream.markdown(`  Condition: \`${location.condition}\`\n`);
        }
      } else {
        stream.markdown(
          `❌ Failed to set breakpoint at ${location.file}:${location.line}\n`,
        );
      }
    } else {
      stream.markdown(
        'Please specify a location, e.g., "set breakpoint at main.c line 42" or "breakpoint at main.c:42"\n',
      );

      // Offer current file as option
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const fileName = activeEditor.document.fileName.split(/[/\\]/).pop();
        stream.markdown(`\nCurrent file: **${fileName}**\n`);
      }
    }
    return true;
  }

  private handleList(stream: vscode.ChatResponseStream): boolean {
    const breakpoints = vscode.debug.breakpoints;
    if (breakpoints.length === 0) {
      stream.markdown("No breakpoints set\n");
    } else {
      stream.markdown("**Current Breakpoints:**\n\n");
      breakpoints.forEach((bp, index) => {
        if (bp instanceof vscode.SourceBreakpoint) {
          const location = bp.location;
          const fileName = location.uri.fsPath.split(/[/\\]/).pop();
          const line = location.range.start.line + 1;
          const enabled = bp.enabled ? "🔴" : "⚪";
          stream.markdown(`${index + 1}. ${enabled} ${fileName}:${line}\n`);
        }
      });
    }
    return true;
  }

  /**
   * Parses a breakpoint location from user input.
   */
  parseLocation(prompt: string): BreakpointLocation | null {
    // Try pattern: "file.c line 42" or "file.c:42"
    const linePattern =
      /([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z]+)[:\s]+(?:line\s+)?(\d+)/i;
    const match = prompt.match(linePattern);

    if (match) {
      const file = match[1];
      const line = parseInt(match[2], 10);

      // Check for condition
      const conditionMatch = prompt.match(/(?:when|if|condition)\s+(.+)/i);
      const condition = conditionMatch ? conditionMatch[1].trim() : undefined;

      return { file, line, condition };
    }

    // Try pattern: "at line 42" or "on line 42" (for current file)
    const currentFilePattern = /(?:at|on)\s+line\s+(\d+)/i;
    const currentMatch = prompt.match(currentFilePattern);

    if (currentMatch) {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const file = activeEditor.document.fileName.split(/[/\\]/).pop() || "";
        const line = parseInt(currentMatch[1], 10);
        return { file, line };
      }
    }

    return null;
  }

  /**
   * Sets a breakpoint at the specified location.
   */
  async setBreakpoint(
    fileName: string,
    line: number,
    condition?: string,
  ): Promise<boolean> {
    try {
      const uri = await this.findFileInWorkspace(fileName);
      if (!uri) {
        return false;
      }

      const location = new vscode.Location(
        uri,
        new vscode.Position(line - 1, 0),
      );
      const breakpoint = condition
        ? new vscode.SourceBreakpoint(location, true, condition)
        : new vscode.SourceBreakpoint(location);

      vscode.debug.addBreakpoints([breakpoint]);
      return true;
    } catch (error) {
      console.error("Error setting breakpoint:", error);
      return false;
    }
  }

  /**
   * Removes a breakpoint at the specified location.
   */
  async removeBreakpoint(fileName: string, line: number): Promise<boolean> {
    try {
      const uri = await this.findFileInWorkspace(fileName);
      const targetFileName = fileName.toLowerCase();

      const breakpoints = vscode.debug.breakpoints.filter((bp) => {
        if (bp instanceof vscode.SourceBreakpoint) {
          const bpPath = bp.location.uri.fsPath;
          const bpFileName = bpPath.split(/[/\\]/).pop()?.toLowerCase() || "";
          const lineMatches = bp.location.range.start.line === line - 1;

          if (uri) {
            return (
              bpPath.toLowerCase() === uri.fsPath.toLowerCase() && lineMatches
            );
          } else {
            return bpFileName === targetFileName && lineMatches;
          }
        }
        return false;
      });

      if (breakpoints.length > 0) {
        vscode.debug.removeBreakpoints(breakpoints);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error removing breakpoint:", error);
      return false;
    }
  }

  /**
   * Finds a file in the workspace by name.
   */
  async findFileInWorkspace(fileName: string): Promise<vscode.Uri | null> {
    // Try as absolute path first (drive letter on Windows)
    if (/^[a-zA-Z]:[/\\]/.test(fileName)) {
      const uri = vscode.Uri.file(fileName);
      try {
        await vscode.workspace.fs.stat(uri);
        return uri;
      } catch {
        // File doesn't exist, continue searching
      }
    }

    // Normalize to forward slashes and strip leading separators for glob matching
    const normalizedName = fileName.replace(/\\/g, "/").replace(/^\/+/, "");

    // Search in workspace
    const files = await vscode.workspace.findFiles(
      `**/${normalizedName}`,
      "**/node_modules/**",
      1,
    );
    return files.length > 0 ? files[0] : null;
  }
}
