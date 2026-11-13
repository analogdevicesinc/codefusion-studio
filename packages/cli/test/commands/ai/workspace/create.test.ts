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

import {Config} from '@oclif/core';
import {runCommand} from '@oclif/test';
import {expect} from 'chai';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Sinon from 'sinon';

import {
  CFS_AI_WORKSPACE_TEMPLATES_PATH,
  CFS_DATA_MODELS_PATH
} from '../../../constants.js';
import {
  assertValidEnvelope,
  type CliErrorEnvelope
} from '../../../utils/assert-json-envelope.js';

// The nested ai:compat, ai:model:update and ai:build commands need the real
// cfsai tool, so they are stubbed; only the failure contract is covered.
describe('ai:workspace:create', () => {
  let tmpDir: string;
  let sandbox: Sinon.SinonSandbox;

  // Failures set the global `process.exitCode`, which the oclif test
  // harness does not reset between tests.
  beforeEach(async () => {
    process.exitCode = 0;
    sandbox = Sinon.createSandbox();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cfs-ai-ws-'));
  });

  afterEach(async () => {
    process.exitCode = 0;
    sandbox.restore();
    await fs.rm(tmpDir, {recursive: true, force: true});
  });

  type NestedOutcome = 'ok' | 'reject' | 'exit1';

  interface NestedCall {
    id: string;
    args: unknown[];
  }

  // Replaces only the nested commands; the top-level run goes through the
  // same Config.runCommand and must reach the real implementation.
  function stubNested(
    outcomes: Record<string, NestedOutcome>
  ): string[] & {calls: NestedCall[]} {
    const original = Config.prototype.runCommand;
    const invoked: string[] & {calls: NestedCall[]} = Object.assign(
      [] as string[],
      {calls: [] as NestedCall[]}
    );

    sandbox
      .stub(Config.prototype, 'runCommand')
      .callsFake(async function (
        this: Config,
        id: string,
        ...rest: unknown[]
      ) {
        const outcome = outcomes[id];

        if (!outcome) {
          return (
            original as (...a: unknown[]) => Promise<unknown>
          ).call(this, id, ...rest);
        }

        invoked.push(id);
        invoked.calls.push({id, args: rest});

        if (outcome === 'reject') {
          throw new Error(`${id} rejected`);
        }

        process.exitCode = outcome === 'exit1' ? 1 : 0;
      } as never);

    return invoked;
  }

  function validArgs(...extra: string[]) {
    return [
      'ai:workspace:create',
      '-o',
      tmpDir,
      '--name',
      'ws1',
      '--soc',
      'TEST8002',
      '--board',
      'KIT_BOARD',
      '--core',
      'CM4',
      '--model',
      path.join(tmpDir, 'model.tflite'),
      '--search-path',
      CFS_DATA_MODELS_PATH,
      '--search-path',
      CFS_AI_WORKSPACE_TEMPLATES_PATH,
      ...extra
    ];
  }

  function args(soc: string, ...extra: string[]) {
    return [
      'ai:workspace:create',
      '-o',
      tmpDir,
      '--name',
      'ws1',
      '--soc',
      soc,
      '--board',
      'EvKit_V1',
      '--core',
      'CM4',
      '--model',
      path.join(tmpDir, 'model.tflite'),
      '--search-path',
      CFS_DATA_MODELS_PATH,
      ...extra
    ];
  }

  describe('--format text', () => {
    it('GIVEN an unknown SoC THEN fail with the validation message', async () => {
      const {error} = await runCommand(args('NOSUCHSOC'), {
        root: '..'
      });

      expect(error?.message).to.contain(
        "SoC 'NOSUCHSOC' not a supported processor"
      );
    });
  });

  describe('--format json', () => {
    it('GIVEN different unknown SoCs THEN return the same stable VALIDATION_FAILED code', async () => {
      const codes: string[] = [];

      for (const soc of ['NOSUCHSOC', 'OTHERSOC']) {
        // eslint-disable-next-line no-await-in-loop
        const {stdout} = await runCommand(
          args(soc, '--format', 'json'),
          {root: '..'}
        );

        const parsed = assertValidEnvelope(
          stdout
        ) as CliErrorEnvelope;
        expect(parsed.ok).to.be.false;
        expect(parsed.command).to.equal('ai workspace create');
        expect(parsed.errors[0].message).to.contain(soc);
        codes.push(parsed.errors[0].code);
      }

      expect(codes).to.deep.equal([
        'VALIDATION_FAILED',
        'VALIDATION_FAILED'
      ]);
    });

    it('GIVEN an unsupported --set key THEN return VALIDATION_FAILED', async () => {
      const {stdout} = await runCommand(
        args('NOSUCHSOC', '--set', 'name=other', '--format', 'json'),
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as CliErrorEnvelope;
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal('VALIDATION_FAILED');
      expect(parsed.errors[0].message).to.contain(
        "--set 'name' is not supported"
      );
    });
  });

  describe('nested command failures', () => {
    async function runJson(...extra: string[]) {
      const {stdout} = await runCommand(
        validArgs('--format', 'json', ...extra),
        {root: '..'}
      );

      return assertValidEnvelope(stdout) as CliErrorEnvelope;
    }

    it('GIVEN ai:compat rejects THEN return AI_COMPAT_CHECK_FAILED', async () => {
      const invoked = stubNested({'ai:compat': 'reject'});

      const parsed = await runJson();

      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal(
        'AI_COMPAT_CHECK_FAILED'
      );
      expect(parsed.errors[0].message).to.contain(
        'ai:compat rejected'
      );
      expect(invoked).to.deep.equal(['ai:compat']);
    });

    it('GIVEN ai:compat resolves non-zero THEN return AI_COMPAT_CHECK_FAILED', async () => {
      const invoked = stubNested({'ai:compat': 'exit1'});

      const parsed = await runJson();

      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal(
        'AI_COMPAT_CHECK_FAILED'
      );
      expect(parsed.errors[0].message).to.equal(
        'Model compatibility check failed'
      );
      expect(invoked).to.deep.equal(['ai:compat']);
    });

    it('GIVEN ai:model:update rejects THEN return AI_MODEL_UPDATE_FAILED and skip ai:build', async () => {
      const invoked = stubNested({
        'ai:model:update': 'reject',
        'ai:build': 'ok'
      });

      const parsed = await runJson('--skip-compat');

      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal(
        'AI_MODEL_UPDATE_FAILED'
      );
      expect(parsed.errors[0].message).to.contain(
        'ai:model:update rejected'
      );
      expect(invoked).to.deep.equal(['ai:model:update']);
    });

    it('GIVEN ai:model:update resolves non-zero THEN return AI_MODEL_UPDATE_FAILED and skip ai:build', async () => {
      const invoked = stubNested({
        'ai:model:update': 'exit1',
        'ai:build': 'ok'
      });

      const parsed = await runJson('--skip-compat');

      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal(
        'AI_MODEL_UPDATE_FAILED'
      );
      expect(parsed.errors[0].message).to.contain(
        'exited with code 1'
      );
      expect(invoked).to.deep.equal(['ai:model:update']);
    });

    it('GIVEN ai:build rejects THEN return AI_BUILD_FAILED', async () => {
      const invoked = stubNested({
        'ai:model:update': 'ok',
        'ai:build': 'reject'
      });

      const parsed = await runJson('--skip-compat');

      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal('AI_BUILD_FAILED');
      expect(parsed.errors[0].message).to.contain(
        'ai:build rejected'
      );
      expect(invoked).to.deep.equal(['ai:model:update', 'ai:build']);
    });

    it('GIVEN ai:build resolves non-zero THEN return AI_BUILD_FAILED', async () => {
      const invoked = stubNested({
        'ai:model:update': 'ok',
        'ai:build': 'exit1'
      });

      const parsed = await runJson('--skip-compat');

      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal('AI_BUILD_FAILED');
      expect(parsed.errors[0].message).to.contain(
        'exited with code 1'
      );
      expect(invoked).to.deep.equal(['ai:model:update', 'ai:build']);
    });

    it('GIVEN every nested command succeeds THEN emit a single success envelope', async () => {
      const invoked = stubNested({
        'ai:compat': 'ok',
        'ai:model:update': 'ok',
        'ai:build': 'ok'
      });

      const {stdout} = await runCommand(
        validArgs('--format', 'json'),
        {
          root: '..'
        }
      );

      const parsed = assertValidEnvelope<{workspacePath: string}>(
        stdout
      );
      expect(parsed.ok).to.be.true;
      expect(invoked).to.deep.equal([
        'ai:compat',
        'ai:model:update',
        'ai:build'
      ]);
    });

    it('passes --cwd pointing to the workspace directory for ai:build', async () => {
      const invoked = stubNested({
        'ai:compat': 'ok',
        'ai:model:update': 'ok',
        'ai:build': 'ok'
      });

      await runCommand(validArgs('--format', 'json'), {
        root: '..'
      });

      const buildCall = invoked.calls.find(
        (c) => c.id === 'ai:build'
      );
      expect(buildCall, 'ai:build must be invoked').to.exist;
      const buildArgs = (buildCall!.args[0] as string[]) ?? [];
      const cwdIndex = buildArgs.indexOf('--cwd');
      expect(
        cwdIndex,
        '--cwd must be present in ai:build args'
      ).to.be.greaterThan(-1);
      expect(buildArgs[cwdIndex + 1]).to.equal(
        path.join(tmpDir, 'ws1')
      );
    });
  });

  describe('--format text nested command failures', () => {
    it('GIVEN ai:compat rejects THEN surface the original error', async () => {
      stubNested({'ai:compat': 'reject'});

      const {error} = await runCommand(validArgs(), {root: '..'});

      expect(error?.message).to.contain('ai:compat rejected');
    });
  });
});
