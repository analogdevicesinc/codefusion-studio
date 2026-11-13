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

import {expect} from 'chai';
import {runCommand} from '@oclif/test';
import {AIToolsPlugin, CfsToolManager} from 'cfs-lib';
import Sinon from 'sinon';

import {
  assertSuccessEnvelopeData,
  assertValidEnvelope
} from '../../utils/assert-json-envelope.js';

describe('ai:backends', () => {
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();

    sandbox
      .stub(CfsToolManager.prototype, 'getToolPath')
      .resolves('/mock/cfsai/path');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('--format json', () => {
    it('GIVEN list action WHEN readBackendJson resolves THEN return envelope with the backends wrapped in an object', async () => {
      sandbox
        .stub(AIToolsPlugin.prototype, 'readBackendJson')
        .resolves({
          properties: {
            tflm: [{Id: 'key', Type: 'string', Default: 'value'}]
          },
          SupportedBackends: {
            tflm: {
              Name: 'tflm',
              Description: 'TensorFlow Lite Micro',
              Package: 'cfs-lib',
              Module: 'tflm',
              Formats: ['tflite'],
              AdvancedTools: false,
              Targets: []
            }
          }
        } as any);

      sandbox
        .stub(AIToolsPlugin.prototype, 'getPropertiesFromName')
        .resolves([
          {Id: 'key', Type: 'string', Default: 'value'}
        ] as any);

      const {stdout, error} = await runCommand(
        ['ai:backends', 'list', '--format', 'json'],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<{backends: unknown[]}>(
        stdout,
        'ai backends'
      );
      expect(data.backends).to.be.an('array');
      expect(data.backends[0]).to.deep.include({
        Name: 'tflm',
        Extensions: [{Id: 'key', Type: 'string', Default: 'value'}]
      });
    });

    it('GIVEN --name WHEN getBackendFromName resolves THEN return envelope with backend as data', async () => {
      sandbox
        .stub(AIToolsPlugin.prototype, 'getBackendFromName')
        .resolves({
          Name: 'tflm',
          Description: 'TensorFlow Lite Micro',
          Package: 'cfs-lib',
          Module: 'tflm',
          Formats: ['tflite'],
          AdvancedTools: false,
          Targets: []
        } as any);

      sandbox
        .stub(AIToolsPlugin.prototype, 'getPropertiesFromName')
        .resolves([
          {Id: 'key', Type: 'string', Default: 'value'}
        ] as any);

      const {stdout, error} = await runCommand(
        ['ai:backends', 'list', '--name', 'tflm', '--format', 'json'],
        {root: '..'}
      );

      expect(error).to.not.exist;
      const data = assertSuccessEnvelopeData<Record<string, unknown>>(
        stdout,
        'ai backends'
      );
      expect(data).to.deep.include({
        Name: 'tflm',
        Extensions: [{Id: 'key', Type: 'string', Default: 'value'}]
      });
    });

    it('GIVEN --name WHEN getBackendFromName resolves undefined THEN return error envelope', async () => {
      sandbox
        .stub(AIToolsPlugin.prototype, 'getBackendFromName')
        .resolves(undefined);

      const {stdout} = await runCommand(
        [
          'ai:backends',
          'list',
          '--name',
          'unknown',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout) as {
        ok: boolean;
        command: string;
        errors: {code: string; message: string}[];
      };
      expect(parsed.ok).to.be.false;
      expect(parsed.command).to.equal('ai backends');
      expect(parsed.errors[0]?.code).to.equal('BACKEND_NOT_FOUND');
      expect(parsed.errors[0]?.message).to.contain(
        "No backend found with name 'unknown'"
      );
    });
  });
});
