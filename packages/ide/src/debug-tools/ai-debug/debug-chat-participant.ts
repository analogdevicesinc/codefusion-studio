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
import { CfsDebugManager } from "../debug-manager";
import { DebugToolExecutor } from "./debug-tool-executor";
import { DebugPromptBuilder } from "./debug-prompt-builder";
import {
  BreakpointHandler,
  LifecycleHandler,
  AnalysisHandler,
  InspectionHandler,
  showHelp,
  identifyRequiredTools,
} from "./handlers";
import {
  isSessionDisconnectedError,
  getDisconnectionMessage,
} from "./utils/session-error-helpers";

export class DebugChatParticipant implements vscode.Disposable {
  private participant: vscode.ChatParticipant;
  private debugManager: CfsDebugManager;
  private toolExecutor: DebugToolExecutor;
  private promptBuilder: DebugPromptBuilder;

  // Command handlers
  private breakpointHandler: BreakpointHandler;
  private lifecycleHandler: LifecycleHandler;
  private analysisHandler: AnalysisHandler;
  private inspectionHandler: InspectionHandler;

  constructor(extensionUri: vscode.Uri, debugManager: CfsDebugManager) {
    this.debugManager = debugManager;
    this.toolExecutor = new DebugToolExecutor(this.debugManager);
    this.promptBuilder = new DebugPromptBuilder();

    // Initialize handlers
    this.breakpointHandler = new BreakpointHandler();
    this.lifecycleHandler = new LifecycleHandler(debugManager);
    this.analysisHandler = new AnalysisHandler(
      this.toolExecutor,
      this.promptBuilder,
    );
    this.inspectionHandler = new InspectionHandler(this.toolExecutor);

    // Register chat participant
    this.participant = vscode.chat.createChatParticipant(
      "cfs.debugAssistant",
      this.handleChatRequest.bind(this),
    );

    this.participant.iconPath = vscode.Uri.joinPath(
      extensionUri,
      "media/images/cfs-app-icon.png",
    );

    this.participant.followupProvider = {
      provideFollowups: () => [], // No follow-up suggestions
    };
  }

  private async handleChatRequest(
    request: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<void> {
    try {
      const userMessage = request.prompt;
      const hadActiveSession = !!vscode.debug.activeDebugSession;

      // Handle slash commands
      if (request.command === "help") {
        showHelp(stream);
        return;
      }

      if (request.command === "gdb") {
        const handled = await this.analysisHandler.handleGdbCommand(
          userMessage,
          stream,
        );
        if (!handled) {
          showHelp(stream);
        }
        return;
      }

      // Check for debug lifecycle commands (start, stop, restart, step, etc.)
      try {
        const handled = await this.lifecycleHandler.handle(
          userMessage,
          stream,
          () => showHelp(stream),
        );
        if (handled) return;
      } catch (error) {
        this.showError(stream, "Debug command", error, hadActiveSession);
        return;
      }

      // Check for breakpoint commands
      try {
        const handled = await this.breakpointHandler.handle(
          userMessage,
          stream,
        );
        if (handled) return;
      } catch (error) {
        this.showError(stream, "Breakpoint command", error, hadActiveSession);
        return;
      }

      // Check for inspection commands (show variables, registers, etc.)
      try {
        const handled = await this.inspectionHandler.handle(
          userMessage,
          stream,
          token,
        );
        if (handled) return;
      } catch (error) {
        this.showError(stream, "Inspection command", error, hadActiveSession);
        return;
      }

      // Check for GDB command execution
      try {
        const handled = await this.analysisHandler.handleGdbCommand(
          userMessage,
          stream,
        );
        if (handled) return;
      } catch (error) {
        this.showError(stream, "GDB command", error, hadActiveSession);
        return;
      }

      // Check for "find bugs" command
      try {
        const handled = await this.analysisHandler.handleFindBugs(
          userMessage,
          stream,
          token,
        );
        if (handled) return;
      } catch (error) {
        this.showError(stream, "Find bugs", error, hadActiveSession);
        return;
      }

      // For other queries, require an active debug session
      if (!vscode.debug.activeDebugSession) {
        stream.markdown(
          "⚠️ No active debug session. Please start debugging first or say 'start debugging'.\n",
        );
        return;
      }

      // Handle AI-assisted debugging queries
      await this.handleAIQuery(userMessage, stream, token);
    } catch (error) {
      this.showError(stream, "Error", error);
    }
  }

  /**
   * Handles AI-assisted debugging queries by gathering context and consulting Copilot.
   */
  private async handleAIQuery(
    userMessage: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<void> {
    stream.progress("Analyzing debug context...");

    // Determine which debug tools to use based on the request
    const tools = identifyRequiredTools(userMessage);

    // Execute tools and gather data
    const toolResults = await this.toolExecutor.executeTools(tools, token);

    // Build context for Copilot
    const debugContext = this.promptBuilder.buildContext(
      userMessage,
      toolResults,
    );

    stream.progress("Consulting AI assistant...");

    const messages = [
      new vscode.LanguageModelChatMessage(
        vscode.LanguageModelChatMessageRole.User,
        this.promptBuilder.buildSystemPrompt(),
      ),
      new vscode.LanguageModelChatMessage(
        vscode.LanguageModelChatMessageRole.User,
        debugContext,
      ),
      new vscode.LanguageModelChatMessage(
        vscode.LanguageModelChatMessageRole.User,
        userMessage,
      ),
    ];

    const chatModels = await vscode.lm.selectChatModels({
      vendor: "copilot",
      family: "claude-sonnet-4.5",
    });

    if (chatModels.length === 0) {
      stream.markdown(
        "❌ No Copilot model available. Please ensure GitHub Copilot is installed and authenticated.\n",
      );
      return;
    }

    const model = chatModels[0];
    const response = await model.sendRequest(messages, {}, token);

    for await (const fragment of response.text) {
      stream.markdown(fragment);
    }
  }
  private showError(
    stream: vscode.ChatResponseStream,
    context: string,
    error: unknown,
    hadActiveSession = false,
  ): void {
    if (isSessionDisconnectedError(error, hadActiveSession)) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      stream.markdown(getDisconnectionMessage(errorMsg));
      return;
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    stream.markdown(`❌ ${context} error: ${errorMsg}\n`);
  }

  dispose() {
    this.debugManager.dispose();
    this.participant.dispose();
  }
}
