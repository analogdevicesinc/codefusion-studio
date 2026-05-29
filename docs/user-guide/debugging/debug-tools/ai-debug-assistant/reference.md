---
description: Full reference for AI Debug Assistant tools and diagnostic workflows.
author: Analog Devices
date: "2026-05-15"
---

# Tools and workflows reference

!!! info "Preview"
    The AI Debug Assistant is currently in preview and may change in future releases.

!!! tip "Recommended Interface"
    For production workflows, we recommend using the MCP server with MCP-enabled AI clients for maximum portability and future compatibility.

This page documents the tools, resources, and diagnostic prompts exposed through the CFS MCP debug server.

## Debug tools

The AI Debug Assistant exposes debug tools organized into six categories. These tools are available to any connected AI client — GitHub Copilot, Claude Code, or any MCP-compatible client.

### GitHub Copilot

You can view and manage the available tools by clicking the tools icon in the GitHub Copilot Chat input toolbar. VS Code automatically discovers and registers all CFS Debug Assistant tools through MCP — individual tools can be enabled or disabled from this panel.

![CFS Debug Assistant tools listed in the VS Code configuration panel](./images/tool-configuration-light.png#only-light) ![CFS Debug Assistant tools listed in the VS Code configuration panel](./images/tool-configuration-dark.png#only-dark)

### Claude Code

In Claude Code, run `/mcp` to review all available CFS Debug Assistant tools.

### GDB commands

Direct GDB command execution with built-in safety guards.

| Tool | Description | Parameters |
|---|---|---|
| `debug_execute_gdb_command` | Execute a single GDB command. Destructive commands (`quit`, `kill`, `detach`, `file`, `target`) are blocked. | `command` |
| `debug_execute_gdb_sequence` | Execute a sequence of GDB commands in order. The session must be halted. | `commands` (array, 1–20), `stopOnError` (optional) |

### Session lifecycle

| Tool | Description | Parameters |
|---|---|---|
| `debug_get_active_session` | Get information about the active debug session (ID, name, type). | — |
| `debug_start` | Start a debug session with an optional configuration name. | `configName` (optional) |
| `debug_stop` | Stop the current debug session. | — |
| `debug_restart` | Restart the current debug session. Re-flashes and re-launches the target. | — |

### Execution control

| Tool | Description | Parameters |
|---|---|---|
| `debug_continue` | Continue program execution. | — |
| `debug_step_over` | Step over the current line. | — |
| `debug_step_into` | Step into a function call. | — |
| `debug_step_out` | Step out of the current function. | — |
| `debug_pause` | Pause program execution. | — |
| `debug_get_execution_state` | Get the current execution state (running, halted, or no session). When halted, includes the stop reason. | — |
| `debug_wait_for_stop` | Block until the target halts (breakpoint, step, exception). Returns the stop reason. | `timeoutMs` (optional, 100–300000) |

### Breakpoints and watchpoints

| Tool | Description | Parameters |
|---|---|---|
| `debug_set_breakpoint` | Set a breakpoint at a specific file and line, with an optional condition. | `file`, `line`, `condition` (optional) |
| `debug_remove_breakpoints` | Remove breakpoints from a file, or remove all breakpoints. | `file` (optional), `line` (optional) |
| `debug_list_breakpoints` | List all active breakpoints. | — |
| `debug_set_watchpoint` | Set a hardware watchpoint to halt on memory write, read, or access. | `expression`, `type` (optional: `write` / `read` / `access`) |
| `debug_remove_watchpoint` | Remove a watchpoint by number. | `number` |

### Memory

| Tool | Description | Parameters |
|---|---|---|
| `debug_read_memory` | Read memory bytes from the target at a specific address. | `address`, `count` (1–1024 bytes) |
| `debug_write_memory` | Write a value to a memory address. The write is verified by read-back. | `address`, `value` (hex), `size` (optional) |
| `debug_search_memory` | Search for a byte pattern in a memory region. | `startAddress`, `length` (1–1,048,576 bytes), `pattern` |

### Analysis

| Tool | Description | Parameters |
|---|---|---|
| `debug_get_context` | Get comprehensive debug context: backtrace, registers, and local variables. | — |
| `debug_analyze_fault` | Read fault status registers and provide a structured fault diagnosis. Supports ARM Cortex-M (CFSR, HFSR, BFAR, MMFAR) and RISC-V (mcause, mtval, mepc). | `architecture` (`arm` or `riscv`) |
| `debug_search_source` | Search workspace source files for a text pattern or symbol name. | `pattern`, `fileGlob` (optional), `maxResults` (optional, 1–100) |

## Diagnostic prompts

Diagnostic prompts are pre-built investigation sequences that the AI follows autonomously. Each prompt encodes a systematic debugging methodology — the AI determines which tools to call and in what order based on what it finds. Invoke a prompt by describing the task to your AI client in natural language, or by name in any MCP-compatible client.

In Claude Code, run `/mcp` to browse all available prompts.

### State and crash

| Prompt | What it does | Parameters |
|---|---|---|
| `basic-state-awareness` | Starts a debug session and reports the execution state, program counter, and stack pointer. | — |
| `crash-diagnosis` | Starts a debug session, waits for a crash, reads fault registers, decodes the exception type, inspects the faulting address, walks the call stack, and identifies the offending function. | — |
| `timeout-handling` | Sets a breakpoint on a specified function and reports what happens — useful for testing timeout and error-handling paths. | `functionName` |

### Breakpoint and stepping

| Prompt | What it does | Parameters |
|---|---|---|
| `breakpoint-and-inspect` | Sets a breakpoint at a specified location, continues execution, and reports local variables when the breakpoint is hit. | `file`, `line` |
| `source-search-and-debug` | Finds code matching a natural-language description, sets a breakpoint there, and inspects registers when hit. | `description` |
| `conditional-breakpoint` | Sets a conditional breakpoint, catches it twice, reads a variable each time, and compares the values. | `condition`, `variable` (optional) |
| `step-and-disassemble` | Steps through N instructions, showing disassembly and a register value at each step. | `steps` (optional), `register` (optional) |

### Watchpoint and memory

| Prompt | What it does | Parameters |
|---|---|---|
| `watchpoint-trigger` | Watches a variable for writes, continues execution, and reports what wrote to it with the full call stack. | `variable` |
| `memory-inspection` | Reads a memory region and determines whether it contains ASCII strings, structured data, or byte patterns. | `address`, `length` (optional) |
| `autonomous-investigation` | Autonomously investigates memory corruption end-to-end: locates the struct in the ELF symbol table, sets a hardware watchpoint, traces the root cause, and disassembles suspicious code. | `variable` |

## Settings reference

| Setting | Description | Default |
|---|---|---|
| `cfs.mcp.runOnActivation` | Automatically start the MCP server when the CodeFusion Studio extension activates. | `false` |
| `cfs.mcp.port` | Port number for the MCP server. Set to `0` to let the OS assign an available port automatically. | `0` |

## Additional information

- [:octicons-link-external-24: CFS Debug chat participant](https://github.com/analogdevicesinc/codefusion-studio/tree/main/packages/ide/src/debug-tools/ai-debug/README.md){:target="_blank"}
- [:octicons-link-external-24: Introducing Agentic AI Workflows as Embedded Debugging Partner in CodeFusion Studio](https://developer.analog.com/newsroom/introducing-agentic-ai-workflows-as-embedded-debugging-partner-in-codefusion-studio){:target="_blank"}
