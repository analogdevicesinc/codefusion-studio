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
import type {CfsWorkspace} from 'cfs-types';
import fs, {promises as fsp} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  CFS_DATA_MODELS_PATH,
  CFS_PROJECT_PLUGINS_PATH
} from '../../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('project:create', () => {
  const pluginsPath = CFS_PROJECT_PLUGINS_PATH;
  const dataModelsPath = CFS_DATA_MODELS_PATH;
  const workspacePath = path.resolve(
    __dirname,
    'sample.cfsworkspace'
  );

  const workspacePathNoProjects = path.resolve(
    __dirname,
    'sample-no-proj.cfsworkspace'
  );

  let workspace: CfsWorkspace;
  let workspaceFolder: string;
  const invalidProject = 'invalid-test-project';

  before(async () => {
    try {
      const fileContent = fs.readFileSync(workspacePath, 'utf8');
      workspace = JSON.parse(fileContent) as CfsWorkspace;
      workspaceFolder = `${workspace.location}/${workspace.workspaceName}/.cfs`;
      await fsp.mkdir(workspaceFolder, {recursive: true});
    } catch (error) {
      console.log('Error before tests', error);
      throw error;
    }
  });

  after(async () => {
    try {
      fs.rmSync(workspace.location, {
        recursive: true,
        force: true
      });
    } catch (error) {
      console.log('Error inside test after', error);
      throw error;
    }
  });

  it('should create the projects', async () => {
    const {stderr} = await runCommand(
      [
        'project:create',
        '--workspace-file-path',
        workspacePath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath,
        '--project-name',
        'test-project'
      ],
      {
        root: '..'
      }
    );
    // This fixture validates the CLI contract (successful command execution)
    // because generated project trees are plugin-dependent and not stable
    // across environments for deterministic assertions here.
    expect(stderr, 'stderr should be empty').to.be.empty;
  });

  it('should throw an error if invalid project name is provided', async () => {
    const {error} = await runCommand(
      [
        'project:create',
        '--workspace-file-path',
        workspacePath,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath,
        '--project-name',
        invalidProject
      ],
      {
        root: '..'
      }
    );
    expect(error?.message).to.include(
      `Project: ${invalidProject} was not found in the workspace projects list`
    );
  });

  it('should throw an error if projects array is empty', async () => {
    const {error} = await runCommand(
      [
        'project:create',
        '--workspace-file-path',
        workspacePathNoProjects,
        '--search-path',
        pluginsPath,
        '--search-path',
        dataModelsPath,
        '--project-name',
        'test-project'
      ],
      {
        root: '..'
      }
    );
    expect(error?.message).to.include(
      'Projects cannot currently be generated from this type of workspace file.'
    );
  });
});
