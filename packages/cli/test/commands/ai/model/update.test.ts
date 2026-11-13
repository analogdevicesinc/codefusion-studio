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
import {AIToolsPlugin, CfsToolManager} from 'cfs-lib';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Sinon from 'sinon';

import {
  assertSuccessEnvelopeData,
  assertValidEnvelope,
  type CliErrorEnvelope
} from '../../../utils/assert-json-envelope.js';

const fixtureConfig = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/configs/sample-config.cfsconfig'
);

async function readModels(
  configPath: string
): Promise<{Name: string; Enabled: boolean}[]> {
  const config = JSON.parse(
    await fs.readFile(configPath, 'utf8')
  ) as {
    Projects: {AIModels?: {Name: string; Enabled: boolean}[]}[];
  };

  return config.Projects.flatMap((project) => project.AIModels ?? []);
}

describe('ai:model:update', () => {
  let sandbox: Sinon.SinonSandbox;
  let tmpDir: string;
  let configPath: string;
  let workspacePath: string;
  let workspaceConfigPath: string;

  // Failures in JSON mode set the global `process.exitCode`, which the
  // oclif test harness does not reset between tests.
  beforeEach(async () => {
    process.exitCode = 0;
    sandbox = Sinon.createSandbox();
    sandbox
      .stub(CfsToolManager.prototype, 'getToolPath')
      .resolves('/mock/cfsai/path');
    // The fixture model has no backend, so there is nothing to look up.
    sandbox
      .stub(AIToolsPlugin.prototype, 'getBackendFromName')
      .resolves(undefined);

    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'cfs-model-update-')
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
    sandbox.restore();
    await fs.rm(tmpDir, {recursive: true, force: true});
  });

  describe('--format text', () => {
    it('GIVEN --set enabled=false THEN log a confirmation and update the model', async () => {
      const {stdout, error} = await runCommand(
        [
          'ai:model:update',
          '--config',
          configPath,
          '--name',
          'test-model',
          '--set',
          'enabled=false'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      expect(stdout).to.contain(
        "Model 'test-model' updated successfully."
      );
      expect((await readModels(configPath))[0].Enabled).to.be.false;
    });
  });

  describe('--format json', () => {
    it('GIVEN --config WHEN --set enabled=false THEN return {updated, name} and update the model', async () => {
      const {stdout, error} = await runCommand(
        [
          'ai:model:update',
          '--config',
          configPath,
          '--name',
          'test-model',
          '--set',
          'enabled=false',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<{
        updated: boolean;
        name: string;
      }>(stdout, 'ai model update');
      expect(data).to.deep.equal({updated: true, name: 'test-model'});
      expect((await readModels(configPath))[0].Enabled).to.be.false;
    });

    it('GIVEN --workspace WHEN --set name=<new> THEN return the new name', async () => {
      const {stdout, error} = await runCommand(
        [
          'ai:model:update',
          '--workspace',
          workspacePath,
          '--name',
          'test-model',
          '--set',
          'name=renamed',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<{
        updated: boolean;
        name: string;
      }>(stdout, 'ai model update');
      expect(data).to.deep.equal({updated: true, name: 'renamed'});
      expect(
        (await readModels(workspaceConfigPath))[0].Name
      ).to.equal('renamed');
    });

    it('GIVEN different unknown model names THEN return the same stable error code', async () => {
      const codes: string[] = [];

      for (const name of ['nope', 'other']) {
        // eslint-disable-next-line no-await-in-loop
        const {stdout} = await runCommand(
          [
            'ai:model:update',
            '--config',
            configPath,
            '--name',
            name,
            '--set',
            'enabled=false',
            '--format',
            'json'
          ],
          {root: '..'}
        );

        const parsed = assertValidEnvelope(
          stdout
        ) as CliErrorEnvelope;
        expect(parsed.ok).to.be.false;
        expect(parsed.command).to.equal('ai model update');
        codes.push(parsed.errors[0].code);
      }

      expect(codes).to.deep.equal([
        'MODEL_NOT_FOUND',
        'MODEL_NOT_FOUND'
      ]);
    });

    it('GIVEN a --set item without a value THEN return INVALID_UPDATE_FORMAT', async () => {
      const {stdout} = await runCommand(
        [
          'ai:model:update',
          '--config',
          configPath,
          '--name',
          'test-model',
          '--set',
          'foo',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as CliErrorEnvelope;
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal('INVALID_UPDATE_FORMAT');
    });

    it('GIVEN a non-boolean enabled value THEN return INVALID_UPDATE_VALUE and leave the config untouched', async () => {
      const {stdout} = await runCommand(
        [
          'ai:model:update',
          '--config',
          configPath,
          '--name',
          'test-model',
          '--set',
          'enabled=maybe',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as CliErrorEnvelope;
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal('INVALID_UPDATE_VALUE');
      expect((await readModels(configPath))[0].Enabled).to.be.true;
    });

    it('GIVEN a missing config file THEN return an error envelope with a stable code', async () => {
      const {stdout} = await runCommand(
        [
          'ai:model:update',
          '--config',
          path.join(tmpDir, 'missing.cfsconfig'),
          '--name',
          'test-model',
          '--set',
          'enabled=false',
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
