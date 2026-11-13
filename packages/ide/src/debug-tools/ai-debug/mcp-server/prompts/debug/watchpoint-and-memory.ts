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

/**
 * Registers workflow prompts for watchpoints, memory inspection,
 * and multi-step autonomous investigation.
 *
 * These prompts use natural language — the agent autonomously
 * determines which tools to call and in what order.
 *
 * Prompts registered:
 * - watchpoint-trigger: Watch a variable for writes and report the writer
 * - memory-inspection: Read a memory region and interpret its contents
 * - autonomous-investigation: Find, watch, and trace memory corruption
 */
export function registerWatchpointAndMemoryPrompts(server: McpServer): void {
  server.registerPrompt(
    "watchpoint-trigger",
    {
      description:
        "Watch a variable for writes, continue execution, and report what wrote to it with the call stack",
      argsSchema: z.object({
              variable: z
                .string()
                .describe("Variable to watch for writes (e.g. 'rx_buffer')"),
            }),
    },
    ({ variable }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Watch the variable ${variable} for writes. Continue execution and when it triggers tell me what wrote to it and show the call stack.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "memory-inspection",
    {
      description:
        "Read a memory region and determine if it contains ASCII strings, structured data, or other patterns",
      argsSchema: z.object({
              address: z.string().describe("Start address (e.g. '0x20000000')"),
              length: z.coerce
                .number()
                .optional()
                .describe("Number of bytes to read (defaults to 256)"),
            }),
    },
    ({ address, length }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Read ${length ?? 256} bytes of memory starting at ${address} and tell me if it looks like it contains ASCII strings or structured data.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "autonomous-investigation",
    {
      description:
        "Autonomously investigate memory corruption: find the struct, set a watchpoint, trace the root cause, and disassemble suspicious code",
      argsSchema: z.object({
              variable: z
                .string()
                .describe("Variable or struct being corrupted (e.g. 'sensor_data')"),
            }),
    },
    ({ variable }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Something is corrupting the ${variable} struct. Find it in the source code, set a watchpoint on it, and when the corruption happens trace back through the call stack to find the root cause. If the writing function looks suspicious, disassemble it and explain what's going wrong.`,
          },
        },
      ],
    }),
  );
}
