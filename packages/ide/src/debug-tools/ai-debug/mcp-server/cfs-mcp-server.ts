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
import { registerDebugTools } from "./tools/debug/index";
import { registerDebugPrompts } from "./prompts/debug/index";
import type { McpServerDependencies } from "./types/mcp-dependencies";

export type {
  McpServerDependencies,
  WorkspaceFileSearchProvider,
} from "./types/mcp-dependencies";

/**
 * CodeFusion Studio MCP Server
 *
 * This server provides debug tools and prompts for autonomous
 * debugging workflows in CodeFusion Studio through the
 * Model Context Protocol (MCP).
 */
export class CfsMcpServer extends McpServer {
  constructor(deps: McpServerDependencies) {
    super(
      {
        name: "CFS MCP",
        version: "1.1.0",
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      },
    );

    // Debug tools
    registerDebugTools(this, deps);

    // Debug prompts
    registerDebugPrompts(this);
  }
}
