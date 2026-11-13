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
export interface RecoverableErrorRecovery {
  suggestion: string;
  run?: string;
  example?: string;
  // Stable machine-readable code for the JSON envelope's errors[].code
  // (see base-command.ts). Defaults to a slug derived from the message
  // when omitted.
  code?: string;
}

export class RecoverableError extends Error {
  public readonly code: string;

  constructor(
    message: string,
    public recovery: RecoverableErrorRecovery
  ) {
    super(message);
    this.code = recovery.code || deriveErrorCode(message);
  }

  // Legacy (non-envelope) JSON error shape; `code` is envelope-only so
  // non-migrated commands' output stays unchanged.
  toJson() {
    const recovery = {...this.recovery};
    delete recovery.code;

    return {
      level: 'ERROR',
      msg: this.message,
      recovery
    };
  }

  toText() {
    let output = this.message;
    output += `\nSuggestion: ${this.recovery.suggestion}`;

    if (this.recovery.run) {
      output += `\nRun: ${this.recovery.run}`;
    }

    if (this.recovery.example) {
      output += `\nExample: ${this.recovery.example}`;
    }

    return output;
  }
}

/**
 * Create an `Error` carrying a stable machine-readable `code` for the JSON
 * envelope, for errors whose message interpolates dynamic values.
 */
export function errorWithCode(message: string, code: string): Error {
  return Object.assign(new Error(message), {code});
}

/**
 * Derive an upper-snake-case error code from a human-readable error
 * message, for errors that don't declare an explicit `code`. Messages that
 * interpolate dynamic values (a file name, a package name, etc.) will
 * derive a different code per invocation — pass an explicit `code` in
 * `RecoverableErrorRecovery` whenever callers need to match on a stable
 * code across differing message content. `BaseCommand.toEnvelopeError()`
 * only falls back to this for plain errors with no existing string `code`
 * property (e.g. Node's ENOENT-style errors keep their own code).
 */
export function deriveErrorCode(message: string): string {
  const slug = message
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || 'UNKNOWN_ERROR';
}
