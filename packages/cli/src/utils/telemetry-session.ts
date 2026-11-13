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

import type {TelemetryManager} from 'cfs-lib';

export interface TelemetrySession {
  manager: TelemetryManager;
  startTime: number;
  commandId?: string;
  metadata: Record<string, unknown>;
}

let currentSession: TelemetrySession | null = null;

export function initTelemetrySession(
  manager: TelemetryManager,
  startTime: number
): void {
  currentSession = {
    manager,
    startTime,
    metadata: {}
  };
}

export function getTelemetrySession(): TelemetrySession | null {
  return currentSession;
}

export function clearTelemetrySession(): void {
  currentSession = null;
}

/**
 * Runs `fn` and afterwards restores the telemetry session that was
 * active before it ran, including its metadata.
 *
 * Wrap nested `config.runCommand()` calls with this: oclif fires the
 * `prerun` hook for nested commands, which replaces the session, but
 * only fires `finally` for the top-level command. Without restoring,
 * the top-level event would report the nested command's metadata and
 * start time.
 *
 * @param fn - The callback to run, typically a nested command.
 * @returns The value returned by `fn`.
 */
export async function preserveTelemetrySession<T>(
  fn: () => Promise<T>
): Promise<T> {
  const saved = currentSession;
  try {
    return await fn();
  } finally {
    currentSession = saved;
  }
}

export function addTelemetryMetadata(
  data: Record<string, unknown>
): void {
  if (currentSession) {
    Object.assign(currentSession.metadata, data);
  }
}
