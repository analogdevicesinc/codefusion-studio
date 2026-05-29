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

/**
 * Error patterns that indicate the debug session has been disconnected
 * or the target hardware is no longer reachable.
 */
const DISCONNECTION_PATTERNS = [
  /session.*terminated/i,
  /session.*ended/i,
  /session.*closed/i,
  /session.*disconnect/i,
  /target.*disconnect/i,
  /target.*not.*respond/i,
  /connection.*refused/i,
  /connection.*reset/i,
  /connection.*closed/i,
  /connection.*lost/i,
  /debug.*adapter.*terminated/i,
  /debug.*adapter.*disconnect/i,
  /no.*active.*debug.*session/i,
  /timed?\s*out/i,
  /GDB.*server.*closed/i,
  /remote.*disconnect/i,
  /target.*not.*available/i,
  /unable.*communicate/i,
  /pipe.*broken/i,
  /EPIPE/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
];

/**
 * Checks whether an error indicates that the debug session has been
 * disconnected or the target hardware is no longer reachable.
 *
 * @param error - The caught error to inspect.
 * @param hadActiveSession - Whether a debug session was known to be
 *   active before the operation that threw. When `true`, the absence
 *   of `vscode.debug.activeDebugSession` is treated as evidence of a
 *   mid-operation disconnect. When `false` (default) only the error
 *   message patterns are checked so that unrelated errors are not
 *   misclassified as disconnections.
 */
export function isSessionDisconnectedError(
  error: unknown,
  hadActiveSession = false,
): boolean {
  const msg = error instanceof Error ? error.message : String(error);

  if (DISCONNECTION_PATTERNS.some((p) => p.test(msg))) {
    return true;
  }

  // Only treat a missing session as a disconnect signal when we know
  // one was active before the failing operation started.
  if (hadActiveSession && !vscode.debug.activeDebugSession) {
    return true;
  }

  return false;
}

/**
 * Returns a user-friendly markdown message explaining that the debug
 * session appears to have been disconnected.
 */
export function getDisconnectionMessage(originalError?: string): string {
  const lines = [
    "⚠️ The debug session appears to be disconnected. " +
      "This can happen when the target hardware is physically " +
      "disconnected or powered off during an active session.\n",
  ];

  if (originalError) {
    lines.push(`Error details: \n\`\`\`${originalError}\`\`\`\n`);
  }

  lines.push(
    "**To recover:**\n" +
      "1. Reconnect and power on the target hardware\n" +
      "2. Stop the current session: `@cfs-debug stop`\n" +
      "3. Start a new session: `@cfs-debug start debugging`\n",
  );

  return lines.join("\n");
}
