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

import {assertSuccessEnvelopeData} from '../../utils/assert-json-envelope.js';

describe('myanalog:logout', () => {
  let authEnvBackup: Record<string, string | undefined>;
  let sandbox: Sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = Sinon.createSandbox();
    authEnvBackup = {
      CFS_AUTH_CALLBACK: process.env.CFS_AUTH_CALLBACK,
      CFS_AUTH_URL: process.env.CFS_AUTH_URL,
      CFS_API_URL: process.env.CFS_API_URL,
      CFS_AUTH_CLIENT_ID: process.env.CFS_AUTH_CLIENT_ID,
      CFS_SESSION_FILE: process.env.CFS_SESSION_FILE,
      CFS_API_KEY: process.env.CFS_API_KEY
    };

    process.env.CFS_AUTH_CALLBACK = 'http://localhost:3000/callback';
    process.env.CFS_AUTH_URL = 'https://example.com/auth';
    process.env.CFS_API_URL = 'https://example.com/api';
    process.env.CFS_AUTH_CLIENT_ID = 'test-client-id';
    process.env.CFS_SESSION_FILE = path.join(
      os.tmpdir(),
      `cfs-logout-test-session-${process.pid}`
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

  it('reports not logged in in text mode', async () => {
    sandbox
      .stub(SessionManager.prototype, 'getSession')
      .resolves(undefined);

    const {stdout} = await runCommand(['myanalog:logout'], {
      root: '..'
    });

    expect(stdout).to.contain('You are not logged in to myAnalog.');
  });

  it('returns loggedOut:false when there is no session', async () => {
    sandbox
      .stub(SessionManager.prototype, 'getSession')
      .resolves(undefined);

    const {stdout} = await runCommand(
      ['myanalog:logout', '--format', 'json'],
      {root: '..'}
    );

    const data = assertSuccessEnvelopeData(stdout, 'myanalog logout');
    expect(data).to.deep.equal({loggedOut: false});
  });

  it('ends the session and returns loggedOut:true', async () => {
    const endSession = sandbox.stub().resolves();
    sandbox
      .stub(SessionManager.prototype, 'getSession')
      .resolves({endSession} as any);

    const {stdout} = await runCommand(
      ['myanalog:logout', '--format', 'json'],
      {root: '..'}
    );

    const data = assertSuccessEnvelopeData(stdout, 'myanalog logout');
    expect(data).to.deep.equal({loggedOut: true});
    expect(endSession.calledOnce).to.be.true;
  });
});
