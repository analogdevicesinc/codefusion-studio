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
import type { McpServerDependencies } from "../../types/mcp-dependencies";
import { registerGdbCommandTools } from "./gdb-commands";
import { registerSessionLifecycleTools } from "./session-lifecycle";
import { registerExecutionControlTools } from "./execution-control";
import { registerBreakpointTools } from "./breakpoints";
import { registerMemoryTools } from "./memory";
import { registerAnalysisTools } from "./analysis";

/**
 * Registers all debug tools with the MCP server.
 *
 * Tools are organised into cohesive groups:
 * - GDB commands: raw and sequenced GDB command execution
 * - Session lifecycle: start, stop, restart, session info, help
 * - Execution control: continue, step, pause, execution state, wait-for-stop
 * - Breakpoints: set/remove/list breakpoints and watchpoints
 * - Memory: read, write, and search target memory
 * - Analysis: debug context, fault analysis, code search
 */
export function registerDebugTools(
  server: McpServer,
  deps: McpServerDependencies,
): void {
  registerGdbCommandTools(server, deps);
  registerSessionLifecycleTools(server, deps);
  registerExecutionControlTools(server, deps);
  registerBreakpointTools(server, deps);
  registerMemoryTools(server, deps);
  registerAnalysisTools(server, deps);
}
