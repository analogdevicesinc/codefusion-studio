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
import Sinon from 'sinon';

import hook from '../../../src/hooks/finally/telemetry-send.js';
import {
  addTelemetryMetadata,
  clearTelemetrySession,
  getTelemetrySession,
  initTelemetrySession
} from '../../../src/utils/telemetry-session.js';

function createFakeManager() {
  return {
    logAction: Sinon.stub().resolves(undefined)
  };
}

function makeHookOptions(commandId?: string, error?: Error) {
  return {
    Command: {id: commandId},
    config: {},
    error
  };
}

describe('finally hook: telemetry-send', () => {
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    clearTelemetrySession();
  });

  it('sends cli_command_completed with correct payload', async () => {
    const manager = createFakeManager();
    initTelemetrySession(manager as never, performance.now() - 42);

    const savedExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await hook.call(
        {} as never,
        makeHookOptions('test:command') as never
      );
    } finally {
      process.exitCode = savedExitCode;
    }

    expect(manager.logAction.calledOnce).to.equal(true);
    const [action, metadata] = manager.logAction.firstCall.args;
    expect(action).to.equal('cli_command_completed');
    expect(metadata.commandId).to.equal('test:command');
    expect(metadata.durationMs).to.be.a('number');
    expect(metadata.durationMs).to.be.at.least(0);
    expect(metadata.exitCode).to.equal(0);
    expect(metadata.nodeVersion).to.equal(process.versions.node);
  });

  it('includes session metadata in payload', async () => {
    const manager = createFakeManager();
    initTelemetrySession(manager as never, performance.now());
    addTelemetryMetadata({templateId: 'hello'});

    await hook.call(
      {} as never,
      makeHookOptions('test:command') as never
    );

    const metadata = manager.logAction.firstCall.args[1];
    expect(metadata.templateId).to.equal('hello');
  });

  it('reports exit code from error', async () => {
    const manager = createFakeManager();
    initTelemetrySession(manager as never, performance.now());
    const error = Object.assign(new Error('fail'), {
      exitCode: 2
    });

    const savedExitCode = process.exitCode;
    process.exitCode = undefined;
    try {
      await hook.call(
        {} as never,
        makeHookOptions('test:command', error) as never
      );
    } finally {
      process.exitCode = savedExitCode;
    }

    const metadata = manager.logAction.firstCall.args[1];
    expect(metadata.exitCode).to.equal(2);
  });

  it('clears telemetry session after send', async () => {
    const manager = createFakeManager();
    initTelemetrySession(manager as never, performance.now());

    await hook.call(
      {} as never,
      makeHookOptions('test:command') as never
    );

    expect(getTelemetrySession()).to.equal(null);
  });

  it('clears session even when logAction throws', async () => {
    const manager = createFakeManager();
    manager.logAction.rejects(new Error('network'));
    initTelemetrySession(manager as never, performance.now());

    await hook.call(
      {} as never,
      makeHookOptions('test:command') as never
    );

    expect(getTelemetrySession()).to.equal(null);
  });

  it('skips send when no session is initialized', async () => {
    clearTelemetrySession();

    await hook.call(
      {} as never,
      makeHookOptions('test:command') as never
    );

    expect(getTelemetrySession()).to.equal(null);
  });

  it('respects timeout when logAction stalls', async () => {
    const never = new Promise<undefined>(() => {});
    const manager = {
      logAction: Sinon.stub().returns(never)
    };
    initTelemetrySession(manager as never, performance.now());

    await hook.call(
      {} as never,
      makeHookOptions('test:command') as never
    );

    expect(getTelemetrySession()).to.equal(null);
  });
});
