---
description: Troubleshooting the AI Debug Assistant in CodeFusion Studio.
author: Analog Devices
date: 2026-05-15
---

# Troubleshooting

!!! info "Preview"
    The AI Debug Assistant is currently in preview and may change in future releases.

## Choosing the right path

If you're experiencing issues with the CFS Debug chat participant, we recommend switching to the CFS MCP debug server with any MCP-compatible AI client for maximum portability and future compatibility.

See [Getting started](getting-started.md#cfs-mcp-debug-server-recommended) for connection steps.

## Port conflict

If the OS cannot assign a port, or you need a specific port:

1. Go to **Settings → Extensions → CodeFusion Studio → General**, or search for (`cfs.mcp.port`).
2. Change the **Port** (`cfs.mcp.port`) to a specific free port (for example, 3001 or 3002). Set it to `0` to let the OS assign a port automatically.
3. Run `(CFS) MCP: Stop Debug Server` then `(CFS) MCP: Start Debug Server`.
4. Update your AI client configuration to use the new port.

## No active debug session

Most tools require an active debug session. Start debugging with **F5** or via the **Run** menu before asking the assistant to inspect state or control execution. Alternatively, you can ask the assistant to start a debug session using the appropriate configuration name. For example: *"Start debugging CFS: Debug with GDB and OpenOCD (ARM Embedded)"*.

## `No Copilot model available`

If you see the error `No Copilot model available. Please ensure GitHub Copilot is installed and authenticated`, the `@cfs-debug` chat participant cannot access the required AI model. To resolve this:

1. Ensure GitHub Copilot is installed and you are signed in
2. Ensure your GitHub Copilot plan includes access to Claude models (such as Claude Sonnet 4.5 or Claude Opus 4.6)

## CFS Debug Assistant tools not appearing in GitHub Copilot Chat

If the CFS Debug Assistant tools are not available in GitHub Copilot Chat:

1. Check that your VS Code version is 1.96.0 or later (**Help → About**)
2. Ensure GitHub Copilot is installed and you are signed in
3. Confirm the CodeFusion Studio extension is installed and active

## Claude Code cannot connect

If Claude Code cannot reach the MCP server:

1. Run `(CFS) MCP: Server Status` in the Command Palette to confirm the MCP server is running
2. Run `(MCP) List Servers` or `claude mcp list` to confirm `cfs-debug` is registered and check the URL and port are correct
3. If the port has changed, re-register the server:

    ```bash
    claude mcp remove cfs-debug
    claude mcp add --transport http cfs-debug http://localhost:<port>/mcp
    ```

### Test the connection independently

Use the [:octicons-link-external-24: MCP Inspector](https://github.com/modelcontextprotocol/inspector){:target="_blank"} to test the server directly:

```bash
npx @modelcontextprotocol/inspector
```

Select **Streamable HTTP** transport and **Proxy** connection type, then enter `http://localhost:<port>/mcp` (replace `<port>` with the port assigned at startup — check using `(CFS) MCP: Server Status`). You can browse all available tools, resources, and prompts, and execute them manually to verify everything is working before involving an AI client.

## Additional information

- [:octicons-link-external-24: Model Context Protocol specification](https://modelcontextprotocol.io/){:target="_blank"}
- [:octicons-link-external-24: GitHub Copilot VS Code extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot){:target="_blank"}
- [:octicons-link-external-24: Claude Code](https://claude.com/product/claude-code){:target="_blank"}
- [:octicons-link-external-24: Debug Adapter Protocol](https://microsoft.github.io/debug-adapter-protocol/){:target="_blank"}
- [GDB Toolbox](../gdb-toolbox/index.md) — automate GDB command sequences with JSON-based scripts
- [Core Dump Analysis Tool](../core-dump-analysis/index.md) — offline post-mortem analysis of Zephyr core dumps
