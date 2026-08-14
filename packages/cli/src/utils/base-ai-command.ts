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

import {BaseCommand} from './base-command.js';
import {RecoverableError} from './recoverable-error.js';

/**
 * Base command for AI workflows with structured result and error handling.
 */
export abstract class BaseAiCommand<
  T extends typeof Command
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
      if (isRecoverableError) {
        this.logJson(error.toJson());
      } else if (isAiCommandError) {
        this.logJson(error.result);
      } else {
        this.logJson({
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

  protected handleResult(
    resultInput: AiCommandResult,
    preResultWarnings: string[]
  ): AiCommandResult {
    let result = resultInput;
    process.exitCode = result.code;

    if (preResultWarnings.length > 0) {
      result = {
        ...result,
        events: [
          ...(preResultWarnings.map((warning) => ({
            type: 'WARN',
            message: warning
          })) as AiCommandResult['events']),
          ...result.events
        ]
      };
    }

    if (this.jsonEnabled()) {
      return result;
    }

    const errors = this.logEvents(result.events);

    if (errors.length > 0) {
      this.error(errors.join('\n'), {exit: result.code || 1});
    }

    return result;
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

        default: {
          this.log(event.message);
        }
      }
    }

    return errors;
  }
}
