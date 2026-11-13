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
import Sinon from 'sinon';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Import from dist/ so we share the same module instance that
// runCommand() uses (oclif always loads commands from dist/).
import {
  initTelemetrySession,
  clearTelemetrySession
} from '../../../dist/utils/telemetry-session.js';
import {
  CFS_PROJECT_PLUGINS_PATH,
  CFS_WORKSPACE_TEMPLATES_PATH,
  CFS_DATA_MODELS_PATH
} from '../../constants.js';

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

function createStubManager() {
  return {
    logAction: Sinon.stub().resolves(undefined)
  };
}

describe('workspace:create telemetry', () => {
  let manager: ReturnType<typeof createStubManager>;

  let savedExitCode: string | number | null | undefined;

  beforeEach(() => {
    savedExitCode = process.exitCode;
    process.exitCode = undefined;
    manager = createStubManager();
    initTelemetrySession(manager as never, performance.now());
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
    clearTelemetrySession();
  });

  describe('new workspace', () => {
    const workspaceName = 'telemetryTestWorkspace';
    const fullWorkspacePath = path.resolve(__dirname, workspaceName);

    after(() => {
      fs.rmSync(fullWorkspacePath, {
        recursive: true,
        force: true
      });
    });

    it('reports soc, board, template, and creationMethod', async () => {
      const {error} = await runCommand(
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
        {root: '..'}
      );

      expect(error).to.be.undefined;
      expect(manager.logAction.calledOnce).to.equal(true);

      const [action, metadata] = manager.logAction.firstCall.args;
      expect(action).to.equal('cli_command_completed');
      expect(metadata.commandId).to.equal('workspace:create');
      expect(metadata.soc).to.equal('TEST-SC835');
      expect(metadata.board).to.equal('TESTSC835-EV-SOM');
      expect(metadata.templateId).to.equal(
        'com.analog.sharcfx.mock.example'
      );
      expect(metadata.templateVersion).to.equal('1.0.0');
      expect(metadata.creationMethod).to.equal('new');
      expect(metadata.durationMs).to.be.a('number');
      expect(metadata.exitCode).to.equal(0);
    });
  });

  describe('file-based workspace', () => {
    const workspaceFilePath = path.resolve(
      __dirname,
      'sample.cfsworkspace'
    );
    let outputDir: string;

    before(() => {
      const cfsworkspace = JSON.parse(
        fs.readFileSync(workspaceFilePath, 'utf8')
      );
      outputDir = path.resolve(
        __dirname,
        path.basename(cfsworkspace.location)
      );
    });

    after(() => {
      fs.rmSync(outputDir, {recursive: true, force: true});
    });

    it('reports creationMethod "file" without workspace-specific fields', async () => {
      const {stderr} = await runCommand(
        [
          'workspace:create',
          '--workspace-file-path',
          workspaceFilePath,
          '--search-path',
          pluginsPath,
          '--search-path',
          workspaceTemplatesPath,
          '--search-path',
          dataModelsPath
        ],
        {root: '..'}
      );

      // expect(error).to.be.undefined;
      expect(stderr, 'stderr should be empty').to.be.empty;
      expect(manager.logAction.calledOnce).to.equal(true);

      const [action, metadata] = manager.logAction.firstCall.args;
      expect(action).to.equal('cli_command_completed');
      expect(metadata.commandId).to.equal('workspace:create');
      expect(metadata.creationMethod).to.equal('file');
      expect(metadata).to.not.have.property('soc');
      expect(metadata).to.not.have.property('board');
      expect(metadata).to.not.have.property('templateId');
    });
  });
});
