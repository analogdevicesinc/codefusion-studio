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
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Import from dist/ so we share the same module instance that
// runCommand() uses (oclif always loads commands from dist/).
import {
  initTelemetrySession,
  clearTelemetrySession
} from '../../../dist/utils/telemetry-session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testWorkspacePath = path.resolve(
  __dirname,
  '..',
  '..',
  'fixtures',
  'tasks-workspace'
);

function createStubManager() {
  return {
    logAction: Sinon.stub().resolves(undefined)
  };
}

describe('tasks:run telemetry', () => {
  let manager: ReturnType<typeof createStubManager>;
  let savedExitCode: number | undefined;

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

  it('classifies "Build" as taskType build', async () => {
    await runCommand(
      [
        'tasks:run',
        'Build',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project1'
      ],
      {root: '..'}
    );

    expect(manager.logAction.calledOnce).to.equal(true);

    const metadata = manager.logAction.firstCall.args[1];
    expect(metadata.commandId).to.equal('tasks:run');
    expect(metadata).to.not.have.property('taskLabel');
    expect(metadata.taskType).to.equal('build');
    expect(metadata.hasCapture).to.equal(false);
    expect(metadata.taskCount).to.be.a('number');
    expect(metadata.taskCount).to.be.at.least(1);
  });

  it('classifies "flash_run_JLink" as taskType flash', async () => {
    await runCommand(
      [
        'tasks:run',
        'flash_run_JLink',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project1'
      ],
      {root: '..'}
    );

    expect(manager.logAction.calledOnce).to.equal(true);

    const metadata = manager.logAction.firstCall.args[1];
    expect(metadata).to.not.have.property('taskLabel');
    expect(metadata.taskType).to.equal('flash');
  });

  it('classifies non-build/flash tasks as "other"', async () => {
    await runCommand(
      [
        'tasks:run',
        'Capture_Variables',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project1'
      ],
      {root: '..'}
    );

    expect(manager.logAction.calledOnce).to.equal(true);

    const metadata = manager.logAction.firstCall.args[1];
    expect(metadata).to.not.have.property('taskLabel');
    expect(metadata.taskType).to.equal('other');
  });

  it('reports hasCapture true when --capture is used', async function () {
    this.timeout(15_000);

    await runCommand(
      [
        'tasks:run',
        'Build',
        '--capture',
        '--port',
        'FAKE_PORT',
        '--project',
        'project1',
        '--workspace',
        testWorkspacePath
      ],
      {root: '..'}
    );

    expect(manager.logAction.calledOnce).to.equal(true);

    const metadata = manager.logAction.firstCall.args[1];
    expect(metadata.hasCapture).to.equal(true);
  });
});
