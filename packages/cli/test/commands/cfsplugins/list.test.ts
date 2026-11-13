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
import {
  CFS_PROJECT_PLUGINS_PATH,
  CFS_WORKSPACE_TEMPLATES_PATH
} from '../../constants.js';
import {
  assertSuccessEnvelopeData,
  assertValidEnvelope
} from '../../utils/assert-json-envelope.js';
import {parseConfigurationOptions} from '../../utils/parse-configuration-options.js';

describe('cfsplugins list', () => {
  const pluginsPath = CFS_PROJECT_PLUGINS_PATH;
  const workspaceTemplatesPath = CFS_WORKSPACE_TEMPLATES_PATH;

  it('should list available plugins', async () => {
    const {stdout} = await runCommand(
      ['cfsplugins:list', '-s', pluginsPath],
      {
        root: '..'
      }
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
      ['cfsplugins:list', '-s', pluginsPath, '--soc', 'TEST690'],
      {root: '..'}
    );
    expect(
      stdout,
      'stdout should contain filtered plugins information'
    ).to.not.to.be.empty;
  });

  it('should filter plugins by board', async () => {
    const {stdout} = await runCommand(
      ['cfsplugins:list', '-s', pluginsPath, '--board', 'KIT_BOARD'],
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
        'TEST690',
        '--board',
        'KIT_BOARD'
      ],
      {root: '..'}
    );
    expect(
      stdout,
      'stdout should contain filtered plugins information'
    ).to.not.to.be.empty;
  });

  it('should project plugin(s) with configuration options', async () => {
    const {stdout} = await runCommand(
      [
        'cfsplugins:list',
        '-s',
        pluginsPath,
        '--soc',
        'TEST690',
        '--board',
        'VERY_SPECIAL_BOARD',
        '--config-options'
      ],
      {root: '..'}
    );

    const output = parseConfigurationOptions(stdout);
    expect(output['Project Name']).to.equal('');
    expect(output['MSDK Board Name']).to.equal('');
    expect(output['Build System']).to.deep.equal(['Ninja', 'Make']);
    expect(output['Enable Core Dump']).to.deep.equal([
      'True',
      'False'
    ]);
    expect(output['CFLAGS']).to.deep.equal([
      '-fdump-rtl-expand',
      '-fdump-rtl-dfinish',
      '-fdump-ipa-cgraph',
      '-fstack-usage',
      '-gdwarf-4'
    ]);
  });

  describe('JSON envelope', () => {
    it('returns a plugins envelope in JSON mode', async () => {
      const {stdout} = await runCommand(
        ['cfsplugins:list', '-s', pluginsPath, '--format', 'json'],
        {root: '..'}
      );

      const data = assertSuccessEnvelopeData<{
        plugins: {pluginId: string; pluginName: string}[];
      }>(stdout, 'cfsplugins list');

      expect(data.plugins).to.not.be.empty;
      for (const plugin of data.plugins) {
        expect(plugin.pluginId).to.be.a('string');
        expect(plugin.pluginName).to.be.a('string');
      }
    });

    it('returns an error envelope when no plugins match in JSON mode', async () => {
      const {stdout} = await runCommand(
        [
          'cfsplugins:list',
          '-s',
          pluginsPath,
          '--soc',
          'NONEXISTENT_SOC',
          '--format',
          'json'
        ],
        {root: '..'}
      );

      const parsed = assertValidEnvelope(stdout);

      expect(parsed.ok).to.be.false;
      if (parsed.ok) throw new Error('expected an error envelope');
      expect(parsed.command).to.equal('cfsplugins list');
      expect(parsed.errors[0]?.code).to.equal('NO_PLUGINS_FOUND');
    });

    it('omits properties.project unless --config-options is set', async () => {
      const args = [
        'cfsplugins:list',
        '-s',
        pluginsPath,
        '--soc',
        'TEST690',
        '--board',
        'VERY_SPECIAL_BOARD',
        '--format',
        'json'
      ];
      type Plugins = {
        plugins: {properties?: Record<string, unknown>}[];
      };

      const without = assertSuccessEnvelopeData<Plugins>(
        (await runCommand(args, {root: '..'})).stdout,
        'cfsplugins list'
      );
      expect(without.plugins).to.not.be.empty;
      for (const plugin of without.plugins) {
        expect(plugin.properties ?? {}).to.not.have.property(
          'project'
        );
      }

      const withOptions = assertSuccessEnvelopeData<Plugins>(
        (
          await runCommand([...args, '--config-options'], {
            root: '..'
          })
        ).stdout,
        'cfsplugins list'
      );
      expect(
        withOptions.plugins.some(
          (plugin) => plugin.properties?.project
        )
      ).to.be.true;
    });
  });
});
