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
import {generateAIArtifacts} from 'cfs-lib';
import type {CfsConfig, CfsWorkspace} from 'cfs-types';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import Sinon from 'sinon';
import {
  CFS_PROJECT_PLUGINS_PATH,
  CFS_WORKSPACE_TEMPLATES_PATH,
  CFS_DATA_MODELS_PATH
} from '../../constants.js';
import {
  assertSuccessEnvelopeData,
  assertValidEnvelope,
  type CliErrorEnvelope
} from '../../utils/assert-json-envelope.js';

/**
 * Test suite for workspace:create command. Check:
 * - Creating a workspace from an existing .cfsworkspace file (-w).
 * - Creating a workspace from command line arguments (-o, --name, etc.).
 * - That specifying -w and (-o, --name, --soc, --board, or --template-id) causes an error.
 * - There's an error when -o is specified and (--board, --name or --template-id) is missing.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginsPath = path.resolve(
  __dirname,
  '..',
  CFS_PROJECT_PLUGINS_PATH
);
const workspaceTemplatesPath = path.resolve(
  __dirname,
  '..',
  CFS_WORKSPACE_TEMPLATES_PATH
);
const dataModelsPath = CFS_DATA_MODELS_PATH;
const workspaceFilenamePath = path.resolve(
  __dirname,
  'sample.cfsworkspace'
);
const workspaceName = 'myWorkspace';
const fullWorkspacePath = path.resolve(__dirname, workspaceName);

describe('workspace:create', () => {
  describe('create workspace from existing file', () => {
    let cfsworkspace: CfsWorkspace;

    before(async () => {
      try {
        cfsworkspace = JSON.parse(
          fs.readFileSync(workspaceFilenamePath, 'utf8')
        );
      } catch (error) {
        console.log('Error inside test before', error);
        throw error;
      }
    });

    after(async () => {
      try {
        fs.rmSync(
          path.resolve(
            __dirname,
            path.basename(cfsworkspace.location)
          ),
          {
            recursive: true,
            force: true
          }
        );
      } catch (error) {
        console.log('Error inside test after', error);
        throw error;
      }
    });

    it('should create a workspace.', async () => {
      const {stderr} = await runCommand(
        [
          'workspace:create',
          '--workspace-file-path',
          workspaceFilenamePath,
          '--search-path',
          pluginsPath,
          '--search-path',
          workspaceTemplatesPath,
          '--search-path',
          dataModelsPath
        ],
        {
          root: '..'
        }
      );
      expect(stderr, 'stderr should be empty').to.be.empty;
      expect(fs.statSync(cfsworkspace.location).isDirectory()).to.be
        .true;
    });
  });

  describe('create workspace from command line args', () => {
    after(async () => {
      try {
        fs.rmSync(path.resolve(__dirname, fullWorkspacePath), {
          recursive: true,
          force: true
        });
      } catch (error) {
        console.log('Error inside test after', error);
        throw error;
      }
    });

    it('should create a workspace from parameters', async () => {
      const {stderr} = await runCommand(
        [
          'workspace:create',
          '-o=' + __dirname,
          '--name=' + workspaceName,
          '--board=TESTSC835-EV-SOM',
          '--soc=TEST-SC835',
          '--search-path',
          pluginsPath,
          '--search-path',
          workspaceTemplatesPath,
          '--search-path',
          dataModelsPath,
          '--template-id=com.analog.sharcfx.mock.example'
        ],
        {
          root: '..'
        }
      );
      expect(stderr, 'stderr should be empty').to.be.empty;
      expect(fs.statSync(fullWorkspacePath).isDirectory()).to.be.true;
    });
  });

  describe('error handling - incompatible flag combinations', () => {
    // Define a selection of invalid flag combinations and expected error messages
    const invalidCombinations = [
      {
        // Specify  --soc with --workspace-file-path
        flags: [
          '--soc=TEST-SC835',
          '--workspace-file-path',
          workspaceFilenamePath
        ],
        errorMessages: [
          'should not be used when generating a workspace using workspace file'
        ],
        description:
          'shows error when both -w and --soc are specified'
      },
      {
        // Missing --board
        flags: [
          '-o=' + __dirname,
          '--name=' + workspaceName,
          '--soc=TEST-SC835',
          '--template-id=com.analog.sharcfx.mock.example'
        ],
        errorMessages: [
          '--board is required when creating a new workspace'
        ],
        description: 'shows error when --board is missing'
      },
      {
        // Missing --name
        flags: [
          '-o=' + __dirname,
          '--board=TESTSC835-EV-SOM',
          '--soc=TEST-SC835',
          '--template-id=com.analog.sharcfx.mock.example'
        ],
        errorMessages: [
          '--name is required when creating a new workspace'
        ],
        description: 'shows error when --name is missing'
      },
      {
        // Invalid board name
        flags: [
          '-o=' + __dirname,
          '--name=' + workspaceName,
          '--soc=TEST-SC835',
          '--template-id=com.analog.sharcfx.mock.example',
          '--board=madeupboard'
        ],
        errorMessages: ["Board 'madeupboard' not found for"],
        description: 'shows error when invalid board is specified'
      },
      {
        // Multiple missing items: --name, --soc and --template-id
        flags: ['-o=' + __dirname, '--board=TESTSC835-EV-SOM'],
        errorMessages: [
          '--name is required when creating a new workspace',
          '--template-id is required when creating a new workspace',
          '--soc is required when creating a new workspace'
        ],
        description:
          'shows error when --name, --soc and --template are missing'
      }
    ];

    invalidCombinations.forEach(
      ({flags, errorMessages, description}) => {
        it(description, async () => {
          const {error} = await runCommand(
            [
              'workspace:create',
              ...flags,
              '--search-path',
              pluginsPath,
              '--search-path',
              dataModelsPath
            ],
            {root: '..'}
          );
          // Check that expected error messages are present
          for (const errorMessage of errorMessages) {
            expect(error?.message).to.contain(errorMessage);
          }
        });
      }
    );
  });

  describe('JSON envelope', () => {
    after(() => {
      fs.rmSync(fullWorkspacePath, {recursive: true, force: true});
    });

    it('returns the created workspace path', async () => {
      const {stdout} = await runCommand(
        [
          'workspace:create',
          '-o=' + __dirname,
          '--name=' + workspaceName,
          '--board=TESTSC835-EV-SOM',
          '--soc=TEST-SC835',
          '--search-path',
          pluginsPath,
          '--search-path',
          workspaceTemplatesPath,
          '--search-path',
          dataModelsPath,
          '--template-id=com.analog.sharcfx.mock.example',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const data = assertSuccessEnvelopeData<{workspacePath: string}>(
        stdout,
        'workspace create'
      );
      expect(data).to.deep.equal({workspacePath: fullWorkspacePath});
    });

    it('returns a stable VALIDATION_FAILED code for invalid input', async () => {
      const {stdout} = await runCommand(
        [
          'workspace:create',
          '-o=' + __dirname,
          '--board=TESTSC835-EV-SOM',
          '--search-path',
          pluginsPath,
          '--search-path',
          dataModelsPath,
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout);
      expect(parsed.ok).to.be.false;
      expect((parsed as CliErrorEnvelope).errors[0]?.code).to.equal(
        'VALIDATION_FAILED'
      );
    });

    it('returns VALIDATION_FAILED for a missing workspace file', async () => {
      const {stdout} = await runCommand(
        [
          'workspace:create',
          '--workspace-file-path',
          path.join(__dirname, 'does-not-exist.cfsworkspace'),
          '--search-path',
          pluginsPath,
          '--search-path',
          dataModelsPath,
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout);
      expect(parsed.ok).to.be.false;
      expect((parsed as CliErrorEnvelope).errors[0]?.code).to.equal(
        'VALIDATION_FAILED'
      );
    });

    it('returns a path-independent WORKSPACE_FILE_READ_FAILED code for an invalid workspace file', async () => {
      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'cfs-ws-create-')
      );
      const badFile = path.join(tmpDir, 'bad.cfsworkspace');
      fs.writeFileSync(badFile, '{not json');

      try {
        const {stdout} = await runCommand(
          [
            'workspace:create',
            '--workspace-file-path',
            badFile,
            '--search-path',
            pluginsPath,
            '--search-path',
            dataModelsPath,
            '--format',
            'json'
          ],
          {root: '..'}
        );

        const parsed = assertValidEnvelope(stdout);
        expect(parsed.ok).to.be.false;
        expect((parsed as CliErrorEnvelope).errors[0]?.code).to.equal(
          'WORKSPACE_FILE_READ_FAILED'
        );
      } finally {
        fs.rmSync(tmpDir, {recursive: true, force: true});
      }
    });
  });

  describe('AI artifact generation after workspace creation', () => {
    const aiWorkspaceName = 'ai-artifact-workspace';
    const aiWorkspacePath = path.resolve(__dirname, aiWorkspaceName);
    let runCommandStub: Sinon.SinonStub;

    // Builds a minimal generated .cfsconfig with a single AI model
    function buildAiConfig(modelEnabled: boolean): CfsConfig {
      return {
        Copyright: 'Test configuration',
        SchemaVersion: '2.1.0',
        DataModelVersion: '1.1.44',
        DataModelSchemaVersion: '1.1.0',
        Soc: 'MAX32690',
        Package: 'WLP',
        Pins: [],
        ClockNodes: [],
        Timestamp: new Date().toISOString(),
        BoardName: 'EvKit_V1',
        Projects: [
          {
            CoreId: 'CM4',
            ProjectId: 'test-project',
            FirmwarePlatform: 'cfsai',
            ExternallyManaged: false,
            Partitions: [],
            Peripherals: [],
            PluginId: 'cfsai',
            PluginVersion: '0.0.0',
            AIModels: [
              {
                Name: 'test-model',
                Files: {Model: 'test-model.tflite'},
                OutDir: '.',
                Target: {Core: 'CM4'},
                Enabled: modelEnabled
              }
            ]
          }
        ]
      };
    }

    beforeEach(() => {
      runCommandStub = Sinon.stub().resolves();
      fs.mkdirSync(path.join(aiWorkspacePath, '.cfs'), {
        recursive: true
      });
    });

    afterEach(() => {
      fs.rmSync(aiWorkspacePath, {recursive: true, force: true});
    });

    async function invokeGenerateAIArtifacts(config: CfsConfig) {
      fs.writeFileSync(
        path.join(aiWorkspacePath, '.cfs', 'test.cfsconfig'),
        JSON.stringify(config, null, 2)
      );

      const workspaceConfig: CfsWorkspace = {
        workspaceName: aiWorkspaceName,
        location: __dirname,
        board: 'EvKit_V1',
        soc: 'MAX32690',
        package: 'WLP',
        projects: []
      };

      await generateAIArtifacts(
        workspaceConfig,
        async (
          _generatedConfig: CfsConfig,
          configPath: string,
          workspacePath: string
        ) =>
          runCommandStub('ai:build', [
            '--config',
            configPath,
            '--cwd',
            workspacePath
          ])
      );
    }

    it('runs ai:build when an AI model is enabled', async () => {
      await invokeGenerateAIArtifacts(buildAiConfig(true));

      expect(runCommandStub.calledOnce).to.be.true;
      expect(runCommandStub.firstCall.args[0]).to.equal('ai:build');
    });

    it('passes --cwd pointing to the workspace directory', async () => {
      await invokeGenerateAIArtifacts(buildAiConfig(true));

      const args: string[] = runCommandStub.firstCall.args[1];
      const cwdIndex = args.indexOf('--cwd');
      expect(cwdIndex, '--cwd must be present').to.be.greaterThan(-1);
      expect(args[cwdIndex + 1]).to.equal(aiWorkspacePath);
    });

    it('does not run ai:build when all AI models are disabled', async () => {
      await invokeGenerateAIArtifacts(buildAiConfig(false));

      expect(runCommandStub.called).to.be.false;
    });
  });
});
