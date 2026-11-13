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
 * Commands that are blocked for safety when executing raw GDB commands.
 */
const DANGEROUS_COMMANDS = [
  "quit",
  "q",
  "detach",
  "kill",
  "file",
  "exec-file",
  "target",
];

/**
 * Checks whether a GDB command string contains a dangerous command.
 * Handles semicolon-separated multi-command strings (e.g., "info registers; quit")
 * and enforces word boundaries to avoid false positives (e.g., "quicklook" matching "q").
 * Returns the blocked command name if dangerous, or `undefined` if safe.
 */
function getDangerousCommand(command: string): string | undefined {
  const subCommands = command.split(";");

  for (const sub of subCommands) {
    const firstToken = sub.trim().split(/\s+/)[0]?.toLowerCase();

    if (firstToken !== undefined) {
      const match = DANGEROUS_COMMANDS.find((d) => firstToken === d);

      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

/** Result of executing a single GDB command. */
interface GdbCommandResult {
  command: string;
  output: string;
  error?: string;
}

/**
 * Executes an ordered sequence of GDB commands, collecting results.
 * Each command is checked against the dangerous-commands blocklist before execution.
 *
 * @param session  - Active debug session with a GDB REPL.
 * @param commands - GDB commands to execute in order.
 * @param stopOnError - If true, stop executing after the first error.
 * @returns Array of per-command results (output or error).
 */
async function executeGdbCommands(
  session: { evaluateREPL(_command: string): Promise<string> },
  commands: string[],
  stopOnError: boolean,
): Promise<GdbCommandResult[]> {
  const results: GdbCommandResult[] = [];

  for (const cmd of commands) {
    const blocked = getDangerousCommand(cmd);

    if (blocked) {
      results.push({
        command: cmd,
        output: "",
        error: `Command "${cmd.split(" ")[0]}" is not allowed for safety`,
      });

      if (stopOnError) break;

      continue;
    }

    try {
      const output = await session.evaluateREPL(cmd);
      results.push({ command: cmd, output });
    } catch (error) {
      results.push({
        command: cmd,
        output: "",
        error: formatError(error),
      });

      if (stopOnError) break;
    }
  }

  return results;
}

/**
 * Registers GDB command execution tools with the MCP server.
 *
 * Tools registered:
 * - debug_execute_gdb_command: Execute a single raw GDB command
 * - debug_execute_gdb_sequence: Execute a sequence of GDB commands in order
 */
export function registerGdbCommandTools(
  server: McpServer,
  deps: McpServerDependencies,
): void {
  const { debugManager } = deps;

  server.registerTool(
    "debug_execute_gdb_command",
    {
      title: "Execute GDB Command",
      description:
        "Execute a raw GDB command for debugging. Supported commands include: backtrace/bt, info (breakpoints/locals/registers/threads/args), print/p <expr>, x/<format> <address>, continue/c, next/n, step/s, finish, until, break/b, delete, disable, enable, list, disassemble. Dangerous commands (quit, kill, detach, file, target) are blocked.",
      inputSchema: z.object({
        command: z
          .string()
          .describe(
            "GDB command to execute (e.g., 'info registers', 'backtrace', 'x/16x 0x20000000')",
          ),
      }),
    },
    async (params) => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const [result] = await executeGdbCommands(
          session,
          [params.command as string],
          true,
        );

        if (result.error) {
          return toolError(result.error);
        }

        return toolResult(result.output);
      } catch (error) {
        return toolError("debug_execute_gdb_command", error);
      }
    },
  );

  server.registerTool(
    "debug_execute_gdb_sequence",
    {
      title: "Execute GDB Sequence",
      description:
        "Execute a sequence of GDB commands in order and return all results. " +
        "Useful for multi-step debugging operations like 'read registers then examine stack'. " +
        "The debug session must be halted (paused at a breakpoint or after a step).",
      inputSchema: z.object({
        commands: z
          .array(z.string())
          .min(1)
          .max(20)
          .describe("Array of GDB commands to execute in order"),
        stopOnError: z
          .boolean()
          .default(true)
          .describe(
            "Whether to stop executing remaining commands if one fails (default true)",
          ),
      }),
    },
    async (params) => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const results = await executeGdbCommands(
          session,
          params.commands as string[],
          params.stopOnError as boolean,
        );

        return toolResult(results);
      } catch (error) {
        return toolError("debug_execute_gdb_sequence", error);
      }
    },
  );
}
