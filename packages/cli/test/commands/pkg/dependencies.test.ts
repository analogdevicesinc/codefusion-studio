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

describe('pkg dependencies', () => {
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
    await uninstallIfInstalled('test_pkg_prerelease_consumer');
    await uninstallIfInstalled('test_pkg_prerelease1');
  });

  it('shows concrete dependency versions by default', async () => {
    const {stdout, stderr, error} = await runPkgCommandWithAuthRetry([
      'pkg',
      'dependencies',
      'test_pkg_consumer12/1.0'
    ]);

    expect(error).to.be.undefined;
    expect(stderr.trim()).to.equal('');
    expect(stdout).to.contain(
      'test_pkg_consumer12/1.0 requires the following packages:'
    );
    expect(stdout).to.contain('- test_pkg_dep1/1.0');
    expect(stdout).to.contain('- test_pkg_dep2/1.0');
    expect(stdout).to.contain('- test_pkg_dep1dep/1.0');
  });

  it('shows unresolved requirements when --unresolved is used', async () => {
    const {stdout, stderr, error} = await runPkgCommandWithAuthRetry([
      'pkg',
      'dependencies',
      'test_pkg_prerelease_consumer/1.0',
      '--unresolved'
    ]);

    expect(error).to.be.undefined;
    expect(stderr.trim()).to.equal('');
    expect(stdout).to.contain(
      'test_pkg_prerelease_consumer/1.0 requires the following packages:'
    );
    expect(stdout).to.contain('- test_pkg_prerelease1/^1.2.0-b.1');
  });

  it('prefers installed dependency version when it satisfies the range', async () => {
    await uninstallIfInstalled('test_pkg_prerelease1');

    const {error: installError, stderr: installStderr} =
      await runPkgCommandWithAuthRetry([
        'pkg',
        'install',
        'test_pkg_prerelease1/1.2.0-b.1',
        '--acceptLicense'
      ]);
    expect(installError).to.be.undefined;
    expect(installStderr.trim()).to.equal('');

    const {stdout, stderr, error} = await runPkgCommandWithAuthRetry([
      'pkg',
      'dependencies',
      'test_pkg_prerelease_consumer/1.0'
    ]);

    expect(error).to.be.undefined;
    expect(stderr.trim()).to.equal('');
    expect(stdout).to.contain('- test_pkg_prerelease1/1.2.0-b.1');
  });

  it('resolves dependencies from cache when --local is used', async () => {
    const {error: installError, stderr: installStderr} =
      await runPkgCommandWithAuthRetry([
        'pkg',
        'install',
        'test_pkg_consumer12/1.0',
        '--acceptLicense'
      ]);
    expect(installError).to.be.undefined;
    expect(installStderr.trim()).to.equal('');

    await uninstallIfInstalled('test_pkg_consumer12');
    await uninstallIfInstalled('test_pkg_dep1');
    await uninstallIfInstalled('test_pkg_dep2');
    await uninstallIfInstalled('test_pkg_dep1dep');

    const {stdout, stderr, error} = await runPkgCommandWithAuthRetry([
      'pkg',
      'dependencies',
      'test_pkg_consumer12/1.0',
      '--local'
    ]);

    expect(error).to.be.undefined;
    expect(stderr.trim()).to.equal('');
    expect(stdout).to.contain('- test_pkg_dep1/1.0');
    expect(stdout).to.contain('- test_pkg_dep2/1.0');
    expect(stdout).to.contain('- test_pkg_dep1dep/1.0');
  });
});
