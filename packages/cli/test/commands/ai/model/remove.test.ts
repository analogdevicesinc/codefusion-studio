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

async function readModelNames(configPath: string): Promise<string[]> {
  const config = JSON.parse(
    await fs.readFile(configPath, 'utf8')
  ) as {
    Projects: {AIModels?: {Name: string}[]}[];
  };

  return config.Projects.flatMap((project) =>
    (project.AIModels ?? []).map((model) => model.Name)
  );
}

describe('ai:model:remove', () => {
  let tmpDir: string;
  let configPath: string;
  let workspacePath: string;
  let workspaceConfigPath: string;

  // Failures in JSON mode set the global `process.exitCode`, which the
  // oclif test harness does not reset between tests.
  beforeEach(async () => {
    process.exitCode = 0;
    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'cfs-model-remove-')
    );
    configPath = path.join(tmpDir, 'a.cfsconfig');
    await fs.copyFile(fixtureConfig, configPath);

    workspacePath = path.join(tmpDir, 'ws');
    workspaceConfigPath = path.join(
      workspacePath,
      '.cfs',
      'ai_single_core-wlp.cfsconfig'
    );
    await fs.mkdir(path.join(workspacePath, '.cfs'), {
      recursive: true
    });
    await fs.copyFile(fixtureConfig, workspaceConfigPath);
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
    it('GIVEN an existing model THEN log a confirmation and remove it', async () => {
      const {stdout, error} = await runCommand(
        [
          'ai:model:remove',
          '--config',
          configPath,
          '--name',
          'test-model'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      expect(stdout).to.contain(
        "Model 'test-model' removed successfully."
      );
      expect(await readModelNames(configPath)).to.deep.equal([]);
    });
  });

  describe('--format json', () => {
    it('GIVEN --config WHEN the model exists THEN return {removed, name} and remove it', async () => {
      const {stdout, error} = await runCommand(
        [
          'ai:model:remove',
          '--config',
          configPath,
          '--name',
          'test-model',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<{
        removed: boolean;
        name: string;
      }>(stdout, 'ai model remove');
      expect(data).to.deep.equal({removed: true, name: 'test-model'});
      expect(await readModelNames(configPath)).to.deep.equal([]);
    });

    it('GIVEN --workspace WHEN the model exists THEN return {removed, name} and remove it', async () => {
      const {stdout, error} = await runCommand(
        [
          'ai:model:remove',
          '--workspace',
          workspacePath,
          '--name',
          'test-model',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<{
        removed: boolean;
        name: string;
      }>(stdout, 'ai model remove');
      expect(data).to.deep.equal({removed: true, name: 'test-model'});
      expect(await readModelNames(workspaceConfigPath)).to.deep.equal(
        []
      );
    });

    it('GIVEN different unknown model names THEN return the same stable error code and leave the config untouched', async () => {
      const codes: string[] = [];

      for (const name of ['nope', 'other']) {
        // eslint-disable-next-line no-await-in-loop
        const {stdout} = await runCommand(
          [
            'ai:model:remove',
            '--config',
            configPath,
            '--name',
            name,
            '--format',
            'json'
          ],
          {root: '..'}
        );

        const parsed = assertValidEnvelope(
          stdout
        ) as CliErrorEnvelope;
        expect(parsed.ok).to.be.false;
        expect(parsed.command).to.equal('ai model remove');
        codes.push(parsed.errors[0].code);
      }

      expect(codes).to.deep.equal([
        'MODEL_NOT_FOUND',
        'MODEL_NOT_FOUND'
      ]);
      expect(await readModelNames(configPath)).to.deep.equal([
        'test-model'
      ]);
    });

    it('GIVEN a missing config file THEN return an error envelope with a stable code', async () => {
      const {stdout} = await runCommand(
        [
          'ai:model:remove',
          '--config',
          path.join(tmpDir, 'missing.cfsconfig'),
          '--name',
          'test-model',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as CliErrorEnvelope;
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal('CONFIG_READ_FAILED');
    });
  });
});
