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
import { DebugToolExecutor } from "../debug-tool-executor";
import {
  isSessionDisconnectedError,
  getDisconnectionMessage,
} from "../utils/session-error-helpers";

/**
 * Handles inspection commands with nice formatted output.
 */
export class InspectionHandler {
  constructor(private toolExecutor: DebugToolExecutor) {}

  /**
   * Handles inspection commands (show variables, show registers, show stack, read memory).
   * @returns true if the command was handled, false otherwise
   */
  async handle(
    prompt: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<boolean> {
    const lowerPrompt = prompt.toLowerCase();

    // Check for show variables
    if (
      lowerPrompt.includes("show variable") ||
      lowerPrompt.includes("display variable") ||
      lowerPrompt.includes("list variable") ||
      lowerPrompt.includes("get variable")
    ) {
      await this.handleShowVariables(stream, token);
      return true;
    }

    // Check for show registers
    if (
      lowerPrompt.includes("show register") ||
      lowerPrompt.includes("display register") ||
      lowerPrompt.includes("list register") ||
      lowerPrompt.includes("get register")
    ) {
      await this.handleShowRegisters(stream, token);
      return true;
    }

    // Check for show stack trace
    if (
      lowerPrompt.includes("show stack") ||
      lowerPrompt.includes("display stack") ||
      lowerPrompt.includes("call stack") ||
      lowerPrompt.includes("backtrace") ||
      lowerPrompt.includes("stack trace")
    ) {
      await this.handleShowStackTrace(stream, token);
      return true;
    }

    // Check for read memory
    const memoryMatch = lowerPrompt.match(
      /(?:read\s+)?memory\b.*(?:at\s+)?(?:address\s+)?(0x[0-9a-fA-F]+)/i,
    );
    if (memoryMatch) {
      await this.handleReadMemory(memoryMatch[1], stream, token);
      return true;
    }

    return false;
  }

  /**
   * Shows local variables with nice formatting.
   */
  private async handleShowVariables(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<void> {
    if (!vscode.debug.activeDebugSession) {
      stream.markdown("⚠️ No active debug session\n");
      return;
    }

    stream.progress("Reading variables...");

    try {
      const result = await this.toolExecutor.executeTools(
        [{ name: "get_variables" }],
        token,
      );

      if (result.get_variables?.error) {
        stream.markdown(`❌ Error: ${result.get_variables.error}\n`);
        return;
      }

      const varData = result.get_variables;
      stream.markdown("## Local Variables\n\n");

      if (varData.scopes && varData.scopes.length > 0) {
        for (const scope of varData.scopes) {
          stream.markdown(`### ${scope.scope}\n\n`);

          if (scope.variables.length === 0) {
            stream.markdown("_No variables in this scope_\n\n");
            continue;
          }

          // Format as table
          stream.markdown("| Variable | Value | Type |\n");
          stream.markdown("|----------|-------|------|\n");

          for (const variable of scope.variables) {
            const name = this.escapeMarkdown(variable.name);
            const value = this.escapeMarkdown(variable.value);
            const type = variable.type
              ? this.escapeMarkdown(variable.type)
              : "_unknown_";
            stream.markdown(`| \`${name}\` | ${value} | ${type} |\n`);
          }
          stream.markdown("\n");
        }
      } else {
        stream.markdown("_No variables available_\n");
      }
    } catch (error) {
      if (isSessionDisconnectedError(error, true)) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stream.markdown(getDisconnectionMessage(errorMsg));
        return;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      stream.markdown(`\u274c Error reading variables: ${errorMsg}\n`);
    }
  }

  /**
   * Shows CPU registers with nice formatting.
   */
  private async handleShowRegisters(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<void> {
    if (!vscode.debug.activeDebugSession) {
      stream.markdown("⚠️ No active debug session\n");
      return;
    }

    stream.progress("Reading registers...");

    try {
      const result = await this.toolExecutor.executeTools(
        [{ name: "get_registers" }],
        token,
      );

      if (result.get_registers?.error) {
        stream.markdown(`❌ Error: ${result.get_registers.error}\n`);
        return;
      }

      stream.markdown("## CPU Registers\n\n");

      // Parse GDB register output
      const registerOutput = result.get_registers.response;

      if (typeof registerOutput === "string") {
        // Format the raw GDB output nicely
        stream.markdown("```\n");
        stream.markdown(registerOutput);
        stream.markdown("\n```\n\n");

        // Add helpful context for ARM Cortex-M registers
        stream.markdown("### Key ARM Cortex-M Registers\n\n");
        stream.markdown("- **SP** (Stack Pointer): Current stack address\n");
        stream.markdown(
          "- **PC** (Program Counter): Current instruction address\n",
        );
        stream.markdown(
          "- **LR** (Link Register): Return address for functions\n",
        );
        stream.markdown(
          "- **xPSR**: Program Status Register (contains flags)\n",
        );
      } else {
        stream.markdown("```json\n");
        stream.markdown(JSON.stringify(registerOutput, null, 2));
        stream.markdown("\n```\n");
      }
    } catch (error) {
      if (isSessionDisconnectedError(error, true)) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stream.markdown(getDisconnectionMessage(errorMsg));
        return;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      stream.markdown(`\u274c Error reading registers: ${errorMsg}\n`);
    }
  }

  /**
   * Shows stack trace with nice formatting.
   */
  private async handleShowStackTrace(
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<void> {
    if (!vscode.debug.activeDebugSession) {
      stream.markdown("⚠️ No active debug session\n");
      return;
    }

    stream.progress("Reading stack trace...");

    try {
      const result = await this.toolExecutor.executeTools(
        [{ name: "get_stack_trace" }],
        token,
      );

      if (result.get_stack_trace?.error) {
        stream.markdown(`❌ Error: ${result.get_stack_trace.error}\n`);
        return;
      }

      const stackData = result.get_stack_trace;
      stream.markdown("## Call Stack\n\n");

      if (stackData.stackFrames && stackData.stackFrames.length > 0) {
        for (const frame of stackData.stackFrames) {
          const fileName = frame.source?.name || "unknown";
          const location = `${fileName}:${frame.line}`;

          stream.markdown(`**#${frame.id}** ${frame.name}\n`);
          stream.markdown(`  📍 ${location}\n\n`);
        }
      } else {
        stream.markdown("_No stack frames available_\n");
      }
    } catch (error) {
      if (isSessionDisconnectedError(error, true)) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stream.markdown(getDisconnectionMessage(errorMsg));
        return;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      stream.markdown(`❌ Error reading stack trace: ${errorMsg}\n`);
    }
  }

  /**
   * Reads and formats memory at a specific address.
   */
  private async handleReadMemory(
    address: string,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken,
  ): Promise<void> {
    if (!vscode.debug.activeDebugSession) {
      stream.markdown("⚠️ No active debug session\n");
      return;
    }

    stream.progress(`Reading memory at ${address}...`);

    try {
      const result = await this.toolExecutor.executeTools(
        [{ name: "get_memory", args: { address, count: 64 } }],
        token,
      );

      if (result.get_memory?.error) {
        stream.markdown(`❌ Error: ${result.get_memory.error}\n`);
        return;
      }

      stream.markdown(`## Memory at ${address}\n\n`);

      const memData = result.get_memory;

      if (memData.data) {
        stream.markdown("```\n");
        stream.markdown(memData.data);
        stream.markdown("\n```\n");
      } else if (memData.response) {
        stream.markdown("```\n");
        stream.markdown(
          typeof memData.response === "string"
            ? memData.response
            : JSON.stringify(memData.response, null, 2),
        );
        stream.markdown("\n```\n");
      }
    } catch (error) {
      if (isSessionDisconnectedError(error, true)) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        stream.markdown(getDisconnectionMessage(errorMsg));
        return;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      stream.markdown(`\u274c Error reading memory: ${errorMsg}\n`);
    }
  }

  /**
   * Escapes markdown special characters.
   */
  private escapeMarkdown(text: string): string {
    return text.replace(/[|\\]/g, "\\$&");
  }
}
