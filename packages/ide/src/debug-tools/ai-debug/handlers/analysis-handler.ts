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
import { DebugPromptBuilder } from "../debug-prompt-builder";
import { DebugToolExecutor } from "../debug-tool-executor";
import {
  isSessionDisconnectedError,
  getDisconnectionMessage,
} from "../utils/session-error-helpers";

/**
 * Handles GDB commands and code analysis ("find bugs").
 */
export class AnalysisHandler {
  constructor(
    private toolExecutor: DebugToolExecutor,
    private promptBuilder: DebugPromptBuilder,
  ) {}

  /**
   * Handles direct GDB command execution.
   * @returns true if the command was handled, false otherwise
   */
  async handleGdbCommand(
    prompt: string,
    stream: vscode.ChatResponseStream,
  ): Promise<boolean> {
    const gdbPatterns = [
      /(?:run|execute|send)\s+(?:gdb\s+)?(?:command|cmd)?[:\s]+(.+)/i,
      /^gdb:\s*(.+)/i, // gdb: <command> prefix syntax
      /^-[a-z]+-/i, // GDB/MI commands start with -
      /^(?:info|print|display|watch|set|show)\s+/i, // Common GDB commands
    ];

    let gdbCommand: string | null = null;

    for (const pattern of gdbPatterns) {
      const match = prompt.match(pattern);
      if (match) {
        gdbCommand = match[1] || prompt;
        break;
      }
    }

    if (!gdbCommand) {
      return false;
    }

    if (!vscode.debug.activeDebugSession) {
      stream.markdown("No active debug session. Start debugging first.\n");
      return true;
    }

    stream.markdown(`GDB command: \`${gdbCommand}\`\n\n`);

    try {
      const result = await this.toolExecutor.executeGdbCommand(gdbCommand);
      stream.markdown(
        "```\n" +
          (result.result || result.response || "Command executed") +
          "\n```\n",
      );
    } catch (error) {
      if (isSessionDisconnectedError(error, true)) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stream.markdown(getDisconnectionMessage(errorMsg));
      } else {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stream.markdown(`Error: ${errorMsg}\n`);
      }
    }

    return true;
  }

  /**
   * Handles "find bugs" command to scan the project for potential issues.
   * @returns true if the command was handled, false otherwise
   */
  async handleFindBugs(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<boolean> {
    const lowerPrompt = prompt.toLowerCase();

    if (
      !lowerPrompt.includes("find bugs") &&
      !lowerPrompt.includes("scan for bugs") &&
      !lowerPrompt.includes("analyze code") &&
      !lowerPrompt.includes("check for issues")
    ) {
      return false;
    }

    stream.progress("Scanning project for potential issues...");

    // Find C/C++ source files in the workspace
    const sourceFiles = await vscode.workspace.findFiles(
      "**/*.{c,cpp,h,hpp}",
      "**/node_modules/**",
      20,
    );

    if (sourceFiles.length === 0) {
      stream.markdown("No C/C++ source files found in the workspace.\n");
      return true;
    }

    stream.markdown(
      `Found ${sourceFiles.length} source file(s) to analyze.\n\n`,
    );

    // Collect file contents for analysis
    const fileContents: string[] = [];
    for (const uri of sourceFiles.slice(0, 5)) {
      if (token.isCancellationRequested) break;

      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        const content = doc.getText();
        const fileName = uri.fsPath.split(/[/\\]/).pop();

        if (content.split("\n").length <= 500) {
          fileContents.push(
            `### File: ${fileName}\n\`\`\`c\n${content}\n\`\`\``,
          );
        }
      } catch {
        // Skip files that can't be read
      }
    }

    if (fileContents.length === 0) {
      stream.markdown("Could not read any source files for analysis.\n");
      return true;
    }

    // Build prompt for AI analysis
    const analysisPrompt = `Analyze the following embedded C/C++ code for potential bugs and issues.
Focus on:
1. Memory safety issues (buffer overflows, null pointer dereferences, memory leaks)
2. Uninitialized variables
3. Race conditions or interrupt safety issues
4. Integer overflow/underflow
5. Resource management issues (unclosed handles, unfreed memory)
6. Common ARM Cortex-M specific issues (stack overflow, interrupt priority issues)

For each issue found, explain:
- The location (file and approximate line)
- The problem
- A suggested fix

${fileContents.join("\n\n")}`;

    // Send to Copilot for analysis
    const messages = [
      new vscode.LanguageModelChatMessage(
        vscode.LanguageModelChatMessageRole.User,
        this.promptBuilder.buildSystemPrompt(),
      ),
      new vscode.LanguageModelChatMessage(
        vscode.LanguageModelChatMessageRole.User,
        analysisPrompt,
      ),
    ];

    const chatModels = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: "claude-sonnet-4.5",
    });

    if (chatModels.length === 0) {
      stream.markdown(
        "No Copilot model available. Please ensure GitHub Copilot is installed.\n",
      );
      return true;
    }

    stream.markdown("### Bug Analysis Results\n\n");

    const model = chatModels[0];
    const response = await model.sendRequest(messages, {}, token);

    for await (const fragment of response.text) {
      stream.markdown(fragment);
    }

    return true;
  }
}
