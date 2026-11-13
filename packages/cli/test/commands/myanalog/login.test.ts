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
import {SessionManager} from 'cfs-lib';
import os from 'node:os';
import path from 'node:path';
import Sinon from 'sinon';

import {
  assertSuccessEnvelopeData,
  assertValidEnvelope,
  type CliErrorEnvelope
} from '../../utils/assert-json-envelope.js';
import {sessionUrlDeps} from '../../../dist/utils/session-manager.js';

const session = {
  userId: 'test-user-id',
  userEmail: 'test@example.com',
  scopes: ['cfs/dev-ccm:read']
};

describe('myanalog:login', () => {
  let authEnvBackup: Record<string, string | undefined>;
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    authEnvBackup = {
      CFS_AUTH_CALLBACK: process.env.CFS_AUTH_CALLBACK,
      CFS_AUTH_URL: process.env.CFS_AUTH_URL,
      CFS_API_URL: process.env.CFS_API_URL,
      CFS_AUTH_CLIENT_ID: process.env.CFS_AUTH_CLIENT_ID,
      CFS_SESSION_FILE: process.env.CFS_SESSION_FILE
    };

    process.env.CFS_AUTH_CALLBACK = 'http://localhost:3000/callback';
    process.env.CFS_AUTH_URL = 'https://example.com/auth';
    process.env.CFS_API_URL = 'https://example.com/api';
    process.env.CFS_AUTH_CLIENT_ID = 'test-client-id';
    process.env.CFS_SESSION_FILE = path.join(
      os.tmpdir(),
      `cfs-login-test-session-${process.pid}`
    );
  });

  afterEach(() => {
    sandbox.restore();
    for (const [key, value] of Object.entries(authEnvBackup)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('logs in and reports the session in text mode', async () => {
    sandbox
      .stub(SessionManager.prototype, 'getSession')
      .resolves(undefined);
    sandbox
      .stub(SessionManager.prototype, 'createSession')
      .resolves(session as any);

    const {stdout} = await runCommand(['myanalog:login'], {
      root: '..'
    });

    expect(stdout).to.contain(
      'You are logged in to myAnalog as test@example.com.'
    );
  });

  it('returns the new session in JSON mode', async () => {
    sandbox
      .stub(SessionManager.prototype, 'getSession')
      .resolves(undefined);
    sandbox
      .stub(SessionManager.prototype, 'createSession')
      .resolves(session as any);

    const {stdout} = await runCommand(
      ['myanalog:login', '--format', 'json'],
      {root: '..'}
    );

    const data = assertSuccessEnvelopeData(stdout, 'myanalog login');
    expect(data).to.deep.equal({
      loggedIn: true,
      alreadyLoggedIn: false,
      userEmail: 'test@example.com',
      userId: 'test-user-id',
      scopes: ['cfs/dev-ccm:read']
    });
  });

  it('keeps the authorization prompt off stdout in JSON mode', async () => {
    const authUrl = 'https://example.com/auth?code=abc';
    const openUrl = sandbox
      .stub(sessionUrlDeps, 'openUrl')
      .resolves();
    sandbox
      .stub(SessionManager.prototype, 'getSession')
      .resolves(undefined);
    sandbox
      .stub(SessionManager.prototype, 'createSession')
      .callsFake(async function (this: any) {
        await this.authCfg.sessionUrlHandler(new URL(authUrl));
        return session;
      });

    const {stdout, stderr} = await runCommand(
      ['myanalog:login', '--format', 'json'],
      {root: '..'}
    );

    assertSuccessEnvelopeData(stdout, 'myanalog login');
    expect(stdout).to.not.contain(authUrl);
    expect(stderr).to.contain(authUrl);
    expect(openUrl.calledOnceWithExactly(authUrl)).to.be.true;
  });

  it('uses the default authorization prompt in text mode', async () => {
    let handler: unknown = 'unset';
    sandbox
      .stub(SessionManager.prototype, 'getSession')
      .resolves(undefined);
    sandbox
      .stub(SessionManager.prototype, 'createSession')
      .callsFake(async function (this: any) {
        handler = this.authCfg.sessionUrlHandler;
        return session;
      });

    await runCommand(['myanalog:login'], {root: '..'});

    expect(handler).to.be.undefined;
  });

  it('reports an existing session without creating a new one', async () => {
    sandbox
      .stub(SessionManager.prototype, 'getSession')
      .resolves(session as any);
    const createSession = sandbox.stub(
      SessionManager.prototype,
      'createSession'
    );

    const {stdout} = await runCommand(
      ['myanalog:login', '--format', 'json'],
      {root: '..'}
    );

    const data = assertSuccessEnvelopeData<{
      alreadyLoggedIn: boolean;
    }>(stdout, 'myanalog login');
    expect(data.alreadyLoggedIn).to.be.true;
    expect(createSession.called).to.be.false;
  });

  it('returns an error envelope when login fails', async () => {
    sandbox
      .stub(SessionManager.prototype, 'getSession')
      .resolves(undefined);
    sandbox
      .stub(SessionManager.prototype, 'createSession')
      .rejects(new Error('boom'));

    const {stdout} = await runCommand(
      ['myanalog:login', '--format', 'json'],
      {root: '..'}
    );

    const parsed = assertValidEnvelope(stdout);
    expect(parsed.ok).to.be.false;
    expect(
      (parsed as CliErrorEnvelope).errors[0]?.message
    ).to.contain(
      'An error occurred while trying to log in to myAnalog.'
    );
  });
});
