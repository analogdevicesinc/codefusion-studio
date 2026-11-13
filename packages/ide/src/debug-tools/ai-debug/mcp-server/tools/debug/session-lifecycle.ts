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
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { McpServerDependencies } from "../../types/mcp-dependencies";
import { toolResult, toolError, noSession } from "../../utils/response-helpers";

/**
 * Registers debug session lifecycle tools with the MCP server.
 *
 * Tools registered:
 * - debug_get_active_session: Get information about the active debug session
 * - debug_start: Start a debug session
 * - debug_stop: Stop the current debug session
 * - debug_restart: Restart the current debug session
 */
export function registerSessionLifecycleTools(
  server: McpServer,
  deps: McpServerDependencies,
): void {
  const { debugManager, commandExecutor } = deps;

  server.registerTool(
    "debug_get_active_session",
    {
      title: "Get Active Debug Session",
      description: "Get information about the active debug session",
    },
    async () => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        return toolResult({ id: session.vscodeSession.id });
      } catch (error) {
        return toolError("debug_get_active_session", error);
      }
    },
  );

  server.registerTool(
    "debug_start",
    {
      title: "Start Debugging",
      description:
        "Start a debug session with the specified configuration name. " +
        "Use 'debug_help' to discover available configurations.",
      inputSchema: z.object({
              configName: z
                .string()
                .describe("Debug configuration name from launch.json"),
            }),
    },
    async (params) => {
      try {
        const result = await commandExecutor.startDebugging(
          params.configName as string,
        );

        return toolResult(result);
      } catch (error) {
        return toolError("debug_start", error);
      }
    },
  );

  server.registerTool(
    "debug_stop",
    {
      title: "Stop Debugging",
      description: "Stop the current debug session",
    },
    async () => {
      try {
        const result = await commandExecutor.stopDebugging();

        return toolResult(result);
      } catch (error) {
        return toolError("debug_stop", error);
      }
    },
  );

  server.registerTool(
    "debug_restart",
    {
      title: "Restart Debugging",
      description:
        "Restart the current debug session. " +
        "Re-flashes and re-launches the target, preserving breakpoints.",
    },
    async () => {
      try {
        const result = await commandExecutor.restart();

        return toolResult(result);
      } catch (error) {
        return toolError("debug_restart", error);
      }
    },
  );
}
