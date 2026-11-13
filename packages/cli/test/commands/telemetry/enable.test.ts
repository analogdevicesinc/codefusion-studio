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
import {UserType} from 'cfs-lib';
import Sinon from 'sinon';

import TelemetryEnable, {
  telemetryEnableDeps
} from '../../../src/commands/telemetry/enable.js';
import {telemetryEnableDeps as compiledTelemetryEnableDeps} from '../../../dist/commands/telemetry/enable.js';

describe('telemetry enable description', () => {
  it('describes telemetry without claiming anonymity', () => {
    expect(TelemetryEnable.description).to.equal('Enable telemetry.');
  });
});

describe('telemetry enable local classification', () => {
  let sandbox: Sinon.SinonSandbox;
  let tempDir: string;
  let command: TelemetryEnable;
  let classify: Sinon.SinonStub;
  let fetchStub: Sinon.SinonStub;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    fetchStub = sandbox
      .stub(globalThis, 'fetch')
      .resolves(new Response(null, {status: 204}));
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cfs-enable-local-')
    );
    const config = new Config({root: path.resolve('.')});
    sandbox.stub(config, 'configDir').value(tempDir);
    command = new TelemetryEnable([], config);
    sandbox.stub(command, 'jsonEnabled').returns(false);
    sandbox.stub(command, 'log');
    classify = sandbox
      .stub(telemetryEnableDeps, 'determineTelemetryUserType')
      .resolves(UserType.INTERNAL);
  });

  afterEach(() => {
    sandbox.restore();
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  for (const enabled of [undefined, false, true]) {
    it(`persists local classification for previously ${enabled} telemetry`, async () => {
      if (enabled !== undefined) {
        fs.writeFileSync(
          path.join(tempDir, 'config.json'),
          JSON.stringify({
            telemetry: {
              version: 1,
              enabled,
              userId: 'existing',
              userType: 'External'
            }
          })
        );
      }
      await command.run();
      const config = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'config.json'), 'utf8')
      );
      expect(config.telemetry.userType).to.equal('Internal');
      expect(config.telemetry.enabled).to.equal(true);
      expect(config.telemetry.version).to.equal(1);
      if (enabled !== undefined)
        expect(config.telemetry.userId).to.equal('existing');
      expect(classify.calledOnce).to.equal(true);
      expect(fetchStub.called).to.equal(false);
    });
  }

  describe('telemetry transport isolation', () => {
    let originalIsTTY: PropertyDescriptor | undefined;

    beforeEach(() => {
      originalIsTTY = Object.getOwnPropertyDescriptor(
        process.stdin,
        'isTTY'
      );
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true
      });
      sandbox.stub(process, 'env').value({
        ...process.env,
        CI: '',
        DO_NOT_TRACK: '',
        CFS_TELEMETRY_URL: 'https://telemetry.invalid',
        CFS_TELEMETRY_APP_ID: 'test-app'
      });
    });

    afterEach(() => {
      if (originalIsTTY) {
        Object.defineProperty(process.stdin, 'isTTY', originalIsTTY);
      } else {
        Reflect.deleteProperty(process.stdin, 'isTTY');
      }
    });

    it('suppresses transport in an interactive session by default', async () => {
      expect(process.env.CFS_TELEMETRY_DISABLED).to.equal('1');

      await command.run();

      expect(fetchStub.called).to.equal(false);
    });

    for (const suppressed of [undefined, '0']) {
      it(`sends consent through mocked transport when suppression is ${suppressed}`, async () => {
        if (suppressed === undefined) {
          delete process.env.CFS_TELEMETRY_DISABLED;
        } else {
          process.env.CFS_TELEMETRY_DISABLED = suppressed;
        }

        await command.run();

        expect(fetchStub.calledOnce).to.equal(true);
        expect(fetchStub.firstCall.args[0]).to.equal(
          'https://telemetry.invalid'
        );
        const payload = JSON.parse(fetchStub.firstCall.args[1].body);
        expect(payload.message.event.action).to.equal(
          'telemetry_consent_given'
        );
      });
    }
  });

  for (const enabled of [false, true]) {
    it(`refreshes cached classification when enabling previously ${enabled} telemetry`, async () => {
      fs.writeFileSync(
        path.join(tempDir, 'config.json'),
        JSON.stringify({
          telemetry: {
            version: 1,
            enabled,
            userId: 'existing',
            userType: 'External'
          }
        })
      );

      await command.run();

      const config = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'config.json'), 'utf8')
      );
      expect(config.telemetry).to.deep.equal({
        version: 1,
        enabled: true,
        userId: 'existing',
        userType: 'Internal'
      });
      expect(classify.calledOnce).to.equal(true);
    });
  }

  it('preserves existing preferences when explicit refresh fails', async () => {
    const configPath = path.join(tempDir, 'config.json');
    const original = JSON.stringify({
      telemetry: {
        version: 1,
        enabled: true,
        userId: 'existing',
        userType: 'External'
      }
    });
    fs.writeFileSync(configPath, original);
    classify.rejects(new Error('local check failed'));
    let error: unknown;
    try {
      await command.run();
    } catch (caught) {
      error = caught;
    }
    expect(error).to.be.instanceOf(Error);
    expect(fs.readFileSync(configPath, 'utf8')).to.equal(original);
  });

  it('does not enable telemetry when local checks fail', async () => {
    classify.rejects(new Error('local check failed'));
    let error: unknown;
    try {
      await command.run();
    } catch (caught) {
      error = caught;
    }
    expect(error).to.be.instanceOf(Error);
    expect(fs.existsSync(path.join(tempDir, 'config.json'))).to.equal(
      false
    );
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

describe('telemetry enable', () => {
  let sandbox: Sinon.SinonSandbox;
  let tempDir: string;
  let savedXdg: string | undefined;
  let savedConfigHome: string | undefined;
  let savedSuppressed: string | undefined;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    sandbox
      .stub(compiledTelemetryEnableDeps, 'determineTelemetryUserType')
      .resolves(UserType.EXTERNAL);
    tempDir = createTempConfigDir();
    savedXdg = process.env.XDG_CONFIG_HOME;
    savedConfigHome = process.env.CFSUTIL_CONFIG_HOME;
    savedSuppressed = process.env.CFS_TELEMETRY_DISABLED;
    process.env.XDG_CONFIG_HOME = tempDir;
    process.env.CFSUTIL_CONFIG_HOME = tempDir;
    process.env.CFS_TELEMETRY_DISABLED = '1';
  });

  afterEach(() => {
    sandbox.restore();
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

    if (savedSuppressed === undefined) {
      delete process.env.CFS_TELEMETRY_DISABLED;
    } else {
      process.env.CFS_TELEMETRY_DISABLED = savedSuppressed;
    }

    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  it('enables telemetry and confirms via text', async () => {
    const {stdout} = await runCommand(['telemetry:enable'], {
      root: '..'
    });

    expect(stdout).to.contain('Telemetry enabled');
    const config = readConfig(tempDir);
    expect(config?.telemetry?.enabled).to.equal(true);
    expect(config?.telemetry?.userId).to.be.a('string');
    expect(config?.telemetry?.version).to.equal(1);
    expect(config?.telemetry?.userType).to.equal('External');
  });

  it('enables telemetry with JSON output', async () => {
    const {stdout} = await runCommand(
      ['telemetry:enable', '--format', 'json'],
      {root: '..'}
    );

    const output = JSON.parse(stdout);
    expect(output.telemetryEnabled).to.equal(true);
  });

  it('preserves existing userId on re-enable', async () => {
    const cfsutilDir = path.join(tempDir, 'cfsutil');
    fs.writeFileSync(
      path.join(cfsutilDir, 'config.json'),
      JSON.stringify({
        telemetry: {
          version: 1,
          enabled: false,
          userId: 'existing-id',
          userType: 'External'
        }
      }),
      'utf8'
    );

    await runCommand(['telemetry:enable'], {root: '..'});

    const config = readConfig(tempDir);
    expect(config?.telemetry?.enabled).to.equal(true);
    expect(config?.telemetry?.userId).to.equal('existing-id');
  });
});
