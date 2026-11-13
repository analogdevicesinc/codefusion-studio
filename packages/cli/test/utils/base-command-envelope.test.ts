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

import {Args} from '@oclif/core';
import {captureOutput} from '@oclif/test';
import {expect} from 'chai';

import {BaseCommand} from '../../src/utils/base-command.js';
import {RecoverableError} from '../../src/utils/recoverable-error.js';
import {assertValidEnvelope} from './assert-json-envelope.js';

function parseEnvelope(stdout: string) {
  assertValidEnvelope(stdout);

  return JSON.parse(stdout);
}

// Throwaway command classes that opt into the envelope, used only to
// exercise BaseCommand's new envelope machinery in isolation — no real
// command sets useResponseEnvelope until its own migration phase.

class EnvelopeSuccessCommand extends BaseCommand<
  typeof EnvelopeSuccessCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  async run() {
    this.pushWarning('a pushed warning');
    this.warn('a warn() call');
    return {message: 'ok'};
  }
}

class EnvelopeRecoverableErrorCommand extends BaseCommand<
  typeof EnvelopeRecoverableErrorCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  async run(): Promise<never> {
    throw new RecoverableError('Something recoverable failed', {
      suggestion: 'Try again',
      code: 'SOMETHING_FAILED'
    });
  }
}

class EnvelopeGenericErrorCommand extends BaseCommand<
  typeof EnvelopeGenericErrorCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  async run(): Promise<never> {
    throw new Error('boom, something broke');
  }
}

class EnvelopeCodedErrorCommand extends BaseCommand<
  typeof EnvelopeCodedErrorCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  async run(): Promise<never> {
    const error = new Error("no such file 'foo.txt'") as Error & {
      code: string;
    };
    error.code = 'ENOENT';
    throw error;
  }
}

class EnvelopeEmptyCodedErrorCommand extends BaseCommand<
  typeof EnvelopeEmptyCodedErrorCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  async run(): Promise<never> {
    const error = new Error('empty code failure') as Error & {
      code: string;
    };
    error.code = '';
    throw error;
  }
}

class EnvelopeEmptyRecoverableCodeCommand extends BaseCommand<
  typeof EnvelopeEmptyRecoverableCodeCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  async run(): Promise<never> {
    throw new RecoverableError('empty recoverable code', {
      suggestion: 'Try again',
      code: ''
    });
  }
}

class EnvelopeFalsyThrowCommand extends BaseCommand<
  typeof EnvelopeFalsyThrowCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  async run(): Promise<never> {
    // eslint-disable-next-line no-throw-literal
    throw null;
  }
}

class EnvelopeVoidCommand extends BaseCommand<
  typeof EnvelopeVoidCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  async run(): Promise<undefined> {
    return undefined;
  }
}

class EnvelopeArrayCommand extends BaseCommand<
  typeof EnvelopeArrayCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  // Cast: models a misconfigured command returning a non-object payload.
  async run() {
    return ['not', 'an', 'object'] as unknown as Record<
      string,
      unknown
    >;
  }
}

class EnvelopeUnserializableCommand extends BaseCommand<
  typeof EnvelopeUnserializableCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  // A BigInt passes the object guard but cannot be JSON-stringified.
  async run() {
    return {value: 1n};
  }
}

class EnvelopeDateCommand extends BaseCommand<
  typeof EnvelopeDateCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};

  // A Date passes the object guard but serializes to a JSON string.
  async run() {
    return new Date(0) as unknown as Record<string, unknown>;
  }
}

class EnvelopeRequiredArgCommand extends BaseCommand<
  typeof EnvelopeRequiredArgCommand
> {
  static enableJsonFlag = true;
  static useResponseEnvelope = true;
  static flags = {...BaseCommand.baseFlags};
  static args = {
    name: Args.string({required: true})
  };

  async run() {
    return {name: this.args.name};
  }
}

/**
 * Feature: BaseCommand envelope machinery
 *   As a CLI developer migrating a command in a later phase
 *   I want BaseCommand to build the {ok, command, data, warnings, errors}
 *   envelope for any command that opts in
 *   So that every migrated command gets consistent JSON output for free
 *
 * Background:
 *   Given commands that extend BaseCommand and set
 *   static useResponseEnvelope = true
 */
describe('BaseCommand envelope (opted-in)', () => {
  // Failures in JSON mode set the global `process.exitCode`, which the
  // oclif test harness does not reset between tests.
  beforeEach(() => {
    process.exitCode = 0;
  });

  afterEach(() => {
    process.exitCode = 0;
  });

  it('wraps a successful result into {ok, command, data, warnings}', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeSuccessCommand.run(['--format', 'json'], {root: '..'})
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed).to.deep.equal({
      ok: true,
      command: parsed.command,
      data: {message: 'ok'},
      warnings: [
        {message: 'a pushed warning'},
        {message: 'a warn() call'}
      ]
    });
  });

  it('wraps a thrown RecoverableError into {ok:false, command, errors:[{code, message}]}', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeRecoverableErrorCommand.run(['--format', 'json'], {
        root: '..'
      })
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed).to.deep.equal({
      ok: false,
      command: parsed.command,
      errors: [
        {
          code: 'SOMETHING_FAILED',
          message: 'Something recoverable failed'
        }
      ]
    });
  });

  it('wraps a thrown generic Error into a valid errors[] entry', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeGenericErrorCommand.run(['--format', 'json'], {
        root: '..'
      })
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.ok).to.equal(false);
    expect(parsed.errors).to.have.lengthOf(1);
    expect(parsed.errors[0].message).to.equal(
      'boom, something broke'
    );
    expect(parsed.errors[0].code).to.be.a('string').and.not.empty;
  });

  it('preserves an existing .code on a thrown error instead of deriving one from the message', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeCodedErrorCommand.run(['--format', 'json'], {
        root: '..'
      })
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.errors[0].code).to.equal('ENOENT');
  });

  it('falls back to a derived code when a thrown error carries an empty .code', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeEmptyCodedErrorCommand.run(['--format', 'json'], {
        root: '..'
      })
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.errors[0].code).to.be.a('string').and.not.empty;
  });

  it('falls back to a derived code when a RecoverableError is given an empty code', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeEmptyRecoverableCodeCommand.run(['--format', 'json'], {
        root: '..'
      })
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.errors[0].code).to.be.a('string').and.not.empty;
  });

  it('emits a JSON error envelope when run() returns undefined instead of a data object', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeVoidCommand.run(['--format', 'json'], {root: '..'})
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.ok).to.equal(false);
    expect(parsed.errors).to.have.lengthOf(1);
    expect(parsed.errors[0].message).to.match(
      /sets useResponseEnvelope = true but run\(\) returned no data/
    );
  });

  it('emits a JSON error envelope when run() returns an array instead of a data object', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeArrayCommand.run(['--format', 'json'], {root: '..'})
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.ok).to.equal(false);
    expect(parsed.errors).to.have.lengthOf(1);
    expect(parsed.errors[0].message).to.match(
      /returned a non-object value/
    );
  });

  it('produces valid JSON, not a stack trace, when a required arg is missing', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeRequiredArgCommand.run(['--format', 'json'], {
        root: '..'
      })
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.ok).to.equal(false);
    expect(parsed.errors).to.have.lengthOf(1);
  });

  it('also recognizes --format=json (equals form) when a required arg is missing', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeRequiredArgCommand.run(['--format=json'], {root: '..'})
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.ok).to.equal(false);
    expect(parsed.errors).to.have.lengthOf(1);
  });

  it('also recognizes -f=json (short equals form) when a required arg is missing', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeRequiredArgCommand.run(['-f=json'], {root: '..'})
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.ok).to.equal(false);
    expect(parsed.errors).to.have.lengthOf(1);
  });

  it('emits one error envelope when the success payload cannot be serialized', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeUnserializableCommand.run(['--format', 'json'], {
        root: '..'
      })
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.ok).to.equal(false);
    expect(parsed.errors).to.have.lengthOf(1);
  });

  it('emits one error envelope when run() returns a value that serializes to a non-object', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeDateCommand.run(['--format', 'json'], {root: '..'})
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.ok).to.equal(false);
    expect(parsed.errors).to.have.lengthOf(1);
  });

  it('clears the scoped REDIRECTED env var before running, like oclif', async () => {
    process.env.CFSUTIL_REDIRECTED = '1';

    await captureOutput(() =>
      EnvelopeSuccessCommand.run(['--format', 'json'], {root: '..'})
    );

    expect(process.env.CFSUTIL_REDIRECTED).to.equal(undefined);
  });

  it('emits a single error envelope when run() throws a falsy value', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeFalsyThrowCommand.run(['--format', 'json'], {
        root: '..'
      })
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.ok).to.equal(false);
    expect(parsed.errors).to.have.lengthOf(1);
  });

  it('pushWarning()/warn() calls do not print to stdout in JSON mode', async () => {
    const {stdout} = await captureOutput(() =>
      EnvelopeSuccessCommand.run(['--format', 'json'], {root: '..'})
    );

    const parsed = parseEnvelope(stdout);
    expect(parsed.data).to.deep.equal({message: 'ok'});
  });

  it('pushWarning() falls back to printing in text mode instead of being dropped', async () => {
    const {stderr} = await captureOutput(() =>
      EnvelopeSuccessCommand.run([], {root: '..'})
    );

    expect(stderr).to.include('a pushed warning');
  });
});
