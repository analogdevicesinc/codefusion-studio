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
import { McpDebugStreamableWebServer } from "./mcp-debug-web-server";
import { DebugChatParticipant } from "./debug-chat-participant";
import { DebugCommandExecutor } from "./debug-command-executor";
import type { McpServerDependencies } from "./mcp-server/cfs-mcp-server";
import {
  START_MCP_SERVER_COMMAND_ID,
  STOP_MCP_SERVER_COMMAND_ID,
  MCP_SERVER_STATUS_COMMAND_ID,
} from "../../commands/constants";
import { logger } from "../../utils/logger";
import { getTelemetryManager } from "../../telemetry/telemetry";
import { TELEMETRY_ACTIONS } from "../../telemetry/action-names";

/**
 * Manages the AI Debug Assistant functionality including:
 * - MCP Server for external AI clients
 * - Chat Participant for VS Code Copilot integration
 * - Command handlers for MCP server management
 */
export class CfsDebugAssistant
  implements vscode.McpServerDefinitionProvider, vscode.Disposable
{
  private onDidChangeMcpServerDefinitionsEmitter =
    new vscode.EventEmitter<void>();

  onDidChangeMcpServerDefinitions =
    this.onDidChangeMcpServerDefinitionsEmitter.event;

  private mcpDebugServer: McpDebugStreamableWebServer;
  private runOnActivation: boolean = false;
  private disposables: vscode.Disposable[] = [
    this.onDidChangeMcpServerDefinitionsEmitter,
  ];

  constructor(extensionUri: vscode.Uri, debugManager: CfsDebugManager) {
    const mcpDeps = CfsDebugAssistant.buildMcpDependencies(debugManager);
    this.mcpDebugServer = new McpDebugStreamableWebServer(mcpDeps);

    try {
      this.disposables.push(
        vscode.lm.registerMcpServerDefinitionProvider("cfs-mcp", this),
      );
    } catch (error) {
      console.warn("Could not register MCP server with VS Code:", error);
      console.log(
        "   If MCP is disabled, enable it in Settings: search for 'chat.mcp.enabled'",
      );
    }

    this.disposables.push(
      new DebugChatParticipant(
        extensionUri,
        debugManager,
        mcpDeps.commandExecutor,
      ),
    );

    this.registerMcpServerCommands();

    const config = vscode.workspace.getConfiguration("cfs.mcp");
    this.runOnActivation = config.get<boolean>("runOnActivation", false);
    if (this.runOnActivation) {
      this.startServer();
    }
  }

  /**
   * Builds the McpServerDependencies object that bridges VS Code APIs
   * to the MCP server without a direct vscode dependency in the MCP server module.
   */
  private static buildMcpDependencies(
    debugManager: CfsDebugManager,
  ): McpServerDependencies {
    return {
      debugManager,
      commandExecutor: new DebugCommandExecutor(debugManager),
      workspaceFileSearch: {
        findFiles: async (glob) => {
          // Use empty string for exclude pattern to override default files.exclude
          // This ensures files in dot-prefixed folders like .cfs are found
          const uris = await vscode.workspace.findFiles(glob, "");
          return uris.map((u) => u.fsPath);
        },
      },
    };
  }

  provideMcpServerDefinitions(
    _token: vscode.CancellationToken,
  ): vscode.McpServerDefinition[] {
    const definitions: vscode.McpServerDefinition[] = [];
    const debugServerUri = this.mcpDebugServer.getUri();
    if (debugServerUri !== undefined) {
      definitions.push(
        new vscode.McpHttpServerDefinition(
          "CFS Debug Assistant",
          debugServerUri,
        ),
      );
    }
    return definitions;
  }

  resolveMcpServerDefinition(
    server: vscode.McpServerDefinition,
    _token: vscode.CancellationToken,
  ): vscode.McpServerDefinition | undefined {
    if (server.label === "CFS Debug Assistant") {
      const debugServerUri = this.mcpDebugServer.getUri();
      if (debugServerUri !== undefined) {
        return new vscode.McpHttpServerDefinition(
          "CFS Debug Assistant",
          debugServerUri,
        );
      }
    }
    return undefined;
  }

  public async startServer(): Promise<void> {
    const config = vscode.workspace.getConfiguration("cfs.mcp");
    const mcpPort = config.get<number>("port", 0);

    if (this.mcpDebugServer.isRunning()) {
      logger.info(
        `MCP server is already running on ${this.mcpDebugServer.getUri()}`,
      );
      return;
    }
    try {
      await this.mcpDebugServer.start(mcpPort);
      void getTelemetryManager().then((telemetryManager) => {
        telemetryManager.logAction(TELEMETRY_ACTIONS.MCP_SERVER_STARTED, {});
      });
      this.onDidChangeMcpServerDefinitionsEmitter.fire();
      vscode.window.showInformationMessage(
        `MCP server started on ${this.mcpDebugServer.getUri()}`,
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start MCP server: ${error}`);
    }
  }

  public async stopServer(): Promise<void> {
    if (this.mcpDebugServer.isRunning() === false) {
      vscode.window.showWarningMessage("MCP server is not running");
      return;
    }
    try {
      await this.mcpDebugServer.stop();
      this.onDidChangeMcpServerDefinitionsEmitter.fire();
      vscode.window.showInformationMessage("MCP server stopped");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to stop MCP server: ${error}`);
    }
  }

  /**
   * Registers commands for managing the MCP server lifecycle
   */
  private registerMcpServerCommands(): void {
    // Start MCP Server Command
    this.disposables.push(
      vscode.commands.registerCommand(START_MCP_SERVER_COMMAND_ID, () => {
        this.startServer();
      }),
    );

    // Stop MCP Server Command
    this.disposables.push(
      vscode.commands.registerCommand(STOP_MCP_SERVER_COMMAND_ID, () => {
        this.stopServer();
      }),
    );

    // MCP Server Status Command
    this.disposables.push(
      vscode.commands.registerCommand(
        MCP_SERVER_STATUS_COMMAND_ID,
        async () => {
          const serverUri = this.mcpDebugServer.getUri();

          const status = serverUri
            ? `MCP server is running on ${serverUri}`
            : "MCP server is not running";

          const buttons = serverUri
            ? ["Stop Server", "Open in Browser", "Copy URL"]
            : ["Start Server"];

          const action = await vscode.window.showInformationMessage(
            status,
            ...buttons,
          );

          if (action === "Start Server") {
            this.startServer();
          } else if (action === "Stop Server") {
            this.stopServer();
          } else if (action === "Open in Browser") {
            vscode.env.openExternal(serverUri!);
          } else if (action === "Copy URL") {
            vscode.env.clipboard.writeText(serverUri!.toString());
            vscode.window.showInformationMessage("URL copied to clipboard");
          }
        },
      ),
    );
  }

  public dispose() {
    if (this.mcpDebugServer.isRunning()) {
      this.mcpDebugServer.stop().catch((error) => {
        console.warn("CFS MCP: Error stopping server during dispose:", error);
      });
    }
    this.onDidChangeMcpServerDefinitionsEmitter.fire();
    this.disposables.forEach((d) => d.dispose());
  }
}
