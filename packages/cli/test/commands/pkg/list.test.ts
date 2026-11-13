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

describe('pkg list', () => {
  const packageRef = 'test_pkg1/1.0';
  const packageName = 'test_pkg1';
  const packagePattern = 'test_pkg1';
  let restoreDeps: (() => void) | undefined;

  beforeEach(async () => {
    restoreDeps = await setupMockPkgCommandDeps();
  });

  afterEach(() => {
    restoreDeps?.();
    restoreDeps = undefined;
  });

  async function ensurePackageNotInstalled(): Promise<void> {
    const {stdout: listOutput} = await runPkgCommandWithAuthRetry([
      'pkg',
      'list',
      packageName
    ]);
    if (listOutput.includes(packageName)) {
      const {error: uninstallError} =
        await runPkgCommandWithAuthRetry([
          'pkg',
          'uninstall',
          packageName
        ]);
      expect(uninstallError).to.be.undefined;
    }
  }

  before(async function () {
    if (shouldSkipPkgTests()) {
      console.warn(
        `Skipping pkg tests because ${runPkgTestsEnvVar} is not set to 1`
      );
      this.skip();
    }
  });

  beforeEach(async () => {
    await ensurePackageNotInstalled();
  });

  after(async () => {
    if (shouldSkipPkgTests()) {
      return;
    }

    await ensurePackageNotInstalled();
  });

  it('shows an installed package in the list output', async () => {
    const {stderr: installStderr, error: installError} =
      await runPkgCommandWithAuthRetry([
        'pkg',
        'install',
        packageRef,
        '--acceptLicense'
      ]);
    expect(installError).to.be.undefined;
    expect(
      installStderr.trim(),
      'install stderr should be empty'
    ).to.equal('');

    const {
      stdout: listStdout,
      stderr: listStderr,
      error: listError
    } = await runPkgCommandWithAuthRetry([
      'pkg',
      'list',
      packagePattern
    ]);
    expect(listError).to.be.undefined;
    expect(listStderr.trim(), 'list stderr should be empty').to.equal(
      ''
    );
    expect(listStdout).to.contain('Installed Packages:');
    expect(listStdout).to.contain(`- ${packageRef}`);
  });

  it('returns installed packages as the JSON envelope data payload', async () => {
    const {error: installError, stderr: installStderr} =
      await runPkgCommandWithAuthRetry([
        'pkg',
        'install',
        packageRef,
        '--acceptLicense'
      ]);
    expect(installError).to.be.undefined;
    expect(installStderr.trim()).to.equal('');

    const {stdout: listStdout, error: listError} =
      await runPkgCommandWithAuthRetry([
        'pkg',
        'list',
        packagePattern,
        '--format',
        'json'
      ]);
    expect(listError).to.be.undefined;

    const parsed = assertValidEnvelope<{
      packages: {name: string; version: string}[];
    }>(listStdout);
    expect(parsed.ok).to.be.true;
    if (parsed.ok) {
      expect(parsed.data.packages).to.be.an('array');
      expect(
        parsed.data.packages.some((pkg) => pkg.name === packageName)
      ).to.be.true;
    }
  });

  it('does not show an uninstalled package in the list output', async () => {
    const {error: installError, stderr: installStderr} =
      await runPkgCommandWithAuthRetry([
        'pkg',
        'install',
        packageRef,
        '--acceptLicense'
      ]);
    expect(installError).to.be.undefined;
    expect(
      installStderr.trim(),
      'install stderr should be empty'
    ).to.equal('');

    const {error: uninstallError, stderr: uninstallStderr} =
      await runPkgCommandWithAuthRetry([
        'pkg',
        'uninstall',
        packageName
      ]);
    expect(uninstallError).to.be.undefined;
    expect(
      uninstallStderr.trim(),
      'uninstall stderr should be empty'
    ).to.equal('');

    const {
      stdout: listStdout,
      stderr: listStderr,
      error: listError
    } = await runPkgCommandWithAuthRetry([
      'pkg',
      'list',
      packagePattern
    ]);
    expect(listError).to.be.undefined;
    expect(listStderr.trim(), 'list stderr should be empty').to.equal(
      ''
    );
    expect(listStdout.trim()).to.equal('No packages installed');
  });
});
