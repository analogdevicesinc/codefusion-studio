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

import { describe, it } from "mocha";
import { expect } from "chai";
import type * as vscode from "vscode";
import {
  CfsDebugSession,
  getDebugConsoleEcho,
} from "../../debug-tools/debug-manager";

const REGISTERS_OUTPUT = "pc  0x1234\nsp  0x5678\n";

/** Handler invoked for every DAP request issued by the session under test. */
type RequestHandler = (
  session: CfsDebugSession,
  command: string,
  args: Record<string, unknown>,
) => unknown;

/** Instance shape used to capture Debug Console writes in tests. */
type ConsoleSpy = { appendToDebugConsole: (text: string) => void };

/**
 * Builds a CfsDebugSession backed by a fake vscode.DebugSession, capturing
 * everything written to the Debug Console.
 */
function createSession(
  type: string,
  handler: RequestHandler,
): { session: CfsDebugSession; consoleLines: string[] } {
  const consoleLines: string[] = [];
  let session!: CfsDebugSession;

  const vscodeSession = {
    id: "test-session",
    type,
    name: type,
    configuration: { type, name: type, request: "launch" },
    customRequest: async (command: string, args: Record<string, unknown>) =>
      handler(session, command, args),
  } as unknown as vscode.DebugSession;

  session = new CfsDebugSession(vscodeSession);
  (session as unknown as ConsoleSpy).appendToDebugConsole = (text: string) => {
    consoleLines.push(text);
  };

  // Adapters report the target as halted before a REPL evaluation is allowed.
  session.onDidSendMessage({
    type: "event",
    event: "stopped",
    body: { reason: "breakpoint", threadId: 1 },
  });

  return { session, consoleLines };
}

/** Emits a DAP console output event on the given session. */
function emitOutputEvent(session: CfsDebugSession, output: string): void {
  session.onDidSendMessage({
    type: "event",
    event: "output",
    body: { category: "console", output },
  });
}

describe("getDebugConsoleEcho", () => {
  it("echoes output that the adapter did not stream", () => {
    expect(
      getDebugConsoleEcho({
        output: REGISTERS_OUTPUT,
        streamedToConsole: false,
      }),
    ).to.equal("pc  0x1234\nsp  0x5678");
  });

  it("does not echo output already streamed by the adapter", () => {
    expect(
      getDebugConsoleEcho({
        output: REGISTERS_OUTPUT,
        streamedToConsole: true,
      }),
    ).to.equal(undefined);
  });

  it("does not echo blank output", () => {
    expect(
      getDebugConsoleEcho({ output: " \n\t", streamedToConsole: false }),
    ).to.equal(undefined);
  });
});

describe("CfsDebugSession.evaluateGdbCommand", () => {
  it("echoes cppdbg response output to the Debug Console when requested", async () => {
    const { session, consoleLines } = createSession("cppdbg", (_s, command) => {
      switch (command) {
        case "stackTrace":
          return { stackFrames: [{ id: 7 }] };
        case "evaluate":
          // cppdbg returns REPL output in the response body only.
          return { result: REGISTERS_OUTPUT };
        default:
          return undefined;
      }
    });

    const output = await session.evaluateGdbCommand("info registers", {
      echoOutput: true,
    });

    expect(output).to.equal(REGISTERS_OUTPUT);
    expect(consoleLines).to.deep.equal(["pc  0x1234\nsp  0x5678"]);
  });

  it("keeps the Debug Console clean for internal commands", async () => {
    const { session, consoleLines } = createSession("cppdbg", (_s, command) => {
      if (command === "stackTrace") {
        return { stackFrames: [{ id: 7 }] };
      }
      return { result: "The target architecture is set to xtensa." };
    });

    const output = await session.evaluateGdbCommand("show architecture");

    expect(output).to.equal("The target architecture is set to xtensa.");
    expect(consoleLines).to.deep.equal([]);
  });

  it("prefixes cppdbg CLI commands with -exec and scopes them to the top frame", async () => {
    const evaluateArgs: Record<string, unknown>[] = [];
    const { session } = createSession("cppdbg", (_s, command, args) => {
      if (command === "stackTrace") {
        return { stackFrames: [{ id: 7 }] };
      }
      evaluateArgs.push(args);
      return { result: REGISTERS_OUTPUT };
    });

    await session.evaluateGdbCommand("info registers");

    expect(evaluateArgs).to.have.lengthOf(1);
    expect(evaluateArgs[0].expression).to.equal("-exec info registers");
    expect(evaluateArgs[0].frameId).to.equal(7);
  });

  it("does not echo for adapters that stream output events", async () => {
    const { session, consoleLines } = createSession(
      "cortex-debug",
      (s, command) => {
        if (command === "evaluate") {
          emitOutputEvent(s, REGISTERS_OUTPUT);
          return { result: "ignored response body" };
        }
        return undefined;
      },
    );

    const output = await session.evaluateGdbCommand("info registers", {
      echoOutput: true,
    });

    // VS Code already renders the streamed output events, so echoing would
    // duplicate the content in the Debug Console.
    expect(output).to.equal(REGISTERS_OUTPUT);
    expect(consoleLines).to.deep.equal([]);
  });

  it("does not echo when the adapter returns no output", async () => {
    const { session, consoleLines } = createSession("cppdbg", (_s, command) => {
      if (command === "stackTrace") {
        return { stackFrames: [{ id: 7 }] };
      }
      return { result: "" };
    });

    const output = await session.evaluateGdbCommand("set confirm off", {
      echoOutput: true,
    });

    expect(output).to.equal("");
    expect(consoleLines).to.deep.equal([]);
  });
});

describe("CfsDebugSession.evaluateREPL", () => {
  it("returns cppdbg response output without echoing it", async () => {
    const { session, consoleLines } = createSession("cppdbg", (_s, command) => {
      if (command === "stackTrace") {
        return { stackFrames: [{ id: 7 }] };
      }
      return { result: "0x20000000" };
    });

    const output = await session.evaluateREPL("p/x &counter");

    // evaluateREPL serves internal queries (e.g. the Memory Viewer), which
    // must not write to the user-facing Debug Console.
    expect(output).to.equal("0x20000000");
    expect(consoleLines).to.deep.equal([]);
  });

  it("prefers streamed output events over the response body", async () => {
    const { session } = createSession("cortex-debug", (s, command) => {
      if (command === "evaluate") {
        emitOutputEvent(s, "0x20000000");
        return { result: "ignored response body" };
      }
      return undefined;
    });

    expect(await session.evaluateREPL("p/x &counter")).to.equal("0x20000000");
  });
});
