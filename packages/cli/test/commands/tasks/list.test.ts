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
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/**
 * Test suite for tasks:list command.
 *
 * Tests cover:
 * - Listing all tasks for a workspace
 * - Filtering tasks by project
 * - Verbose output showing command details
 * - Error handling for invalid workspace
 * - Error handling for workspace with no tasks
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test fixture workspace containing sample tasks
const testWorkspacePath = path.resolve(
  __dirname,
  '..',
  '..',
  'fixtures',
  'tasks-workspace'
);
const project1Path = path.join(testWorkspacePath, 'project1');
const cliRootPath = path.resolve(__dirname, '..', '..', '..');
const cliDevEntryPoint = path.join(cliRootPath, 'bin', 'dev.js');

describe('tasks:list', () => {
  describe('list all tasks for workspace', () => {
    test
      .stdout()
      .command(['tasks:list', '--workspace', testWorkspacePath], {
        root: '..'
      })
      .it('lists all tasks from multiple projects', (ctx) => {
        // Should show tasks from both project1 and project2
        expect(ctx.stdout).to.contain('Tasks for workspace');
        expect(ctx.stdout).to.contain('=== Project: project1 ===');
        expect(ctx.stdout).to.contain('=== Project: project2 ===');
        expect(ctx.stdout).to.contain('Build');
        expect(ctx.stdout).to.contain('Clean');
        expect(ctx.stdout).to.contain('Test');
        expect(ctx.stdout).to.contain('Build_NPM');
        expect(ctx.stdout).to.contain('Lint');
      });

    test
      .stdout()
      .command(
        ['tasks:list', '--workspace', testWorkspacePath, '--verbose'],
        {
          root: '..'
        }
      )
      .it(
        'lists tasks with verbose output showing commands',
        (ctx) => {
          expect(ctx.stdout).to.contain('Tasks for workspace');
          expect(ctx.stdout).to.contain('Command:');
          expect(ctx.stdout).to.contain('make build');
          expect(ctx.stdout).to.contain('npm run build');
        }
      );

    test
      .stdout()
      .command(['tasks:list', '--workspace', project1Path], {
        root: '..'
      })
      .it(
        'infers the project when workspace points to a project path',
        (ctx) => {
          expect(ctx.stdout).to.contain(
            `Tasks for workspace "${project1Path}"`
          );
          expect(ctx.stdout).to.contain('=== Project: project1 ===');
          expect(ctx.stdout).to.contain('Build');
          expect(ctx.stdout).to.contain('Clean');
          expect(ctx.stdout).to.contain('Test');
          expect(ctx.stdout).not.to.contain(
            '=== Project: project2 ==='
          );
        }
      );

    it('infers the project from cwd when no workspace flag is provided', () => {
      const stdout = execFileSync(
        process.execPath,
        [
          '--loader',
          'ts-node/esm',
          '--no-warnings=ExperimentalWarning',
          cliDevEntryPoint,
          'tasks:list'
        ],
        {
          cwd: project1Path,
          env: process.env,
          encoding: 'utf8'
        }
      );

      expect(stdout).to.contain(
        `Tasks for workspace "${project1Path}"`
      );
      expect(stdout).to.contain('=== Project: project1 ===');
      expect(stdout).to.contain('Build');
      expect(stdout).to.contain('Clean');
      expect(stdout).to.contain('Test');
      expect(stdout).not.to.contain('=== Project: project2 ===');
    });
  });

  describe('filter tasks by project', () => {
    test
      .stdout()
      .command(
        [
          'tasks:list',
          '--workspace',
          testWorkspacePath,
          '--project',
          'project1'
        ],
        {
          root: '..'
        }
      )
      .it('lists only tasks for the specified project', (ctx) => {
        expect(ctx.stdout).to.contain('=== Project: project1 ===');
        expect(ctx.stdout).to.contain('Build');
        expect(ctx.stdout).to.contain('Clean');
        expect(ctx.stdout).to.contain('Test');
        // Should not contain project2 tasks
        expect(ctx.stdout).not.to.contain(
          '=== Project: project2 ==='
        );
        expect(ctx.stdout).not.to.contain('Build_NPM');
        expect(ctx.stdout).not.to.contain('Lint');
      });

    test
      .stdout()
      .command(
        [
          'tasks:list',
          '--workspace',
          testWorkspacePath,
          '--project',
          'project2'
        ],
        {
          root: '..'
        }
      )
      .it('lists only tasks for project2', (ctx) => {
        expect(ctx.stdout).to.contain('=== Project: project2 ===');
        expect(ctx.stdout).to.contain('Build_NPM');
        expect(ctx.stdout).to.contain('Lint');
        // Should not contain project1 tasks
        expect(ctx.stdout).not.to.contain(
          '=== Project: project1 ==='
        );
        expect(ctx.stdout).not.to.contain('Clean');
        expect(ctx.stdout).not.to.contain('Test');
      });
  });

  describe('error handling', () => {
    test
      .command(['tasks:list'], {
        root: '..'
      })
      .catch((error) => {
        expect(error.message).to.contain(
          'Please ensure this is a valid workspace folder'
        );
      })
      .it(
        'shows error when workspace cwd is not a valid CFS workspace'
      );

    test
      .command(
        [
          'tasks:list',
          '--workspace',
          path.resolve(__dirname, 'nonexistent-workspace')
        ],
        {
          root: '..'
        }
      )
      .catch((error) => {
        expect(error.message).to.contain(
          ' Please ensure this is a valid workspace folder'
        );
      })
      .it('shows error when workspace does not exist');

    test
      .command(
        [
          'tasks:list',
          '--workspace',
          testWorkspacePath,
          '--project',
          'nonexistent-project'
        ],
        {
          root: '..'
        }
      )
      .catch((error) => {
        expect(error.message).to.contain('No project with the name');
      })
      .it('shows error when project filter matches no tasks');
  });

  describe('task sorting and formatting', () => {
    test
      .stdout()
      .command(['tasks:list', '--workspace', testWorkspacePath], {
        root: '..'
      })
      .it(
        'tasks are sorted alphabetically within each project',
        (ctx) => {
          // Check that tasks appear in alphabetical order
          const buildIndex = ctx.stdout.indexOf('Build');
          const cleanIndex = ctx.stdout.indexOf('Clean');
          const testIndex = ctx.stdout.indexOf('Test');

          expect(buildIndex).to.be.lessThan(cleanIndex);
          expect(cleanIndex).to.be.lessThan(testIndex);
        }
      );

    test
      .stdout()
      .command(
        [
          'tasks:list',
          '--workspace',
          testWorkspacePath,
          '--project',
          'project1'
        ],
        {
          root: '..'
        }
      )
      .it(
        'shows workspace and project info in output header',
        (ctx) => {
          expect(ctx.stdout).to.match(
            /Tasks for workspace .* and project "project1"/
          );
        }
      );
  });
});
