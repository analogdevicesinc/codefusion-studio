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
import {
  toolResult,
  toolError,
  formatError,
  noSession,
} from "../../utils/response-helpers";

/**
 * Registers analysis and inspection tools with the MCP server.
 *
 * Tools registered:
 * - debug_get_context: Get backtrace, registers, and local variables
 * - debug_analyze_fault: Analyze ARM Cortex-M or RISC-V fault state
 */
export function registerAnalysisTools(
  server: McpServer,
  deps: McpServerDependencies,
): void {
  const { debugManager } = deps;

  server.registerTool(
    "debug_get_context",
    {
      title: "Get Debug Context",
      description:
        "Get comprehensive debug context including backtrace, registers, and local variables",
    },
    async () => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const backtrace = await session.evaluateREPL("backtrace");
        const registers = await session.evaluateREPL("info registers");
        const locals = await session.evaluateREPL("info locals");

        return toolResult({ backtrace, registers, locals });
      } catch (error) {
        return toolError("debug_get_context", error);
      }
    },
  );

  server.registerTool(
    "debug_analyze_fault",
    {
      title: "Analyze Fault",
      description:
        "Analyze the current fault state of the target processor. " +
        "Reads fault status registers, captures the stack frame, and provides a structured diagnosis. " +
        "Works with ARM Cortex-M (HardFault, MemManage, BusFault, UsageFault) and RISC-V (mcause, mtval).",
      inputSchema: z.object({
        architecture: z
          .enum(["arm", "riscv"])
          .describe("Target processor architecture"),
      }),
    },
    async (params) => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const architecture = params.architecture as "arm" | "riscv";
        const commands =
          architecture === "arm"
            ? [
                "info registers",
                "x/1xw 0xE000ED28", // CFSR
                "x/1xw 0xE000ED2C", // HFSR
                "x/1xw 0xE000ED34", // BFAR
                "x/1xw 0xE000ED38", // MMFAR
                "bt full",
              ]
            : [
                "info registers",
                "p/x $mcause",
                "p/x $mtval",
                "p/x $mepc",
                "p/x $mstatus",
                "bt full",
              ];

        const results: Array<{
          cmd: string;
          output?: string;
          error?: string;
        }> = [];

        for (const cmd of commands) {
          try {
            const output = await session.evaluateREPL(cmd);
            results.push({ cmd, output });
          } catch (e) {
            results.push({
              cmd,
              error: formatError(e),
            });
          }
        }

        return toolResult({ architecture, faultAnalysis: results });
      } catch (error) {
        return toolError("debug_analyze_fault", error);
      }
    },
  );
}
