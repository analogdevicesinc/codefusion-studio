---
description: Setup guide for the AI Debug Assistant - choose between the CFS MCP debug server (recommended) or the CFS Debug chat participant.
author: Analog Devices
date: 2026-05-15
---

# Getting started with the AI Debug Assistant

The AI Debug Assistant provides two integration paths: the **CFS MCP debug server** (recommended for production) and the **CFS Debug chat participant** (for quick interactions). Choose the path that fits your workflow.

## Before using the assistant

Most AI Debug Assistant tools require an active debug session to inspect hardware state. Press **F5** or click the **Run and Debug** icon ![Run and Debug icon](../../images/run-and-debug-icon-dark.png#only-dark) ![Run and Debug icon](../../images/run-and-debug-icon-light.png#only-light) before asking the assistant to investigate, inspect, or control your target. Alternatively, you can ask the assistant to start a debug session using the appropriate configuration name. For example: *"Start debugging CFS: Debug with GDB and OpenOCD (ARM Embedded)"*. For detailed debug steps, refer to [Start a debug session](../../debug-an-application.md).

## CFS MCP debug server (recommended)

Before you begin, make sure you have:

- **CodeFusion Studio** installed with an active project
- For **GitHub Copilot Agent Mode**: VS Code 1.96.0 or later and the [:octicons-link-external-24: GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot){:target="_blank"}
- For **Claude Code**: [:octicons-link-external-24: Claude Code](https://claude.com/product/claude-code){:target="_blank"} installed

### Start the MCP server

The MCP server runs as a local HTTP service inside CodeFusion Studio. The server does not start automatically — you must start it manually before connecting an AI client.

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type MCP Server.
    ![Command Palette showing CFS MCP commands](./images/mcp-command-palette-light.png#only-light) ![Command Palette showing CFS MCP commands](./images/mcp-command-palette-dark.png#only-dark)
2. Run `(CFS) MCP: Start Debug Server`.

The following commands are available for managing the server:

| Command | Description |
|---|---|
| `(CFS) MCP: Start Debug Server` | Start the MCP server |
| `(CFS) MCP: Stop Debug Server` | Stop the MCP server |
| `(CFS) MCP: Server Status` | Check whether the server is running and which port it is listening on |

When the server starts, a VS Code notification shows the URL it is listening on (for example, `http://localhost:56448/mcp`). Note the port number from this URL — you will need it to connect AI clients.

!!! tip
    To start the MCP server automatically when the extension activates, go to **Settings → Extensions → CodeFusion Studio → General → MCP Server** and enable the **Run on Activation** setting (`cfs.mcp.runOnActivation`).

    ![CFS Run on Activation](./images/cfs-mcp-activation-light.png#only-light) ![CFS Run on Activation](./images/cfs-mcp-activation-dark.png#only-dark)

### Connect your AI client

The MCP server works with any MCP-compatible AI client. The sections below show connection steps for commonly used clients.

#### Example: GitHub Copilot Agent Mode

1. Open GitHub Copilot Chat (`Ctrl+Alt+I` / `Cmd+Shift+I`)
2. Click the mode selector dropdown in the chat input box — it defaults to **Ask**
3. Select **Agent**
4. Describe what you want investigated

When VS Code MCP support is enabled and available, Agent Mode automatically discovers the MCP server while it is running and uses it to access all debug tools and diagnostic prompts.

!!! note
    If Agent Mode does not show the CFS MCP server or its tools, make sure your VS Code installation supports MCP and that MCP support is enabled/available. If MCP support is unavailable in your environment, use the **CFS Debug** chat participant or connect with an external MCP client such as Claude Code instead.

#### Example: Claude Code

The MCP server is assigned an available port by the operating system at startup. Before connecting Claude Code, check which URL was assigned:

- Check the VS Code notification that appears when the server starts, or
- Run `(CFS) MCP: Server Status` in the Command Palette.

Both show the full URL (for example, `http://localhost:56448/mcp`).

For a stable connection, we recommend setting a fixed port before registering with Claude Code. See [Set a fixed port](#optional-set-a-fixed-port) below.

Once you know the port, register the server with Claude Code:

```bash
claude mcp add --transport http cfs-debug http://localhost:<port>/mcp
```

Replace `<port>` with the port assigned at startup. This registers the CFS MCP server with Claude Code using the name `cfs-debug`.

!!! important
    After adding the server, exit and restart Claude Code for the registration to take effect. To verify the server was added, run `claude mcp list`.

Start a debug session in CodeFusion Studio, then try asking Claude: *"What is the current execution state of the target?"* or *"Show me the registers."*

![Claude Code connected to a CFS debug session](./images/claude-code-connected-light.png#only-light) ![Claude Code connected to a CFS debug session](./images/claude-code-connected-dark.png#only-dark)

#### Other MCP-compatible clients

The above are examples only - there are numerous MCP-compatible clients available.

To connect another MCP client:

1. Start the MCP server via `(CFS) MCP: Start Debug Server` in the Command Palette
2. Note the server URL displayed in the VS Code notification (for example, `http://localhost:56448/mcp`)
3. Register this URL with your AI client - consult your client's documentation for how to add an MCP server

The specific registration method varies by client, but all MCP-compatible clients provide a way to connect to external MCP servers.

### Optional: Set a fixed port

By default, the OS assigns an available port when the MCP server starts. To use a fixed port instead (recommended for Claude Code, so the registration URL stays stable):

1. Go to **Settings → Extensions → CodeFusion Studio → General**, or search for (`cfs.mcp.port`).
  ![CFS MCP Server Settings](./images/cfs-mcp-port-light.png#only-light)
  ![CFS MCP Server Settings](./images/cfs-mcp-port-dark.png#only-dark)
2. Set the **Port** field (`cfs.mcp.port`) to a specific value (0–65535). Setting it to `0` restores OS-assigned behaviour.
3. Run `(CFS) MCP: Stop Debug Server` then `(CFS) MCP: Start Debug Server` to restart with the new port. A notification confirms the port the server is now listening on.
4. If using Claude Code, re-register the server with the new port:

    ```bash
    claude mcp remove cfs-debug
    claude mcp add --transport http cfs-debug http://localhost:<port>/mcp
    claude mcp list
    ```

!!! note
    GitHub Copilot reads the port directly from the `cfs.mcp.port` setting — no re-registration is needed after a port change.

### Optional: Verify the connection with MCP Inspector

To test the connection independently of any AI client, use the open-source [:octicons-link-external-24: MCP Inspector](https://github.com/modelcontextprotocol/inspector){:target="_blank"}:

```bash
npx @modelcontextprotocol/inspector
```

The inspector outputs a session token and a URL with that token pre-filled:

```bash
Starting MCP inspector...
⚙️ Proxy server listening on 127.0.0.1:6277
🔑 Session token: <your-session-token>
Use this token to authenticate requests or set DANGEROUSLY_OMIT_AUTH=true to disable auth

🔗 Open inspector with token pre-filled:
   http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=<your-session-token>

🔍 MCP Inspector is up and running at http://127.0.0.1:6274 🚀
```

1. Open the URL shown in your terminal — this opens the MCP Inspector in your browser with the session token pre-filled.
2. Select **Streamable HTTP** as the transport type.
3. Select **Via Proxy** as the **Connection Type**.
4. Enter the MCP server URL using the port assigned at startup (for example, `http://localhost:<port>/mcp`). Check the port via `(CFS) MCP: Server Status` if needed.
5. Click **Connect**.

Once connected, you can browse all available tools, resources, and prompts, and execute them manually to verify the server is working.

![Using MCP Inspector](./images/mcp-server-light.png#only-light) ![Using MCP Inspector](./images/mcp-server-dark.png#only-dark)

## CFS Debug chat participant

Before you begin, make sure you have:

- **CodeFusion Studio** installed with an active project
- **VS Code 1.96.0 or later**
- [:octicons-link-external-24: **GitHub Copilot extension**](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot){:target="_blank"} installed and authenticated

### Use the chat participant

1. Open GitHub Copilot Chat (`Ctrl+Alt+I` / `Cmd+Shift+I`).
2. Type `@cfs-debug` followed by your question.

The chat participant is available immediately - no MCP server setup required.

!!! tip
    For best results, use a Claude model (such as Claude Sonnet 4.5 or Claude Opus 4.6) with the `@cfs-debug` chat participant. Other models may work for basic commands but could produce inconsistent results or errors for AI analysis features.

![GitHub Copilot Chat with @cfs-debug participant active](./images/copilot-chat-cfs-debug-light.png#only-light) ![GitHub Copilot Chat with @cfs-debug participant active](./images/copilot-chat-cfs-debug-dark.png#only-dark)

## Next steps

- [Using the AI Debug Assistant](using-ai-debug-assistant.md) — practical examples for both interfaces with real-world debugging scenarios
- [Tools and workflows reference](reference.md) — full reference for all debug tools and diagnostic prompts
