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
  listRemotesOutputHasRemoteValue,
  localTestPassword,
  localTestRemoteUrl,
  localTestUsername,
  runPkgTestsEnvVar,
  setupMockPkgCommandDeps,
  shouldSkipPkgTests
} from '../../utils/pkg-test-helpers.js';

function remoteName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

describe('pkg login', () => {
  let restoreDeps: (() => void) | undefined;

  beforeEach(async () => {
    restoreDeps = await setupMockPkgCommandDeps({
      includeTestServer: false
    });
  });

  afterEach(() => {
    restoreDeps?.();
    restoreDeps = undefined;
  });

  before(async function () {
    if (shouldSkipPkgTests()) {
      console.warn(
        `Skipping pkg tests because ${runPkgTestsEnvVar} is not set to 1`
      );
      this.skip();
    }
  });

  it('logs in to a remote with user credentials', async () => {
    const name = remoteName('pkg-login');

    const {error: addError} = await runCommand(
      ['pkg', 'add-remote', name, localTestRemoteUrl],
      {root: '..'}
    );
    expect(addError).to.be.undefined;

    const {stdout, error} = await runCommand(
      [
        'pkg',
        'login',
        name,
        '--user',
        localTestUsername,
        '--password',
        localTestPassword
      ],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain('Log in successful');

    const {stdout: remotesStdout, error: remotesError} =
      await runCommand(['pkg', 'list-remotes'], {root: '..'});
    expect(remotesError).to.be.undefined;
    expect(
      listRemotesOutputHasRemoteValue(
        remotesStdout,
        name,
        `username: ${localTestUsername}`
      )
    ).to.equal(true);
  });
});
