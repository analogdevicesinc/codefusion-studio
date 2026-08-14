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
  localTestRemoteUrl,
  runPkgTestsEnvVar,
  setupMockPkgCommandDeps,
  shouldSkipPkgTests
} from '../../utils/pkg-test-helpers.js';

function remoteName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

describe('pkg add-remote', () => {
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

  it('adds a remote and shows it in the remotes list', async () => {
    const name = remoteName('pkg-add-remote');

    const {
      stdout: addStdout,
      stderr: addStderr,
      error: addError
    } = await runCommand(
      ['pkg', 'add-remote', name, localTestRemoteUrl],
      {root: '..'}
    );

    expect(addError).to.be.undefined;
    expect(addStderr.trim()).to.equal('');
    expect(addStdout).to.contain(
      'Added remote package server successfully'
    );

    const {
      stdout: remotesStdout,
      stderr: remotesStderr,
      error: remotesError
    } = await runCommand(['pkg', 'list-remotes'], {root: '..'});

    expect(remotesError).to.be.undefined;
    expect(remotesStderr.trim()).to.equal('');
    expect(remotesStdout).to.contain(name);
    expect(remotesStdout).to.contain(localTestRemoteUrl);
  });
});
