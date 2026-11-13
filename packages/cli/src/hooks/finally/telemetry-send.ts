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

import {Hook} from '@oclif/core';

import {
  clearTelemetrySession,
  getTelemetrySession
} from '../../utils/telemetry-session.js';

const TELEMETRY_TIMEOUT_MS = 3000;

const hook: Hook<'finally'> = async function (options) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const session = getTelemetrySession();
    if (!session) return;

    const durationMs = Math.max(
      0,
      Math.round(performance.now() - session.startTime)
    );

    const exitCode =
      process.exitCode ??
      (
        options.error as unknown as {
          exitCode?: number;
        }
      )?.exitCode ??
      (options.error ? 1 : 0);

    const send = session.manager.logAction('cli_command_completed', {
      ...session.metadata,
      commandId: session.commandId ?? options.Command?.id,
      durationMs,
      exitCode,
      nodeVersion: process.versions.node
    });

    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, TELEMETRY_TIMEOUT_MS);
      timer.unref();
    });

    await Promise.race([send, timeout]);
  } catch {
    // Telemetry must never break commands
  } finally {
    if (timer) clearTimeout(timer);
    clearTelemetrySession();
  }
};

export default hook;
