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

import type {Config} from '@oclif/core';
import {TelemetryManager, UserType} from 'cfs-lib';

const TRUTHY_VALUES = new Set(['1', 'true']);

/**
 * Returns `true` when telemetry is suppressed via the
 * `CFS_TELEMETRY_DISABLED` environment variable.
 * Accepts `"1"`, or `"true"` (case-insensitive).
 */
export function isTelemetrySuppressed(
  env: Record<string, string | undefined>
): boolean {
  const raw = env.CFS_TELEMETRY_DISABLED?.trim().toLowerCase();
  return raw !== undefined && TRUTHY_VALUES.has(raw);
}

/**
 * Creates a TelemetryManager for one-shot use by
 * management commands (e.g. `telemetry enable`).
 */
export function createTelemetryManagerForCommand(
  config: Config,
  userId: string,
  userType: string
): TelemetryManager {
  return new TelemetryManager(
    true,
    config.version,
    '',
    userId,
    userType as UserType,
    crypto.randomUUID()
  );
}
