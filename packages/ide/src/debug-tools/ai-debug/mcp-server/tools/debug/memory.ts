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
 * Parses the output of a GDB `x/Nxb` command into an array of byte values.
 *
 * GDB output example:
 *   0x20000000: 0xde 0xad 0xbe 0xef
 *   0x20000004: 0xca 0xfe 0xba 0xbe
 */
function parseHexBytes(gdbOutput: string): number[] {
  const bytes: number[] = [];

  for (const line of gdbOutput.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Strip the address prefix (e.g. "0x20000000:") then extract hex values
    const afterAddress = trimmed.replace(/^0x[0-9a-fA-F]+:\s*/, "");

    for (const match of afterAddress.matchAll(/0x([0-9a-fA-F]+)/g)) {
      bytes.push(parseInt(match[1], 16));
    }
  }

  return bytes;
}

/**
 * Registers memory operation tools with the MCP server.
 *
 * Tools registered:
 * - debug_read_memory: Read memory at a specific address
 * - debug_write_memory: Write a value to a memory address
 * - debug_search_memory: Search for a byte pattern in a memory region
 */
export function registerMemoryTools(
  server: McpServer,
  deps: McpServerDependencies,
): void {
  const { debugManager } = deps;

  server.registerTool(
    "debug_read_memory",
    {
      title: "Read Memory",
      description:
        "Read memory from the target device at a specific address. " +
        "Returns the data as a hex byte string. " +
        "Requires a halted debug session.",
      inputSchema: z.object({
        address: z
          .string()
          .describe(
            "Memory address to read from, e.g. '0x20000000' or a symbol name like '&main'",
          ),
        count: z
          .number()
          .int()
          .min(1)
          .max(1024)
          .describe("Number of bytes to read"),
      }),
    },
    async (params) => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const address = params.address as string;
        const count = params.count as number;

        const gdbCmd = `x/${count}xb ${address}`;
        const raw = await session.evaluateREPL(gdbCmd);
        const bytes = parseHexBytes(raw);

        return toolResult({
          address,
          count: bytes.length,
          hex: bytes.map((b) => b.toString(16).padStart(2, "0")).join(""),
        });
      } catch (error) {
        return toolError("debug_read_memory", error);
      }
    },
  );

  server.registerTool(
    "debug_write_memory",
    {
      title: "Write Memory",
      description:
        "Write a value to a specific memory address on the target device. " +
        "Requires a halted debug session. The write is verified by reading " +
        "back the written address. Use with caution.",
      inputSchema: z.object({
        address: z
          .string()
          .describe(
            "Memory address to write to (e.g. '0x20000000' or a symbol name)",
          ),
        value: z
          .string()
          .describe("Value to write in hex format (e.g. '0xDEADBEEF')"),
        size: z
          .enum(["byte", "halfword", "word"])
          .default("word")
          .describe(
            "Write size: byte(1), halfword(2), word(4) (default 'word')",
          ),
      }),
    },
    async (params) => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const address = params.address as string;
        const value = params.value as string;
        const size = params.size as string;

        const castMap: Record<string, string> = {
          byte: "char",
          halfword: "short",
          word: "int",
        };

        const gdbWrite = `set *((${castMap[size]}*)${address}) = ${value}`;
        await session.evaluateREPL(gdbWrite);

        // Verify the write by reading back
        const unitMap: Record<string, string> = {
          byte: "b",
          halfword: "h",
          word: "w",
        };
        const gdbVerify = `x/1x${unitMap[size]} ${address}`;
        const verification = await session.evaluateREPL(gdbVerify);

        return toolResult(
          `Memory write successful.\nVerification: ${verification}`,
        );
      } catch (error) {
        return toolError("debug_write_memory", error);
      }
    },
  );

  server.registerTool(
    "debug_search_memory",
    {
      title: "Search Memory",
      description:
        "Search for a byte pattern or value in a memory region. " +
        "Useful for finding specific values, strings, or sentinel " +
        "patterns that indicate corruption. Requires a halted debug session.",
      inputSchema: z.object({
        startAddress: z
          .string()
          .describe("Start address for the search (e.g. '0x20000000')"),
        length: z
          .number()
          .int()
          .min(1)
          .max(1048576)
          .describe("Number of bytes to search"),
        pattern: z
          .string()
          .describe(
            "Pattern to search for (hex value like '0xDEADBEEF' " +
              "or a string in double quotes)",
          ),
      }),
    },
    async (params) => {
      try {
        const session = debugManager.getActiveSession();

        if (!session) {
          return noSession();
        }

        const startAddress = params.startAddress as string;
        const length = params.length as number;
        const pattern = params.pattern as string;

        const gdbCmd = `find /w ${startAddress}, +${length}, ${pattern}`;
        const result = await session.evaluateREPL(gdbCmd);

        return toolResult(
          result || "Pattern not found in specified memory region",
        );
      } catch (error) {
        return toolError("debug_search_memory", error);
      }
    },
  );
}
