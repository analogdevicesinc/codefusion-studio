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

async function uninstallIfInstalled(pkgName: string): Promise<void> {
  const {error} = await runPkgCommandWithAuthRetry([
    'pkg',
    'uninstall',
    pkgName
  ]);

  if (error && !String(error).includes('is not installed')) {
    throw error;
  }
}

describe('pkg local-consumers', () => {
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

  after(async () => {
    if (shouldSkipPkgTests()) {
      return;
    }

    await uninstallIfInstalled('test_pkg_consumer12');
    await uninstallIfInstalled('test_pkg_dep1');
    await uninstallIfInstalled('test_pkg_dep2');
    await uninstallIfInstalled('test_pkg_dep1dep');
  });

  it('shows installed consumers of a dependency', async () => {
    const {error: installError, stderr: installStderr} =
      await runPkgCommandWithAuthRetry([
        'pkg',
        'install',
        'test_pkg_consumer12/1.0',
        '--acceptLicense'
      ]);
    expect(installError).to.be.undefined;
    expect(installStderr.trim()).to.equal('');

    const {stdout, stderr, error} = await runPkgCommandWithAuthRetry([
      'pkg',
      'local-consumers',
      'test_pkg_dep1'
    ]);

    expect(error).to.be.undefined;
    expect(stderr.trim()).to.equal('');
    expect(stdout).to.contain(
      'test_pkg_dep1 is required by the following packages:'
    );
    expect(stdout).to.contain('- test_pkg_consumer12/1.0');
  });

  it('returns a fixed error code in JSON mode for an invalid package name', async () => {
    const {stdout} = await runPkgCommandWithAuthRetry([
      'pkg',
      'local-consumers',
      'test_pkg_dep1/1.0',
      '--format',
      'json'
    ]);

    const parsed = assertValidEnvelope(stdout) as {
      ok: boolean;
      errors: {code: string}[];
    };
    expect(parsed.ok).to.be.false;
    expect(parsed.errors[0].code).to.equal('INVALID_PACKAGE_NAME');
  });

  it('returns consumers as the JSON envelope data payload', async () => {
    const {error: installError} = await runPkgCommandWithAuthRetry([
      'pkg',
      'install',
      'test_pkg_consumer12/1.0',
      '--acceptLicense'
    ]);
    expect(installError).to.be.undefined;

    const {stdout, error} = await runPkgCommandWithAuthRetry([
      'pkg',
      'local-consumers',
      'test_pkg_dep1',
      '--format',
      'json'
    ]);
    expect(error).to.be.undefined;

    const parsed = assertValidEnvelope<{
      consumers: {name: string; version: string}[];
    }>(stdout);
    expect(parsed.ok).to.be.true;
    if (parsed.ok) {
      expect(parsed.data.consumers).to.be.an('array');
      expect(
        parsed.data.consumers.some(
          (pkg) =>
            `${pkg.name}/${pkg.version}` === 'test_pkg_consumer12/1.0'
        )
      ).to.be.true;
    }
  });
});
