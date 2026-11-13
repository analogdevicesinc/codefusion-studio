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

/**
 * Determines whether the current session is non-interactive.
 *
 * Returns true when any of the following hold:
 *  - The DO_NOT_TRACK environment variable is set
 *  - The CI environment variable is set
 *  - stdin is not a TTY (piped input, cron, CI runners, etc.)
 */
export function isNonInteractiveSession(): boolean {
  const dnt = process.env.DO_NOT_TRACK;
  if (dnt === '1' || dnt === 'true') return true;

  const ci = process.env.CI;
  if (ci === '1' || ci === 'true') return true;

  if (!process.stdin.isTTY) return true;

  return false;
}
