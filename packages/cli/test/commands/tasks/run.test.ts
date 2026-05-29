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

import {expect, test} from '@oclif/test';
import fs from 'node:fs/promises';
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
const captureOutputPath = path.join(
  project1Path,
  'capture-output.json'
);
const failMarkerPath = path.join(project2Path, 'fail-task-ran.txt');

async function removeIfExists(filePath: string) {
  await fs.rm(filePath, {force: true});
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

  test
    .stdout()
    .command(
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
    )
    .it('runs a task from workspace + project id', (ctx) => {
      expect(ctx.stdout).to.contain('Running task: Build');
      expect(ctx.stdout).to.contain(
        'Task "Build" completed successfully.'
      );
    });

  test
    .stdout()
    .command(
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
    )
    .it(
      'resolves config, environment, and predefined variables before running',
      async (ctx) => {
        expect(ctx.stdout).to.contain(
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
      }
    );

  test
    .stdout()
    .command(
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
    )
    .it(
      'runs labels containing punctuation when the raw label is provided',
      (ctx) => {
        expect(ctx.stdout).to.contain('Running task: Build (Node)');
        expect(ctx.stdout).to.contain(
          'Task "Build (Node)" completed successfully.'
        );
      }
    );

  test
    .command(
      [
        'tasks run',
        'Fail Task',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project2'
      ],
      {
        root: '..'
      }
    )
    .catch(async (error) => {
      expect(error.message).to.contain(
        'Task "Fail Task" failed with exit code 3'
      );

      const marker = await fs.readFile(failMarkerPath, 'utf8');
      expect(marker).to.equal('Fail Task');
    })
    .it('surfaces task failures with the process exit code');

  test
    .command(
      [
        'tasks run',
        'Missing Task',
        '--workspace',
        testWorkspacePath,
        '--project',
        'project1'
      ],
      {
        root: '..'
      }
    )
    .catch((error) => {
      expect(error.message).to.contain(
        'Task "Missing Task" not found.'
      );
      expect(error.message).to.contain('Available tasks:');
      expect(error.message).to.contain('Build');
      expect(error.message).to.contain('Capture_Variables');
    })
    .it(
      'fails with the available labels when the task does not exist'
    );

  test
    .stdout()
    .command(
      ['tasks run', 'Build', '--workspace', testWorkspacePath],
      {
        root: '..'
      }
    )
    .it(
      'runs all matching task labels in sequence from workspace root',
      (ctx) => {
        const runningMatches =
          ctx.stdout.match(/Running task: Build/g) ?? [];
        const completedMatches =
          ctx.stdout.match(
            /Task "Build" completed successfully\./g
          ) ?? [];

        expect(runningMatches.length).to.equal(2);
        expect(completedMatches.length).to.equal(2);
      }
    );

  test
    .stdout()
    .command(['tasks run', 'Build', '--workspace', project1Path], {
      root: '..'
    })
    .it(
      'runs a task without project id when workspace points to a project path',
      (ctx) => {
        expect(ctx.stdout).to.contain('Running task: Build');
        expect(ctx.stdout).to.contain(
          'Task "Build" completed successfully.'
        );
      }
    );
});
