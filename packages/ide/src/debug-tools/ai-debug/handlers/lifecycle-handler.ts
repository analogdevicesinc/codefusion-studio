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
import type { CfsDebugManager, CfsDebugSession } from "../../debug-manager";

/** Time (ms) to wait for a new session to appear after a restart. */
const RESTART_TIMEOUT_MS = 10_000;

/** Time (ms) to wait for early termination after a successful start. */
const EARLY_TERMINATION_TIMEOUT_MS = 5_000;

export interface DebugConfig {
  name: string;
  workspaceFolder: vscode.WorkspaceFolder;
}

/**
 * Handles debug lifecycle commands (start, stop, restart, step, continue).
 */
export class LifecycleHandler {
  constructor(private debugManager: CfsDebugManager) {}

  /**
   * Gets the active debug session, throwing if none exists.
   */
  private getSession(): CfsDebugSession {
    const session = this.debugManager.getActiveSession();
    if (!session) {
      throw new Error("No active debug session");
    }
    return session;
  }

  private async startSession(
    stream: vscode.ChatResponseStream,
    configName: string,
    workspaceFolder: vscode.WorkspaceFolder | undefined,
  ) {
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

      stream.markdown(
        "❌ Failed to start debug session.\n\n" +
          LifecycleHandler.START_FAILURE_CAUSES,
      );
      return;
    }

    const terminatedEarly = await earlyTermination;

    if (terminatedEarly) {
      stream.markdown(
        "❌ Debug session started but terminated immediately.\n\n" +
          "This usually means the debugger could not connect to the target.\n\n" +
          LifecycleHandler.START_FAILURE_CAUSES,
      );
    } else {
      stream.markdown("✓ Debug session started successfully\n");
    }
  }

  /**
   * Handles debug lifecycle commands.
   * @returns true if the command was handled, false otherwise
   */
  async handle(
    prompt: string,
    stream: vscode.ChatResponseStream,
    showHelp: () => void,
  ): Promise<boolean> {
    const lowerPrompt = prompt.toLowerCase();

    // Check for help command first
    if (
      lowerPrompt === "help" ||
      lowerPrompt.includes("help me") ||
      lowerPrompt.includes("what can you do") ||
      lowerPrompt.includes("list commands") ||
      lowerPrompt.includes("show commands")
    ) {
      showHelp();
      return true;
    }

    // Check for restart debug intent (must be checked before "start debug"
    // because "restart" contains the substring "start")
    if (
      lowerPrompt.includes("restart") ||
      lowerPrompt.includes("relaunch") ||
      lowerPrompt.includes("re-run")
    ) {
      if (vscode.debug.activeDebugSession) {
        const activeSession = vscode.debug.activeDebugSession;
        const sessionId = activeSession.id;
        const configName = activeSession.configuration.name;
        const workspaceFolder = activeSession.workspaceFolder;

        const sessionStopped = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            disposable.dispose();
            resolve(false);
          }, RESTART_TIMEOUT_MS);

          const disposable = vscode.debug.onDidTerminateDebugSession(
            (session) => {
              if (session.id === sessionId) {
                clearTimeout(timeout);
                disposable.dispose();
                resolve(true);
              }
            },
          );
        });

        vscode.debug.stopDebugging(activeSession);

        const stopped = await sessionStopped;

        if (!stopped) {
          stream.markdown(
            "❌ Failed to stop the active debug session.\n\n" +
              "Please stop it manually before restarting.\n",
          );
          return true;
        } else {
          stream.markdown(
            "✓ Debug session stopped\n\nRestarting debug session...\n\n",
          );
        }

        await this.startSession(stream, configName, workspaceFolder);
      } else {
        stream.markdown("⚠️ No active debug session to restart\n");
      }
      return true;
    }

    // Check for start debug intent
    if (
      lowerPrompt.includes("start debug") ||
      lowerPrompt.includes("begin debug") ||
      lowerPrompt.includes("launch debug") ||
      (lowerPrompt.includes("debug") &&
        (lowerPrompt.includes("start") || lowerPrompt.includes("begin")))
    ) {
      await this.handleStart(prompt, stream);
      return true;
    }

    // Check for stop debug intent
    if (
      lowerPrompt.includes("stop debug") ||
      lowerPrompt.includes("end debug") ||
      lowerPrompt.includes("terminate debug") ||
      lowerPrompt === "stop"
    ) {
      if (vscode.debug.activeDebugSession) {
        await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
        stream.markdown("✓ Debug session stopped\n");
      } else {
        stream.markdown("⚠️ No active debug session to stop\n");
      }
      return true;
    }

    // Check for continue/resume intent
    if (
      lowerPrompt.includes("continue") ||
      lowerPrompt.includes("resume") ||
      lowerPrompt === "c" ||
      (lowerPrompt.includes("keep") && lowerPrompt.includes("going"))
    ) {
      const session = this.getSession();
      await session.continue();
      stream.markdown("✓ Continuing execution\n");
      return true;
    }

    // Check for step over intent
    if (
      lowerPrompt.includes("step over") ||
      lowerPrompt.includes("next") ||
      (lowerPrompt.includes("step") &&
        !lowerPrompt.includes("into") &&
        !lowerPrompt.includes("out"))
    ) {
      const session = this.getSession();
      await session.stepOver();
      stream.markdown("✓ Stepped over\n");
      return true;
    }

    // Check for step into intent
    if (lowerPrompt.includes("step into") || lowerPrompt.includes("step in")) {
      const session = this.getSession();
      await session.stepInto();
      stream.markdown("✓ Stepped into\n");
      return true;
    }

    // Check for step out intent
    if (
      lowerPrompt.includes("step out") ||
      lowerPrompt.includes("finish") ||
      lowerPrompt.includes("return")
    ) {
      const session = this.getSession();
      await session.stepOut();
      stream.markdown("✓ Stepped out\n");
      return true;
    }

    // Check for pause intent
    if (
      lowerPrompt.includes("pause") ||
      lowerPrompt.includes("break now") ||
      lowerPrompt.includes("halt")
    ) {
      const session = this.getSession();
      await session.pause();
      stream.markdown("✓ Execution paused\n");
      return true;
    }

    return false;
  }

  private static readonly START_FAILURE_CAUSES =
    "**Common causes:**\n" +
    "- Target hardware is not connected or powered on\n" +
    "- Debug probe (J-Link, OpenOCD, etc.) is not detected\n" +
    "- Incorrect debug configuration settings\n\n" +
    "Please check the **Debug Console** and **Terminal** output for detailed error information.\n";

  /**
   * Handles starting a debug session.
   */
  private async handleStart(
    prompt: string,
    stream: vscode.ChatResponseStream,
  ): Promise<void> {
    stream.markdown("🔍 Looking for debug configurations...\n");

    const configs = this.getConfigurations();

    if (configs.length === 0) {
      stream.markdown(
        "❌ No debug configurations found. Please create a launch.json file.\n",
      );
      return;
    }

    stream.markdown(`Found ${configs.length} debug configuration(s).\n`);

    // Try to extract configuration name from prompt
    const selectedConfig = this.matchConfiguration(prompt, configs);

    if (selectedConfig) {
      // Check all tracked sessions (not just the active one) for duplicates
      const isDuplicate = this.debugManager
        .getAllSessions()
        .some(
          (s) => s.vscodeSession.configuration?.name === selectedConfig.name,
        );
      if (isDuplicate) {
        stream.markdown(
          `A debug session with configuration **${selectedConfig.name}** is already running.\n\n` +
            "Please stop the current session first or use the `restart` command.\n\n" +
            "Examples:\n" +
            "- `@cfs-debug stop`\n" +
            "- `@cfs-debug restart`\n",
        );
        return;
      }

      stream.markdown(`✓ Matched configuration: **${selectedConfig.name}**\n`);
      stream.markdown(`Starting debug session...\n`);

      await this.startSession(
        stream,
        selectedConfig.name,
        selectedConfig.workspaceFolder,
      );
    } else {
      stream.markdown(
        "⚠️ Could not match a configuration from your request.\n\n",
      );
      stream.markdown("Available debug configurations:\n\n");
      this.showConfigList(stream, configs);
    }
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
        normalizedPrompt.includes(normalizedConfigName) ||
        normalizedConfigName.includes(normalizedPrompt)
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

  /**
   * Gets all debug configurations from workspace.
   */
  getConfigurations(): DebugConfig[] {
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
  showConfigList(
    stream: vscode.ChatResponseStream,
    configs?: DebugConfig[],
  ): void {
    const configList = configs || this.getConfigurations();

    if (configList.length === 0) {
      return;
    }

    configList.forEach((config, index) => {
      stream.markdown(`${index + 1}. ${config.name}\n`);
    });
    stream.markdown('\nSay "start debugging <config name>" to begin.\n');
  }
}
