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

export class SessionManager {
  private sessionData: Map<string, any> = new Map();
  private activeSessionId: string | undefined;
  private activeSessions: Set<string> = new Set();
  private readonly _onDidSessionDataChange = new vscode.EventEmitter<{
    sessionId: string;
    data: any;
  }>();
  public readonly onDidSessionDataChange = this._onDidSessionDataChange.event;

  constructor() {
    // Listen for active debug session changes
    vscode.debug.onDidChangeActiveDebugSession((session) => {
      this.activeSessionId = session?.id;
    });
  }

  /**
   * Marks a session as active.
   */
  markSessionActive(sessionId: string): void {
    this.activeSessions.add(sessionId);
  }

  /**
   * Marks a session as inactive.
   */
  markSessionInactive(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  /**
   * Retrieves all active core dump session IDs.
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions);
  }
  /**
   * Stores data for a specific session ID.
   */
  setSessionData(sessionId: string, data: any): void {
    this.sessionData.set(sessionId, data);
    // Fire event to notify listeners that session data has changed
    this._onDidSessionDataChange.fire({ sessionId, data });
  }

  /**
   * Retrieves data for the active session.
   */
  getActiveSessionData(): any {
    if (!this.activeSessionId) return null;
    return this.sessionData.get(this.activeSessionId);
  }

  /**
   * Retrieves data for a specific session ID.
   */
  getSessionData(sessionId: string): any {
    const data = this.sessionData.get(sessionId);
    return data;
  }

  /**
   * Clears data for a specific session ID.
   */
  clearSessionData(sessionId: string): void {
    this.sessionData.delete(sessionId);
  }
  /**
   * Clears all session data.
   */
  clearAll(): void {
    this.sessionData.clear();
  }

  /**
   * Dispose method to clean up resources.
   */
  dispose(): void {
    this._onDidSessionDataChange.dispose();
  }
}
