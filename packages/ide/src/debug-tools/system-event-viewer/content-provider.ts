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
import { LatestCfsEventsFile } from "./cfsevents-schema";
import { TraceManager } from "../trace/trace-manager";
import { TELEMETRY_ACTIONS } from "../../telemetry/action-names";
import { getTelemetryManager } from "../../telemetry/telemetry";
import { SEV_SCHEMA } from "../../constants";

interface EventDocumentContext {
  content: LatestCfsEventsFile;
  disposables: vscode.Disposable[];
  /** True once the current run has produced at least one event. Reset to false
   *  when a new run starts so empty reads can tell whether cached events belong
   *  to this run or to the previous one. */
  hasCurrentRunData: boolean;
}

/**
 * Content provider for the system event viewer live document.
 *
 * There is a single virtual document per workspace (`cfs-sev:/events`), shared
 * across all debug sessions. This mirrors the TraceManager, which is also a
 * single instance per workspace.
 */
export class EventContentProvider
  implements vscode.TextDocumentContentProvider, vscode.Disposable
{
  /** The fixed URI for the single live SEV document. */
  static readonly URI = vscode.Uri.from({ scheme: SEV_SCHEMA, path: "/System Event Viewer" });

  // This event is used by VS Code to listen for document changes
  private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this.onDidChangeEmitter.event;

  private context: EventDocumentContext | undefined;
  // Tracks which sessions are already subscribed so that concurrent
  // provideTextDocumentContent / onStartSession calls cannot register
  // duplicate listeners. WeakSet avoids retaining stopped sessions.
  private subscribedSessions = new WeakSet<CfsDebugSession>();
  private traceIsBusy = false;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private debugManager: CfsDebugManager,
    private traceManager: TraceManager,
  ) {
    this.disposables.push(
      debugManager.onStartSession((session) => {
        if (!this.debugManager.getAllSessions().includes(session)) {
          return;
        }
        if (this.context) {
          // First session after a completed run: reset trace data so the
          // viewer does not display the previous run's events as new data.
          // state === "ended" means every previous session has already stopped;
          // any other state means another core is already in this run, so we
          // leave the accumulated data alone. eventSourceIndex (layout) is
          // intentionally kept across runs.
          if (this.context.content.state === "ended") {
            this.context.hasCurrentRunData = false;
          }
          // Wire up halt/continue/stop notifications for this session now.
          // provideTextDocumentContent handles the no-context path: firing the
          // change event below causes VS Code to call it, which creates the
          // context and subscribes all current sessions lazily.
          this.subscribeSession(session);
        }
        // Always fire a change event so VS Code re-requests the document.
        // CfsDebugSession starts in the running state and suppresses redundant
        // continue events, so onContinue cannot be relied on for the initial
        // refresh — a tab open before debugging never updates without this.
        this.onDidChangeEmitter.fire(EventContentProvider.URI);
      }),
    );
  }

  private subscribeSession(session: CfsDebugSession): void {
    if (this.subscribedSessions.has(session)) {
      return;
    }
    this.subscribedSessions.add(session);

    const context = this.context!;
    const sessionSubs: vscode.Disposable[] = [
      session.onHalt(() => {
        // Only trigger a read when every session is halted — mirrors the
        // resolveSession logic in TraceManager that returns a running session
        // as a "not ready" signal when cores have mixed halt states.
        const allHalted = this.debugManager
          .getAllSessions()
          .every((s) => s.isHalted());
        if (allHalted) {
          this.onDidChangeEmitter.fire(EventContentProvider.URI);
        }
      }),
      session.onContinue(() => {
        // Any session continuing means the system is running again.
        this.onDidChangeEmitter.fire(EventContentProvider.URI);
      }),
    ];
    const stopSub = session.onStop(() => {
      // Dispose only this session's subscriptions, not the other sessions'.
      const toRemove = new Set<vscode.Disposable>([...sessionSubs, stopSub]);
      toRemove.forEach((d) => d.dispose());
      context.disposables = context.disposables.filter((d) => !toRemove.has(d));
      // Always notify so the provider recomputes the remaining sessions'
      // state. If the terminated session was the only running core, the
      // remaining halted sessions now have an accessible trace buffer that
      // would otherwise not be read until the next unrelated event.
      if (this.debugManager.getAllSessions().length === 0) {
        context.content.state = "ended";
        context.hasCurrentRunData = false;
      }
      this.onDidChangeEmitter.fire(EventContentProvider.URI);
    });
    context.disposables.push(...sessionSubs, stopSub);
  }

  async provideTextDocumentContent(
    _uri: vscode.Uri,
    token: vscode.CancellationToken,
  ): Promise<string> {
    // TODO: Handle cancellation
    void token;

    const sessions = this.debugManager.getAllSessions();

    if (!sessions.length) {
      if (this.context) {
        this.context.content.state = "ended";
        return JSON.stringify(this.context.content, undefined, 2);
      }
      // VS Code may restore this tab before any debug session starts (e.g. on
      // extension host reload). Return a placeholder so the editor opens without throwing.
      return JSON.stringify(
        {
          schemaVersion: "1.0",
          eventSources: {},
          state: "ended",
          lastUpdate: new Date().toISOString(),
        },
        undefined,
        2,
      );
    }

    if (!this.context) {
      this.context = {
        content: {
          schemaVersion: "1.0",
          eventSources: {},
          state: "running",
          lastUpdate: new Date().toISOString(),
        },
        disposables: [],
        hasCurrentRunData: false,
      };

      for (const session of sessions) {
        this.subscribeSession(session);
      }
    } else {
      this.context.content.state = "running";
    }

    const areAllHalted =
      sessions.length > 0 && sessions.every((s) => s.isHalted());

    if (!areAllHalted || this.traceIsBusy) {
      this.context.content.state = "running";
      return JSON.stringify(this.context.content, undefined, 2);
    }

    this.traceIsBusy = true;
    const startTime = Date.now();
    try {
      const eventInfo = await this.traceManager.readEvents();
      const fileEvents: LatestCfsEventsFile["eventSources"] = {};

      void getTelemetryManager().then((telemetryManager) => {
        telemetryManager.logAction(TELEMETRY_ACTIONS.SEV_READ_EVENTS, {
          eventCount: eventInfo.events.length,
          durationMs: Date.now() - startTime,
        });
      });

      if (eventInfo.events.length === 0) {
        // No new events yet. If this run has not produced any data so far,
        // clear stale content from the previous run so the viewer shows an
        // empty document rather than misleading old data.
        if (!this.context.hasCurrentRunData) {
          this.context.content.eventSources = {};
        }
        this.context.content.state = "active";
        return JSON.stringify(this.context.content, undefined, 2);
      }

      for (const event of eventInfo.events) {
        if (!(event.source in fileEvents)) {
          fileEvents[event.source] = { events: [] };
        }
        fileEvents[event.source].events.push({
          ts: event.timestamp,
          ...(event.data && { msg: event.data }),
        });
      }
      this.context.content.eventSources = fileEvents;
      this.context.content.tickFrequency = eventInfo.tsFrequency;
      this.context.content.tickEpoch = eventInfo.tsEpoch?.toISOString();
      this.context.content.state = "active";
      this.context.hasCurrentRunData = true;
      this.context.content.lastUpdate = new Date().toISOString();

      return JSON.stringify(this.context.content, undefined, 2);
    } finally {
      this.traceIsBusy = false;
    }
  }

  /**
   * Stores the event source ordering for the live document.
   * @param eventSourceIndex The ordered event source and group entries.
   */
  public updateEventSourceIndex(
    eventSourceIndex: LatestCfsEventsFile["eventSourceIndex"],
  ): void {
    if (this.context) {
      this.context.content.eventSourceIndex = eventSourceIndex;
    }
  }

  public dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.context?.disposables.forEach((d) => d.dispose());
    this.onDidChangeEmitter.dispose();
  }
}
