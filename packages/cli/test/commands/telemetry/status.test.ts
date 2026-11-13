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

import TelemetryStatus, {
  telemetryStatusDeps
} from '../../../src/commands/telemetry/status.js';
import {TELEMETRY_DISCLOSURE} from '../../../src/utils/telemetry-disclosure.js';

describe('telemetry status privacy disclosure', () => {
  let sandbox: Sinon.SinonSandbox;
  let tempDir: string;
  let command: TelemetryStatus;
  let logStub: Sinon.SinonStub;
  let jsonEnabledStub: Sinon.SinonStub;
  let suppressionStub: Sinon.SinonStub;
  let originalIsTTY: boolean | undefined;
  let originalCI: string | undefined;
  let originalDoNotTrack: string | undefined;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'cfsutil-telemetry-status-')
    );
    originalIsTTY = process.stdin.isTTY;
    originalCI = process.env.CI;
    originalDoNotTrack = process.env.DO_NOT_TRACK;
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true
    });
    delete process.env.CI;
    delete process.env.DO_NOT_TRACK;
    const config = new Config({root: path.resolve('.')});
    sandbox.stub(config, 'configDir').value(tempDir);
    command = new TelemetryStatus([], config);
    jsonEnabledStub = sandbox
      .stub(command, 'jsonEnabled')
      .returns(false);
    logStub = sandbox.stub(command, 'log');
    suppressionStub = sandbox
      .stub(telemetryStatusDeps, 'isTelemetrySuppressed')
      .returns(false);
  });

  afterEach(() => {
    sandbox.restore();
    fs.rmSync(tempDir, {recursive: true, force: true});
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      configurable: true
    });
    if (originalCI === undefined) delete process.env.CI;
    else process.env.CI = originalCI;
    if (originalDoNotTrack === undefined)
      delete process.env.DO_NOT_TRACK;
    else process.env.DO_NOT_TRACK = originalDoNotTrack;
  });

  for (const enabled of [true, false, undefined]) {
    it(`prints the full disclosure when preference is ${enabled}`, async () => {
      if (enabled !== undefined) {
        fs.writeFileSync(
          path.join(tempDir, 'config.json'),
          JSON.stringify({telemetry: {enabled}})
        );
      }

      await command.run();

      if (enabled === undefined) {
        expect(
          fs.existsSync(path.join(tempDir, 'config.json'))
        ).to.equal(false);
      }

      const status =
        enabled === undefined
          ? 'not configured'
          : enabled
            ? 'enabled'
            : 'disabled';
      if (enabled === undefined) {
        expect(logStub.firstCall.args[0]).to.contain(
          `Telemetry: ${status}`
        );
      } else {
        expect(logStub.firstCall.args[0]).to.equal(
          `Telemetry: ${status}`
        );
      }
      expect(
        logStub.calledWith('\n' + TELEMETRY_DISCLOSURE)
      ).to.equal(true);
      if (enabled === true) {
        expect(logStub.lastCall.args[0]).to.equal(
          '\nTo disable telemetry, run: cfs telemetry disable'
        );
        expect(logStub.lastCall.args[0]).not.to.contain(
          'telemetry enable'
        );
      } else if (enabled === false) {
        expect(logStub.lastCall.args[0]).to.equal(
          '\nTo enable telemetry, run: cfs telemetry enable'
        );
        expect(logStub.lastCall.args[0]).not.to.contain(
          'telemetry disable'
        );
      }
      expect(logStub.lastCall.args[0]).not.to.contain('Press Y');
    });
  }

  for (const enabled of [true, false, undefined]) {
    it(`prints preference-appropriate guidance when suppressed and preference is ${enabled}`, async () => {
      suppressionStub.returns(true);
      if (enabled !== undefined) {
        fs.writeFileSync(
          path.join(tempDir, 'config.json'),
          JSON.stringify({telemetry: {enabled}})
        );
      }

      await command.run();

      const status =
        enabled === undefined
          ? 'not configured'
          : enabled
            ? 'enabled'
            : 'disabled';
      expect(logStub.firstCall.args[0]).to.contain(
        `Telemetry: ${status}`
      );
      expect(logStub.secondCall.args[0]).to.equal(
        'Telemetry: suppressed (CFS_TELEMETRY_DISABLED is set)'
      );
      expect(
        logStub.calledWith('\n' + TELEMETRY_DISCLOSURE)
      ).to.equal(true);
      expect(logStub.lastCall.args[0]).to.contain(
        enabled === true
          ? 'cfs telemetry disable'
          : 'cfs telemetry enable'
      );
      if (enabled === undefined) {
        expect(logStub.lastCall.args[0]).to.contain(
          'cfs telemetry disable'
        );
      }
    });
  }

  it('does not prompt or change config when preference is unset', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'config.json'),
      JSON.stringify({other: 'preserved'})
    );

    await command.run();

    expect(
      fs.readFileSync(path.join(tempDir, 'config.json'), 'utf8')
    ).to.equal(JSON.stringify({other: 'preserved'}));
    expect(logStub.firstCall.args[0]).to.contain('not configured');
    expect(logStub.lastCall.args[0]).to.contain(
      'cfs telemetry enable'
    );
  });

  it('does not prompt in non-interactive mode', async () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: undefined,
      configurable: true
    });
    try {
      await command.run();
      expect(logStub.firstCall.args[0]).to.contain('not configured');
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: true,
        configurable: true
      });
    }
  });

  it('preserves JSON output without appending disclosure text', async () => {
    jsonEnabledStub.returns(true);
    const jsonStub = sandbox.stub(command, 'logJson');

    await command.run();

    expect(jsonStub.calledOnce).to.equal(true);
    expect(jsonStub.firstCall.args[0]).to.have.all.keys(
      'telemetryEnabled',
      'telemetrySuppressed',
      'nonInteractiveSession'
    );
    expect(logStub.called).to.equal(false);
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

describe('telemetry status', () => {
  let tempDir: string;
  let savedXdg: string | undefined;
  let savedConfigHome: string | undefined;
  let savedSuppressed: string | undefined;

  beforeEach(() => {
    tempDir = createTempConfigDir();
    savedXdg = process.env.XDG_CONFIG_HOME;
    savedConfigHome = process.env.CFSUTIL_CONFIG_HOME;
    savedSuppressed = process.env.CFS_TELEMETRY_DISABLED;
    process.env.XDG_CONFIG_HOME = tempDir;
    process.env.CFSUTIL_CONFIG_HOME = tempDir;
    delete process.env.CFS_TELEMETRY_DISABLED;
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

    if (savedSuppressed === undefined) {
      delete process.env.CFS_TELEMETRY_DISABLED;
    } else {
      process.env.CFS_TELEMETRY_DISABLED = savedSuppressed;
    }

    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  it('shows "enabled" when telemetry is on', async () => {
    const cfsutilDir = path.join(tempDir, 'cfsutil');
    fs.writeFileSync(
      path.join(cfsutilDir, 'config.json'),
      JSON.stringify({
        telemetry: {
          version: 1,
          enabled: true,
          userId: 'u',
          userType: 'External'
        }
      }),
      'utf8'
    );

    const {stdout} = await runCommand(['telemetry:status'], {
      root: '..'
    });

    expect(stdout).to.contain('Telemetry: enabled');
  });

  it('shows "disabled" when telemetry is off', async () => {
    const cfsutilDir = path.join(tempDir, 'cfsutil');
    fs.writeFileSync(
      path.join(cfsutilDir, 'config.json'),
      JSON.stringify({
        telemetry: {
          version: 1,
          enabled: false,
          userId: '',
          userType: 'External'
        }
      }),
      'utf8'
    );

    const {stdout} = await runCommand(['telemetry:status'], {
      root: '..'
    });

    expect(stdout).to.contain('Telemetry: disabled');
  });

  it('shows "not configured" when no preference is set', async () => {
    const {stdout} = await runCommand(['telemetry:status'], {
      root: '..'
    });

    expect(stdout).to.contain('not configured');
  });

  it('shows "suppressed" when CFS_TELEMETRY_DISABLED=1', async () => {
    process.env.CFS_TELEMETRY_DISABLED = '1';

    const {stdout} = await runCommand(['telemetry:status'], {
      root: '..'
    });

    expect(stdout).to.contain('suppressed');
  });

  it('returns JSON format with telemetry state', async () => {
    const cfsutilDir = path.join(tempDir, 'cfsutil');
    fs.writeFileSync(
      path.join(cfsutilDir, 'config.json'),
      JSON.stringify({
        telemetry: {
          version: 1,
          enabled: true,
          userId: 'u',
          userType: 'External'
        }
      }),
      'utf8'
    );

    const {stdout} = await runCommand(
      ['telemetry:status', '--format', 'json'],
      {root: '..'}
    );

    const output = JSON.parse(stdout);
    expect(output.telemetryEnabled).to.equal(true);
    expect(output).to.have.property('nonInteractiveSession');
    expect(output).to.have.property('telemetrySuppressed');
  });

  it('returns null for unconfigured telemetry in JSON', async () => {
    const {stdout} = await runCommand(
      ['telemetry:status', '--format', 'json'],
      {root: '..'}
    );

    const output = JSON.parse(stdout);
    expect(output.telemetryEnabled).to.equal(null);
  });
});
