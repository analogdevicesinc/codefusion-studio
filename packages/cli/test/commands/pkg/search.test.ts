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
  runPkgCommandWithAuthRetry,
  shouldSkipPkgTests,
  runPkgTestsEnvVar,
  setupMockPkgCommandDeps
} from '../../utils/pkg-test-helpers.js';
import {assertValidEnvelope} from '../../utils/assert-json-envelope.js';

describe('pkg search', () => {
  const packagePattern = 'test_pkg1*';
  let restoreDeps: (() => void) | undefined;

  beforeEach(async () => {
    restoreDeps = await setupMockPkgCommandDeps();
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

  it('returns packages from the configured remote server', async () => {
    const {
      stdout: searchStdout,
      stderr: searchStderr,
      error: searchError
    } = await runPkgCommandWithAuthRetry([
      'pkg',
      'search',
      packagePattern
    ]);

    expect(searchError).to.be.undefined;
    expect(
      searchStderr.trim(),
      'search stderr should be empty'
    ).to.equal('');
    expect(searchStdout).to.contain(
      'Packages available for installation:'
    );
    expect(searchStdout).to.contain('- test_pkg1/1.0');
  });

  it('returns matching packages as the JSON envelope data payload', async () => {
    const {stdout, error} = await runPkgCommandWithAuthRetry([
      'pkg',
      'search',
      packagePattern,
      '--format',
      'json'
    ]);

    expect(error).to.be.undefined;

    const parsed = assertValidEnvelope<{
      packages: {name: string; version: string}[];
    }>(stdout);
    expect(parsed.ok).to.be.true;
    if (parsed.ok) {
      expect(parsed.data.packages).to.be.an('array');
      expect(
        parsed.data.packages.some(
          (pkg) => `${pkg.name}/${pkg.version}` === 'test_pkg1/1.0'
        )
      ).to.be.true;
    }
  });
});
