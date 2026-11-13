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
 * Registers workflow prompts for state awareness, crash diagnosis,
 * and timeout/error handling.
 *
 * These prompts use natural language — the agent autonomously
 * determines which tools to call and in what order.
 *
 * Prompts registered:
 * - basic-state-awareness: Check execution state, PC, and SP
 * - crash-diagnosis: Wait for and diagnose a firmware crash
 * - timeout-handling: Test behavior when a breakpoint is never hit
 */
export function registerStateAndCrashPrompts(server: McpServer): void {
  server.registerPrompt(
    "basic-state-awareness",
    {
      description:
        "Start a debug session and report the execution state, program counter, and stack pointer",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Start a debug session and tell me if the target is running or halted. If it is halted, show me the current program counter and stack pointer.",
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "crash-diagnosis",
    {
      description:
        "Start a debug session, wait for a crash, and provide full diagnosis with fault registers",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Start a debug session. The firmware is going to crash — when it does, tell me what happened, where it crashed, what the call stack looks like, and what the fault registers say.",
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "timeout-handling",
    {
      description:
        "Set a breakpoint on a function and report what happens (tests timeout and error handling)",
      argsSchema: z.object({
              functionName: z
                .string()
                .describe(
                  "Function name to set a breakpoint on (e.g. 'unusedFunction', 'SPI_Transfer')",
                ),
            }),
    },
    ({ functionName }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Set a breakpoint at the entry of function ${functionName}, continue execution, and tell me what happens.`,
          },
        },
      ],
    }),
  );
}
