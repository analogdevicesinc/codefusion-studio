---
description: Introduction to the AI Debug Assistant and how to use it with CodeFusion Studio.
author: Analog Devices
date: "2026-05-15"
---

# AI Debug Assistant

!!! info "Preview"
    The AI Debug Assistant is currently in preview and may change in future releases.

The AI Debug Assistant is an agentic AI system built into CodeFusion Studio that actively participates in your debug sessions. Rather than answering static questions about your source code, it can autonomously investigate faults, inspect live hardware state, coordinate across multiple cores, and reason about what your silicon is actually doing - all in real time.

The AI Debug Assistant is accessible through two integration paths:

- **CFS MCP debug server**: an MCP-based integration that works with GitHub Copilot Agent Mode, Claude Code, and other MCP-compatible AI clients.
- **CFS Debug chat participant**: a VS Code GitHub Copilot chat integration available through the `@cfs-debug` participant.

The recommended workflow is the CFS MCP debug server, which is built on the [:octicons-link-external-24: Model Context Protocol (MCP)](https://modelcontextprotocol.io/){:target="_blank"}, an open standard created by Anthropic for connecting AI models to external tools and data sources.

![AI Debug Assistant hero — AI interfacing with a live embedded debug session](./images/ai-debug-assistant-hero.png)

In this section you'll find:

- [Getting started](getting-started.md) — prerequisites and setup for the CFS MCP debug server or CFS Debug chat participant.
- [Using the AI Debug Assistant](using-ai-debug-assistant.md) — using both integration paths with real-world debugging examples.
- [Tools and workflows reference](reference.md) — full reference for all debug tools and pre-built diagnostic prompts.
- [Troubleshooting](troubleshooting.md) — troubleshooting guidance and information.

## What makes this different

There is a meaningful difference between an AI that suggests the next line of code and one that can autonomously coordinate debug sessions, read fault registers, decode exception frames, correlate a shared-memory conflict, and tell you that your DMA descriptor on Core 1 is racing against a buffer reallocation on Core 0.

The AI Debug Assistant bridges that gap. It enables **agentic debugging workflows** — where the AI doesn't wait to be guided step by step, but instead autonomously orchestrates multi-step investigations, correlates hardware state across subsystems, and reports findings in plain language.

## What it can do

The AI Debug Assistant provides a comprehensive set of debug tools, contextual resources, and pre-built diagnostic prompts.

| Capability | Description |
|---|---|
| **Session control** | Start, stop, restart, continue, pause, and step through debug sessions |
| **Hardware state inspection** | Read registers, memory, variables, stack traces, and thread lists directly from the target |
| **Breakpoints and watchpoints** | Set, list, and remove breakpoints — including conditional breakpoints — and hardware watchpoints |
| **GDB command execution** | Run GDB commands with built-in safety guards that block destructive operations |
| **Fault decoding** | Automatically parse ARM Cortex-M fault registers (CFSR, HFSR, BFAR, MMFAR) and RISC-V exception registers (mcause, mtval, mepc) into human-readable diagnoses |
| **ELF binary analysis** | Surface symbol sizes, stack usage, section layout, and the largest consumers of flash and RAM |
| **Structured diagnostic prompts** | Pre-built investigation sequences for crash diagnosis, memory corruption, peripheral misconfiguration, multi-core debugging, and more |

## How to use the AI Debug Assistant

The AI Debug Assistant currently supports two integration paths: the CFS MCP debug server and the CFS Debug chat participant. For production workflows, we recommend using the CFS MCP debug server with MCP-compatible AI clients for maximum portability and future compatibility.

### CFS MCP debug server (recommended)

| Client | Connection Method |
|---|---|
| **GitHub Copilot (Agent Mode)** | Requires MCP server started with `(CFS) MCP: Start Debug Server` command. See [Getting started](getting-started.md#example-github-copilot-agent-mode). |
| **Claude Code** | Register the server with `claude mcp add --transport http cfs-debug http://localhost:<port>/mcp`. See [Getting started](getting-started.md#example-claude-code). |
| **Any MCP-compatible client** | The MCP server is open by design. Any AI client that supports the Model Context Protocol can connect. See [Getting started](getting-started.md#other-mcp-compatible-clients). |

### CFS Debug chat participant

| Interface | Connection Method |
|---|---|
| **`@cfs-debug` Chat Participant** | Type `@cfs-debug` in GitHub Copilot Chat within VS Code. Does NOT require MCP server to be started. |

!!! tip "Which path should I use?"
    - **For production workflows:** Use the CFS MCP debug server with any MCP-compatible AI client for maximum portability and future compatibility
    - **For quick interactions in VS Code:** The CFS Debug chat participant works without starting the MCP server
