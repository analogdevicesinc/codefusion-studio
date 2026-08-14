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
import {
  localTestRemoteUrl,
  runPkgCommandWithAuthRetry,
  runPkgTestsEnvVar,
  setupMockPkgCommandDeps,
  shouldSkipPkgTests
} from '../../utils/pkg-test-helpers.js';

function remoteName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

describe('pkg delete-remote', () => {
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

  it('removes a previously added remote', async () => {
    const name = remoteName('pkg-delete-remote');

    const {error: addError} = await runPkgCommandWithAuthRetry([
      'pkg',
      'add-remote',
      name,
      localTestRemoteUrl
    ]);
    expect(addError).to.be.undefined;

    const {
      stdout: deleteStdout,
      stderr: deleteStderr,
      error: deleteError
    } = await runPkgCommandWithAuthRetry([
      'pkg',
      'delete-remote',
      name
    ]);

    expect(deleteError).to.be.undefined;
    expect(deleteStderr.trim()).to.equal('');
    expect(deleteStdout).to.contain(
      'Removed remote package server successfully'
    );

    const {stdout: remotesStdout, error: remotesError} =
      await runPkgCommandWithAuthRetry(['pkg', 'list-remotes']);

    expect(remotesError).to.be.undefined;
    expect(remotesStdout).to.not.contain(name);
  });
});
