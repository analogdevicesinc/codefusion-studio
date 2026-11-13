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
 * Registers workflow prompts for breakpoint operations, source search,
 * conditional breakpoints, and instruction stepping.
 *
 * These prompts use natural language — the agent autonomously
 * determines which tools to call and in what order.
 *
 * Prompts registered:
 * - breakpoint-and-inspect: Set breakpoint, run, inspect locals on hit
 * - conditional-breakpoint: Conditional breakpoint, catch multiple hits, compare
 * - step-and-disassemble: Step N instructions, show disassembly and registers
 */
export function registerBreakpointAndSteppingPrompts(server: McpServer): void {
  server.registerPrompt(
    "breakpoint-and-inspect",
    {
      description:
        "Set a breakpoint at a specific location, continue, and show local variables when hit",
      argsSchema: z.object({
        file: z.string().describe("Source file name (e.g. 'main.c')"),
        line: z.coerce.number().describe("Line number for the breakpoint"),
      }),
    },
    ({ file, line }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Set a breakpoint on line ${line} of ${file}, continue execution, and when the breakpoint is hit show me the local variables.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "conditional-breakpoint",
    {
      description:
        "Set a conditional breakpoint, catch it twice, read a variable each time, and compare values",
      argsSchema: z.object({
        condition: z
          .string()
          .describe(
            "Condition for the breakpoint (e.g. 'the loop counter exceeds 100')",
          ),
        variable: z
          .string()
          .optional()
          .describe(
            "Variable to read and compare across hits (e.g. 'loop counter')",
          ),
      }),
    },
    ({ condition, variable }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Set a breakpoint in the main loop that only triggers when ${condition}. When it hits, read the ${variable ?? "counter"} value, then continue and catch it again. Compare the two values.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "step-and-disassemble",
    {
      description:
        "Step through N instructions showing disassembly and a register value at each step",
      argsSchema: z.object({
        steps: z.coerce
          .number()
          .default(1)
          .describe("Number of instructions to step through"),
        register: z
          .string()
          .optional()
          .describe("Register to display at each step (defaults to 'r0')"),
      }),
    },
    ({ steps, register }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Start debugging, step through the first ${steps} instructions, and after each step show me the disassembly of the current instruction and the value of register ${register ?? "r0"}.`,
          },
        },
      ],
    }),
  );
}
