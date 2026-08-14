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
import {
  type AuthConfig,
  CfsApiClient,
  CfsToolManager,
  AiCommandError,
  MAX_MODEL_NAME_LENGTH
} from 'cfs-lib';
import AIToolsPlugin from 'cfs-lib/dist/ai-tools/index.js';
import Sinon from 'sinon';
import {AiCommandResult} from 'cfs-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures');
const MODELS_DIR = path.resolve(FIXTURES_DIR, 'models');
const CONFIGS_DIR = path.resolve(FIXTURES_DIR, 'configs');

describe('ai:build', () => {
  let sandbox: Sinon.SinonSandbox;
  let authEnvBackup: Record<string, string | undefined>;
  let capturedApiClient: CfsApiClient | AuthConfig | undefined;
  let generateFromConfigStub: Sinon.SinonStub;

  const VALID_OUTPUT: AiCommandResult = {
    code: 0,
    validCodes: [0],
    events: [
      {
        type: 'INFO',
        message: 'No arena size provided. Estimated to be 2888 bytes'
      },
      {
        type: 'FILE',
        message: 'Created file: test-model.cpp',
        value: 'output/test-model.cpp'
      },
      {
        type: 'FILE',
        message: 'Created file: hello_world_f32.hpp',
        value: 'output/hello_world_f32.hpp'
      },
      {
        type: 'FILE',
        message: 'Created file: adi_tflm.hpp',
        value: 'output/adi_tflm.hpp'
      }
    ],
    artifacts: {
      files: [
        'output/test-model.cpp',
        'output/test-model.hpp',
        'output/adi_tflm.hpp'
      ]
    }
  };

  const ERROR_OUTPUT: AiCommandResult = {
    code: 1,
    validCodes: [0],
    events: [
      {
        type: 'ERROR',
        message:
          'models/test-model.tflite is corrupt: reported 268435456 operator codes but file is only 3164 bytes.'
      }
    ],
    artifacts: {
      files: []
    }
  };

  beforeEach(() => {
    sandbox = Sinon.createSandbox();

    authEnvBackup = {
      CFS_AUTH_CALLBACK: process.env.CFS_AUTH_CALLBACK,
      CFS_AUTH_URL: process.env.CFS_AUTH_URL,
      CFS_API_URL: process.env.CFS_API_URL,
      CFS_AUTH_CLIENT_ID: process.env.CFS_AUTH_CLIENT_ID,
      CFS_SESSION_FILE: process.env.CFS_SESSION_FILE
    };

    process.env.CFS_AUTH_CALLBACK = 'http://localhost:3000/callback';
    process.env.CFS_AUTH_URL = 'https://example.com/auth';
    process.env.CFS_API_URL = 'https://example.com/api';
    process.env.CFS_AUTH_CLIENT_ID = 'test-client-id';
    process.env.CFS_SESSION_FILE = path.join(FIXTURES_DIR, 'session');

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

    sandbox
      .stub(AIToolsPlugin.prototype, 'getBackendFromTarget')
      .resolves({
        Name: 'tflm',
        Package: 'cfs-lib',
        Module: 'tflm',
        Targets: []
      } as any);

    sandbox
      .stub(AIToolsPlugin.prototype, 'getPropertiesFromName')
      .resolves([
        {Id: 'key', Type: 'string', Default: 'value'}
      ] as any);

    generateFromConfigStub = sandbox
      .stub(AIToolsPlugin.prototype, 'generateFromConfig')
      .callsFake(async (_config, _dataModel, _cwd, apiClient) => {
        capturedApiClient = apiClient;

        return VALID_OUTPUT;
      });
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(authEnvBackup)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    sandbox.restore();
  });

  describe('Core Inference Logic', () => {
    describe('Single-Core SoC', () => {
      it('should auto-select core when SoC has only one core', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:build',
            '--soc',
            'ai_single_core',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR
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
            'ai:build',
            '--soc',
            'ai_single_core',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR
          ],
          {root: '..'}
        );
        // Command should execute without errors
        expect(error).to.not.exist;
        expect(stderr).to.not.include('--core is required');
      });
    });

    describe('Multi-Core SoC with Single AI Core', () => {
      it('should auto-select AI core and emit warning when multiple cores but single AI', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:build',
            '--soc',
            'ai_multi_single',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR
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
            'ai:build',
            '--soc',
            'ai_multi_single',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR
          ],
          {root: '..'}
        );
        // Should not emit the defaulting warning when --core is explicitly provided
        expect(error).to.not.exist;
        expect(stderr).to.not.include('Defaulting to');
      });
    });

    describe('Multi-Core SoC with Multiple AI Cores', () => {
      it('should throw error when --core is omitted and multiple AI cores exist', async () => {
        const {error} = await runCommand(
          [
            'ai:build',
            '--soc',
            'ai_multi_multiple',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR
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
            'ai:build',
            '--soc',
            'ai_multi_multiple',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR
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
            'ai:build',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        expect(error).to.exist;
      });

      it('should error when --model is missing', async () => {
        const {error} = await runCommand(
          ['ai:build', '--soc', 'ai_single_core'],
          {root: '..'}
        );
        expect(error).to.exist;
      });
    });

    describe('Accelerator Flag', () => {
      it('should accept --acc flag', async () => {
        const {error} = await runCommand(
          [
            'ai:build',
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
        expect(error).to.not.exist;
      });
    });

    describe('Flag Case Normalization', () => {
      it('should normalize --soc to lowercase', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:build',
            '--soc',
            'AI_SINGLE_CORE',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR
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
            'ai:build',
            '--soc',
            'ai_single_core',
            '--core',
            'cm4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR
          ],
          {root: '..'}
        );
        // Should process successfully with lowercase core
        expect(error).to.not.exist;
        expect(stderr).to.not.include('Invalid core');
      });
    });
  });

  describe('Build Command Specific Tests', () => {
    it('should pass a CfsApiClient to generateFromConfig', async () => {
      const {error} = await runCommand(
        [
          'ai:build',
          '--soc',
          'ai_single_core',
          '--model',
          path.join(MODELS_DIR, 'test-model.tflite'),
          '--cwd',
          FIXTURES_DIR
        ],
        {root: '..'}
      );

      expect(error).to.not.exist;
      expect(capturedApiClient).to.be.instanceOf(CfsApiClient);
    });

    describe('Config File Mode', () => {
      it('with --config should load configuration from file', async () => {
        const {error} = await runCommand(
          [
            'ai:build',
            '--config',
            path.join(CONFIGS_DIR, 'sample-config.cfsconfig')
          ],
          {root: '..'}
        );
        expect(error).to.not.exist;
      });

      it('should error when --config file does not exist', async () => {
        const {error} = await runCommand(
          [
            'ai:build',
            '--config',
            'nonexistent/path/to/config.cfsconfig'
          ],
          {root: '..'}
        );
        expect(error).to.exist;
        expect(error?.message).to.include('FILE NOT FOUND');
      });

      it('should warn when --soc/--core/--model provided with --config', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:build',
            '--config',
            path.join(CONFIGS_DIR, 'sample-config.cfsconfig'),
            '--soc',
            'ai_single_core',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Should warn about these flags being ignored
        expect(error).to.not.exist;
        expect(stderr).to.include('ignored');
      });
    });

    describe('Backend and Extension Flags', () => {
      it('should allow --extension without --backend when backend can be inferred', async () => {
        const {error} = await runCommand(
          [
            'ai:build',
            '--soc',
            'ai_single_core',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--extension',
            'key=value'
          ],
          {root: '..'}
        );
        expect(error).to.not.exist;
      });
    });
  });

  describe('Command Return Logic', () => {
    describe('--format text', () => {
      it('GIVEN valid run WHEN generateFromConfig THEN return parsed AiCommandResult', async () => {
        const {stdout, error} = await runCommand(
          [
            'ai:build',
            '--soc',
            'ai_single_core',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR
          ],
          {root: '..'}
        );

        expect(error).to.not.exist;
        VALID_OUTPUT.events.map(({message}) =>
          expect(stdout).to.include(message)
        );
      });

      it('GIVEN invalid run WHEN generateFromConfig THEN return parsed AiCommandError', async () => {
        generateFromConfigStub.rejects(
          new AiCommandError(ERROR_OUTPUT)
        );

        const {error} = await runCommand(
          [
            'ai:build',
            '--soc',
            'ai_single_core',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR
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
      it('GIVEN valid run WHEN generateFromConfig THEN return AiCommandResult', async () => {
        const {stdout, error} = await runCommand(
          [
            'ai:build',
            '--soc',
            'ai_single_core',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR,
            '--format',
            'json'
          ],
          {root: '..'}
        );

        expect(error).to.not.exist;
        assert.deepEqual(JSON.parse(stdout), VALID_OUTPUT);
      });

      it('GIVEN invalid run WHEN generateFromConfig THEN return AiCommandError', async () => {
        generateFromConfigStub.rejects(
          new AiCommandError(ERROR_OUTPUT)
        );

        const {stdout} = await runCommand(
          [
            'ai:build',
            '--soc',
            'ai_single_core',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--cwd',
            FIXTURES_DIR,
            '--format',
            'json'
          ],
          {root: '..'}
        );

        assert.deepEqual(JSON.parse(stdout), ERROR_OUTPUT);
      });
    });
  });

  describe('Model Name Length Validation', () => {
    it('should error when model filename exceeds max length', async () => {
      const longName = 'a'.repeat(MAX_MODEL_NAME_LENGTH + 1);
      const {error} = await runCommand(
        [
          'ai:build',
          '--soc',
          'ai_single_core',
          '--model',
          path.join(MODELS_DIR, `${longName}.tflite`),
          '--cwd',
          FIXTURES_DIR
        ],
        {root: '..'}
      );
      expect(error).to.exist;
      expect(error?.message).to.include(
        `Derived model name exceeds ${MAX_MODEL_NAME_LENGTH} characters`
      );
    });
  });
});
