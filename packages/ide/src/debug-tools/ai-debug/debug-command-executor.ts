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
import { CfsDebugManager } from "../debug-manager";
import * as path from "path";

/** Time (ms) to wait for the stop event after calling stopDebugging. */
const STOP_CONFIRMATION_DELAY_MS = 100;

/** Time (ms) to wait for a new session to appear after a restart. */
const RESTART_TIMEOUT_MS = 10_000;

/**
 * Shared executor for debug lifecycle commands.
 * Used by both MCP server and chat participant.
 */
export class DebugCommandExecutor {
  constructor(private debugManager: CfsDebugManager) {}

  /**
   * Start a debug session
   */
  async startDebugging(configName?: string): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return "❌ No workspace folder open";
    }

    // If config name provided, find and start it
    if (configName) {
      for (const folder of workspaceFolders) {
        const launchConfig = vscode.workspace.getConfiguration(
          "launch",
          folder,
        );
        const configurations = launchConfig.get<any[]>("configurations", []);
        const config = configurations.find((c) =>
          c.name.toLowerCase().includes(configName.toLowerCase()),
        );

        if (config) {
          const success = await vscode.debug.startDebugging(
            folder,
            config.name,
          );
          return success
            ? `✅ Started debugging with configuration: **${config.name}**`
            : `❌ Failed to start debugging with configuration: **${config.name}**`;
        }
      }
      return `❌ Debug configuration not found: **${configName}**`;
    }

    // Get all available configurations
    const allConfigs: Array<{ name: string; folder: vscode.WorkspaceFolder }> =
      [];
    for (const folder of workspaceFolders) {
      const launchConfig = vscode.workspace.getConfiguration("launch", folder);
      const configurations = launchConfig.get<any[]>("configurations", []);
      configurations.forEach((config) => {
        allConfigs.push({ name: config.name, folder });
      });
    }

    if (allConfigs.length === 0) {
      return "❌ No debug configurations found. Please configure debugging first.";
    }

    // Start with first available config
    const firstConfig = allConfigs[0];
    const success = await vscode.debug.startDebugging(
      firstConfig.folder,
      firstConfig.name,
    );
    return success
      ? `✅ Started debugging with configuration: **${firstConfig.name}**`
      : `❌ Failed to start debugging`;
  }

  /**
   * Stop the current debug session
   */
  async stopDebugging(): Promise<string> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      return "⚠️  No active debug session to stop";
    }

    const sessionName = session.name;
    await vscode.debug.stopDebugging(session);

    // Wait a bit to confirm stop
    await new Promise((resolve) =>
      setTimeout(resolve, STOP_CONFIRMATION_DELAY_MS),
    );

    return `✅ Stopped debug session: **${sessionName}**`;
  }

  /**
   * Continue execution
   */
  async continue(): Promise<string> {
    const session = this.debugManager.getActiveSession();
    if (!session) {
      return "⚠️  No active debug session";
    }

    await session.continue();
    return "▶️  Continuing execution";
  }

  /**
   * Step over
   */
  async stepOver(): Promise<string> {
    const session = this.debugManager.getActiveSession();
    if (!session) {
      return "⚠️  No active debug session";
    }

    await session.stepOver();
    return "⏭️  Stepped over";
  }

  /**
   * Step into
   */
  async stepInto(): Promise<string> {
    const session = this.debugManager.getActiveSession();
    if (!session) {
      return "⚠️  No active debug session";
    }

    await session.stepInto();
    return "⤵️  Stepped into function";
  }

  /**
   * Step out
   */
  async stepOut(): Promise<string> {
    const session = this.debugManager.getActiveSession();
    if (!session) {
      return "⚠️  No active debug session";
    }

    await session.stepOut();
    return "⤴️  Stepped out of function";
  }

  /**
   * Pause execution
   */
  async pause(): Promise<string> {
    const session = this.debugManager.getActiveSession();
    if (!session) {
      return "⚠️  No active debug session";
    }

    await session.pause();
    return "⏸️  Paused execution";
  }

  /**
   * Restart debugging.
   * Waits for the new session to start before returning.
   */
  async restart(): Promise<string> {
    const session = vscode.debug.activeDebugSession;
    if (!session) {
      return "⚠️  No active debug session to restart";
    }

    const oldSessionId = session.id;

    // Wait for a new session to start after restart, with a timeout
    const sessionRestarted = new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        disposable.dispose();
        resolve(false);
      }, RESTART_TIMEOUT_MS);

      const disposable = vscode.debug.onDidStartDebugSession((newSession) => {
        if (newSession.id !== oldSessionId) {
          clearTimeout(timeout);
          disposable.dispose();
          resolve(true);
        }
      });
    });

    await vscode.commands.executeCommand("workbench.action.debug.restart");

    const restarted = await sessionRestarted;

    if (restarted) {
      return "🔄 Restarted debug session";
    }

    return "⚠️  Restart was initiated but the new session did not start within the expected time. Check the Debug Console for errors.";
  }

  /**
   * Set a breakpoint
   */
  async setBreakpoint(
    file: string,
    line: number,
    condition?: string,
  ): Promise<string> {
    if (!path.isAbsolute(file)) {
      // We have a problem with relative paths since we have multiple
      // workspace folders. First workspace is typically .cfs folder,
      // but that doesn't contain any source file and vscode.workspace.findFiles
      // won't find anything. Other workspace folders exist such as m4, etc.
      // but these are not typically seen by the MCP clients as root folders to
      // define relative paths against them.
      // More specifically, MCP server was using for example `m4/src/main.c` as file
      // path which is not relative to either /.cfs nor /m4 (it is included on it).
      // Rather than overcomplicating things, let's request absolute paths only which
      // should be 100% unambiguous and work regardless of the workspace folder structure.
      throw Error(
        `Relative paths are not supported. Please provide an absolute path.`,
      );
    }

    const uri = vscode.Uri.file(file);

    // Technically vs code allow us to set breakpoints on files that do not exist,
    // but for the moment let's prevent that from happening.
    // fs.stat will throw an exception if the file does not exist.
    const stat = await vscode.workspace.fs.stat(uri);
    // eslint-disable-next-line no-bitwise
    if ((stat.type & vscode.FileType.File) === 0) {
      throw Error(`Path ${file} is not a file.`);
    }

    const location = new vscode.Location(uri, new vscode.Position(line - 1, 0));
    const breakpoint = condition
      ? new vscode.SourceBreakpoint(location, true, condition)
      : new vscode.SourceBreakpoint(location);

    vscode.debug.addBreakpoints([breakpoint]);

    const filePath = uri.fsPath;
    return condition
      ? `🔴 Breakpoint set at **${filePath}:${line}**\n   Condition: \`${condition}\``
      : `🔴 Breakpoint set at **${filePath}:${line}**`;
  }

  /**
   * Remove breakpoints
   */
  async removeBreakpoints(file?: string, line?: number): Promise<string> {
    let breakpointsToRemove = vscode.debug.breakpoints;

    if (file) {
      if (!path.isAbsolute(file)) {
        // Read message above about limitations with relative paths
        throw Error(
          `Relative paths are not supported. Please provide an absolute path.`,
        );
      }

      const uri = vscode.Uri.file(file);

      breakpointsToRemove = breakpointsToRemove.filter((bp) => {
        if (bp instanceof vscode.SourceBreakpoint) {
          const bpPath =
            process.platform === "win32"
              ? bp.location.uri.fsPath.toLowerCase()
              : bp.location.uri.fsPath;
          const targetPath =
            process.platform === "win32"
              ? uri.fsPath.toLowerCase()
              : uri.fsPath;

          if (bpPath === targetPath) {
            return (
              line === undefined || bp.location.range.start.line === line - 1
            );
          }
        }
        return false;
      });
    } else if (line !== undefined) {
      throw Error(
        `Line number provided without file. Please provide an absolute file path along with the line number.`,
      );
    }

    if (breakpointsToRemove.length === 0) {
      if (file) {
        throw Error(
          `No breakpoints found for the specified location: ${file}${line !== undefined ? `:${line}` : ""}.`,
        );
      } else {
        // Do not consider an error in case user requested all breakpoints to be removed
        // since the user may use this to get to a clean state without checking for breakpoint
        // existence first.
        return "⚠️  No breakpoints to remove";
      }
    }
    vscode.debug.removeBreakpoints(breakpointsToRemove);
    return (
      "Removed the following breakpoints:\n" +
      breakpointsToRemove
        .map((bp) => {
          if (bp instanceof vscode.SourceBreakpoint) {
            const filePath = bp.location.uri.fsPath;
            const line = bp.location.range.start.line + 1;
            return `- **${filePath}:${line}**`;
          }
          if (bp instanceof vscode.FunctionBreakpoint) {
            return `- Function: **${bp.functionName}**`;
          }
          return `- Breakpoint ID: **${bp.id}**`;
        })
        .join("\n")
    );
  }

  /**
   * List all breakpoints
   */
  async listBreakpoints(): Promise<string> {
    const breakpoints = vscode.debug.breakpoints;

    if (breakpoints.length === 0) {
      return "ℹ️  No breakpoints set";
    }

    const lines: string[] = [
      `📍 **Active Breakpoints** (${breakpoints.length})\n`,
    ];

    breakpoints.forEach((bp, index) => {
      if (bp instanceof vscode.SourceBreakpoint) {
        const filePath = bp.location.uri.fsPath;
        const line = bp.location.range.start.line + 1;
        const enabled = bp.enabled ? "🔴" : "⚪";
        const condition = bp.condition
          ? ` - Condition: \`${bp.condition}\``
          : "";
        lines.push(
          `${index + 1}. ${enabled} **${filePath}:${line}**${condition}`,
        );
      }
    });

    return lines.join("\n");
  }

  /**
   * Analyze code for potential issues
   */
  async analyzeCode(pattern?: string): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      return "❌ No workspace folder open";
    }

    // Define comprehensive bug patterns for embedded systems
    const bugPatterns = [
      {
        pattern: /\/\/\s*(TODO|FIXME|HACK|XXX|BUG)/gi,
        severity: "⚠️",
        description: "Unresolved comments",
        category: "Code Quality",
      },
      {
        pattern: /\bif\s*\([^)]*=[^=]/g,
        severity: "🔴",
        description: "Potential assignment in condition",
        category: "Logic Error",
      },
      {
        pattern: /\b(malloc|calloc|realloc)\s*\([^)]*\)(?!\s*;)/g,
        severity: "🔴",
        description: "Unchecked memory allocation",
        category: "Memory Leak",
      },
      {
        pattern: /\bfree\s*\([^)]*\)(?!.*=\s*NULL)/g,
        severity: "⚠️",
        description: "Pointer not set to NULL after free",
        category: "Dangling Pointer",
      },
      {
        pattern: /\bwhile\s*\(\s*1\s*\)(?!.*\/\/.*watchdog)/gi,
        severity: "⚠️",
        description: "Infinite loop without watchdog comment",
        category: "Control Flow",
      },
      {
        pattern: /\b(strcmp|strncmp|memcmp)\s*\([^)]*\)\s*==\s*1/g,
        severity: "🔴",
        description: "Incorrect string comparison (should be == 0)",
        category: "Logic Error",
      },
      {
        pattern: /\bsizeof\s*\(\s*\*[^)]*\)/g,
        severity: "⚠️",
        description: "sizeof on dereferenced pointer",
        category: "Memory Error",
      },
      {
        pattern: /\bprintf\s*\([^)]*\)/g,
        severity: "ℹ️",
        description: "Printf in production code (consider logging)",
        category: "Debug Code",
      },
      {
        pattern: /\b__disable_irq\s*\(\s*\)(?!.*__enable_irq)/g,
        severity: "🔴",
        description: "IRQ disabled without re-enable",
        category: "Critical Section",
      },
      {
        pattern: /\bvolatile\s+(?!.*\s+(uint|int|bool|char))/g,
        severity: "⚠️",
        description: "Suspicious volatile usage",
        category: "Concurrency",
      },
      {
        pattern: /\b(uint8_t|uint16_t|uint32_t)\s+\w+\s*=\s*-?\d+\s*;/g,
        severity: "⚠️",
        description: "Potential integer overflow/underflow",
        category: "Type Safety",
      },
      {
        pattern: /\breturn\s*(?!;|.*\w)/g,
        severity: "🔴",
        description: "Empty return in non-void function",
        category: "Logic Error",
      },
    ];

    // Use custom pattern if provided
    const patternsToSearch = pattern
      ? [
          {
            pattern: new RegExp(pattern, "gi"),
            severity: "🔍",
            description: "custom search pattern",
            category: "Custom Search",
          },
        ]
      : bugPatterns;

    interface BugReport {
      file: string;
      line: number;
      column: number;
      severity: string;
      description: string;
      category: string;
      code: string;
    }

    const bugs: BugReport[] = [];
    const fileCount = new Map<string, number>();

    // Progress tracking
    const searchResults = await vscode.workspace.findFiles(
      "**/*.{c,cpp,h,hpp,cc,cxx}",
      "**/node_modules/**",
      1000,
    );

    if (searchResults.length === 0) {
      return "ℹ️  No C/C++ source files found in workspace";
    }

    // Analyze each file
    for (const file of searchResults) {
      const document = await vscode.workspace.openTextDocument(file);
      const text = document.getText();
      const lines = text.split("\n");
      const fileName = file.fsPath.split(/[/\\]/).pop() || "";

      for (const bugPattern of patternsToSearch) {
        const matches = text.matchAll(bugPattern.pattern);

        for (const match of matches) {
          if (match.index !== undefined) {
            // Find line and column
            const position = document.positionAt(match.index);
            const line = position.line + 1;
            const column = position.character + 1;
            const codeLine = lines[position.line].trim();

            bugs.push({
              file: fileName,
              line,
              column,
              severity: bugPattern.severity,
              description: bugPattern.description,
              category: bugPattern.category,
              code: codeLine,
            });

            // Track file issue counts
            fileCount.set(fileName, (fileCount.get(fileName) || 0) + 1);
          }
        }
      }
    }

    if (bugs.length === 0) {
      return pattern
        ? `✅ No matches found for pattern: \`${pattern}\``
        : "✅ **Code Analysis Complete**\n\nNo potential issues detected. Your code looks clean!";
    }

    // Sort bugs by severity and file
    const severityOrder: { [key: string]: number } = {
      "🔴": 1,
      "⚠️": 2,
      ℹ️: 3,
      "🔍": 4,
    };
    bugs.sort(
      (a, b) =>
        severityOrder[a.severity] - severityOrder[b.severity] ||
        a.file.localeCompare(b.file) ||
        a.line - b.line,
    );

    // Build comprehensive report
    const report: string[] = [];
    report.push(`# 🔍 **Code Analysis Report**\n`);
    report.push(
      `**Analyzed:** ${searchResults.length} file(s) | **Found:** ${bugs.length} potential issue(s)\n`,
    );

    // Summary by severity
    const severityCounts = bugs.reduce(
      (acc, bug) => {
        acc[bug.severity] = (acc[bug.severity] || 0) + 1;
        return acc;
      },
      {} as { [key: string]: number },
    );

    report.push(`## Summary by Severity\n`);
    if (severityCounts["🔴"])
      report.push(`- 🔴 **Critical**: ${severityCounts["🔴"]}`);
    if (severityCounts["⚠️"])
      report.push(`- ⚠️ **Warning**: ${severityCounts["⚠️"]}`);
    if (severityCounts["ℹ️"])
      report.push(`- ℹ️ **Info**: ${severityCounts["ℹ️"]}`);
    if (severityCounts["🔍"])
      report.push(`- 🔍 **Custom**: ${severityCounts["🔍"]}`);
    report.push("");

    // Group by category
    const categoryGroups = bugs.reduce(
      (acc, bug) => {
        if (!acc[bug.category]) acc[bug.category] = [];
        acc[bug.category].push(bug);
        return acc;
      },
      {} as { [key: string]: BugReport[] },
    );

    report.push(`## Issues by Category\n`);

    for (const [category, categoryBugs] of Object.entries(categoryGroups)) {
      report.push(`### ${category} (${categoryBugs.length})\n`);

      // Limit to top 10 per category for readability
      const displayBugs = categoryBugs.slice(0, 10);

      for (const bug of displayBugs) {
        report.push(
          `${bug.severity} **${bug.file}:${bug.line}:${bug.column}** - ${bug.description}`,
        );
        report.push(`   \`\`\`c\n   ${bug.code}\n   \`\`\``);
      }

      if (categoryBugs.length > 10) {
        report.push(
          `   *...and ${categoryBugs.length - 10} more issue(s) in this category*\n`,
        );
      }
      report.push("");
    }

    // Top files with most issues
    const topFiles = Array.from(fileCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topFiles.length > 0) {
      report.push(`## Files Needing Attention\n`);
      topFiles.forEach(([file, count], index) => {
        report.push(`${index + 1}. **${file}**: ${count} issue(s)`);
      });
      report.push("");
    }

    // Recommendations
    report.push(`## 💡 Recommendations\n`);
    report.push(`- Review critical (🔴) issues first`);
    report.push(`- Address memory management and null pointer issues`);
    report.push(`- Remove or complete TODO/FIXME comments`);
    report.push(`- Consider using static analysis tools for deeper inspection`);

    return report.join("\n");
  }

  /**
   * Get help text
   */
  getHelp(): string {
    return `## 🐛 AI Debug Assistant

### Debug Control
- \`start debugging [config-name]\` - Start a debug session
- \`stop debugging\` - Stop the current session
- \`restart\` - Restart the current session
- \`continue\` - Continue execution
- \`step over\` - Step over current line
- \`step into\` - Step into function
- \`step out\` - Step out of function
- \`pause\` - Pause execution

### Breakpoints
- \`set breakpoint at file.c:42\` - Set breakpoint
- \`set breakpoint at file.c:42 if x > 10\` - Conditional breakpoint
- \`remove breakpoint at file.c:42\` - Remove specific breakpoint
- \`remove breakpoints from file.c\` - Remove all from file
- \`remove all breakpoints\` - Remove all breakpoints
- \`list breakpoints\` - Show all breakpoints

### Inspection
- \`info registers\` - Show register values
- \`backtrace\` - Show call stack
- \`print variable\` - Print variable value
- \`info locals\` - Show local variables

### Analysis
- \`analyze code\` - Find common issues
- \`search for malloc\` - Custom code search
- \`find TODO comments\` - Find specific patterns

### Examples
\`\`\`
start debugging with openocd
set breakpoint at main.c:42 if count > 100
step over
info registers
analyze code
\`\`\``;
  }
}
