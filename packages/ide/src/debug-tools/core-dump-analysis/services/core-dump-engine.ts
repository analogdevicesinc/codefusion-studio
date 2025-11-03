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

import {
  CoreDumpConfig,
  CrashPanelData,
  HeapPanelData,
  TasksPanelData,
} from "../types";
import { CoreDumpRetriever } from "../retrievers/core-dump-retriever";
import { ZephyrCoreDumpParser } from "../parsers/zephyr-bin-core-dump-parser";
import { CoreDumpTreeProvider } from "../ui/core-dump-tree-provider";
import { CoreDumpError } from "./core-dump-error";
import { CoreDumpGdbServer } from "./core-dump-gdb-server";
import { GDBToolbox } from "../../gdb-toolbox/core/gdb-toolbox";
import * as vscode from "vscode";
import {
  CORE_DUMP_COMPLETE_MSG,
  CORE_DUMP_FAILED_MSG,
  CRASH_SUMMARY,
  HEAP_SUMMARY,
  TASKS_SUMMARY,
} from "./constants";
import { SessionManager } from "./core-dump-session-manager";
import { CORE_DUMP_VIEW_VISIBLE_COMMAND_ID } from "../commands/constants";

/**
 * CoreDumpEngine orchestrates the retrieval, parsing, and UI presentation
 * of Zephyr core dumps. It uses a retriever to obtain the raw core dump,
 * a parser to extract only the valid core dump content, and a tree provider
 * to display the results in the UI.
 */
export class CoreDumpEngine {
  private retriever: CoreDumpRetriever;
  private parser: ZephyrCoreDumpParser;
  private treeProvider: CoreDumpTreeProvider;
  private projectFolder: vscode.WorkspaceFolder;
  private config: CoreDumpConfig;
  private gdbServer?: CoreDumpGdbServer;
  private sessionManager: SessionManager;
  private debugSession?: vscode.DebugSession;

  /**
   * @param config Core dump configuration (address, size, output file, etc.)
   * @param treeProvider The UI tree provider to update with analysis results
   * @param projectFolder The selected workspace folder for debug session
   * @param sessionManager The session manager to store session-specific data
   */
  constructor(
    config: CoreDumpConfig,
    treeProvider: CoreDumpTreeProvider,
    projectFolder: vscode.WorkspaceFolder,
    sessionManager: SessionManager,
  ) {
    this.config = config;
    this.retriever = new CoreDumpRetriever(config);
    this.parser = new ZephyrCoreDumpParser();
    this.treeProvider = treeProvider;
    this.projectFolder = projectFolder;
    this.sessionManager = sessionManager;
    vscode.debug.onDidTerminateDebugSession(async (session) => {
      if (
        session.type === "cortex-debug" &&
        (session.name === "CFS: Launch Core Dump Analysis" ||
          session.name.includes("Core Dump Analysis"))
      ) {
        // Remove from active sessions
        this.sessionManager.markSessionInactive(session.id);

        if (this.gdbServer && typeof this.gdbServer.stop === "function") {
          await this.gdbServer.stop();
        }

        // Clear the session reference when our session terminates
        if (this.debugSession?.id === session.id) {
          this.debugSession = undefined;
        }

        // Check if there are still active core dump sessions
        const remainingActiveSessions = this.sessionManager.getActiveSessions();
        if (remainingActiveSessions.length > 0) {
          // Show data for one of the remaining sessions
          const remainingSessionId = remainingActiveSessions[0];
          const remainingSessionData =
            this.sessionManager.getSessionData(remainingSessionId);
          if (remainingSessionData) {
            this.treeProvider.setCoreDumpInfo(remainingSessionData);
          }
        } else {
          // No more active sessions, clear the UI
          this.treeProvider.clear();
        }
      }
    });
  }

  /**
   * Converts raw GDB script results into structured data for the UI panels.
   * Used to map GDB output to the format expected by CoreDumpTreeProvider.setCoreDumpInfo.
   * @param gdbResults The raw results returned from GDB scripts.
   * @param panelType The type of panel ("crash" or "tasks") to format results for.
   * @returns Structured data for display in the UI.
   */

  private transformGdbResultsForUI(
    gdbResults: any,
    panelType: "crash" | "tasks",
  ): any {
    if (!gdbResults || typeof gdbResults !== "object") {
      return {
        summary: "Core dump analysis failed: No valid GDB results.",
        crashCause: "No crash cause: GDB results missing or invalid.",
        tasks: [
          {
            name: "Error",
            status: "error",
            address: "",
            stack: { used: 0, total: 0, max_usage: 0 },
            execution_info: { pc: "0x0", sp: "0x0", lr: "0" },
            trace: [],
            reason: {
              code: -1,
              message: "No task data: GDB results missing or invalid.",
            },
          },
        ],
      };
    }

    if (panelType === "crash") {
      return {
        summary: "Crash Cause",
        crashCause: gdbResults.crashCause || "Unknown crash cause",
      };
    }

    if (panelType === "tasks") {
      return {
        summary: "Tasks Stack",
        tasks: Array.isArray(gdbResults)
          ? gdbResults.map((t, idx) => {
              // Parse stack trace to array of frames
              const parsedTrace = this.parseStackTrace(t.trace);
              // Improved name fallback: use t.name, else first frame's name, else thread_N
              let threadName =
                t.name !== undefined && t.name !== null && t.name !== ""
                  ? t.name
                  : Array.isArray(parsedTrace) && parsedTrace[0]?.name
                    ? parsedTrace[0].name
                    : `thread_${idx + 1}`;
              return {
                name: threadName,
                status: t.status || "error",
                address: t.address || "",
                stack: t.stack || { used: 0, total: 0, max_usage: 0 },
                execution_info: t.execution_info || {
                  pc: "0x0",
                  sp: "0x0",
                  lr: "0",
                },
                trace: parsedTrace,
                reason: t.reason || {
                  code: -1,
                  message: "expected string or bytes-like object",
                },
              };
            })
          : [
              {
                name: "thread_n",
                status: "error",
                address: "",
                stack: { used: 0, total: 0, max_usage: 0 },
                execution_info: { pc: "0x0", sp: "0x0", lr: "0" },
                trace: [],
                reason: {
                  code: -1,
                  message: "expected string or bytes-like object",
                },
              },
            ],
      };
    }
  }

  /**
   * Retrieves the core dump from the target device using the configured retriever.
   * @returns A Buffer containing the raw core dump data.
   */
  private async retrieveCoreDump(): Promise<Buffer> {
    return await this.retriever.retrieve();
  }

  private parseStackTrace(trace: any): any[] {
    if (Array.isArray(trace)) {
      // If it's an array of frame objects, return as is
      return trace;
    }
    if (typeof trace !== "string") return [];
    // Try to parse JSON array or object string
    try {
      const arr = JSON.parse(trace);
      if (Array.isArray(arr)) return arr;
      if (typeof arr === "object" && arr !== null) return [arr];
    } catch {}
    // Fallback: parse GDB backtrace string or split on newlines/semicolons
    const frames: any[] = [];
    // Split the trace string into lines (handles both \n and ; as delimiters)
    const lines = trace
      .split(/\n|;/)
      .map((l) => l.trim())
      .filter(Boolean);
    // Try to parse each line as JSON object if possible
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (typeof obj === "object" && obj !== null) {
          frames.push(obj);
          continue;
        }
      } catch {}
      // Fallback: regex for GDB backtrace lines
      const frameRegex = /#\d+\s+([a-zA-Z0-9_]+)\s*\(\)\s+at\s+([^\s:]+):(\d+)/;
      const match = frameRegex.exec(line);
      if (match) {
        frames.push({
          name: match[1],
          symtab: match[2],
          line: Number(match[3]),
        });
      }
    }
    // If we have a single frame object, flatten its properties for the UI
    if (
      frames.length === 1 &&
      typeof frames[0] === "object" &&
      frames[0] !== null
    ) {
      const frame = frames[0];
      return Object.keys(frame).map((key) => ({ key, value: frame[key] }));
    }
    return frames;
  }

  /**
   * Reads an existing core dump from disk using the configured retriever.
   * @returns A Buffer containing the raw core dump data.
   */
  private async readExistingCoreDump(): Promise<Buffer> {
    return await this.retriever.readExisting();
  }

  /**
   * Parses the core dump buffer using the configured parser.
   * @param buffer The raw core dump data to parse.
   * @returns Parsed core dump information in a structured format.
   */
  private parseCoreDump(buffer: Buffer): any {
    // Validate binFile before parsing
    let binFile = this.config.binFile;
    if (!binFile || typeof binFile !== "string" || binFile.trim() === "") {
      vscode.window
        .showErrorMessage(
          "Core dump bin file is not set. Please check your project configuration.",
          "Open Settings",
        )
        .then((action) => {
          if (action === "Open Settings") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "coreDump.binFile",
            );
          }
        });
      throw new CoreDumpError("Core dump bin file is not set.");
    }
    // Optionally warn if path is suspicious (e.g., not .bin or .log)
    if (!binFile.endsWith(".bin") && !binFile.endsWith(".log")) {
      vscode.window
        .showWarningMessage(
          `Core dump bin file '${binFile}' does not have a .bin or .log extension. Please verify the path.`,
          "Open Settings",
        )
        .then((action) => {
          if (action === "Open Settings") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "coreDump.binFile",
            );
          }
        });
    }
    // Always overwrite the bin file, never the log file
    if (binFile.endsWith(".log")) {
      binFile = binFile.replace(/\.log$/, ".bin");
    }
    return this.parser.parse(buffer, binFile);
  }

  /**
   * Parses thread results from GDB scripts, handling stringified arrays and errors.
   */
  private parseThreadsResults(results: any): any {
    let text: string;
    if (
      Array.isArray(results) &&
      results.length === 1 &&
      typeof results[0] === "string"
    ) {
      text = results[0];
    } else if (Array.isArray(results)) {
      text = results.join("\n");
    } else if (typeof results === "string") {
      text = results;
    } else {
      return [];
    }

    const nameIdx = text.indexOf('"name":');
    if (nameIdx !== -1) {
      const arrayStart = text.lastIndexOf("[", nameIdx);
      if (arrayStart !== -1) {
        let bracketCount = 0;
        let arrayEnd = -1;
        for (let i = arrayStart; i < text.length; i++) {
          if (text[i] === "[") bracketCount++;
          else if (text[i] === "]") bracketCount--;
          if (bracketCount === 0) {
            arrayEnd = i;
            break;
          }
        }
        if (arrayEnd !== -1) {
          const jsonArrayText = text.substring(arrayStart, arrayEnd + 1);
          try {
            return JSON.parse(jsonArrayText);
          } catch (err) {
            console.error("Failed to parse threads JSON:", err, jsonArrayText);
            return [];
          }
        }
      }
    }

    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err) {
        console.error("Fallback failed to parse threads JSON:", err, match[0]);
        return [];
      }
    }
    return [];
  }

  /**
   * Runs the core dump analysis workflow with configurable steps.
   * Steps: retrieve, parse, analyze. Each can be toggled via options or booleans.
   * Shows completion message or handles errors.
   */

  async runAnalysis(
    opts?: boolean | { retrieve?: boolean; parse?: boolean; analyze?: boolean },
    parse?: boolean,
    analyze?: boolean,
  ): Promise<void> {
    let retrieve = true;
    if (typeof opts === "object") {
      retrieve = opts.retrieve ?? true;
      parse = opts.parse ?? true;
      analyze = opts.analyze ?? true;
    } else if (typeof opts === "boolean") {
      retrieve = opts;
      parse = parse ?? true;
      analyze = analyze ?? true;
    }
    try {
      const buffer = retrieve
        ? await this.retrieveCoreDump()
        : await this.readExistingCoreDump();
      if (parse) {
        this.parseCoreDump(buffer);
      }
      if (analyze) {
        await this.runPanelAnalysis();
      }
      vscode.window.showInformationMessage(CORE_DUMP_COMPLETE_MSG);
    } catch (err) {
      vscode.window.showWarningMessage(
        "Core dump analysis failed. Error: " +
          (err instanceof Error ? err.message : String(err)),
      );
    }
  }

  /**
   * Centralized error handling and UI context update.
   */
  handleError(err: unknown) {
    vscode.commands.executeCommand(
      "setContext",
      CORE_DUMP_VIEW_VISIBLE_COMMAND_ID,
      false,
    );
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(CORE_DUMP_FAILED_MSG + message);
    throw new CoreDumpError(message);
  } /**
   * Runs all analysis scripts and updates the UI panels.
   */
  private async runPanelAnalysis(): Promise<void> {
    await vscode.commands.executeCommand("workbench.debug.action.toggleRepl");
    await this.startGdbServerAndSession();
    await vscode.commands.executeCommand("workbench.debug.action.toggleRepl");
    const gdbToolbox = GDBToolbox.getInstance();
    const scriptManager = gdbToolbox.getScriptManager();
    const executor = gdbToolbox.getExecutor();

    // Use our specific debug session instead of the active one
    const debugSession = this.debugSession;
    if (!debugSession) {
      throw new Error("Debug session not available for core dump analysis");
    }

    // Check if required scripts are available
    const crashScript = scriptManager
      .getAllScripts()
      .find((s) => s.name === "Analyze Crash");
    const threadsScript = scriptManager
      .getAllScripts()
      .find((s) => s.name === "Analyze Threads");
    const heapScript = scriptManager
      .getAllScripts()
      .find((s) => s.name === "Analyze Global Heap");

    const missingScripts: string[] = [];
    if (!crashScript) missingScripts.push("Analyze Crash");
    if (!threadsScript) missingScripts.push("Analyze Threads");
    if (!heapScript) missingScripts.push("Analyze Global Heap");

    if (missingScripts.length > 0) {
      const errorMessage = `Core dump analysis failed: Required GDB scripts not found: ${missingScripts.join(", ")}. Please add analysis scripts to workspace.`;
      vscode.window.showErrorMessage(errorMessage);

      // Stop the GDB server if it was started
      if (this.gdbServer && typeof this.gdbServer.stop === "function") {
        await this.gdbServer.stop();
      }

      // Terminate the debug session
      if (debugSession) {
        await vscode.debug.stopDebugging(debugSession);
      }

      throw new CoreDumpError(errorMessage);
    }

    const crashPanelData = await this.runPanelScript(
      crashScript,
      executor,
      debugSession,
      this.parseCrashResults,
      { summary: CRASH_SUMMARY, crashCause: [] },
    );
    const tasksPanelData = await this.runPanelScript(
      threadsScript,
      executor,
      debugSession,
      this.parseTasksResults,
      { summary: TASKS_SUMMARY, tasks: [] },
    );
    const heapPanelData = await this.runPanelScript(
      heapScript,
      executor,
      debugSession,
      this.parseHeapResults,
      {
        summary: HEAP_SUMMARY,
        heap: { total: 0, used: 0, max: 0, message: "" },
      },
    );

    // Use our specific session ID instead of the active debug session
    const sessionId = debugSession.id;
    this.sessionManager.setSessionData(sessionId, {
      summary: "Core Dump Analysis",
      details: {
        crashCause: crashPanelData.crashCause,
        tasks: tasksPanelData.tasks,
        heap: heapPanelData.heap,
      },
    });

    vscode.commands.executeCommand(
      "setContext",
      CORE_DUMP_VIEW_VISIBLE_COMMAND_ID,
      true,
    );
  }

  /**
   * Starts the GDB server and launches the debug session.
   */
  private async startGdbServerAndSession(): Promise<void> {
    // Validate configuration before proceeding
    if (!this.config.elfFile || this.config.elfFile.trim() === "") {
      throw new Error(
        "ELF file path is not configured. Please check your core dump settings.",
      );
    }
    if (!this.config.binFile || this.config.binFile.trim() === "") {
      throw new Error(
        "Binary file path is not configured. Please check your core dump settings.",
      );
    }

    this.gdbServer = new CoreDumpGdbServer(
      this.config.elfFile ?? "",
      this.config.binFile,
      this.projectFolder.uri,
      this.config,
    );

    try {
      await this.gdbServer.start();
    } catch (error) {
      throw new Error(
        `Failed to start GDB server: ${error instanceof Error ? error.message : String(error)}`,
      );
    } // Listen for debug session start to capture our specific session
    const sessionPromise = new Promise<vscode.DebugSession>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          disposable.dispose();
          reject(
            new Error(
              "Timeout waiting for debug session to start (30 seconds)",
            ),
          );
        }, 30000);

        const disposable = vscode.debug.onDidStartDebugSession((session) => {
          // Match both exact name and partial name for more flexibility
          if (
            session.name === "CFS: Launch Core Dump Analysis" ||
            (session.type === "cortex-debug" &&
              session.name.includes("Core Dump Analysis"))
          ) {
            this.debugSession = session;
            clearTimeout(timeout);
            disposable.dispose();
            resolve(session);
          }
        });
      },
    );

    const success = await vscode.debug.startDebugging(
      this.projectFolder,
      "CFS: Launch Core Dump Analysis",
    );
    if (!success) {
      console.error(
        "Core Dump Engine: vscode.debug.startDebugging returned false",
      );
      throw new Error("Failed to launch debug session.");
    }

    // Wait for our specific session to be created
    await sessionPromise;
    await new Promise((r) => setTimeout(r, 1000)); // Wait for session to stabilize
  }

  /**
   * Runs a panel script and parses its results.
   */
  private async runPanelScript<T>(
    script: any,
    executor: any,
    debugSession: any,
    parser: (results: any) => T,
    fallback: T,
  ): Promise<T> {
    if (!script || !debugSession) {
      return fallback;
    }
    try {
      const results = await executor.executeScript(
        script.commands,
        [],
        debugSession,
      );
      return parser.call(this, results);
    } catch (error) {
      console.error(
        `Core Dump Engine: Script '${script?.name}' failed:`,
        error,
      );
      return fallback;
    }
  }

  /**
   * Parses crash script results.
   */
  private parseCrashResults(results: any): CrashPanelData {
    let crashPanelData: CrashPanelData = {
      summary: CRASH_SUMMARY,
      crashCause: [],
    };
    try {
      let jsonStr =
        Array.isArray(results) && typeof results[0] === "string"
          ? this.extractJson(results[0])
          : typeof results === "string"
            ? results
            : null;
      if (jsonStr) {
        crashPanelData = JSON.parse(jsonStr);
      } else if (Array.isArray(results)) {
        crashPanelData.crashCause = results;
      } else if (results && typeof results === "object") {
        crashPanelData = results;
      }
    } catch {
      // fallback already set
    }
    crashPanelData.crashCause = Array.isArray(crashPanelData.crashCause)
      ? crashPanelData.crashCause
      : [];
    crashPanelData.summary = crashPanelData.summary || CRASH_SUMMARY;
    return crashPanelData;
  }

  /**
   * Parses tasks script results.
   */
  private parseTasksResults(results: any): TasksPanelData {
    let threadsResults = this.parseThreadsResults(results);
    let tasksPanelData = this.transformGdbResultsForUI(threadsResults, "tasks");
    if (!Array.isArray(tasksPanelData.tasks)) tasksPanelData.tasks = [];
    tasksPanelData.summary = tasksPanelData.summary || TASKS_SUMMARY;
    return tasksPanelData;
  }

  /**
   * Parses heap script results.
   */
  private parseHeapResults(results: any): HeapPanelData {
    let heapObj: any = {};
    if (Array.isArray(results) && typeof results[0] === "string") {
      try {
        heapObj = JSON.parse(results[0]);
      } catch {}
    } else if (Array.isArray(results)) {
      heapObj = results[0];
    } else {
      heapObj = results;
    }
    const toNum = (v: unknown): number =>
      typeof v === "number" ? v : Number(v) || 0;
    return {
      summary: HEAP_SUMMARY,
      heap: {
        total: toNum(heapObj?.total),
        used: toNum(heapObj?.used),
        max: toNum(heapObj?.max),
        message: typeof heapObj?.message === "string" ? heapObj.message : "",
      },
    };
  }

  /**
   * Extracts JSON substring from a string containing logs and JSON.
   */
  private extractJson(str: string): string {
    const firstBrace = str.indexOf("{");
    const lastBrace = str.lastIndexOf("}");
    return firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
      ? str.substring(firstBrace, lastBrace + 1)
      : str;
  }
}
