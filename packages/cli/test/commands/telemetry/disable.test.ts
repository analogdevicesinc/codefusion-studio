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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Config} from '@oclif/core';
import Sinon from 'sinon';

import TelemetryDisable from '../../../src/commands/telemetry/disable.js';

describe('telemetry disable description', () => {
  it('describes telemetry without claiming anonymity', () => {
    expect(TelemetryDisable.description).to.equal(
      'Disable telemetry.'
    );
  });
});

describe('telemetry disable classification cache', () => {
  let sandbox: Sinon.SinonSandbox;
  let tempDir: string;
  let command: TelemetryDisable;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cfs-disable-cache-')
    );
    const config = new Config({root: path.resolve('.')});
    sandbox.stub(config, 'configDir').value(tempDir);
    command = new TelemetryDisable([], config);
    sandbox.stub(command, 'jsonEnabled').returns(false);
    sandbox.stub(command, 'log');
  });

  afterEach(() => {
    sandbox.restore();
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  it('preserves the classification when disabling', async () => {
    const configPath = path.join(tempDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        telemetry: {
          version: 1,
          enabled: true,
          userId: 'existing',
          userType: 'Internal'
        }
      })
    );

    await command.run();

    expect(
      JSON.parse(fs.readFileSync(configPath, 'utf8')).telemetry
    ).to.deep.equal({
      version: 1,
      enabled: false,
      userId: 'existing',
      userType: 'Internal'
    });
  });

  it('does not mark unclassified preferences as cached', async () => {
    await command.run();
    const configPath = path.join(tempDir, 'config.json');
    expect(
      JSON.parse(fs.readFileSync(configPath, 'utf8')).telemetry
    ).to.deep.equal({
      version: 1,
      enabled: false,
      userId: '',
      userType: 'External'
    });
  });
});

function createTempConfigDir() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'cfsutil-telemetry-')
  );
  fs.mkdirSync(path.join(dir, 'cfsutil'), {
    recursive: true
  });
  return dir;
}

function readConfig(baseDir: string) {
  const configPath = path.join(baseDir, 'cfsutil', 'config.json');
  if (!fs.existsSync(configPath)) return undefined;
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

describe('telemetry disable', () => {
  let tempDir: string;
  let savedXdg: string | undefined;
  let savedConfigHome: string | undefined;

  beforeEach(() => {
    tempDir = createTempConfigDir();
    savedXdg = process.env.XDG_CONFIG_HOME;
    savedConfigHome = process.env.CFSUTIL_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tempDir;
    process.env.CFSUTIL_CONFIG_HOME = tempDir;
  });

  afterEach(() => {
    if (savedXdg === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = savedXdg;
    }

    if (savedConfigHome === undefined) {
      delete process.env.CFSUTIL_CONFIG_HOME;
    } else {
      process.env.CFSUTIL_CONFIG_HOME = savedConfigHome;
    }

    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  it('disables telemetry and confirms via text', async () => {
    const {stdout} = await runCommand(['telemetry:disable'], {
      root: '..'
    });

    expect(stdout).to.contain('Telemetry disabled');
    const config = readConfig(tempDir);
    expect(config?.telemetry?.enabled).to.equal(false);
  });

  it('disables telemetry with JSON output', async () => {
    const {stdout} = await runCommand(
      ['telemetry:disable', '--format', 'json'],
      {root: '..'}
    );

    const output = JSON.parse(stdout);
    expect(output.telemetryEnabled).to.equal(false);
  });

  it('preserves userId and userType when disabling', async () => {
    const cfsutilDir = path.join(tempDir, 'cfsutil');
    fs.writeFileSync(
      path.join(cfsutilDir, 'config.json'),
      JSON.stringify({
        telemetry: {
          version: 1,
          enabled: true,
          userId: 'keep-me',
          userType: 'External'
        }
      }),
      'utf8'
    );

    await runCommand(['telemetry:disable'], {root: '..'});

    const config = readConfig(tempDir);
    expect(config?.telemetry?.enabled).to.equal(false);
    expect(config?.telemetry?.userId).to.equal('keep-me');
    expect(config?.telemetry?.userType).to.equal('External');
  });
});
