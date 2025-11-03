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

/**
 * VS Code debug event hooks for the GDB Toolbox extension.
 * This module provides event emitters and listeners for handling
 * debug session events, breakpoint changes, and GDB command responses.
 */

import * as vscode from "vscode";

// Emits { sessionId, isHit } when a breakpoint is hit or cleared
export const breakpointEventEmitter = new vscode.EventEmitter<{
  sessionId: string;
  isHit: boolean;
}>();
export const onBreakpointChanged = breakpointEventEmitter.event;

//
export const coreDumpSessionEmitter = new vscode.EventEmitter<{
  sessionId: string;
}>();
export const onCoreDumpSessionStarted = coreDumpSessionEmitter.event;

// Emits GDB command responses and evaluation results with sessionId
export const responseEventEmitter = new vscode.EventEmitter<{
  sessionId: string;
  expression?: string;
  command?: string;
  response: any;
}>();
export const onResponseReceived = responseEventEmitter.event;

// Map to track commands and their request sequences
const commandMap: Map<number, string> = new Map();

// Temporary storage for output events
const outputBuffer: string[] = [];

/**
 * Registers listeners for debug session events and GDB responses.
 * Handles breakpoint events and collects output for GDB command responses.
 */
export async function registerDebugSessionListeners(): Promise<void> {
  vscode.debug.onDidStartDebugSession((session) => {
    if (session.type === "cortex-debug") {
      outputBuffer.length = 0;
      vscode.debug.onDidReceiveDebugSessionCustomEvent((event) => {
        if (
          event.body?.reason === "breakpoint" ||
          event.body?.reason === "user request" ||
          event.body?.reason === "attach" ||
          event.body?.reason === "step"
        ) {
          breakpointEventEmitter.fire({
            sessionId: event.session.id,
            isHit: true,
          });
        } else {
          breakpointEventEmitter.fire({
            sessionId: event.session.id,
            isHit: false,
          });
        }
      });

      if (session.name === "CFS: Launch Core Dump Analysis") {
        coreDumpSessionEmitter.fire({ sessionId: session.id });
      }
    }
  });

  // Track GDB adapter messages for command/response handling
  vscode.debug.registerDebugAdapterTrackerFactory("*", {
    createDebugAdapterTracker(session) {
      return {
        onWillReceiveMessage: (message) => {
          if (
            message.type === "request" &&
            message.command === "evaluate" &&
            message.arguments?.expression
          ) {
            commandMap.set(message.seq, message.arguments.expression);
            outputBuffer.length = 0;
          }
        },

        onDidSendMessage: (message) => {
          if (message.type === "event" && message.event === "output") {
            const output = message.body?.output || "";
            outputBuffer.push(output);
          }

          if (message.type === "response" && message.command === "evaluate") {
            const expression = commandMap.get(message.request_seq);
            if (expression) {
              const response = message.body || {};
              if (outputBuffer.length > 0) {
                const formattedOutput = formatOutput(outputBuffer);
                responseEventEmitter.fire({
                  sessionId: session.id,
                  expression,
                  response: formattedOutput,
                });
                outputBuffer.length = 0;
              } else {
                responseEventEmitter.fire({
                  sessionId: session.id,
                  expression,
                  response,
                });
              }
              commandMap.delete(message.request_seq);
            }
          }
        },
      };
    },
  });
}

/**
 * Processes a GDB response message and emits a formatted response event.
 */
export function retrieveGdbResponse(message: any, sessionId?: string): void {
  if (message.type === "response" && message.command) {
    const command = commandMap.get(message.request_seq);
    if (command) {
      const response = message.body || {};
      if (outputBuffer.length > 0) {
        // Process and format the output for any GDB command
        const formattedOutput = formatOutput(outputBuffer);
        responseEventEmitter.fire({
          sessionId: sessionId ?? "",
          command,
          response: formattedOutput,
        });
        outputBuffer.length = 0;
      } else {
        responseEventEmitter.fire({
          sessionId: sessionId ?? "",
          command,
          response,
        });
      }
      commandMap.delete(message.request_seq);
    }
  }
}

/**
 * Formats an array of GDB output lines into a single string.
 */
function formatOutput(outputLines: string[]): string {
  return outputLines.filter((line) => line).join("");
}
