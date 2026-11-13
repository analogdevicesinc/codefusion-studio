# AI Debug

This directory contains the AI-assisted debugging features for CodeFusion Studio, including the MCP (Model Context Protocol) debug server.

## Overview

**MCP Server** — Exposes debug tools and prompts via the Model Context Protocol for use by any MCP-compatible AI client

## Directory Structure

```
ai-debug/
├── debug-assistant.ts          # Orchestrates MCP server lifecycle
├── debug-command-executor.ts   # Shared executor for debug lifecycle commands
├── debug-tool-executor.ts      # DAP-based debug tool execution
├── mcp-debug-web-server.ts     # Express HTTP server for MCP transport
├── mcp-server/                 # MCP server implementation
│   ├── cfs-mcp-server.ts       # CfsMcpServer class (extends McpServer)
│   ├── types/
│   │   └── mcp-dependencies.ts # Dependency injection interfaces
│   ├── utils/
│   │   └── response-helpers.ts # Tool response formatting helpers
│   ├── tools/debug/            # MCP tool registrations
│   │   ├── index.ts            # Registers all tool groups
│   │   ├── analysis.ts         # Context, fault analysis
│   │   ├── breakpoints.ts      # Breakpoints and watchpoints
│   │   ├── execution-control.ts# Step, continue, pause, wait-for-stop
│   │   ├── gdb-commands.ts     # Direct GDB/MI command execution
│   │   ├── memory.ts           # Memory read/write/search
│   │   └── session-lifecycle.ts# Session start/stop/restart
│   └── prompts/debug/          # MCP prompt registrations
│       ├── index.ts            # Registers all prompt groups
│       ├── breakpoint-and-stepping.ts
│       ├── state-and-crash.ts
│       └── watchpoint-and-memory.ts
└── README.md
```

## Architecture

### CfsDebugAssistant

`CfsDebugAssistant` (`debug-assistant.ts`) is the top-level orchestrator that:

- Creates and manages the `McpDebugStreamableWebServer`
- Registers VS Code commands for MCP server start/stop/status
- Wires up the `DebugCommandExecutor` and dependency injection for the MCP server

### MCP Server

**CfsMcpServer** extends `McpServer` from `@modelcontextprotocol/sdk` and registers debug tools and prompts. It uses dependency injection (`McpServerDependencies`) to access `CfsDebugManager` and `DebugCommandExecutor` without directly importing `vscode`.

**McpDebugStreamableWebServer** wraps the MCP server in an Express HTTP server using the Streamable HTTP transport, allowing external AI clients to connect.

### Data Flow

```
MCP Server path:
  AI Client → HTTP → McpDebugStreamableWebServer → CfsMcpServer → DebugCommandExecutor → CfsDebugManager → DAP
```

## Usage

The MCP server starts on an OS-assigned port. Control it via the VS Code command palette:

- **CFS: Start MCP Debug Server**
- **CFS: Stop MCP Debug Server**
- **CFS: MCP Debug Server Status**

The port is configurable via `cfs.mcp.port` in VS Code settings (default: `0` for OS-assigned).

## Development

### Adding an MCP Tool

1. Create or extend a file in `mcp-server/tools/debug/`
2. Register the tool using `server.tool()` from the MCP SDK
3. Call the registration function from `mcp-server/tools/debug/index.ts`

### Adding an MCP Prompt

1. Create or extend a file in `mcp-server/prompts/debug/`
2. Register the prompt using `server.prompt()` from the MCP SDK
3. Call the registration function from `mcp-server/prompts/debug/index.ts`

### Testing

1. Start the extension with F5
2. In the Extension Development Host:
   - Start the MCP server and connect an MCP client
3. Check the Extension Host console for logs

## Learn More

- [VS Code Debug API](https://code.visualstudio.com/api/extension-guides/debugger-extension)
- [Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
