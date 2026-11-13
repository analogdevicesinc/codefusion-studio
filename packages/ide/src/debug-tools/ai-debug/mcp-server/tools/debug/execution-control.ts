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
import type { StopInfo } from "../../../../debug-manager";
import type { McpServerDependencies } from "../../types/mcp-dependencies";
import { toolResult, toolError, noSession } from "../../utils/response-helpers";

/**
 * Registers execution control tools with the MCP server.
 *
 * Tools registered:
 * - debug_continue: Continue program execution
 * - debug_step_over: Step over the current line
 * - debug_step_into: Step into a function call
 * - debug_step_out: Step out of the current function
 * - debug_pause: Pause program execution
 * - debug_get_execution_state: Get whether the target is running/halted
 * - debug_wait_for_stop: Block until the target halts
 */
export function registerExecutionControlTools(
  server: McpServer,
  deps: McpServerDependencies,
): void {
  const { debugManager, commandExecutor } = deps;

  server.registerTool(
    "debug_continue",
    {
      title: "Continue Execution",
      description: "Continue program execution",
    },
    async () => {
      try {
        const result = await commandExecutor.continue();

        return toolResult(result);
      } catch (error) {
        return toolError("debug_continue", error);
      }
    },
  );

  server.registerTool(
    "debug_step_over",
    {
      title: "Step Over",
      description: "Step over the current line",
    },
    async () => {
      try {
        const result = await commandExecutor.stepOver();

        return toolResult(result);
      } catch (error) {
        return toolError("debug_step_over", error);
      }
    },
  );

  server.registerTool(
    "debug_step_into",
    {
      title: "Step Into",
      description: "Step into the function call",
    },
    async () => {
      try {
        const result = await commandExecutor.stepInto();

        return toolResult(result);
      } catch (error) {
        return toolError("debug_step_into", error);
      }
    },
  );

  server.registerTool(
    "debug_step_out",
    {
      title: "Step Out",
      description: "Step out of the current function",
    },
    async () => {
      try {
        const result = await commandExecutor.stepOut();

        return toolResult(result);
      } catch (error) {
        return toolError("debug_step_out", error);
      }
    },
  );

  server.registerTool(
    "debug_pause",
    {
      title: "Pause Execution",
      description: "Pause program execution",
    },
    async () => {
      try {
        const result = await commandExecutor.pause();

        return toolResult(result);
      } catch (error) {
        return toolError("debug_pause", error);
      }
    },
  );

  server.registerTool(
    "debug_get_execution_state",
    {
      title: "Get Execution State",
      description:
        "Get the current execution state of the debug target. " +
        "Returns whether the target is running, halted, or if there " +
        "is no active session. When halted, also returns the reason " +
        "the target stopped (breakpoint, step, pause, exception, etc.).",
    },
    async () => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return toolResult({ state: "no-session" });
        }

        if (session.isRunning) {
          return toolResult({ state: "running" });
        }

        return toolResult({
          state: "halted",
          stopInfo: session.lastStopInfo ?? null,
        });
      } catch (error) {
        return toolError("debug_get_execution_state", error);
      }
    },
  );

  server.registerTool(
    "debug_wait_for_stop",
    {
      title: "Wait for Target to Stop",
      description:
        "Block until the debug target halts execution (e.g. hits a breakpoint, " +
        "completes a step, encounters an exception). Returns the stop reason " +
        "including which breakpoint was hit and which thread triggered the stop. " +
        "If the target is already halted, returns immediately with the last stop reason. " +
        "Use this after 'debug_continue' to wait for a breakpoint hit, then " +
        "use 'debug_get_context' to inspect the state.",
      inputSchema: z.object({
              timeoutMs: z
                .number()
                .int()
                .min(100)
                .max(300000)
                .default(30000)
                .describe(
                  "Maximum time to wait in milliseconds (default 30000, max 300000)",
                ),
            }),
    },
    async (params) => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        // If the target is already halted, return immediately
        if (!session.isRunning) {
          return toolResult({
            stopped: true,
            stopInfo: session.lastStopInfo ?? { reason: "unknown" },
          });
        }

        const timeoutMs = params.timeoutMs as number;

        // Wait for the onHalt event or timeout
        const stopInfo = await new Promise<StopInfo | "timeout">((resolve) => {
          const timer = setTimeout(() => {
            disposable.dispose();
            resolve("timeout");
          }, timeoutMs);

          const disposable = session.onHalt((info: StopInfo) => {
            clearTimeout(timer);
            disposable.dispose();
            resolve(info);
          });
        });

        if (stopInfo === "timeout") {
          return toolResult({
            stopped: false,
            reason: `Target did not stop within ${timeoutMs}ms. It may still be running. Use debug_pause to halt it, or increase the timeout.`,
          });
        }

        return toolResult({
          stopped: true,
          stopInfo,
        });
      } catch (error) {
        return toolError("debug_wait_for_stop", error);
      }
    },
  );
}
