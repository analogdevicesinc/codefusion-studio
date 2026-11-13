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
import {
  AIToolsPlugin,
  CfsDataModelManager,
  CfsToolManager
} from 'cfs-lib';
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

describe('ai:model:add', () => {
  let sandbox: Sinon.SinonSandbox;
  let tmpDir: string;
  let configPath: string;
  let modelPath: string;

  // Failures in JSON mode set the global `process.exitCode`, which the
  // oclif test harness does not reset between tests.
  beforeEach(async () => {
    process.exitCode = 0;
    sandbox = Sinon.createSandbox();
    sandbox
      .stub(CfsToolManager.prototype, 'getToolPath')
      .resolves('/mock/cfsai/path');

    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'cfs-model-add-')
    );
    configPath = path.join(tmpDir, 'a.cfsconfig');
    await fs.copyFile(fixtureConfig, configPath);

    modelPath = path.join(tmpDir, 'new-model.tflite');
    await fs.writeFile(modelPath, 'not a real model');
  });

  afterEach(async () => {
    process.exitCode = 0;
    sandbox.restore();
    await fs.rm(tmpDir, {recursive: true, force: true});
  });

  function stubSocData(
    backendFormats: string[] = ['tflite'],
    maxModels = 5
  ) {
    sandbox
      .stub(CfsDataModelManager.prototype, 'getDataModel')
      .resolves({} as any);
    sandbox
      .stub(AIToolsPlugin.prototype, 'getAIDataFromSOCModel')
      .returns({Target: {Core: 'CM4'}} as any);
    sandbox
      .stub(AIToolsPlugin.prototype, 'getBackendFromTarget')
      .resolves({
        Name: 'tflm',
        Formats: backendFormats,
        MaxModels: maxModels
      } as any);
  }

  describe('--format text', () => {
    it('GIVEN a valid model THEN log a confirmation and add it to the config', async () => {
      stubSocData();

      const {stdout, error} = await runCommand(
        [
          'ai:model:add',
          '--config',
          configPath,
          '--core',
          'CM4',
          '--model',
          modelPath
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      expect(stdout).to.contain(
        "Model 'new-model' added successfully."
      );
      expect(await readModelNames(configPath)).to.include(
        'new-model'
      );
    });

    it('GIVEN an invalid --extension THEN keep the backend suggestion in the error', async () => {
      stubSocData();
      sandbox
        .stub(AIToolsPlugin.prototype, 'getPropertiesFromName')
        .resolves([{Id: 'opt', Type: 'boolean'}] as any);

      const {error} = await runCommand(
        [
          'ai:model:add',
          '--config',
          configPath,
          '--core',
          'CM4',
          '--model',
          modelPath,
          '--extension',
          'bogus=1'
        ],
        {root: '..'}
      );

      expect(error?.message).to.contain('Invalid extension "bogus"');
      expect(error?.message).to.contain(
        'Verify the backend is properly configured'
      );
    });
  });

  describe('--format json', () => {
    it('GIVEN a valid model THEN return the added model as data and add it to the config', async () => {
      stubSocData();

      const {stdout, error} = await runCommand(
        [
          'ai:model:add',
          '--config',
          configPath,
          '--core',
          'CM4',
          '--model',
          modelPath,
          '--format',
          'json'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<{
        model: {
          Name: string;
          Enabled: boolean;
          Files: {Model: string};
          Backend: {Name: string};
        };
      }>(stdout, 'ai model add');
      expect(data.model).to.deep.include({
        Name: 'new-model',
        Enabled: true
      });
      expect(data.model.Files.Model).to.equal(modelPath);
      expect(data.model.Backend.Name).to.equal('tflm');
      expect(await readModelNames(configPath)).to.include(
        'new-model'
      );
    });

    it('GIVEN the backend model limit is exceeded THEN report the disabled model as a warning', async () => {
      stubSocData(['tflite'], 1);
      const config = JSON.parse(
        await fs.readFile(configPath, 'utf8')
      ) as {Projects: {AIModels: {Backend: unknown}[]}[]};
      config.Projects[0].AIModels[0].Backend = {Name: 'tflm'};
      await fs.writeFile(configPath, JSON.stringify(config));

      const {stdout, error} = await runCommand(
        [
          'ai:model:add',
          '--config',
          configPath,
          '--core',
          'CM4',
          '--model',
          modelPath,
          '--format',
          'json'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const parsed = assertValidEnvelope(stdout) as {
        warnings: {message: string}[];
      };
      expect(parsed.warnings.map((w) => w.message)).to.deep.equal([
        'Maximum number of models exceeded. The following model has been disabled: test-model'
      ]);
    });

    it('GIVEN --network-config on a non-izer backend THEN report the ignored flag as a warning', async () => {
      stubSocData();
      const networkConfig = path.join(tmpDir, 'network.yaml');
      await fs.writeFile(networkConfig, 'layers: []');

      const {stdout, error} = await runCommand(
        [
          'ai:model:add',
          '--config',
          configPath,
          '--core',
          'CM4',
          '--model',
          modelPath,
          '--network-config',
          networkConfig,
          '--format',
          'json'
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const parsed = assertValidEnvelope(stdout) as {
        ok: boolean;
        warnings: {message: string}[];
      };
      expect(parsed.ok).to.be.true;
      expect(parsed.warnings.map((w) => w.message)).to.include(
        'ignoring --network-config for non-izer backend.'
      );
    });

    it('GIVEN different missing model files THEN return the same stable error code', async () => {
      const codes: string[] = [];

      for (const name of ['one.tflite', 'two.tflite']) {
        // eslint-disable-next-line no-await-in-loop
        const {stdout} = await runCommand(
          [
            'ai:model:add',
            '--config',
            configPath,
            '--core',
            'CM4',
            '--model',
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
        expect(parsed.command).to.equal('ai model add');
        codes.push(parsed.errors[0].code);
      }

      expect(codes).to.deep.equal([
        'SOURCE_RESOLVE_FAILED',
        'SOURCE_RESOLVE_FAILED'
      ]);
    });

    it('GIVEN no data model for the SoC THEN return DATA_MODEL_NOT_FOUND', async () => {
      sandbox
        .stub(CfsDataModelManager.prototype, 'getDataModel')
        .resolves(undefined);

      const {stdout} = await runCommand(
        [
          'ai:model:add',
          '--config',
          configPath,
          '--core',
          'CM4',
          '--model',
          modelPath,
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as CliErrorEnvelope;
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal('DATA_MODEL_NOT_FOUND');
    });

    it('GIVEN a model format the backend does not support THEN return INVALID_MODEL_FILE_EXTENSION', async () => {
      stubSocData(['onnx']);

      const {stdout} = await runCommand(
        [
          'ai:model:add',
          '--config',
          configPath,
          '--core',
          'CM4',
          '--model',
          modelPath,
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as CliErrorEnvelope;
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal(
        'INVALID_MODEL_FILE_EXTENSION'
      );
      expect(await readModelNames(configPath)).to.not.include(
        'new-model'
      );
    });

    it('GIVEN backend properties cannot be loaded THEN return BACKEND_PROPERTIES_NOT_FOUND', async () => {
      stubSocData();
      sandbox
        .stub(AIToolsPlugin.prototype, 'getPropertiesFromName')
        .rejects(new Error('boom'));

      const {stdout} = await runCommand(
        [
          'ai:model:add',
          '--config',
          configPath,
          '--core',
          'CM4',
          '--model',
          modelPath,
          '--extension',
          'opt=true',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as CliErrorEnvelope;
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal(
        'BACKEND_PROPERTIES_NOT_FOUND'
      );
    });

    it('GIVEN an invalid --extension THEN return INVALID_BACKEND_EXTENSIONS', async () => {
      stubSocData();
      sandbox
        .stub(AIToolsPlugin.prototype, 'getPropertiesFromName')
        .resolves([{Id: 'opt', Type: 'boolean'}] as any);

      const {stdout} = await runCommand(
        [
          'ai:model:add',
          '--config',
          configPath,
          '--core',
          'CM4',
          '--model',
          modelPath,
          '--extension',
          'bogus=1',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as CliErrorEnvelope;
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal(
        'INVALID_BACKEND_EXTENSIONS'
      );
      expect(await readModelNames(configPath)).to.not.include(
        'new-model'
      );
    });

    it('GIVEN a core without a project THEN return PROJECT_NOT_FOUND_FOR_CORE', async () => {
      stubSocData();

      const {stdout} = await runCommand(
        [
          'ai:model:add',
          '--config',
          configPath,
          '--core',
          'CM7',
          '--model',
          modelPath,
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as CliErrorEnvelope;
      expect(parsed.ok).to.be.false;
      expect(parsed.errors[0].code).to.equal(
        'PROJECT_NOT_FOUND_FOR_CORE'
      );
    });
  });
});
