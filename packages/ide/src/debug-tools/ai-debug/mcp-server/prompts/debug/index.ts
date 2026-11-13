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
import { registerStateAndCrashPrompts } from "./state-and-crash";
import { registerBreakpointAndSteppingPrompts } from "./breakpoint-and-stepping";
import { registerWatchpointAndMemoryPrompts } from "./watchpoint-and-memory";

/**
 * Registers all debug workflow prompts with the MCP server.
 *
 * Prompts use natural language — the agent autonomously determines
 * which tools to call and in what order. This tests the full
 * autonomous debugging capability of the AI debug assistant.
 *
 * Workflow groups:
 * - State & crash: session awareness, crash diagnosis, timeout handling
 * - Breakpoint & stepping: set/hit, source search, conditional, disassembly
 * - Watchpoint & memory: variable watches, memory inspection, investigation
 */
export function registerDebugPrompts(server: McpServer): void {
  registerStateAndCrashPrompts(server);
  registerBreakpointAndSteppingPrompts(server);
  registerWatchpointAndMemoryPrompts(server);
}
