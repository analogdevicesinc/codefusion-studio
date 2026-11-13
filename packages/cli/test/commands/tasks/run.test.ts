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
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import {spawn} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {tasksRunDeps} from '../../../dist/commands/tasks/run.js';
import {
  assertSuccessEnvelopeData,
  assertValidEnvelope,
  type CliErrorEnvelope
} from '../../utils/assert-json-envelope.js';

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
    // interfere with the child process. Append (not overwrite) NODE_OPTIONS so
    // the child process loads tsx to run the TypeScript dev entry point, since
    // mocha's own `--require tsx` registration does not propagate to spawned
    // children.
    const {NODE_V8_COVERAGE: _coverage, ...restEnv} = process.env;
    const childEnv = {
      ...restEnv,
      NODE_OPTIONS:
        `${process.env.NODE_OPTIONS ?? ''} --import tsx`.trim()
    };

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

  it('runs a dependsOn task before the task that depends on it', async () => {
    const {stdout} = await runCommand(
      [
        'tasks:run',
        'Build_with_Dependency',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project1'
      ],
      {
        root: '..'
      }
    );

    expect(stdout).to.contain('Running task: Build from Dependency');
    expect(stdout).to.contain(
      'Task "Build from Dependency" completed successfully.'
    );
    expect(
      stdout.indexOf('Running task: Build from Dependency')
    ).to.be.lessThan(
      stdout.indexOf('Running task: Build with Dependency')
    );
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

describe('tasks:run JSON envelope', () => {
  afterEach(async () => {
    await Promise.all([
      removeIfExists(captureOutputPath),
      removeIfExists(failMarkerPath)
    ]);
  });

  // Child output goes straight to the process's fd 1/2, which runCommand
  // cannot intercept, so this runs the CLI in a real subprocess.
  it('keeps --verbose child output off stdout so it is one envelope', async () => {
    const {NODE_V8_COVERAGE: _coverage, ...restEnv} = process.env;

    const {stdout, stderr} = await new Promise<{
      stdout: string;
      stderr: string;
    }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          cliDevEntryPoint,
          'tasks',
          'run',
          'Print_Both_Streams',
          '--workspace',
          testWorkspacePath,
          '--project',
          'project1',
          '--verbose',
          '--format',
          'json'
        ],
        {
          cwd: cliRootPath,
          env: {
            ...restEnv,
            NODE_OPTIONS:
              `${process.env.NODE_OPTIONS ?? ''} --import tsx`.trim()
          },
          stdio: 'pipe'
        }
      );

      let out = '';
      let err = '';
      child.stdout?.on('data', (chunk: Buffer) => {
        out += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        err += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', () => {
        resolve({stdout: out, stderr: err});
      });
    });

    const data = assertSuccessEnvelopeData<{
      executed: {label: string; workspacePath: string}[];
    }>(stdout, 'tasks run');
    expect(data.executed).to.deep.equal([
      {label: 'Print_Both_Streams', workspacePath: project1Path}
    ]);
    expect(stdout).to.not.contain('runner-stdout');
    expect(stderr).to.contain('runner-stdout:Print_Both_Streams');
    expect(stderr).to.contain('runner-stderr:Print_Both_Streams');
  });

  // Needs a real subprocess: the signal handlers are registered on the
  // process, and mocha must not receive the SIGTERM.
  it('returns TASK_INTERRUPTED and exits non-zero when the task is signalled', async function () {
    // Windows kills the child outright on kill(), so its SIGTERM handler never runs.
    if (process.platform === 'win32') this.skip();

    const {NODE_V8_COVERAGE: _coverage, ...restEnv} = process.env;

    const {stdout, code} = await new Promise<{
      stdout: string;
      code: null | number;
    }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          cliDevEntryPoint,
          'tasks',
          'run',
          'Hang_Task',
          '--workspace',
          testWorkspacePath,
          '--project',
          'project1',
          '--verbose',
          '--format',
          'json'
        ],
        {
          cwd: cliRootPath,
          env: {
            ...restEnv,
            NODE_OPTIONS:
              `${process.env.NODE_OPTIONS ?? ''} --import tsx`.trim()
          },
          stdio: 'pipe'
        }
      );

      let out = '';
      let err = '';
      let signalled = false;
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
      }, 20_000);

      child.stdout?.on('data', (chunk: Buffer) => {
        out += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        err += chunk.toString();

        // Signal only once the task process is running, so the abort path
        // (not a startup failure) is what gets exercised.
        if (!signalled && err.includes('runner-hang:Hang_Task')) {
          signalled = true;
          child.kill('SIGTERM');
        }
      });
      child.on('error', reject);
      child.on('close', (exitCode) => {
        clearTimeout(timer);
        resolve({stdout: out, code: exitCode});
      });
    });

    expect(code).to.equal(1);

    const parsed = assertValidEnvelope(stdout);
    expect(parsed.ok).to.be.false;
    expect((parsed as CliErrorEnvelope).errors[0]?.code).to.equal(
      'TASK_INTERRUPTED'
    );
  });

  it('returns the executed tasks', async () => {
    const {stdout} = await runCommand(
      [
        'tasks:run',
        'Build',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project1',
        '--format',
        'json'
      ],
      {root: '..'}
    );

    const data = assertSuccessEnvelopeData<{
      executed: {label: string; workspacePath: string}[];
    }>(stdout, 'tasks run');
    expect(data.executed).to.deep.equal([
      {label: 'Build', workspacePath: project1Path}
    ]);
  });

  it('returns TASK_FAILED when the task exits non-zero', async () => {
    const {stdout} = await runCommand(
      [
        'tasks:run',
        'Fail_Task',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project2',
        '--format',
        'json'
      ],
      {root: '..'}
    );

    const parsed = assertValidEnvelope(stdout);
    expect(parsed.ok).to.be.false;
    expect((parsed as CliErrorEnvelope).errors[0]?.code).to.equal(
      'TASK_FAILED'
    );
  });

  it('returns TASK_NOT_FOUND for an unknown task label', async () => {
    const {stdout} = await runCommand(
      [
        'tasks:run',
        'Missing_Task',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project1',
        '--format',
        'json'
      ],
      {root: '..'}
    );

    const parsed = assertValidEnvelope(stdout);
    expect(parsed.ok).to.be.false;
    expect((parsed as CliErrorEnvelope).errors[0]?.code).to.equal(
      'TASK_NOT_FOUND'
    );
  });
});

/**
 * Regression test for CFSIO-27355: a project folder with its own `.cfs`
 * folder (holding only `.cfsdependencies`) must not be mistaken for the
 * workspace root.
 */
describe('tasks:run with a project-level .cfs folder', () => {
  let workspaceDir: string;
  let projectDir: string;

  beforeEach(() => {
    workspaceDir = mkdtempSync(
      path.join(os.tmpdir(), 'cfs-tasks-run-projcfs-')
    );
    mkdirSync(path.join(workspaceDir, '.cfs'), {recursive: true});
    writeFileSync(
      path.join(workspaceDir, '.cfs', '.cfsworkspace'),
      '{}'
    );
    writeFileSync(
      path.join(
        workspaceDir,
        `${path.basename(workspaceDir)}.code-workspace`
      ),
      JSON.stringify({
        settings: {'mock.workspace.config': 'config-from-workspace'}
      })
    );

    projectDir = path.join(workspaceDir, 'project');
    mkdirSync(path.join(projectDir, '.vscode'), {recursive: true});
    mkdirSync(path.join(projectDir, '.cfs'), {recursive: true});
    writeFileSync(
      path.join(projectDir, '.cfs', '.cfsdependencies'),
      JSON.stringify({version: 1, packages: []})
    );
    copyFileSync(
      path.join(project1Path, 'task-runner.cjs'),
      path.join(projectDir, 'task-runner.cjs')
    );
    writeFileSync(
      path.join(projectDir, '.vscode', 'cfs.tasks.json'),
      JSON.stringify({
        version: '2.0.0',
        tasks: [
          {
            type: 'shell',
            command: 'capture',
            label: 'Capture',
            options: {
              env: {
                TASK_LABEL: 'Capture',
                TASK_OUTPUT_FILE: 'capture-output.json',
                RESOLVED_CONFIG: '${config:mock.workspace.config}'
              },
              shell: {
                executable: '${env:CFS_TEST_NODE_PATH}',
                args: ['task-runner.cjs']
              }
            }
          }
        ]
      })
    );
  });

  afterEach(() => {
    rmSync(workspaceDir, {recursive: true, force: true});
  });

  it('finds the project and workspace settings from the workspace root', async () => {
    const {stdout, error} = await runCommand(
      [
        'tasks run',
        'Capture',
        '--workspace',
        workspaceDir,
        '--project',
        'project'
      ],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain(
      'Task "Capture" completed successfully.'
    );

    const payload = JSON.parse(
      readFileSync(
        path.join(projectDir, 'capture-output.json'),
        'utf8'
      )
    ) as Record<string, string>;
    expect(realpathSync(payload.cwd)).to.equal(
      realpathSync(projectDir)
    );
    expect(payload.config).to.equal('config-from-workspace');
  });

  it('resolves workspace settings when pointed at the project folder', async () => {
    const {error} = await runCommand(
      ['tasks run', 'Capture', '--workspace', projectDir],
      {root: '..'}
    );

    expect(error).to.be.undefined;

    const payload = JSON.parse(
      readFileSync(
        path.join(projectDir, 'capture-output.json'),
        'utf8'
      )
    ) as Record<string, string>;
    expect(payload.config).to.equal('config-from-workspace');
  });
});

/**
 * Test suite for the non-blocking dependency-verification failure
 * annotation. Checks:
 * - Unmet dependencies never prevent a task from running or succeeding
 * - A failed task is annotated with unmet dependency details, only when a
 *   manifest is present and unmet
 * - A satisfied manifest, a missing manifest, and a verification failure
 *   all leave the original failure message unchanged
 * - Both process spawn failures and non-zero exit failures are annotated
 */
describe('tasks:run dependency verification annotation', () => {
  let workspaceDir: string;
  let projectDir: string;
  let originalGetPackageManager: typeof tasksRunDeps.getPackageManager;

  beforeEach(() => {
    originalGetPackageManager = tasksRunDeps.getPackageManager;
    workspaceDir = mkdtempSync(
      path.join(os.tmpdir(), 'cfs-tasks-run-deps-')
    );
    mkdirSync(path.join(workspaceDir, '.cfs'), {recursive: true});
    writeFileSync(
      path.join(workspaceDir, '.cfs', '.cfsworkspace'),
      '{}'
    );
    projectDir = path.join(workspaceDir, 'project');
    mkdirSync(path.join(projectDir, '.vscode'), {recursive: true});
  });

  afterEach(() => {
    tasksRunDeps.getPackageManager = originalGetPackageManager;
    rmSync(workspaceDir, {recursive: true, force: true});
  });

  function writeTasks(tasks: unknown[]): void {
    writeFileSync(
      path.join(projectDir, '.vscode', 'cfs.tasks.json'),
      JSON.stringify({version: '2.0.0', tasks})
    );
  }

  function writeManifest(
    packages: Array<{name: string; version: string}>
  ): string {
    const manifestPath = path.join(
      workspaceDir,
      '.cfs',
      '.cfsdependencies'
    );
    writeFileSync(
      manifestPath,
      JSON.stringify({version: 1, packages})
    );
    return manifestPath;
  }

  function mockUnmetPackageManager(): void {
    tasksRunDeps.getPackageManager = (async () => ({
      checkManifest: async () => [
        {name: 'missing_pkg', version: '1.0.0'}
      ],
      list: async () => []
    })) as unknown as typeof tasksRunDeps.getPackageManager;
  }

  function mockSatisfiedPackageManager(): void {
    tasksRunDeps.getPackageManager = (async () => ({
      checkManifest: async () => [],
      list: async () => [{name: 'ok_pkg', version: '1.0.0'}]
    })) as unknown as typeof tasksRunDeps.getPackageManager;
  }

  it('runs and succeeds when a manifest is unmet', async () => {
    writeManifest([{name: 'missing_pkg', version: '1.0.0'}]);
    writeTasks([
      {type: 'shell', command: 'exit 0', label: 'Succeed'}
    ]);

    let packageManagerCalled = false;
    tasksRunDeps.getPackageManager = (async () => {
      packageManagerCalled = true;
      return {
        checkManifest: async () => [
          {name: 'missing_pkg', version: '1.0.0'}
        ],
        list: async () => []
      };
    }) as unknown as typeof tasksRunDeps.getPackageManager;

    const {stdout, error} = await runCommand(
      ['tasks run', 'Succeed', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain(
      'Task "Succeed" completed successfully.'
    );
    expect(packageManagerCalled).to.equal(false);
  });

  it('annotates a failed task with unmet dependency details', async () => {
    writeManifest([{name: 'missing_pkg', version: '1.0.0'}]);
    writeTasks([{type: 'shell', command: 'exit 3', label: 'Fail'}]);
    mockUnmetPackageManager();

    const {error} = await runCommand(
      ['tasks run', 'Fail', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.contain(
      'Task "Fail" failed with exit code 3'
    );
    expect(error?.message).to.contain('unmet package dependencies');
    expect(error?.message).to.contain('missing_pkg/1.0.0: missing');
    expect(error?.message).to.contain(
      'cfsutil validate dependencies'
    );
  });

  it('does not annotate a failed task when the manifest is satisfied', async () => {
    writeManifest([{name: 'ok_pkg', version: '1.0.0'}]);
    writeTasks([{type: 'shell', command: 'exit 3', label: 'Fail'}]);
    mockSatisfiedPackageManager();

    const {error} = await runCommand(
      ['tasks run', 'Fail', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.equal(
      'Task "Fail" failed with exit code 3'
    );
  });

  it('does not annotate a failed task when no manifest is present', async () => {
    writeTasks([{type: 'shell', command: 'exit 3', label: 'Fail'}]);

    let packageManagerCalled = false;
    tasksRunDeps.getPackageManager = (async () => {
      packageManagerCalled = true;
      throw new Error('package manager should not be called');
    }) as unknown as typeof tasksRunDeps.getPackageManager;

    const {error} = await runCommand(
      ['tasks run', 'Fail', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.equal(
      'Task "Fail" failed with exit code 3'
    );
    expect(packageManagerCalled).to.equal(false);
  });

  it('preserves the original failure message when verification itself fails', async () => {
    writeManifest([{name: 'missing_pkg', version: '1.0.0'}]);
    writeTasks([{type: 'shell', command: 'exit 3', label: 'Fail'}]);
    tasksRunDeps.getPackageManager = (async () => {
      throw new Error('network unreachable');
    }) as unknown as typeof tasksRunDeps.getPackageManager;

    const {error} = await runCommand(
      ['tasks run', 'Fail', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.equal(
      'Task "Fail" failed with exit code 3'
    );
  });

  it("annotates only the manifest of the failed task's project", async () => {
    const [projectManifest, otherManifest] = ['project', 'other'].map(
      (name) => {
        const dir = path.join(workspaceDir, name, '.cfs');
        mkdirSync(dir, {recursive: true});
        writeFileSync(
          path.join(dir, '.cfsdependencies'),
          JSON.stringify({
            version: 1,
            packages: [{name: 'missing_pkg', version: '1.0.0'}]
          })
        );
        return path.join(dir, '.cfsdependencies');
      }
    );
    writeTasks([{type: 'shell', command: 'exit 3', label: 'Fail'}]);
    mockUnmetPackageManager();

    const {error} = await runCommand(
      ['tasks run', 'Fail', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.contain(projectManifest);
    expect(error?.message).to.not.contain(otherManifest);
  });

  it('keeps the root annotation when a project manifest is malformed', async () => {
    const rootManifest = writeManifest([
      {name: 'missing_pkg', version: '1.0.0'}
    ]);
    mkdirSync(path.join(projectDir, '.cfs'));
    writeFileSync(
      path.join(projectDir, '.cfs', '.cfsdependencies'),
      '{not json'
    );
    writeTasks([{type: 'shell', command: 'exit 3', label: 'Fail'}]);
    mockUnmetPackageManager();

    const {error} = await runCommand(
      ['tasks run', 'Fail', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.contain(rootManifest);
    expect(error?.message).to.contain('missing_pkg/1.0.0: missing');
  });

  it('annotates a process spawn failure with unmet dependency details', async () => {
    writeManifest([{name: 'missing_pkg', version: '1.0.0'}]);
    writeTasks([
      {
        type: 'shell',
        command: 'noop',
        label: 'Spawn_Fail',
        options: {
          shell: {
            executable: path.join(
              workspaceDir,
              'does-not-exist-binary'
            )
          }
        }
      }
    ]);
    mockUnmetPackageManager();

    const {error} = await runCommand(
      ['tasks run', 'Spawn_Fail', '--workspace', workspaceDir],
      {root: '..'}
    );

    expect(error?.message).to.contain('Failed to spawn task process');
    expect(error?.message).to.contain('unmet package dependencies');
    expect(error?.message).to.contain('missing_pkg/1.0.0: missing');
  });
});
