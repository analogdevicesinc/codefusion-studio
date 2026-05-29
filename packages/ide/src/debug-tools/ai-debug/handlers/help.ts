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

import * as vscode from "vscode";

/**
 * Displays help information about available commands.
 */
export function showHelp(stream: vscode.ChatResponseStream): void {
  stream.markdown(`# 🐛 AI Debug Assistant - Help

## Debug Session Control
| Command | Description |
|---------|-------------|
| \`start debugging\` | Start a debug session |
| \`stop\` / \`stop debugging\` | Stop the current debug session |
| \`restart\` | Restart the current debug session |

## Execution Control
| Command | Description |
|---------|-------------|
| \`continue\` / \`resume\` | Continue program execution |
| \`step over\` / \`next\` | Step over the current line |
| \`step into\` | Step into a function call |
| \`step out\` / \`finish\` | Step out of the current function |
| \`pause\` / \`halt\` | Pause program execution |

## Breakpoints
| Command | Description |
|---------|-------------|
| \`set breakpoint at file.c:42\` | Set a breakpoint at a specific location |
| \`set breakpoint at line 42\` | Set a breakpoint in the current file |
| \`remove breakpoint at file.c:42\` | Remove a specific breakpoint |
| \`clear all breakpoints\` | Remove all breakpoints |
| \`list breakpoints\` | Show all current breakpoints |

## GDB Commands
| Command | Description |
|---------|-------------|
| \`gdb: <command>\` | Execute a GDB command in the active debug session |
| \`run gdb command: <cmd>\` | Execute a GDB command |
| \`info registers\` | Show CPU registers |
| \`info locals\` | Show local variables |
| \`print <expr>\` | Print expression value |

## Inspection & Analysis
| Command | Description |
|---------|-------------|
| \`show variables\` | Display local variables |
| \`show stack trace\` | Display call stack |
| \`show registers\` | Display CPU registers |
| \`read memory at 0x20000000\` | Read memory at address |
| \`find bugs\` | Scan project code for potential issues |

## Tips
- Use \`gdb: <command>\` prefix for any raw GDB command
- You can ask natural language questions about your debug session
- The AI will analyze variables, stack traces, and memory to help diagnose issues
- For embedded ARM Cortex-M debugging, ask about specific registers like SP, PC, LR

`);
}

/**
 * Identifies which debug tools are needed based on user prompt.
 */
export function identifyRequiredTools(
  prompt: string,
): Array<{ name: string; args?: any }> {
  const tools: Array<{ name: string; args?: any }> = [];
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("variable") || lowerPrompt.includes("value of")) {
    tools.push({ name: "get_variables" });
  }

  if (
    lowerPrompt.includes("stack") ||
    lowerPrompt.includes("call stack") ||
    lowerPrompt.includes("backtrace")
  ) {
    tools.push({ name: "get_stack_trace" });
  }

  if (lowerPrompt.includes("breakpoint")) {
    tools.push({ name: "get_breakpoints" });
  }

  if (
    lowerPrompt.includes("register") ||
    lowerPrompt.includes("r0") ||
    lowerPrompt.includes("pc") ||
    lowerPrompt.includes("sp")
  ) {
    tools.push({ name: "get_registers" });
  }

  if (lowerPrompt.includes("memory") || lowerPrompt.includes("0x")) {
    const addressMatch = prompt.match(/0x[0-9a-fA-F]+/);
    if (addressMatch) {
      tools.push({
        name: "get_memory",
        args: { address: addressMatch[0], count: 64 },
      });
    }
  }

  // Always get debug status for context so the AI knows whether
  // a session is active and can respond accurately.
  tools.unshift({ name: "get_debug_status" });

  return tools;
}
