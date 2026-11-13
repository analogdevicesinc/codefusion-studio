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
import {UserType} from 'cfs-lib';

import hook, {
  telemetryConsentDeps
} from '../../../src/hooks/prerun/telemetry-consent.js';
import {
  clearTelemetrySession,
  getTelemetrySession
} from '../../../src/utils/telemetry-session.js';

function createTempConfigDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cfsutil-telemetry-'));
}

function makeHookOptions(configDir: string, commandId?: string) {
  return {
    Command: {id: commandId},
    argv: [],
    config: {configDir}
  };
}

function readConfig(configDir: string) {
  const configPath = path.join(configDir, 'config.json');
  if (!fs.existsSync(configPath)) return undefined;
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

describe('prerun hook: telemetry-consent', () => {
  let sandbox: Sinon.SinonSandbox;
  let tempDir: string;
  let telemetrySuppressionStub: Sinon.SinonStub;
  let userTypeStub: Sinon.SinonStub;
  let originalIsTTY: boolean | undefined;
  let originalDoNotTrack: string | undefined;
  let originalSuppressed: string | undefined;
  let originalCI: string | undefined;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    userTypeStub = sandbox
      .stub(telemetryConsentDeps, 'determineTelemetryUserType')
      .resolves(UserType.EXTERNAL);
    telemetrySuppressionStub = sandbox
      .stub(telemetryConsentDeps, 'isTelemetrySuppressed')
      .returns(false);
    tempDir = createTempConfigDir();
    originalIsTTY = process.stdin.isTTY;
    originalDoNotTrack = process.env.DO_NOT_TRACK;
    originalSuppressed = process.env.CFS_TELEMETRY_DISABLED;
    originalCI = process.env.CI;

    delete process.env.DO_NOT_TRACK;
    delete process.env.CFS_TELEMETRY_DISABLED;
    delete process.env.CI;
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    sandbox.restore();
    clearTelemetrySession();
    fs.rmSync(tempDir, {recursive: true, force: true});
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      writable: true,
      configurable: true
    });
    if (originalDoNotTrack === undefined) {
      delete process.env.DO_NOT_TRACK;
    } else {
      process.env.DO_NOT_TRACK = originalDoNotTrack;
    }

    if (originalSuppressed === undefined) {
      delete process.env.CFS_TELEMETRY_DISABLED;
    } else {
      process.env.CFS_TELEMETRY_DISABLED = originalSuppressed;
    }

    if (originalCI === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCI;
    }
  });

  it('skips prompt for telemetry:enable command', async () => {
    const inputStub = sandbox
      .stub(telemetryConsentDeps, 'input')
      .resolves('Y');

    await hook.call(
      {} as never,
      makeHookOptions(tempDir, 'telemetry:enable') as never
    );

    expect(inputStub.called).to.equal(false);
  });

  it('skips prompt for telemetry:disable command', async () => {
    const inputStub = sandbox
      .stub(telemetryConsentDeps, 'input')
      .resolves('Y');

    await hook.call(
      {} as never,
      makeHookOptions(tempDir, 'telemetry:disable') as never
    );

    expect(inputStub.called).to.equal(false);
  });

  it('skips prompt for telemetry:status command', async () => {
    const inputStub = sandbox
      .stub(telemetryConsentDeps, 'input')
      .resolves('Y');

    await hook.call(
      {} as never,
      makeHookOptions(tempDir, 'telemetry:status') as never
    );

    expect(inputStub.called).to.equal(false);
  });

  it('skips when telemetry is suppressed', async () => {
    process.env.CFS_TELEMETRY_DISABLED = '1';
    telemetrySuppressionStub.callsFake(
      (env) => env.CFS_TELEMETRY_DISABLED === '1'
    );

    const inputStub = sandbox
      .stub(telemetryConsentDeps, 'input')
      .resolves('Y');

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    expect(inputStub.called).to.equal(false);
    expect(getTelemetrySession()).to.equal(null);
  });

  it('skips prompt when telemetry is already enabled', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'config.json'),
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

    const inputStub = sandbox
      .stub(telemetryConsentDeps, 'input')
      .resolves('Y');

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    expect(inputStub.called).to.equal(false);
  });

  it('skips prompt when telemetry is already disabled', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'config.json'),
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

    const inputStub = sandbox
      .stub(telemetryConsentDeps, 'input')
      .resolves('Y');

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    expect(inputStub.called).to.equal(false);
  });

  it('skips prompt in non-interactive session', async () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: undefined,
      writable: true,
      configurable: true
    });

    const inputStub = sandbox
      .stub(telemetryConsentDeps, 'input')
      .resolves('Y');

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    expect(inputStub.called).to.equal(false);
  });

  it('writes nested telemetry config when user shares data', async () => {
    sandbox.stub(telemetryConsentDeps, 'input').resolves('Y');

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    const config = readConfig(tempDir);
    expect(config.telemetry.enabled).to.equal(true);
    expect(config.telemetry.userId).to.be.a('string');
    expect(config.telemetry.userId.length).to.be.greaterThan(0);
    expect(config.telemetry.version).to.equal(1);
    expect(config.telemetry.userType).to.equal('External');
  });

  it('writes telemetry disabled without userId when user declines', async () => {
    sandbox.stub(telemetryConsentDeps, 'input').resolves('N');

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    const config = readConfig(tempDir);
    expect(config.telemetry.enabled).to.equal(false);
    expect(config.telemetry.userId).to.equal('');
    expect(config.telemetry.version).to.equal(1);
    expect(userTypeStub.called).to.equal(false);
  });

  it('persists internal classification before initializing telemetry', async () => {
    userTypeStub.resolves(UserType.INTERNAL);
    sandbox.stub(telemetryConsentDeps, 'input').resolves('Y');

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    expect(readConfig(tempDir).telemetry.userType).to.equal(
      'Internal'
    );
    expect(userTypeStub.calledOnce).to.equal(true);
    expect(getTelemetrySession()).not.to.equal(null);
  });

  for (const userType of [UserType.INTERNAL, UserType.EXTERNAL]) {
    it(`reuses cached ${userType} classification without checks or config writes`, async () => {
      const configPath = path.join(tempDir, 'config.json');
      const original = JSON.stringify({
        telemetry: {
          version: 1,
          enabled: true,
          userId: 'existing',
          userType
        }
      });
      fs.writeFileSync(configPath, original);
      userTypeStub.rejects(new Error('must not check'));

      await hook.call({} as never, makeHookOptions(tempDir) as never);
      clearTelemetrySession();
      await hook.call({} as never, makeHookOptions(tempDir) as never);

      expect(userTypeStub.called).to.equal(false);
      expect(fs.readFileSync(configPath, 'utf8')).to.equal(original);
      expect(getTelemetrySession()).not.to.equal(null);
    });
  }

  it('reclassifies invalid cached user types before initializing', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'config.json'),
      JSON.stringify({
        telemetry: {
          version: 1,
          enabled: true,
          userId: 'existing',
          userType: 'invalid'
        }
      })
    );

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    expect(userTypeStub.calledOnce).to.equal(true);
    expect(readConfig(tempDir).telemetry.userType).to.equal(
      'External'
    );
    expect(getTelemetrySession()).not.to.equal(null);
  });

  it('warns and does not initialize telemetry if classification fails', async () => {
    sandbox.stub(telemetryConsentDeps, 'input').resolves('Y');
    userTypeStub.rejects(new Error('local check failed'));
    const warn = sandbox.stub();

    await hook.call(
      {warn} as never,
      makeHookOptions(tempDir) as never
    );

    expect(warn.calledOnce).to.equal(true);
    expect(readConfig(tempDir)).to.equal(undefined);
    expect(getTelemetrySession()).to.equal(null);
  });

  it('does not send when an unrecognized cached classification cannot be refreshed', async () => {
    fs.writeFileSync(
      path.join(tempDir, 'config.json'),
      JSON.stringify({
        telemetry: {
          version: 1,
          enabled: true,
          userId: 'existing',
          userType: 'Unknown'
        }
      })
    );
    userTypeStub.rejects(new Error('local check failed'));
    const warn = sandbox.stub();
    await hook.call(
      {warn} as never,
      makeHookOptions(tempDir) as never
    );
    expect(warn.calledOnce).to.equal(true);
    expect(getTelemetrySession()).to.equal(null);
    expect(readConfig(tempDir).telemetry.userType).to.equal(
      'Unknown'
    );
    expect(readConfig(tempDir).telemetry.version).to.equal(1);
  });

  it('validates consent input case-insensitively and after trimming', async () => {
    const inputStub = sandbox
      .stub(telemetryConsentDeps, 'input')
      .resolves(' y ');

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    const config = readConfig(tempDir);
    expect(config.telemetry.enabled).to.equal(true);

    const {message, validate} = inputStub.firstCall.args[0];
    expect(message).to.equal(
      'CodeFusion Studio CLI collects diagnostic and usage data, including tool ' +
        'version, operating system, command categories, performance metrics, and ' +
        'error codes, to improve usability and performance. A randomly generated ' +
        'usage identifier is stored locally to link your sessions. No source code, ' +
        'file paths, credentials, or personal details are collected. To distinguish ' +
        'ADI-internal from external use, CFS checks locally whether you are signed ' +
        'in to myAnalog with an ADI account or using an ADI-managed computer; only ' +
        'the result is shared. To learn more, ' +
        'view our Privacy Policy at https://www.analog.com/en/who-we-are/' +
        'legal-and-risk-oversight/data-privacy/privacy-policy.html.\n' +
        '\n' +
        'You can change this setting at any time by running: cfs telemetry disable\n' +
        '\n' +
        'Press Y to consent to data sharing, or press N to decline.'
    );
    expect(validate('Y')).to.equal(true);
    expect(validate('n')).to.equal(true);
    expect(validate(' y ')).to.equal(true);
    expect(validate(' N ')).to.equal(true);
    expect(validate('yes')).to.equal('Please enter Y or N.');
    expect(validate('')).to.equal('Please enter Y or N.');
  });

  it('initializes telemetry session when user shares data', async () => {
    sandbox.stub(telemetryConsentDeps, 'input').resolves('Y');

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    expect(getTelemetrySession()).to.not.equal(null);
  });

  it('does not initialize session when user declines', async () => {
    sandbox.stub(telemetryConsentDeps, 'input').resolves('N');

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    expect(getTelemetrySession()).to.equal(null);
  });

  it('handles prompt cancellation gracefully', async () => {
    sandbox
      .stub(telemetryConsentDeps, 'input')
      .rejects(new Error('User cancelled'));

    await hook.call({} as never, makeHookOptions(tempDir) as never);

    const config = readConfig(tempDir);
    expect(config).to.be.undefined;
    expect(getTelemetrySession()).to.equal(null);
  });
});
