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

import {Command, Flags, Interfaces} from '@oclif/core';

import {RecoverableError} from './recoverable-error.js';

// Non-cfsutil wrapped commands (currently)
interface CliResponse<T = never> {
  data?: T;
  msg?: string;
}

export type CliRunResponse<T = never> =
  Promise<CliResponse<T> | void>;

export type Flags<T extends typeof Command> =
  Interfaces.InferredFlags<
    (typeof BaseCommand)['baseFlags'] & T['flags']
  >;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<
  T['args']
>;

export abstract class BaseCommand<
  T extends typeof Command
> extends Command {
  static baseFlags = {
    format: Flags.string({
      summary: 'Output in desired format',
      required: false,
      options: ['json', 'text'],
      default: 'text'
    }),
    json: Flags.boolean({
      char: 'j',
      deprecated: true,
      hidden: true
    })
  };

  static enableJsonFlag = true;

  protected args!: Args<T>;
  protected flags!: Flags<T>;

  async catch(error: Interfaces.CommandError | RecoverableError) {
    const isRecoverableError = error instanceof RecoverableError;

    process.exitCode = isRecoverableError
      ? 1
      : (error?.exitCode ?? 1);

    if (this.jsonEnabled()) {
      const formattedError = {
        level: 'ERROR',
        msg: error instanceof Error ? error.message : String(error)
      };

      this.logJson(
        isRecoverableError ? error.toJson() : formattedError
      );
    } else {
      this.error(isRecoverableError ? error.toText() : error);
    }
  }

  public async init() {
    await super.init();

    const {args, flags} = await this.parse({
      flags: this.ctor.flags,
      baseFlags: this.ctor.baseFlags,
      args: this.ctor.args,
      enableJsonFlag: this.ctor.enableJsonFlag
    });

    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;
  }

  jsonEnabled(): boolean {
    if (!this.flags) return false;
    return this.flags.format === 'json' || this.flags.json === true;
  }
}
