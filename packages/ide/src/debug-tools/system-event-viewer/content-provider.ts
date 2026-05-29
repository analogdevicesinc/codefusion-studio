/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import { CfsDebugManager, CfsDebugSession } from "../debug-manager";
import { TraceManager } from "./hardware/trace-manager";
import { CfsEventsFile } from "./cfsevents-schema";

interface EventDocumentContext {
  debugSession: CfsDebugSession;
  content: CfsEventsFile;
  disposables: vscode.Disposable[];
}

/**
 * This class implements a content provider for system event viewer live session.
 *
 * Currenlty the provided content is only a placeholder JSON with session information,
 * but once the file format is defined (CFSIO-14895) this class will be modified to
 * actually retrieve the trace buffer from the device and format it accordingly as part
 * of CFSIO-14913
 */
export class EventContentProvider
  implements vscode.TextDocumentContentProvider, vscode.Disposable
{
  // This event is used by VS code to listen for document changes
  private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;

  private activeDocuments: Record<string, EventDocumentContext> = {};

  constructor(
    private debugManager: CfsDebugManager,
    private traceManager: TraceManager,
  ) {}

  async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken,
  ): Promise<string> {
    // TODO: Handle cancellation
    void token;

    const sessionId = uri.path.replace("/", "");
    const debugSession = this.debugManager.getSession(sessionId);
    let sessionContext = this.activeDocuments[sessionId];

    if (!debugSession) {
      const sessionContent = sessionContext?.content;
      if (sessionContent) {
        // There is no active session but we have a context,
        // so this was a previous session that has ended.
        sessionContent.state = "ended";
        return JSON.stringify(sessionContent, undefined, 2);
      }
      throw new Error(`No active debug session with id ${sessionId}`);
    }

    if (!sessionContext) {
      // This is the first time we open the document for this session,
      // setup event listeners and create the context
      sessionContext = {
        debugSession,
        content: {
          schemaVersion: "0.2",
          events: {},
          lastUpdate: new Date().toISOString(),
        },
        disposables: [],
      };

      this.activeDocuments[sessionId] = sessionContext;

      sessionContext.disposables.push(
        debugSession.onHalt(() => {
          // This will trigger the provideTextDocumentContent method to be called again
          // so latest events can be retrieved
          this.onDidChangeEmitter.fire(uri);
        }),
        debugSession.onContinue(() => {
          // This will trigger the provideTextDocumentContent method to be called again
          // so we can update the state to 'running'.
          this.onDidChangeEmitter.fire(uri);
        }),
        debugSession.onStop(() => {
          // Dispose listeners since we are not going to receive more events from them
          sessionContext?.disposables.forEach((d) => d.dispose());
          // This will trigger the provideTextDocumentContent method to be called again
          // so we can update the state to 'ended'.
          this.onDidChangeEmitter.fire(uri);
        }),
      );
    }

    if (debugSession.isHalted()) {
      const hwEventInfo = await this.traceManager.readHwEvents();
      const fileEvents: Record<string, { timestamps: number[] }> = {};

      for (const event of hwEventInfo.events) {
        if (!(event.source in fileEvents)) {
          fileEvents[event.source] = { timestamps: [] };
        }
        fileEvents[event.source].timestamps.push(event.timestamp);
      }
      sessionContext.content.events = fileEvents;
      sessionContext.content.tickFrequency = hwEventInfo.tsFrequency;
      sessionContext.content.ticksEpoch = hwEventInfo.tsEpoch?.toISOString();
      sessionContext.content.state = "active";
      sessionContext.content.lastUpdate = new Date().toISOString();
    } else {
      sessionContext.content.state = "running";
    }

    return JSON.stringify(sessionContext.content, undefined, 2);
  }

  public dispose() {
    for (const sessionId in this.activeDocuments) {
      const sessionContext = this.activeDocuments[sessionId];
      sessionContext.disposables?.forEach((disposable) => disposable.dispose());
    }
    this.activeDocuments = {};
    this.onDidChangeEmitter.dispose();
  }
}
