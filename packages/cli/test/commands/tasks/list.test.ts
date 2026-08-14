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
    it('lists all tasks from multiple projects', async () => {
      const {stdout} = await runCommand(
        ['tasks:list', '--workspace', testWorkspacePath],
        {
          root: '..'
        }
      );
      // Should show tasks from both project1 and project2
      expect(stdout).to.contain('Tasks for workspace');
      expect(stdout).to.contain('=== Project: project1 ===');
      expect(stdout).to.contain('=== Project: project2 ===');
      expect(stdout).to.contain('Build');
      expect(stdout).to.contain('Clean');
      expect(stdout).to.contain('Test');
      expect(stdout).to.contain('Build_NPM');
      expect(stdout).to.contain('Lint');
    });

    it('lists tasks with verbose output showing commands', async () => {
      const {stdout} = await runCommand(
        ['tasks:list', '--workspace', testWorkspacePath, '--verbose'],
        {
          root: '..'
        }
      );
      expect(stdout).to.contain('Tasks for workspace');
      expect(stdout).to.contain('Command:');
      expect(stdout).to.contain('make build');
      expect(stdout).to.contain('npm run build');
    });

    it('infers the project when workspace points to a project path', async () => {
      const {stdout} = await runCommand(
        ['tasks:list', '--workspace', project1Path],
        {
          root: '..'
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
    it('lists only tasks for the specified project', async () => {
      const {stdout} = await runCommand(
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
      );
      expect(stdout).to.contain('=== Project: project1 ===');
      expect(stdout).to.contain('Build');
      expect(stdout).to.contain('Clean');
      expect(stdout).to.contain('Test');
      // Should not contain project2 tasks
      expect(stdout).not.to.contain('=== Project: project2 ===');
      expect(stdout).not.to.contain('Build_NPM');
      expect(stdout).not.to.contain('Lint');
    });

    it('lists only tasks for project2', async () => {
      const {stdout} = await runCommand(
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
      );
      expect(stdout).to.contain('=== Project: project2 ===');
      expect(stdout).to.contain('Build_NPM');
      expect(stdout).to.contain('Lint');
      // Should not contain project1 tasks
      expect(stdout).not.to.contain('=== Project: project1 ===');
      expect(stdout).not.to.contain('Clean');
      expect(stdout).not.to.contain('Test');
    });
  });

  describe('error handling', () => {
    it('shows error when workspace cwd is not a valid CFS workspace', async () => {
      const {error} = await runCommand(['tasks:list'], {
        root: '..'
      });
      expect(error?.message).to.contain(
        'Please ensure this is a valid workspace folder'
      );
    });

    it('shows error when workspace does not exist', async () => {
      const {error} = await runCommand(
        [
          'tasks:list',
          '--workspace',
          path.resolve(__dirname, 'nonexistent-workspace')
        ],
        {
          root: '..'
        }
      );
      expect(error?.message).to.contain(
        ' Please ensure this is a valid workspace folder'
      );
    });

    it('shows error when project filter matches no tasks', async () => {
      const {error} = await runCommand(
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
      );
      expect(error?.message).to.contain('No project with the name');
    });
  });

  describe('task sorting and formatting', () => {
    it('tasks are sorted alphabetically within each project', async () => {
      const {stdout} = await runCommand(
        ['tasks:list', '--workspace', testWorkspacePath],
        {
          root: '..'
        }
      );
      // Check that tasks appear in alphabetical order
      const buildIndex = stdout.indexOf('Build');
      const cleanIndex = stdout.indexOf('Clean');
      const testIndex = stdout.indexOf('Test');

      expect(buildIndex).to.be.lessThan(cleanIndex);
      expect(cleanIndex).to.be.lessThan(testIndex);
    });

    it('shows workspace and project info in output header', async () => {
      const {stdout} = await runCommand(
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
      );
      expect(stdout).to.match(
        /Tasks for workspace .* and project "project1"/
      );
    });
  });
});
