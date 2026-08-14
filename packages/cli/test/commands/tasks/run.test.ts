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
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testWorkspacePath = path.resolve(
  __dirname,
  '..',
  '..',
  'fixtures',
  'tasks-workspace'
);
const project1Path = path.join(testWorkspacePath, 'project1');
const project2Path = path.join(testWorkspacePath, 'project2');
const cliRootPath = path.resolve(__dirname, '..', '..', '..');
const cliDevEntryPoint = path.join(cliRootPath, 'bin', 'dev.js');
const captureOutputPath = path.join(
  project1Path,
  'capture-output.json'
);
const failMarkerPath = path.join(project2Path, 'fail-task-ran.txt');

async function removeIfExists(filePath: string) {
  await fs.rm(filePath, {force: true});
}

/**
 * Spawn the CLI in a subprocess and collect stdout/stderr until one of the
 * `stopSentinels` strings appears in the combined output or the timeout
 * expires, then send SIGTERM and wait for the process to exit.
 *
 * Both SIGINT and SIGTERM are handled by the command's `stopCapture` handler,
 * so the port is closed cleanly before the process exits.
 */
function runCaptureCommand(
  args: string[],
  timeoutMs = 10_000
): Promise<{stdout: string; stderr: string}> {
  const STOP_SENTINELS = [
    'Press Ctrl+C to stop capture',
    'Failed to start serial capture'
  ];

  return new Promise((resolve, reject) => {
    // Strip NODE_V8_COVERAGE (set by c8) so coverage instrumentation does not
    // interfere with the child process. NODE_OPTIONS is intentionally kept so
    // that mocha's --loader=ts-node/esm reaches the child; adding the loader
    // flag explicitly on top of NODE_OPTIONS caused a duplicate-loader crash
    // on Node.js 20 that produced no output at all.
    const childEnv = {...process.env};
    delete childEnv.NODE_V8_COVERAGE;

    const child = spawn(
      process.execPath,
      [cliDevEntryPoint, ...args],
      {
        cwd: cliRootPath,
        env: childEnv,
        stdio: 'pipe'
      }
    );

    let stdout = '';
    let stderr = '';
    let stopped = false;

    const tryStop = () => {
      if (!stopped && !child.killed) {
        stopped = true;
        // Brief pause to allow post-sentinel messages to be written before
        // sending SIGTERM (caught by stopCapture in the command).
        setTimeout(() => {
          if (!child.killed) child.kill();
        }, 300);
      }
    };

    const checkSentinels = () => {
      if (STOP_SENTINELS.some((s) => (stdout + stderr).includes(s))) {
        tryStop();
      }
    };

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      checkSentinels();
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      checkSentinels();
    });

    const timer = setTimeout(tryStop, timeoutMs);

    child.on('close', () => {
      clearTimeout(timer);
      resolve({stdout, stderr});
    });

    child.on('error', reject);
  });
}

describe('tasks:run', () => {
  beforeEach(async () => {
    await Promise.all([
      removeIfExists(captureOutputPath),
      removeIfExists(failMarkerPath)
    ]);
  });

  afterEach(async () => {
    await Promise.all([
      removeIfExists(captureOutputPath),
      removeIfExists(failMarkerPath)
    ]);
  });

  it('runs a task from workspace + project id', async () => {
    const {stdout} = await runCommand(
      [
        'tasks:run',
        'Build',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project1'
      ],
      {
        root: '..'
      }
    );
    expect(stdout).to.contain('Running task: Build');
    expect(stdout).to.contain('Task "Build" completed successfully.');
  });

  it('resolves config, environment, and predefined variables before running', async () => {
    const {stdout} = await runCommand(
      [
        'tasks:run',
        'Capture_Variables',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project1',
        '--verbose'
      ],
      {root: '..'}
    );

    expect(stdout).to.contain(
      'Task "Capture Variables" completed successfully.'
    );

    const content = await fs.readFile(captureOutputPath, 'utf8');
    const payload = JSON.parse(content) as Record<string, string>;

    expect(payload.cwd).to.equal(project1Path);
    expect(payload.label).to.equal('Capture Variables');
    expect(payload.config).to.equal('config-from-project1');
    expect(payload.env).to.equal('env-from-test-setup');
    expect(payload.folder).to.equal('project1');
    expect(payload.home).to.equal(os.homedir());
    expect(payload.separator).to.equal(path.sep);
  });

  it('runs labels containing punctuation when the raw label is provided', async () => {
    const {stdout} = await runCommand(
      [
        'tasks:run',
        'Build_Node',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project2',
        '--verbose'
      ],
      {root: '..'}
    );

    expect(stdout).to.contain('Running task: Build (Node)');
    expect(stdout).to.contain(
      'Task "Build (Node)" completed successfully.'
    );
  });

  it('surfaces task failures with the process exit code', async () => {
    const {error} = await runCommand(
      [
        'tasks run',
        'Fail_Task',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project2'
      ],
      {
        root: '..'
      }
    );
    expect(error?.message).to.contain(
      'Task "Fail Task" failed with exit code 3'
    );

    const marker = await fs.readFile(failMarkerPath, 'utf8');
    expect(marker).to.equal('Fail Task');
  });

  it('fails with the available labels when the task does not exist', async () => {
    const {error} = await runCommand(
      [
        'tasks run',
        'Missing_Task',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project1'
      ],
      {
        root: '..'
      }
    );
    expect(error?.message).to.contain(
      'Task "Missing_Task" not found.'
    );
    expect(error?.message).to.contain('Available tasks:');
    expect(error?.message).to.contain('Build');
    expect(error?.message).to.contain('Capture_Variables');
  });

  it('runs all matching task labels in sequence from workspace root', async () => {
    const {stdout} = await runCommand(
      ['tasks run', 'Build', '--workspace', testWorkspacePath],
      {
        root: '..'
      }
    );

    const runningMatches = stdout.match(/Running task: Build/g) ?? [];
    const completedMatches =
      stdout.match(/Task "Build" completed successfully\./g) ?? [];

    expect(runningMatches.length).to.equal(2);
    expect(completedMatches.length).to.equal(2);
  });

  it('runs a task without project id when workspace points to a project path', async () => {
    const {stdout} = await runCommand(
      ['tasks run', 'Build', '--workspace', project1Path],
      {
        root: '..'
      }
    );

    expect(stdout).to.contain('Running task: Build');
    expect(stdout).to.contain('Task "Build" completed successfully.');
  });
});

describe('--capture flag', () => {
  it('--capture requires --project', async () => {
    const {error} = await runCommand(
      [
        'tasks:run',
        'Build',
        '--capture',
        '--port',
        'COM4',
        '--workspace',
        testWorkspacePath
      ],
      {root: '..'}
    );
    expect(error?.message).to.include('--capture');
    expect(error?.message).to.include('--project');
  });

  it('--capture requires --port', async () => {
    const {error} = await runCommand(
      [
        'tasks:run',
        'Build',
        '--capture',
        '--project',
        'project1',
        '--workspace',
        testWorkspacePath
      ],
      {root: '..'}
    );
    expect(error?.message).to.include('--capture');
    expect(error?.message).to.include('--port');
  });

  it('--port requires --capture', async () => {
    const {error} = await runCommand(
      [
        'tasks:run',
        'Build',
        '--port',
        'COM4',
        '--project',
        'project1',
        '--workspace',
        testWorkspacePath
      ],
      {root: '..'}
    );
    expect(error?.message).to.include('--port');
    expect(error?.message).to.include('--capture');
  });

  it('logs "Starting serial capture" and either waits for Ctrl+C or reports a port error', async function () {
    this.timeout(15_000);

    const {stdout, stderr} = await runCaptureCommand([
      'tasks:run',
      'Build',
      '--capture',
      '--port',
      'COM4',
      '--project',
      'project1',
      '--workspace',
      testWorkspacePath
    ]);

    const combined = stdout + stderr;
    expect(combined).to.include('Starting serial capture on COM4.');
    expect(combined).to.satisfy(
      (s: string) =>
        s.includes('Press Ctrl+C to stop capture') ||
        s.includes('Failed to start serial capture')
    );
  });
});
