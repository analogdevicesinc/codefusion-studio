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

describe('pkg path', () => {
  const packageRef = 'test_pkg1/1.0';
  const packageName = 'test_pkg1';
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

  async function ensurePackageInstalled(): Promise<void> {
    const {stdout: listOutput} = await runPkgCommandWithAuthRetry([
      'pkg',
      'list',
      packageName
    ]);
    if (!listOutput.includes(packageName)) {
      const {error: installError} = await runPkgCommandWithAuthRetry([
        'pkg',
        'install',
        packageRef,
        '--acceptLicense'
      ]);
      expect(installError).to.be.undefined;
    }
  }

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

  it('returns the path of an installed package', async () => {
    await ensurePackageInstalled();

    const {stdout, stderr, error} = await runPkgCommandWithAuthRetry([
      'pkg',
      'path',
      packageName
    ]);

    expect(error).to.be.undefined;
    expect(stderr.trim(), 'path stderr should be empty').to.equal('');
    expect(stdout.trim()).to.not.equal('');
  });

  it('returns the path in JSON format', async () => {
    await ensurePackageInstalled();

    const {stdout, stderr, error} = await runPkgCommandWithAuthRetry([
      'pkg',
      'path',
      packageName,
      '--format',
      'json'
    ]);

    expect(error).to.be.undefined;
    expect(stderr.trim(), 'path stderr should be empty').to.equal('');
    const parsed = assertValidEnvelope<{path: string}>(stdout.trim());
    expect(parsed.ok).to.be.true;
    if (parsed.ok) {
      expect(parsed.data.path).to.be.a('string');
      expect(parsed.data.path).to.not.equal('');
    }
  });

  it('throws an error for an uninstalled package', async () => {
    await ensurePackageNotInstalled();

    const {error} = await runPkgCommandWithAuthRetry([
      'pkg',
      'path',
      packageName
    ]);

    expect(error).to.not.be.undefined;
    expect(String(error)).to.contain('not installed');
  });

  it('returns a fixed error code in JSON mode for an uninstalled package', async () => {
    await ensurePackageNotInstalled();

    const {stdout} = await runPkgCommandWithAuthRetry([
      'pkg',
      'path',
      packageName,
      '--format',
      'json'
    ]);

    const parsed = assertValidEnvelope(stdout.trim()) as {
      ok: boolean;
      errors: {code: string}[];
    };
    expect(parsed.ok).to.be.false;
    expect(parsed.errors[0].code).to.equal('PACKAGE_NOT_INSTALLED');
  });
});
