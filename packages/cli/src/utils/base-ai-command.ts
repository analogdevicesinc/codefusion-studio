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

import type {Command, Interfaces} from '@oclif/core';
import type {AiCommandResult} from 'cfs-types';

import {AiCommandError} from 'cfs-lib';

import type {CfsJsonError} from './base-command.js';

import {BaseCommand} from './base-command.js';
import {RecoverableError} from './recoverable-error.js';

// AiCommandResult.code is a numeric exit code, not a per-error identifier,
// so every ERROR event mapped from a thrown AiCommandError shares this code.
const AI_COMMAND_FAILED_CODE = 'AI_COMMAND_FAILED';

/**
 * Base command for AI workflows with structured result and error handling.
 */
export abstract class BaseAiCommand<
  T extends typeof Command,
  TData = unknown
> extends BaseCommand<T> {
  async catch(
    error: AiCommandError | Interfaces.CommandError | RecoverableError
  ): Promise<void> {
    const isRecoverableError = error instanceof RecoverableError;
    const isAiCommandError = error instanceof AiCommandError;

    const exitCode = isAiCommandError
      ? error.result.code
      : isRecoverableError
        ? 1
        : (error.exitCode ?? 1);

    process.exitCode = exitCode;

    if (this.jsonEnabled()) {
      if (isAiCommandError) {
        this.logJsonError(
          this.ctor.useResponseEnvelope
            ? this.toAiEnvelopeError(error.result.events)
            : error.result
        );
      } else if (this.ctor.useResponseEnvelope) {
        this.logJsonError(this.toEnvelopeError(error));
      } else if (isRecoverableError) {
        this.logJsonError(error.toJson());
      } else {
        this.logJsonError({
          level: 'ERROR',
          msg: error instanceof Error ? error.message : String(error)
        });
      }
    } else if (isRecoverableError) {
      this.error(error.toText(), {exit: exitCode});
    } else if (isAiCommandError) {
      const errors = this.logEvents(error.result.events);
      this.error(errors.join('\n') || 'AI command failed', {
        exit: exitCode
      });
    } else {
      this.error(error.message, {exit: exitCode});
    }
  }

  protected formatData?(data: TData): void;

  protected handleResult(
    resultInput: AiCommandResult<TData>,
    preResultWarnings: string[]
  ): AiCommandResult<TData> {
    let result = resultInput;
    process.exitCode = result.code;

    if (preResultWarnings.length > 0) {
      result = {
        ...result,
        events: [
          ...(preResultWarnings.map((warning) => ({
            type: 'WARN',
            message: warning
          })) as AiCommandResult<TData>['events']),
          ...result.events
        ]
      };
    }

    if (this.ctor.useResponseEnvelope && this.jsonEnabled()) {
      // A resolved result is a success even when it carries ERROR events
      // (the tool exited with a code in validCodes), so surface them as
      // warnings instead of dropping them.
      for (const event of result.events) {
        if (event.type === 'WARN' || event.type === 'ERROR') {
          this.pushWarning(event.message);
        }
      }

      // build has no data/formatData; artifacts (its file list) fills
      // data instead. Fall back to {} (rather than undefined) so a valid
      // resolved result never trips the "misconfigured command" guard in
      // base-command.ts's _run(). Cast keeps this method's declared return
      // type stable for non-enveloped callers.
      return (result.data ??
        result.artifacts ??
        {}) as unknown as AiCommandResult<TData>;
    }

    if (this.jsonEnabled()) {
      return result;
    }

    const errors = this.logEvents(result.events);

    if (errors.length > 0) {
      this.error(errors.join('\n'), {exit: result.code || 1});
    }

    if (result.data !== undefined && this.formatData) {
      this.formatData(result.data);
    }

    return result;
  }

  private toAiEnvelopeError(
    events: AiCommandResult['events']
  ): CfsJsonError {
    const errors = events
      .filter((event) => event.type === 'ERROR')
      .map((event) => ({
        code: AI_COMMAND_FAILED_CODE,
        message: event.message
      }));

    return {
      ok: false,
      command: this.envelopeCommandId,
      // Every AiCommandError call site pushes an ERROR event before
      // throwing, but that isn't enforced by the type contract, so fall
      // back to a generic message rather than an empty errors[].
      errors:
        errors.length > 0
          ? errors
          : [
              {
                code: AI_COMMAND_FAILED_CODE,
                message: 'AI command failed'
              }
            ]
    };
  }

  private logEvents(events: AiCommandResult['events']): string[] {
    const errors: string[] = [];

    for (const event of events) {
      switch (event.type) {
        case 'WARN': {
          this.warn(event.message);
          break;
        }

        case 'ERROR': {
          errors.push(event.message);
          break;
        }

        case 'DATA': {
          // do not log data events, used for tool returns
          break;
        }

        default: {
          this.log(event.message);
        }
      }
    }

    return errors;
  }
}
