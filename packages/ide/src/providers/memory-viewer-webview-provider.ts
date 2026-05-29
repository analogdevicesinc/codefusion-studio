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
import { WebviewViewProvider } from "vscode";
import { getNonce } from "../utils/getNonce";
import { getUri } from "../utils/getUri";
import { readFileSync } from "node:fs";
import {
  CfsDebugManager,
  CfsDebugSession,
  MemoryReadStrategy,
} from "../debug-tools/debug-manager";

interface WebviewRequest {
  id: number;
  type: string;
  body?: Record<string, unknown>;
}

/**
 * Extracts a human-readable message from an unknown error value.
 *
 * When Cortex Debug encounters unreadable memory (e.g. out-of-range address),
 * it sends a DAP error *response* which causes vscode.DebugSession.customRequest
 * to reject with a plain object rather than an Error instance. The object
 * typically has a `message` string property containing the GDB error text
 * (e.g. "Read memory error: Cannot access memory at address 0xdeadbeef").
 * A plain String() conversion would yield "[object Object]", so we inspect
 * the rejection value before falling back.
 */
function extractErrorMessage(error: any): string {
  if (error?.message?.length > 0) {
    return error.message;
  }

  if (typeof error?.error === "string" && error?.error?.length > 0) {
    return error.error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

interface MemoryPacket {
  sessionId: string;
  address: number;
  /**
   * Contiguous readable memory bytes starting at `address`. Unreadable
   * trailing bytes (nulls returned by the fault-tolerant reader) are
   * truncated before the packet is sent to the webview, so every element
   * is a valid byte value (0-255). A partial-read warning is shown to the
   * user when the returned slice is shorter than the requested length.
   */
  data: number[];
}

interface CfsDebugSessionData {
  sessionId: string;
  isRunning: boolean;
  name: string;
  isActive: boolean;
  isLive: boolean;
}

class MemoryViewerWebviewProvider implements WebviewViewProvider {
  public static readonly viewType = "cfs.memory.view";

  private disposables: vscode.Disposable[] = [];
  private sessionDisposables: Map<string, vscode.Disposable[]> = new Map();
  private debugManager: CfsDebugManager;

  private static readonly MEMORY_READ_TIMEOUT_MS = 5000;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    debugManager: CfsDebugManager,
  ) {
    this.debugManager = debugManager;
  }

  // TODO: Expand these handlers to notifiy frontend of other events.
  // The message should contain enough detail for the frontend to not need to poll the backend.
  /**
   * this notifies the front end that a context switch event has happened.
   * it is up to the front end to request a memory read directly through
   * CfsDebugSession upon receiving
   * @param event
   */
  private handleContextSwitch(
    session: CfsDebugSession | undefined,
    webview: vscode.Webview,
  ) {
    webview.postMessage({
      type: "debugger-state-change",
      event: "context-switch",
      sessionId: session?.vscodeSession.id,
    });
  }

  private handleContinue(sessionId: string, webview: vscode.Webview) {
    webview.postMessage({
      type: "debugger-state-change",
      event: "continue",
      sessionId,
    });
  }

  private handleHalt(sessionId: string, webview: vscode.Webview) {
    webview.postMessage({
      type: "debugger-state-change",
      event: "halt",
      sessionId,
    });
  }

  private handleStop(sessionId: string, webview: vscode.Webview) {
    const disposables = this.sessionDisposables.get(sessionId);
    disposables?.forEach((d) => d.dispose());
    this.sessionDisposables.delete(sessionId);

    webview.postMessage({
      type: "debugger-state-change",
      event: "stop",
      sessionId,
    });
  }

  private handleStart(
    sessionId: string,
    session: CfsDebugSession,
    webview: vscode.Webview,
  ) {
    const config = session.vscodeSession.configuration;
    const coreDump = config.coreDump ? true : false;

    webview.postMessage({
      type: "debugger-state-change",
      event: "start",
      session: {
        isRunning: session.isRunning,
        coreDump,
      },
      sessionId,
    });
  }

  private handleNewSession(session: CfsDebugSession, webview: vscode.Webview) {
    const sessionId = session.vscodeSession.id;
    const disposables: vscode.Disposable[] = [];

    disposables.push(
      session.onContinue(() => {
        this.handleContinue(sessionId, webview);
      }),
    );

    disposables.push(
      session.onHalt(() => {
        this.handleHalt(sessionId, webview);
      }),
    );

    disposables.push(
      session.onStop(() => {
        this.handleStop(sessionId, webview);
      }),
    );

    this.sessionDisposables.set(sessionId, disposables);
    this.handleStart(sessionId, session, webview);
  }

  private getMemoryDataWithTimeout(
    message: WebviewRequest,
    timeoutMs: number,
  ): Promise<MemoryPacket> {
    let timeoutId: NodeJS.Timeout;

    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        const err: Error = new Error("Memory read request timed out");
        reject(err);
      }, timeoutMs);
    });

    return Promise.race([this.getMemoryData(message), timeout]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  private async getMemoryData(message: WebviewRequest): Promise<MemoryPacket> {
    const body = message.body;
    if (!body) {
      throw new Error("No body provided in request");
    }

    const address: number = body.address as number;
    const length: number = body.length as number;
    const sessionId: string = body.sessionId as string;

    if (
      typeof address !== "number" ||
      address < 0 ||
      !Number.isInteger(address) ||
      !Number.isFinite(address)
    ) {
      throw new Error("Invalid address");
    }

    if (typeof sessionId !== "string") {
      throw new Error("Invalid sessionId");
    }

    if (
      typeof length !== "number" ||
      length <= 0 ||
      !Number.isInteger(length) ||
      !Number.isFinite(length)
    ) {
      throw new Error("Invalid length");
    }

    const session = this.debugManager.getSession(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const results = await session.readMemoryFaultTolerant(
      address,
      length,
      MemoryReadStrategy.FirstFault,
    );

    const firstNullIndex = results.data.indexOf(null);

    if (firstNullIndex === 0) {
      throw new Error(
        `Cannot read memory at address 0x${address.toString(16)}`,
      );
    }

    const readableData =
      firstNullIndex > 0
        ? (results.data.slice(0, firstNullIndex) as number[])
        : (results.data as number[]);

    const readableCount = readableData.length;
    if (readableCount > 0 && readableCount < length) {
      void vscode.window.showWarningMessage(
        `Memory Viewer: Partial read - only ${readableCount} of ${length} bytes readable from 0x${address.toString(16)}.`,
      );
    }

    return {
      sessionId: sessionId,
      address: address,
      data: readableData,
    };
  }

  private async getSessionList(): Promise<CfsDebugSessionData[]> {
    const activeSession = this.debugManager.getActiveSession();
    return this.debugManager.getAllSessions().map((session) => ({
      isActive: activeSession?.vscodeSession.id === session.vscodeSession.id,
      isLive: !session.vscodeSession.configuration.coreDump,
      isRunning: session.isRunning,
      name: session.vscodeSession.name,
      sessionId: session.vscodeSession.id,
    }));
  }

  private async getSessionStatus(
    message: WebviewRequest,
  ): Promise<CfsDebugSessionData> {
    const activeSession = this.debugManager.getActiveSession();
    const sessionId = message.body?.sessionId as string;
    if (!sessionId) {
      throw new Error("No sessionId provided");
    }

    const session = this.debugManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      isActive: activeSession?.vscodeSession.id === sessionId,
      isLive: !session.vscodeSession.configuration.coreDump,
      isRunning: session.isRunning,
      name: session.vscodeSession.name,
      sessionId,
    };
  }

  private async handleWebviewRequest(
    message: WebviewRequest,
    webview: vscode.Webview,
  ): Promise<void> {
    let request: Promise<any> | undefined;

    switch (message.type) {
      case "get-memory-data":
        request = this.getMemoryDataWithTimeout(
          message,
          MemoryViewerWebviewProvider.MEMORY_READ_TIMEOUT_MS,
        );
        break;
      case "get-session-list":
        request = this.getSessionList();
        break;
      case "get-session-status":
        request = this.getSessionStatus(message);
        break;
      default:
        request = Promise.reject(
          new Error(`Unknown request type: ${message.type}`),
        );
        break;
    }

    if (request) {
      const { body, error } = await request.then(
        (body) => ({ body, error: undefined }),
        (error: unknown) => ({
          body: undefined,
          error: extractErrorMessage(error),
        }),
      );

      if (message.type === "get-memory-data" && error) {
        void vscode.window.showErrorMessage(`Memory Viewer: ${error}`);
      }

      await webview.postMessage({
        id: message.id,
        type: "api-response",
        body,
        error,
      });
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    const extensionUri = this._extensionUri;

    const { webview } = webviewView;
    let translations = vscode.l10n.bundle;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    const existingSessions = this.debugManager.getAllSessions();
    existingSessions.forEach((s) => {
      this.handleNewSession(s, webview);
    });

    this.disposables.push(
      this.debugManager.onDidChangeActiveDebugSession((session) => {
        this.handleContextSwitch(session, webview);
      }),
    );

    this.disposables.push(
      this.debugManager.onStartSession((session) => {
        this.handleNewSession(session, webview);
      }),
    );

    webview.onDidReceiveMessage(async (message) => {
      await this.handleWebviewRequest(message, webview);
    });

    if (!translations) {
      const translationUri = getUri(webview, extensionUri, [
        "l10n",
        "bundle.l10n.en.json",
      ]);
      const enJSON = readFileSync(translationUri.fsPath);
      translations = JSON.parse(Buffer.from(enJSON).toString("utf8"));
    }
    const scriptUri = getUri(webview, extensionUri, [
      "out",
      "memory-viewer",
      "assets",
      "index.js",
    ]);

    const stylesUri = getUri(webview, extensionUri, [
      "out",
      "memory-viewer",
      "assets",
      "index.css",
    ]);
    const nonce = getNonce();

    webview.html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        <script>
          window.__webview_localization_resources__ = ${JSON.stringify(translations)}
        </script>
      </html>
    `;
  }

  public dispose(): void {
    this.sessionDisposables.forEach((disposables) => {
      disposables?.forEach((d) => d.dispose());
    });
    this.sessionDisposables.clear();
    this.disposables.forEach((d) => d.dispose());
  }
}

export default MemoryViewerWebviewProvider;
