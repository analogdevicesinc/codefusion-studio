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
const STOP_CONFIRMATION_TIMEOUT_MS = 5_000;

/** Time (ms) to wait for a new session to appear after a restart. */
const RESTART_TIMEOUT_MS = 10_000;

/** Time (ms) to wait for early termination after a successful start. */
const EARLY_TERMINATION_TIMEOUT_MS = 5_000;

export interface DebugConfig {
  name: string;
  workspaceFolder: vscode.WorkspaceFolder;
}

/**
 * Shared executor for debug lifecycle commands.
 * Used by both MCP server and chat participant.
 */
export class DebugCommandExecutor {
  constructor(private debugManager: CfsDebugManager) {}

  private static readonly START_FAILURE_CAUSES =
    "**Common causes:**\n" +
    "- Target hardware is not connected or powered on\n" +
    "- Debug probe (J-Link, OpenOCD, etc.) is not detected\n" +
    "- Incorrect debug configuration settings\n\n" +
    "Please check the **Debug Console** and **Terminal** output for detailed error information.\n";

  /**
   * Gets all debug configurations from workspace.
   */
  private getConfigurations(): DebugConfig[] {
    const configs: DebugConfig[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      return configs;
    }

    for (const folder of workspaceFolders) {
      const launchConfig = vscode.workspace.getConfiguration("launch", folder);
      const configurations = launchConfig.get<any[]>("configurations", []);

      for (const config of configurations) {
        configs.push({
          name: config.name,
          workspaceFolder: folder,
        });
      }
    }

    return configs;
  }

  /**
   * Shows list of available configurations.
   */
  private showConfigList(configs?: DebugConfig[]): string {
    const configList = configs ?? this.getConfigurations();

    if (configList.length === 0) {
      return "❌ No debug configurations found. Please create a launch.json file.";
    }

    const configLines = configList
      .map((config, index) => `${index + 1}. ${config.name}`)
      .join("\n");

    return configLines.concat(
      `\n\nSay "start debugging <config name>" to begin.\n`,
    );
  }

  /**
   * Matches a configuration from user prompt.
   *
   * Matching is done in three passes with decreasing confidence:
   * 1. Exact substring match (config name found verbatim in prompt)
   * 2. Normalized substring match (after stripping debug-related keywords)
   * 3. Fuzzy word-overlap match (best score above 60% threshold wins)
   */
  private matchConfiguration(
    prompt: string,
    configs: DebugConfig[],
  ): DebugConfig | null {
    const lowerPrompt = prompt.toLowerCase();

    const normalizeText = (text: string) =>
      text
        .toLowerCase()
        .replace(/start|debug|begin|launch|debugging|session/gi, "")
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const normalizedPrompt = normalizeText(lowerPrompt);

    // Pass 1: exact substring match (highest confidence)
    for (const config of configs) {
      if (lowerPrompt.includes(config.name.toLowerCase())) {
        return config;
      }
    }

    // If the prompt normalizes to empty (e.g. "start debugging"),
    // there is nothing to match against — let the caller show the
    // configuration list so the user can pick one explicitly.
    if (!normalizedPrompt) {
      return null;
    }

    // Pass 2: normalized substring containment
    for (const config of configs) {
      const normalizedConfigName = normalizeText(config.name);

      if (
        (normalizedPrompt.includes(normalizedConfigName) ||
          normalizedConfigName.includes(normalizedPrompt)) &&
        normalizedConfigName !== ""
      ) {
        return config;
      }
    }

    // Pass 3: fuzzy word-overlap — pick the best match above threshold
    const FUZZY_THRESHOLD = 0.6;
    let bestMatch: DebugConfig | null = null;
    let bestScore = 0;

    const promptWords = normalizedPrompt.split(" ").filter((w) => w.length > 2);

    for (const config of configs) {
      const normalizedConfigName = normalizeText(config.name);
      const configWords = normalizedConfigName
        .split(" ")
        .filter((w) => w.length > 2);

      if (configWords.length > 0) {
        const matchingWords = configWords.filter((word) =>
          promptWords.includes(word),
        );
        const score = matchingWords.length / configWords.length;

        if (score > FUZZY_THRESHOLD && score > bestScore) {
          bestScore = score;
          bestMatch = config;
        }
      }
    }

    return bestMatch;
  }

  private async startDebugSession(
    configName: string,
    workspaceFolder: vscode.WorkspaceFolder,
  ): Promise<string> {
    // Register termination listener before starting to avoid a race
    // where the session terminates before we begin listening.
    let terminationDisposable: vscode.Disposable | undefined;
    let terminationTimeout: ReturnType<typeof setTimeout> | undefined;

    const earlyTermination = new Promise<boolean>((resolve) => {
      terminationTimeout = setTimeout(() => {
        terminationDisposable?.dispose();
        resolve(false);
      }, EARLY_TERMINATION_TIMEOUT_MS);

      terminationDisposable = vscode.debug.onDidTerminateDebugSession(
        (terminated) => {
          if (terminated.name === configName) {
            clearTimeout(terminationTimeout);
            terminationDisposable?.dispose();
            resolve(true);
          }
        },
      );
    });

    const success = await vscode.debug.startDebugging(
      workspaceFolder,
      configName,
    );

    if (!success) {
      clearTimeout(terminationTimeout);
      terminationDisposable?.dispose();

      return (
        "❌ Failed to start debug session.\n\n" +
        DebugCommandExecutor.START_FAILURE_CAUSES
      );
    }

    const terminatedEarly = await earlyTermination;

    if (terminatedEarly) {
      return (
        "❌ Debug session started but terminated immediately.\n\n" +
        "This usually means the debugger could not connect to the target.\n\n" +
        DebugCommandExecutor.START_FAILURE_CAUSES
      );
    } else {
      return `✅ Started debugging with configuration: **${configName}**\n`;
    }
  }

  /**
   * Start a debug session
   *
   * Resolution order:
   * 1. If `configName` is provided, find and start that configuration
   * 2. If `prompt` is provided, match configuration from natural language
   * 3. Otherwise, start the first available configuration
   */
  async startDebugging(
    configName?: string,
    workspaceFolder?: vscode.WorkspaceFolder,
    prompt?: string,
  ): Promise<string> {
    let response: string = "";

    if (!vscode.workspace.workspaceFolders) {
      return "❌ No workspace folders open.";
    }

    const configs = this.getConfigurations();

    if (configs.length === 0) {
      return "❌ No debug configurations found. Please create a launch.json file.";
    }

    response = response.concat(
      `Found ${configs.length} debug configuration(s).\n`,
    );

    let selectedConfig: DebugConfig | null = null;

    // Priority 1: Explicit config name
    if (configName) {
      if (workspaceFolder) {
        selectedConfig = { name: configName, workspaceFolder };
      } else {
        selectedConfig =
          configs.find((c) =>
            c.name.toLowerCase().includes(configName.toLowerCase()),
          ) ?? null;
      }

      if (!selectedConfig) {
        return response.concat(
          `❌ Debug configuration not found: **${configName}**`,
        );
      }
    }

    // Priority 2: Match from prompt
    if (!selectedConfig && prompt) {
      selectedConfig = this.matchConfiguration(prompt, configs);

      if (!selectedConfig) {
        return response.concat(
          "⚠️ Could not match a configuration from your request.\nAvailable debug configurations:\n\n",
          this.showConfigList(configs),
        );
      }
    }

    // Priority 3: Fall back to first config
    if (!selectedConfig) {
      selectedConfig = configs[0];
    }

    // Check for duplicate sessions
    const isDuplicate = this.debugManager
      .getAllSessions()
      .some(
        (s) => s.vscodeSession.configuration?.name === selectedConfig!.name,
      );

    if (isDuplicate) {
      return response.concat(
        `A debug session with configuration **${selectedConfig.name}** is already running.\n\n` +
          "Please stop the current session first or use the `restart` command.\n\n" +
          "Examples:\n" +
          "- `@cfs-debug stop`\n" +
          "- `@cfs-debug restart`\n",
      );
    }

    const result = await this.startDebugSession(
      selectedConfig.name,
      selectedConfig.workspaceFolder,
    );

    return response.concat(result);
  }

  /**
   * Stop the current debug session
   */
  async stopDebugging(): Promise<string> {
    const activeSession = vscode.debug.activeDebugSession;

    if (!activeSession) {
      return "⚠️  No active debug session to stop\n";
    }

    const sessionId = activeSession.id;
    const sessionName = activeSession.name;

    let disposable: vscode.Disposable | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const sessionStopped = new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => {
          resolve(false);
        }, STOP_CONFIRMATION_TIMEOUT_MS);

        disposable = vscode.debug.onDidTerminateDebugSession((session) => {
          if (session.id === sessionId) {
            clearTimeout(timeout);
            resolve(true);
          }
        });
      });

      await vscode.debug.stopDebugging(activeSession);

      const stopped = await sessionStopped;

      if (!stopped) {
        return (
          "❌ Failed to stop the active debug session.\n\n" +
          "Please stop it manually before trying again.\n"
        );
      }

      return `✅ Stopped debug session: **${sessionName}**\n`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `❌ Error stopping debug session: ${message}\n`;
    } finally {
      // always clean up, regardless of success or failure
      clearTimeout(timeout);
      disposable?.dispose();
    }
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

    try {
      await session.pause();
      return "⏸️  Paused execution";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `❌ Failed to pause execution: ${message}`;
    }
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

    const sessionName = session.name;
    const oldSessionId = session.id;
    const oldSessionConfigName = session.configuration.name;
    const oldSessionWsFolder = session.workspaceFolder;

    /**
     * Cortex debug uses custom events to track the restarting of debug sessions. Counter intuitively a
     * `custom-continued` event is fired first when the old session stops, and `custom-stop` is fired when the new
     * session starts
     */

    const sessionRestarted = new Promise<boolean>((resolve) => {
      const disposables: vscode.Disposable[] = [];

      const cleanup = () => {
        disposables.forEach((d) => d.dispose());
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, RESTART_TIMEOUT_MS);

      let terminated = false;

      disposables.push(
        vscode.debug.onDidReceiveDebugSessionCustomEvent((event) => {
          if (
            event.session.id === oldSessionId &&
            event.event === "custom-continued"
          ) {
            terminated = true;
          }
        }),
      );

      /**
       * listen for the stopped event which indicates the session is ready this
       * handles in-place restarts where no new session is created
       */
      disposables.push(
        vscode.debug.onDidReceiveDebugSessionCustomEvent((event) => {
          if (
            event.session.id === oldSessionId &&
            event.event === "custom-stop" &&
            terminated === true
          ) {
            clearTimeout(timeout);
            cleanup();
            resolve(true);
          }
        }),
      );

      /**
       * Future proof the restart handler in the case of the DAP moving away
       * from custom events to standard VSCode termination and start events
       */
      disposables.push(
        vscode.debug.onDidTerminateDebugSession((session) => {
          if (session.id === oldSessionId) {
            terminated = true;
          }
        }),
      );

      disposables.push(
        vscode.debug.onDidStartDebugSession((session) => {
          if (
            session.id !== oldSessionId &&
            session.configuration.name === oldSessionConfigName &&
            session.workspaceFolder === oldSessionWsFolder &&
            terminated === true
          ) {
            clearTimeout(timeout);
            cleanup();
            resolve(true);
          }
        }),
      );
    });

    // fire and forget. awaiting on this command causes indefinite hanging
    void vscode.commands.executeCommand("workbench.action.debug.restart");

    const restarted = await sessionRestarted;

    if (restarted) {
      return `🔄 Restarted debug session: **${sessionName}**`;
    }

    return "⚠️  Restart was initiated but could not confirm completion. Check the Debug Console for errors.";
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
