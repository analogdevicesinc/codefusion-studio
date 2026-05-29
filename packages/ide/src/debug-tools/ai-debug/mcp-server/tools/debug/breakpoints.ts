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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { McpServerDependencies } from "../../types/mcp-dependencies";
import { toolResult, toolError, noSession } from "../../utils/response-helpers";

/**
 * Registers breakpoint and watchpoint tools with the MCP server.
 *
 * Tools registered:
 * - debug_set_breakpoint: Set a breakpoint at file:line
 * - debug_remove_breakpoints: Remove breakpoints from a file or all
 * - debug_list_breakpoints: List all active breakpoints
 * - debug_set_watchpoint: Set a hardware watchpoint
 * - debug_remove_watchpoint: Remove a watchpoint by number
 */
export function registerBreakpointTools(
  server: McpServer,
  deps: McpServerDependencies,
): void {
  const { debugManager, commandExecutor } = deps;

  server.registerTool(
    "debug_set_breakpoint",
    {
      title: "Set Breakpoint",
      description: "Set a breakpoint at the specified file and line",
      inputSchema: {
        file: z
          .string()
          .describe(
            "Absolute file path. Relative file paths are not supported.",
          ),
        line: z.coerce
          .number()
          .int()
          .min(1)
          .describe("Line number, with first line being 1"),
        condition: z
          .string()
          .optional()
          .describe("Conditional expression (optional)"),
      },
    },
    async (params) => {
      try {
        const result = await commandExecutor.setBreakpoint(
          params.file as string,
          params.line as number,
          params.condition as string | undefined,
        );

        return toolResult(result);
      } catch (error) {
        return toolError("debug_set_breakpoint", error);
      }
    },
  );

  server.registerTool(
    "debug_remove_breakpoints",
    {
      title: "Remove Breakpoints",
      description: "Remove breakpoints from a file or remove all breakpoints",
      inputSchema: {
        file: z
          .string()
          .optional()
          .describe(
            "Absolute file path. Relative file paths are not supported. If omitted, all breakpoints will be removed.",
          ),
        line: z.coerce
          .number()
          .int()
          .min(1)
          .optional()
          .describe(
            "Line number, with first line being 1. Can only be provided if file argument is also provided.\n" +
              "If omitted, and file is provided, all breakpoints of the file will be removed.\n" +
              "If omitted, and file is not provided, all breakpoints will be removed.",
          ),
      },
    },
    async (params) => {
      try {
        const result = await commandExecutor.removeBreakpoints(
          params.file as string | undefined,
          params.line as number | undefined,
        );

        return toolResult(result);
      } catch (error) {
        return toolError("debug_remove_breakpoints", error);
      }
    },
  );

  server.registerTool(
    "debug_list_breakpoints",
    {
      title: "List Breakpoints",
      description: "List all active breakpoints",
    },
    async () => {
      try {
        const result = await commandExecutor.listBreakpoints();

        return toolResult(result);
      } catch (error) {
        return toolError("debug_list_breakpoints", error);
      }
    },
  );

  server.registerTool(
    "debug_set_watchpoint",
    {
      title: "Set Watchpoint",
      description:
        "Set a hardware watchpoint to halt execution when a memory " +
        "location is written, read, or accessed. Useful for detecting " +
        "when global variables or memory regions are modified unexpectedly.",
      inputSchema: {
        expression: z
          .string()
          .describe(
            "Expression to watch (variable name like 'my_var' or " +
              "a dereference like '*(int*)0x20000100')",
          ),
        type: z
          .enum(["write", "read", "access"])
          .default("write")
          .describe(
            "Watchpoint type: 'write' (break on store), " +
              "'read' (break on load), 'access' (break on either)",
          ),
      },
    },
    async (params) => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const expression = params.expression as string;
        const type = params.type as string;

        const cmdMap: Record<string, string> = {
          write: "watch",
          read: "rwatch",
          access: "awatch",
        };

        const result = await session.evaluateREPL(
          `${cmdMap[type]} ${expression}`,
        );

        return toolResult(result);
      } catch (error) {
        return toolError("debug_set_watchpoint", error);
      }
    },
  );

  server.registerTool(
    "debug_remove_watchpoint",
    {
      title: "Remove Watchpoint",
      description:
        "Remove a watchpoint by its number. Use " +
        "'debug_execute_gdb_command' with 'info watchpoints' to list active watchpoints.",
      inputSchema: {
        number: z
          .number()
          .int()
          .min(1)
          .describe("Watchpoint number to remove (from 'info watchpoints')"),
      },
    },
    async (params) => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const num = params.number as number;
        await session.evaluateREPL(`delete ${num}`);

        return toolResult(`Watchpoint ${num} removed`);
      } catch (error) {
        return toolError("debug_remove_watchpoint", error);
      }
    },
  );
}
