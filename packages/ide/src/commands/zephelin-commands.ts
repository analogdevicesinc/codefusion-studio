/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import { platform } from "node:process";

/**
 * Command to capture profiler trace using Zephelin west zpl-uart-capture
 */
export async function captureProfilerTrace(): Promise<string | undefined> {
  try {
    // Collect serial port
    const serialPort = await vscode.window.showInputBox({
      prompt: "Enter the serial port for Zephelin UART",
      placeHolder: "e.g., COM3 or /dev/ttyUSB0",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Serial port is required";
        }
        if (platform === "win32" && !value.match(/^COM\d+$/i)) {
          return "Windows serial ports should be in format COM1, COM2, etc.";
        }
        if (platform !== "win32" && !value.match(/^\/dev\//)) {
          return "Unix serial ports should start with /dev/";
        }
        if (value.includes('"')) {
          return "Serial port must not contain quotation marks";
        }
        return undefined;
      },
    });

    if (!serialPort) {
      return undefined; // User cancelled
    }

    // Collect baud rate - must match the board's UART configuration
    const baudRateInput = await vscode.window.showQuickPick(
      [
        {
          label: "115200",
        },
        {
          label: "921600",
        },
        {
          label: "460800",
        },
        {
          label: "230400",
        },
        {
          label: "57600",
        },
        {
          label: "38400",
        },
        {
          label: "19200",
        },
        {
          label: "9600",
        },
        {
          label: "Custom...",
        },
      ],
      {
        placeHolder: "Select the baud rate configured on your board's UART",
        ignoreFocusOut: true,
      },
    );

    if (!baudRateInput) {
      return undefined; // User cancelled
    }

    let baudRate: string;
    if (baudRateInput.label === "Custom...") {
      // Handle custom baud rate input - must match board configuration
      const customBaudRate = await vscode.window.showInputBox({
        prompt: "Enter the baud rate configured on your board's UART",
        value: "115200",
        placeHolder: "e.g., 115200, 9600, 57600",
        validateInput: (value) => {
          const numValue = parseInt(value);
          if (isNaN(numValue) || numValue <= 0) {
            return "Baud rate must be a positive number";
          }
          return undefined;
        },
      });

      if (!customBaudRate) {
        return undefined; // User cancelled
      }

      baudRate = customBaudRate;
    } else {
      baudRate = baudRateInput.label;
    }

    // Collect output file path
    const outputPath = await vscode.window.showInputBox({
      prompt: "Enter the output file path for Zephelin trace",
      value: "tracefile",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Output file path is required";
        }
        if (value.includes('"')) {
          return "Output file path must not contain quotation marks";
        }
        return undefined;
      },
    });

    if (!outputPath) {
      return undefined; // User cancelled
    }

    // Ask about send enable flag
    const sendEnableChoice = await vscode.window.showQuickPick(
      [
        {
          label: "No",
          description: "Don't send enable command",
          value: "",
        },
        {
          label: "Yes",
          description: "Send enable command to device before collecting data",
          detail:
            "Requires CONFIG_TRACING_HANDLE_HOST_CMD to be enabled in the app",
          value: "--send-enable",
        },
      ],
      {
        placeHolder:
          "Send 'enable' to device before collecting data to enable tracing?",
        ignoreFocusOut: true,
      },
    );

    if (!sendEnableChoice) {
      return undefined; // User cancelled
    }

    // Build the command
    const args = [`"${serialPort}"`, baudRate, `"${outputPath}"`];
    if (sendEnableChoice.value) {
      args.push(sendEnableChoice.value);
    }

    const command = `west zpl-uart-capture ${args.join(" ")}`;

    vscode.window.showInformationMessage(
      `Starting Zephelin UART capture on ${serialPort} at ${baudRate} baud. Output will be saved in your workspace to file "${outputPath}".`,
    );

    return command;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to capture profiler trace: ${error}`,
    );
    return undefined;
  }
}

/**
 * Command to convert trace from CTF to TEF format using Zephelin west zpl-prepare-trace
 * Note: This command is not supported on Windows.
 */
export async function convertTraceCtfToTef(): Promise<string | undefined> {
  try {
    // Check if running on Windows - zpl-prepare-trace is not supported there
    if (platform === "win32") {
      vscode.window.showErrorMessage(
        "The 'west zpl-prepare-trace' command is not supported on Windows. " +
          "Please use a Linux or macOS system, or run it in a WSL2 instance.",
      );
      return undefined;
    }

    // Collect input CTF trace file path
    const inputPath = await vscode.window.showInputBox({
      prompt: "Enter the input CTF trace file path",
      value: "tracefile",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Input CTF trace file path is required";
        }
        if (value.includes('"')) {
          return "Input file path must not contain quotation marks";
        }
        return undefined;
      },
    });

    if (!inputPath) {
      return undefined; // User cancelled
    }

    // Collect output TEF trace file path
    const outputPath = await vscode.window.showInputBox({
      prompt: "Enter the output TEF trace file path",
      value: "trace.tef",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Output TEF trace file path is required";
        }
        if (value.includes('"')) {
          return "Output file path must not contain quotation marks";
        }
        return undefined;
      },
    });

    if (!outputPath) {
      return undefined; // User cancelled
    }

    // Build the command
    const command = `west zpl-prepare-trace "${inputPath}" -o "${outputPath}"`;

    vscode.window.showInformationMessage(
      `Converting trace from ${inputPath} to TEF format. Output will be saved in your workspace to file "${outputPath}".`,
    );

    return command;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to convert trace: ${error}`);
    return undefined;
  }
}
