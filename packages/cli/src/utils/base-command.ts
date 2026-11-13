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

import {
  deriveErrorCode,
  RecoverableError
} from './recoverable-error.js';
import {addTelemetryMetadata} from './telemetry-session.js';

function hasStringCode(error: unknown): error is {code: string} {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as {code?: unknown}).code === 'string' &&
    (error as {code: string}).code.length > 0
  );
}

// Prefer a stable code already carried by the error (e.g. Node's
// ENOENT-style .code on fs errors) over deriveErrorCode(), whose
// output varies with interpolated message content.
function resolveErrorCode(error: unknown, message: string): string {
  if (error instanceof RecoverableError) return error.code;
  if (hasStringCode(error)) return error.code;
  return deriveErrorCode(message);
}

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

// Shared JSON response envelope for commands that opt in via
// `static useResponseEnvelope = true`. See packages/cli/AGENTS.md's
// "JSON output contract" section for the full contract.
export interface CfsJsonSuccess<T extends object = object> {
  ok: true;
  command: string;
  data: T;
  warnings: {message: string}[];
}

export interface CfsJsonError {
  ok: false;
  command: string;
  errors: {code: string; message: string}[];
}

export abstract class BaseCommand<
  T extends typeof Command
> extends Command {
  static baseFlags = {
    format: Flags.string({
      char: 'f',
      summary: 'Output in desired format',
      required: false,
      options: ['json', 'text'],
      default: 'text'
    }),
    json: Flags.boolean({
      char: 'j',
      deprecated: true,
      hidden: true
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'Enable verbose mode',
      exclusive: ['quiet']
    }),
    quiet: Flags.boolean({
      summary: 'Suppress non-error output',
      required: false,
      default: false,
      char: 'q'
    })
  };

  static enableJsonFlag = true;

  // Per-command opt-in for the shared {ok, command, data, warnings, errors}
  // envelope. Defaults to false so this is a pure addition until each
  // command's own migration phase sets it to true.
  static useResponseEnvelope = false;

  protected args!: Args<T>;
  protected flags!: Flags<T>;
  protected set telemetryMetadata(data: Record<string, unknown>) {
    addTelemetryMetadata(data);
  }

  // Warnings raised during a command's run(), flushed into the success
  // envelope's `warnings[]` by toSuccessJson() — see pushWarning() and the
  // warn() override below.
  protected pendingWarnings: {message: string}[] = [];
  private runWrapped = false;

  // Narrows oclif's own `typeof Command` return type so subclasses can read
  // static envelope config (e.g. `this.ctor.useResponseEnvelope`).
  protected override get ctor(): typeof BaseCommand {
    return this.constructor as typeof BaseCommand;
  }

  // Queues a warning for the success envelope's warnings[]; falls back to
  // warn() when not writing JSON so the message isn't silently dropped.
  protected pushWarning(message: string): void {
    if (this.ctor.useResponseEnvelope && this.jsonEnabled()) {
      this.pendingWarnings.push({message});
    } else {
      this.warn(message);
    }
  }

  async catch(error: Interfaces.CommandError | RecoverableError) {
    const isRecoverableError = error instanceof RecoverableError;

    process.exitCode = isRecoverableError
      ? 1
      : (error?.exitCode ?? 1);

    if (this.jsonEnabled()) {
      if (this.ctor.useResponseEnvelope) {
        this.logJsonError(this.toEnvelopeError(error));
        return;
      }

      const formattedError = {
        level: 'ERROR',
        msg: error instanceof Error ? error.message : String(error)
      };

      this.logJsonError(
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

    // Throwing from inside run() lets oclif's own _run() route the failure
    // through catch() as an error envelope; a check after run() could not.
    if (this.ctor.useResponseEnvelope && !this.runWrapped) {
      this.runWrapped = true;
      const run = this.run.bind(this);
      this.run = async () => this.assertEnvelopeData(await run());
    }
  }

  jsonEnabled(): boolean {
    if (this.flags) {
      return this.flags.format === 'json' || this.flags.json === true;
    }

    // this.flags isn't populated yet if oclif's own argument parser threw
    // during init() (e.g. a missing required arg). Enveloped commands still
    // need JSON output in that window, so fall back to scanning argv
    // directly, mirroring oclif's own default jsonEnabled() implementation.
    // Non-enveloped commands keep the previous (false) behavior unchanged.
    return (
      this.ctor.useResponseEnvelope && this.isJsonRequestedInArgv()
    );
  }

  // Duplicates oclif's own flag parsing as a fallback for the pre-init()
  // window; does not handle combined short-flag forms (e.g. `-fjson`).
  private isJsonRequestedInArgv(): boolean {
    const passThroughIndex = this.argv.indexOf('--');
    const isBeforePassThrough = (index: number) =>
      index !== -1 &&
      (passThroughIndex === -1 || index < passThroughIndex);

    const formatJsonIndex = this.argv.findIndex(
      (arg, index) =>
        (arg === '--format' || arg === '-f') &&
        this.argv[index + 1] === 'json'
    );
    const formatEqualsJsonIndex = this.argv.findIndex(
      (arg) => arg === '--format=json' || arg === '-f=json'
    );

    return (
      isBeforePassThrough(formatJsonIndex) ||
      isBeforePassThrough(formatEqualsJsonIndex) ||
      isBeforePassThrough(this.argv.indexOf('--json')) ||
      isBeforePassThrough(this.argv.indexOf('-j'))
    );
  }

  private get isQuiet(): boolean {
    if (this.flags) return this.flags.quiet;
    return this.argv.includes('-q') || this.argv.includes('--quiet');
  }

  log(message?: string, ...args: any[]): void {
    if (this.isQuiet) return;
    super.log(message, ...args);
  }

  logJson(json: unknown): void {
    if (this.isQuiet) return;
    super.logJson(json);
  }

  protected logJsonError(json: unknown): void {
    super.logJson(json);
  }

  private assertEnvelopeData(result: unknown): unknown {
    if (result === undefined || result === null) {
      throw new Error(
        `${this.id} sets useResponseEnvelope = true but run() returned ` +
          'no data. Every enveloped command must return a data object ' +
          'on success.'
      );
    }

    // The envelope schema requires `data` to be an object.
    if (typeof result !== 'object' || Array.isArray(result)) {
      throw new TypeError(
        `${this.id} sets useResponseEnvelope = true but run() returned ` +
          'a non-object value. Every enveloped command must return a ' +
          'data object (not an array or primitive) on success.'
      );
    }

    if (this.jsonEnabled()) {
      // The schema constrains the JSON value, which toJSON() (e.g. Date)
      // can turn into a string, array, or null; stringify also surfaces
      // serialization failures (e.g. a BigInt) here, before any output.
      const serialized: unknown = JSON.parse(
        JSON.stringify(result) ?? 'null'
      );
      if (
        typeof serialized !== 'object' ||
        serialized === null ||
        Array.isArray(serialized)
      ) {
        throw new TypeError(
          `${this.id} sets useResponseEnvelope = true but run() returned ` +
            'a value that serializes to a non-object JSON value. Every ' +
            'enveloped command must return a plain data object.'
        );
      }
    }

    return result;
  }

  // oclif's own `this.id` is always colon-separated (e.g. "catalog:update")
  // regardless of the `topicSeparator: " "` in package.json's oclif config,
  // which only affects generated help/usage text. The CLI response envelope's
  // `command` field uses the space-separated form the user actually types,
  // so normalize it here rather than at each call site.
  protected get envelopeCommandId(): string {
    return (this.id ?? '').replaceAll(':', ' ');
  }

  toSuccessJson<TResult = unknown>(result: TResult): unknown {
    if (!this.ctor.useResponseEnvelope) {
      return result;
    }

    const envelope: CfsJsonSuccess<TResult & object> = {
      ok: true,
      command: this.envelopeCommandId,
      data: result as TResult & object,
      warnings: this.pendingWarnings
    };

    this.pendingWarnings = [];

    return envelope;
  }

  protected toEnvelopeError(
    error: Interfaces.CommandError | RecoverableError
  ): CfsJsonError {
    const message =
      error instanceof Error ? error.message : String(error);
    const code = resolveErrorCode(error, message);

    return {
      ok: false,
      command: this.envelopeCommandId,
      errors: [{code, message}]
    };
  }

  warn(input: Error | string): Error | string {
    if (this.ctor.useResponseEnvelope && this.jsonEnabled()) {
      this.pendingWarnings.push({
        message: input instanceof Error ? input.message : input
      });
      return input;
    }

    if (this.isQuiet) return input;
    return super.warn(input);
  }

  writeToStdout(data: Buffer | string): boolean {
    if (this.isQuiet) return true;
    return process.stdout.write(data);
  }

  /**
   * Write to stderr unless `--quiet` is set. Use this for diagnostics that
   * must stay off stdout (e.g. subprocess output in `--format json` mode).
   * @param data - Text or bytes to write.
   * @returns The result of `process.stderr.write`, or `true` when quiet.
   */
  writeToStderr(data: Buffer | string): boolean {
    if (this.isQuiet) return true;
    return process.stderr.write(data);
  }
}
