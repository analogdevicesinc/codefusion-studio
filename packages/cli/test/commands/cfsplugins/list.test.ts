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
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CFS_PROJECT_PLUGINS_PATH, CFS_WORKSPACE_TEMPLATES_PATH} from '../../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('cfsplugins list', () => {
  const pluginsPath = CFS_PROJECT_PLUGINS_PATH;
  const workspaceTemplatesPath = CFS_WORKSPACE_TEMPLATES_PATH;

  it('should list available plugins', async () => {
    const {stdout} = await runCommand(
      ['cfsplugins:list', '-s', pluginsPath],
      {root: '..'}
    );
    expect(stdout, 'stdout should contain plugins information').to.not
      .to.be.empty;
  });

  it('should list available plugins by providing multiple plugin paths', async () => {
    const {stdout} = await runCommand(
      [
        'cfsplugins:list',
        '-s',
        pluginsPath,
        '--search-path',
        pluginsPath,
        '-s',
        '/somepath'
      ],
      {root: '..'}
    );
    expect(stdout, 'stdout should contain plugins information').to.not
      .to.be.empty;
  });

  it('should filter plugins by SoC', async () => {
    const {stdout} = await runCommand(
      ['cfsplugins:list', '-s', pluginsPath, '--soc', 'MAX32690'],
      {root: '..'}
    );
    expect(
      stdout,
      'stdout should contain filtered plugins information'
    ).to.not.to.be.empty;
  });

  it('should filter plugins by board', async () => {
    const {stdout} = await runCommand(
      ['cfsplugins:list', '-s', pluginsPath, '--board', 'EvKit_V1'],
      {root: '..'}
    );
    expect(
      stdout,
      'stdout should contain filtered plugins information'
    ).to.not.to.be.empty;
  });

  it('should filter plugins by service', async () => {
    const {stdout} = await runCommand(
      [
        'cfsplugins:list',
        '-s',
        workspaceTemplatesPath,
        '--service',
        'workspace'
      ],
      {root: '..'}
    );
    expect(
      stdout,
      'stdout should contain filtered plugins information'
    ).to.not.to.be.empty;
  });

  it('should show configuration options when requested', async () => {
    const {stdout} = await runCommand(
      ['cfsplugins:list', '-s', pluginsPath, '--config-options'],
      {root: '..'}
    );
    expect(
      stdout,
      'stdout should contain plugins with config options'
    ).to.not.to.be.empty;
  });

  it('should filter plugins by multiple criteria', async () => {
    const {stdout} = await runCommand(
      [
        'cfsplugins:list',
        '-s',
        pluginsPath,
        '--soc',
        'MAX32690',
        '--board',
        'EvKit_V1'
      ],
      {root: '..'}
    );
    expect(
      stdout,
      'stdout should contain filtered plugins information'
    ).to.not.to.be.empty;
  });
});
