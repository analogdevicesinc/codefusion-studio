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

import {assert, expect} from 'chai';
import {runCommand} from '@oclif/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AiCommandError, CfsToolManager} from 'cfs-lib';
import AIToolsPlugin from 'cfs-lib/dist/ai-tools/index.js';
import Sinon from 'sinon';
import type {AiCommandResult} from 'cfs-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures');
const MODELS_DIR = path.resolve(FIXTURES_DIR, 'models');

describe('ai:compat', () => {
  let sandbox: Sinon.SinonSandbox;
  let runCompatStub: Sinon.SinonStub;

  const VALID_OUTPUT: AiCommandResult = {
    code: 0,
    validCodes: [0, 10],
    events: [
      {
        type: 'INFO',
        message:
          'Model fully compatible with target hardware platform'
      },
      {
        type: 'INFO',
        message:
          'No compatibility issues detected - ready for deployment'
      }
    ]
  };

  const ERROR_OUTPUT: AiCommandResult = {
    code: 1,
    validCodes: [0, 10],
    events: [
      {
        type: 'WARN',
        message:
          'Model contains multiple subgraphs, only the first will be analyzed'
      },
      {
        type: 'ERROR',
        message: 'ModelParsingErrorFailed to parse model...'
      }
    ]
  };

  beforeEach(() => {
    sandbox = Sinon.createSandbox();

    sandbox
      .stub(CfsToolManager.prototype, 'getToolPath')
      .resolves('/mock/cfsai/path');

    sandbox
      .stub(AIToolsPlugin.prototype, 'readBackendJson')
      .resolves({
        properties: {
          tflm: [{Id: 'key', Type: 'string', Default: 'value'}]
        },
        SupportedBackends: {
          tflm: {
            Name: 'tflm',
            Package: 'cfs-lib',
            Module: 'tflm',
            Targets: []
          }
        }
      } as any);

    runCompatStub = sandbox
      .stub(AIToolsPlugin.prototype, 'runCompat')
      .resolves(VALID_OUTPUT);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Core Inference Logic', () => {
    describe('Single-Core SoC', () => {
      it('should auto-select core when SoC has only one core', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_single_core',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Command should not error about missing --core
        expect(error).to.not.exist;
        expect(stderr).to.not.include('--core is required');
        expect(stderr).to.not.include('Multiple cores');
      });

      it('should respect explicit --core even with single-core SoC', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_single_core',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Command should execute without errors
        expect(stderr.trim(), 'stderr should be empty').to.equal('');
        expect(error).to.not.exist;
      });
    });

    describe('Multi-Core SoC with Single AI Core', () => {
      it('should auto-select AI core and emit warning when multiple cores but single AI', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_multi_single',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Should auto-select and emit warning
        expect(error).to.not.exist;
        expect(stderr).to.include('Multiple cores found');
        expect(stderr).to.include('Defaulting to');
      });

      it('should respect explicit --core and not emit warning', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_multi_single',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        expect(error).to.not.exist;
        expect(stderr).to.not.include('Defaulting to');
      });
    });

    describe('Multi-Core SoC with Multiple AI Cores', () => {
      it('should throw error when --core is omitted and multiple AI cores exist', async () => {
        const {error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_multi_multiple',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        expect(error).to.exist;
        expect(error?.message).to.include(
          'Multiple cores with AI support'
        );
      });

      it('should succeed when explicit --core is provided with multiple AI cores', async () => {
        const {error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_multi_multiple',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        expect(error).to.not.exist;
      });
    });
  });

  describe('Flag Validation and Normalization', () => {
    describe('Required Flags', () => {
      it('should error when --soc is missing', async () => {
        const {error} = await runCommand(
          [
            'ai:compat',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        expect(error).to.exist;
        expect(error?.message).to.include('--soc');
      });

      it('should error when --model is missing', async () => {
        const {error} = await runCommand(
          ['ai:compat', '--soc', 'ai_single_core'],
          {root: '..'}
        );
        expect(error).to.exist;
        expect(error?.message).to.include('--model');
      });
    });

    describe('Unsupported Flags', () => {
      it('should reject --acc flag with not supported error', async () => {
        const {error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_single_core',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--acc',
            'DSP'
          ],
          {root: '..'}
        );
        expect(error).to.exist;
        expect(error?.message).to.include('not currently supported');
      });
    });

    describe('Flag Case Normalization', () => {
      it('should normalize --soc to lowercase', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'AI_SINGLE_CORE',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Should find the model despite uppercase SoC name
        expect(error).to.not.exist;
        expect(stderr).to.not.include('not found');
      });

      it('should normalize --core to uppercase', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_single_core',
            '--core',
            'cm4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Should process successfully with lowercase core
        expect(error).to.not.exist;
        expect(stderr).to.not.include('Invalid core');
      });
    });
  });

  describe('Command Return Logic', () => {
    describe('--format text', () => {
      it('GIVEN valid run WHEN runCompat THEN return parsed AiCommandResult', async () => {
        const {stdout, error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_single_core',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );

        expect(error).to.not.exist;
        VALID_OUTPUT.events.map(({message}) =>
          expect(stdout).to.include(message)
        );
      });

      it('GIVEN invalid run WHEN runCompat THEN return parsed AiCommandError', async () => {
        runCompatStub.rejects(new AiCommandError(ERROR_OUTPUT));

        const {error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_single_core',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );

        expect(error).to.exist;
        ERROR_OUTPUT.events
          .filter((event) => event.type === 'ERROR')
          .map(({message}) =>
            expect(error?.message).to.include(message)
          );
        expect(error?.oclif?.exit).to.equal(1);
      });
    });

    describe('--format json', () => {
      it('GIVEN valid run WHEN runCompat THEN return AiCommandResult', async () => {
        const {stdout, error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_single_core',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--format',
            'json'
          ],
          {root: '..'}
        );

        expect(error).to.not.exist;
        assert.deepEqual(JSON.parse(stdout), VALID_OUTPUT);
      });

      // The compatibility static analysis tool can exit with code 10 (valid) but contains an error log
      it('GIVEN valid run with error log WHEN runCompat THEN return whole AiCommandResult', async () => {
        const VALID_OUTPUT_WITH_ERROR_EVENT: AiCommandResult = {
          ...VALID_OUTPUT,
          code: 10,
          validCodes: [0, 10],
          events: [
            ...VALID_OUTPUT.events,
            {
              type: 'ERROR',
              message: 'Process completed but there is an issue...'
            }
          ]
        };

        runCompatStub.resolves(VALID_OUTPUT_WITH_ERROR_EVENT);

        const {stdout, error} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_single_core',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--format',
            'json'
          ],
          {root: '..'}
        );

        expect(error).to.not.exist;
        assert.deepEqual(
          JSON.parse(stdout),
          VALID_OUTPUT_WITH_ERROR_EVENT
        );
      });

      it('GIVEN invalid run WHEN runCompat THEN return AiCommandError', async () => {
        runCompatStub.rejects(new AiCommandError(ERROR_OUTPUT));

        const {stdout} = await runCommand(
          [
            'ai:compat',
            '--soc',
            'ai_single_core',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--format',
            'json'
          ],
          {root: '..'}
        );

        assert.deepEqual(JSON.parse(stdout), ERROR_OUTPUT);
      });
    });
  });
});
