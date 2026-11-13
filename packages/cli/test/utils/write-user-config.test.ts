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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Sinon from 'sinon';

import type {CliTelemetryConfig} from '../../src/types/cli-config.js';
import {
  readUserConfig,
  writeTelemetryDeps,
  writeTelemetryPreference
} from '../../src/utils/utils.js';

function createTempConfigDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cfsutil-config-'));
}

function makeFakeConfig(configDir: string) {
  return {configDir} as import('@oclif/core').Config;
}

const SAMPLE_TELEMETRY: CliTelemetryConfig = {
  version: 1,
  enabled: true,
  userId: 'test-uuid',
  userType: 'External'
};

describe('writeTelemetryPreference', () => {
  let tempDir: string;
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    tempDir = createTempConfigDir();
    sandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  it('creates config.json when it does not exist', () => {
    const config = makeFakeConfig(tempDir);

    writeTelemetryPreference(config, SAMPLE_TELEMETRY);

    const content = JSON.parse(
      fs.readFileSync(path.join(tempDir, 'config.json'), 'utf8')
    );
    expect(content.telemetry).to.deep.equal(SAMPLE_TELEMETRY);
  });

  it('creates config directory if it does not exist', () => {
    const nested = path.join(tempDir, 'sub', 'dir');
    const config = makeFakeConfig(nested);

    writeTelemetryPreference(config, SAMPLE_TELEMETRY);

    expect(fs.existsSync(nested)).to.equal(true);
    const content = JSON.parse(
      fs.readFileSync(path.join(nested, 'config.json'), 'utf8')
    );
    expect(content.telemetry.enabled).to.equal(true);
  });

  it('preserves existing config keys', () => {
    const configPath = path.join(tempDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        cfsInstallPath: '/opt/cfs',
        dataModelSearchPaths: ['/foo']
      }),
      'utf8'
    );

    const config = makeFakeConfig(tempDir);
    writeTelemetryPreference(config, SAMPLE_TELEMETRY);

    const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(content.cfsInstallPath).to.equal('/opt/cfs');
    expect(content.dataModelSearchPaths).to.deep.equal(['/foo']);
    expect(content.telemetry).to.deep.equal(SAMPLE_TELEMETRY);
  });

  it('replaces only the telemetry property', () => {
    const configPath = path.join(tempDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        telemetry: {
          version: 1,
          enabled: true,
          userId: 'old-id',
          userType: 'External'
        }
      }),
      'utf8'
    );

    const config = makeFakeConfig(tempDir);
    const disabled: CliTelemetryConfig = {
      ...SAMPLE_TELEMETRY,
      enabled: false
    };
    writeTelemetryPreference(config, disabled);

    const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(content.telemetry.enabled).to.equal(false);
    expect(content.telemetry.userId).to.equal('test-uuid');
  });

  it('handles corrupt config file gracefully', () => {
    const configPath = path.join(tempDir, 'config.json');
    fs.writeFileSync(configPath, 'not json!!', 'utf8');

    const config = makeFakeConfig(tempDir);
    writeTelemetryPreference(config, SAMPLE_TELEMETRY);

    const content = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(content.telemetry).to.deep.equal(SAMPLE_TELEMETRY);
  });

  it('uses atomic rename via temp file', () => {
    const config = makeFakeConfig(tempDir);
    const renameSpy = sandbox.spy(writeTelemetryDeps, 'renameSync');

    writeTelemetryPreference(config, SAMPLE_TELEMETRY);

    expect(renameSpy.calledOnce).to.equal(true);
    const [src, dest] = renameSpy.firstCall.args;
    expect(String(src)).to.include('config.json.tmp.');
    expect(String(dest)).to.equal(path.join(tempDir, 'config.json'));
  });

  it('swallows chmod failure', () => {
    const config = makeFakeConfig(tempDir);
    sandbox
      .stub(writeTelemetryDeps, 'chmodSync')
      .throws(new Error('ENOTSUP'));

    expect(() =>
      writeTelemetryPreference(config, SAMPLE_TELEMETRY)
    ).to.not.throw();

    const content = JSON.parse(
      fs.readFileSync(path.join(tempDir, 'config.json'), 'utf8')
    );
    expect(content.telemetry).to.deep.equal(SAMPLE_TELEMETRY);
  });

  it('preserves two-space indentation and final newline', () => {
    const config = makeFakeConfig(tempDir);
    writeTelemetryPreference(config, SAMPLE_TELEMETRY);

    const raw = fs.readFileSync(
      path.join(tempDir, 'config.json'),
      'utf8'
    );
    expect(raw).to.include('  "telemetry"');
    expect(raw.endsWith('\n')).to.equal(true);
  });

  it('produces output readable by readUserConfig', () => {
    const config = makeFakeConfig(tempDir);
    writeTelemetryPreference(config, SAMPLE_TELEMETRY);

    const result = readUserConfig(config);
    expect(result?.telemetry?.enabled).to.equal(true);
    expect(result?.telemetry?.userId).to.equal('test-uuid');
    expect(result?.telemetry?.version).to.equal(1);
    expect(result?.telemetry?.userType).to.equal('External');
  });
});
