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
import type { DebugCommandExecutor } from "../debug-command-executor";

/**
 * Handles debug lifecycle commands (start, stop, restart, step, continue).
 */
export class LifecycleHandler {
  constructor(private commandExecutor: DebugCommandExecutor) {}

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
      await this.handleExecutorCommand(stream, () =>
        this.commandExecutor.restart(),
      );
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
      await this.handleExecutorCommand(stream, () =>
        this.commandExecutor.startDebugging(undefined, undefined, prompt),
      );
      return true;
    }

    // Check for stop debug intent
    if (
      lowerPrompt.includes("stop debug") ||
      lowerPrompt.includes("end debug") ||
      lowerPrompt.includes("terminate debug") ||
      lowerPrompt === "stop"
    ) {
      await this.handleExecutorCommand(stream, () =>
        this.commandExecutor.stopDebugging(),
      );
      return true;
    }

    // Check for continue/resume intent
    if (
      lowerPrompt.includes("continue") ||
      lowerPrompt.includes("resume") ||
      lowerPrompt === "c" ||
      (lowerPrompt.includes("keep") && lowerPrompt.includes("going"))
    ) {
      await this.handleExecutorCommand(stream, () =>
        this.commandExecutor.continue(),
      );
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
      await this.handleExecutorCommand(stream, () =>
        this.commandExecutor.stepOver(),
      );
      return true;
    }

    // Check for step into intent
    if (lowerPrompt.includes("step into") || lowerPrompt.includes("step in")) {
      await this.handleExecutorCommand(stream, () =>
        this.commandExecutor.stepInto(),
      );
      return true;
    }

    // Check for step out intent
    if (
      lowerPrompt.includes("step out") ||
      lowerPrompt.includes("finish") ||
      lowerPrompt.includes("return")
    ) {
      await this.handleExecutorCommand(stream, () =>
        this.commandExecutor.stepOut(),
      );
      return true;
    }

    // Check for pause intent
    if (
      lowerPrompt.includes("pause") ||
      lowerPrompt.includes("break now") ||
      lowerPrompt.includes("halt")
    ) {
      await this.handleExecutorCommand(stream, () =>
        this.commandExecutor.pause(),
      );
      return true;
    }

    return false;
  }

  private async handleExecutorCommand(
    stream: vscode.ChatResponseStream,
    command: () => Promise<string>,
  ): Promise<void> {
    const response = await command();
    stream.markdown(response);
  }
}
