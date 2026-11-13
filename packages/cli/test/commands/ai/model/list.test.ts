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

import {runCommand} from '@oclif/test';
import {expect} from 'chai';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  assertSuccessEnvelopeData,
  assertValidEnvelope,
  type CliErrorEnvelope
} from '../../../utils/assert-json-envelope.js';

const fixtureConfig = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/configs/sample-config.cfsconfig'
);

describe('ai:model:list', () => {
  let tmpDir: string;
  let configPath: string;
  let workspacePath: string;

  // Failures in JSON mode set the global `process.exitCode`, which the
  // oclif test harness does not reset between tests.
  beforeEach(async () => {
    process.exitCode = 0;
    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'cfs-model-list-')
    );
    configPath = path.join(tmpDir, 'a.cfsconfig');
    await fs.copyFile(fixtureConfig, configPath);

    workspacePath = path.join(tmpDir, 'ws');
    await fs.mkdir(path.join(workspacePath, '.cfs'), {
      recursive: true
    });
    await fs.copyFile(
      fixtureConfig,
      path.join(workspacePath, '.cfs', 'ai_single_core-wlp.cfsconfig')
    );
    await fs.writeFile(
      path.join(workspacePath, '.cfs', '.cfsworkspace'),
      JSON.stringify({Soc: 'ai_single_core', Package: 'wlp'})
    );
  });

  afterEach(async () => {
    process.exitCode = 0;
    await fs.rm(tmpDir, {recursive: true, force: true});
  });

  describe('--format text', () => {
    it('GIVEN --config THEN print the models grouped by core', async () => {
      const {stdout, error} = await runCommand(
        ['ai:model:list', '--config', configPath],
        {root: '..'}
      );

      expect(error).to.not.exist;
      expect(stdout).to.contain('CM4:');
      expect(stdout).to.contain('test-model');
    });
  });

  describe('--format json', () => {
    it('GIVEN --config THEN return the models wrapped in an object', async () => {
      const {stdout, error} = await runCommand(
        ['ai:model:list', '--config', configPath, '--format', 'json'],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<{
        models: {Name: string}[];
      }>(stdout, 'ai model list');
      expect(data.models).to.have.length(1);
      expect(data.models[0]).to.deep.include({Name: 'test-model'});
    });

    it('GIVEN --workspace WHEN --core matches THEN return the models of that core', async () => {
      const {stdout, error} = await runCommand(
        [
          'ai:model:list',
          '--workspace',
          workspacePath,
          '--core',
          'CM4',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<{models: unknown[]}>(
        stdout,
        'ai model list'
      );
      expect(data.models).to.have.length(1);
    });

    it('GIVEN --core WHEN it matches no project THEN return an empty models array', async () => {
      const {stdout, error} = await runCommand(
        [
          'ai:model:list',
          '--config',
          configPath,
          '--core',
          'CM7',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<{models: unknown[]}>(
        stdout,
        'ai model list'
      );
      expect(data.models).to.deep.equal([]);
    });

    it('GIVEN neither --config nor --workspace THEN return an error envelope', async () => {
      const {stdout} = await runCommand(
        ['ai:model:list', '--format', 'json'],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as CliErrorEnvelope;
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal(
        'CONFIG_OR_WORKSPACE_MUST_BE_PROVIDED'
      );
    });

    it('GIVEN different missing config paths THEN return the same stable error code', async () => {
      const codes: string[] = [];

      for (const name of ['one.cfsconfig', 'two.cfsconfig']) {
        // eslint-disable-next-line no-await-in-loop
        const {stdout} = await runCommand(
          [
            'ai:model:list',
            '--config',
            path.join(tmpDir, name),
            '--format',
            'json'
          ],
          {root: '..'}
        );

        const parsed = assertValidEnvelope(
          stdout
        ) as CliErrorEnvelope;
        expect(parsed.ok).to.be.false;
        codes.push(parsed.errors[0].code);
      }

      expect(codes).to.deep.equal([
        'CONFIG_READ_FAILED',
        'CONFIG_READ_FAILED'
      ]);
    });
  });
});
