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
import {promises as fs} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runCommand} from '@oclif/test';
import {
  runPkgCommandWithAuthRetry,
  shouldSkipPkgTests,
  runPkgTestsEnvVar,
  setupMockPkgCommandDeps
} from '../../utils/pkg-test-helpers.js';

import {pkgInstallDeps} from '../../../dist/commands/pkg/install.js';
import {
  assertSuccessEnvelopeData,
  assertValidEnvelope,
  type CliErrorEnvelope
} from '../../utils/assert-json-envelope.js';

describe('pkg install', () => {
  const testPkgWithLicense = 'test_pkg_with_license1';
  const testPkgWithLicenseVersion = '1.0.0';
  const testPkgWithLicenseVersionRange = '^1.0.0';
  const testPkgWithLicenseRef = `${testPkgWithLicense}/${testPkgWithLicenseVersion}`;

  const testPkg1 = 'test_pkg1';
  const testPkg1Version = '1.0';
  const testPkg1Ref = `${testPkg1}/${testPkg1Version}`;

  const testPkg2 = 'test_pkg2';
  const testPkg2Version = '1.0';
  const testPkg2Ref = `${testPkg2}/${testPkg2Version}`;

  let restoreDeps: (() => void) | undefined;
  let testManifestDir: string;
  let tempManifestPath: string;

  beforeEach(async () => {
    restoreDeps = await setupMockPkgCommandDeps();
    testManifestDir = join(tmpdir(), `cfs-test-${Date.now()}`);
    tempManifestPath = join(testManifestDir, '.cfsdependencies');
  });

  afterEach(async () => {
    restoreDeps?.();
    restoreDeps = undefined;

    try {
      await fs.rm(testManifestDir, {recursive: true, force: true});
    } catch {
      // Ignore errors
    }
  });

  async function ensurePackageNotInstalled(
    packageName: string
  ): Promise<void> {
    try {
      const {stdout: listOutput} = await runPkgCommandWithAuthRetry([
        'pkg',
        'list',
        packageName
      ]);
      if (listOutput.includes(packageName)) {
        await runPkgCommandWithAuthRetry([
          'pkg',
          'uninstall',
          packageName
        ]);
      }
    } catch (error) {
      // If package is not installed or list/uninstall fails, ignore
      // This ensures test can proceed even if cleanup fails
    }
  }

  async function ensurePackagesNotInstalled(
    packageNames: string[]
  ): Promise<void> {
    for (const pkg of packageNames) {
      await ensurePackageNotInstalled(pkg);
    }
  }

  async function createManifestFile(
    packages: Array<{name: string; version: string}>
  ): Promise<string> {
    const manifest = {
      version: 1,
      packages
    };
    await fs.mkdir(testManifestDir, {recursive: true});
    await fs.writeFile(tempManifestPath, JSON.stringify(manifest));
    return tempManifestPath;
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
    await ensurePackagesNotInstalled([
      testPkgWithLicense,
      testPkg1,
      testPkg2
    ]);
  });

  after(async () => {
    if (shouldSkipPkgTests()) {
      return;
    }

    await ensurePackagesNotInstalled([
      testPkgWithLicense,
      testPkg1,
      testPkg2
    ]);
  });

  describe('single package installation', () => {
    it('should accept license and install package with version range', async () => {
      const {stderr, error, stdout} =
        await runPkgCommandWithAuthRetry([
          'pkg',
          'install',
          `${testPkgWithLicense}/${testPkgWithLicenseVersionRange}`,
          '--acceptLicense'
        ]);
      expect(error).to.be.undefined;
      expect(
        stderr.trim(),
        'install stderr should be empty'
      ).to.equal('');
      expect(stdout).to.contain(
        'The following packages have been installed'
      );
      expect(stdout).to.contain(testPkgWithLicenseRef);
    });

    it('should install package with exact version', async () => {
      const {stderr, error, stdout} =
        await runPkgCommandWithAuthRetry([
          'pkg',
          'install',
          testPkgWithLicenseRef,
          '--acceptLicense'
        ]);
      expect(error).to.be.undefined;
      expect(
        stderr.trim(),
        'install stderr should be empty'
      ).to.equal('');
      expect(stdout).to.contain(
        'The following packages have been installed'
      );
      expect(stdout).to.contain(testPkgWithLicenseRef);
    });

    it('should install package without license requirement', async () => {
      const {stderr, error, stdout} =
        await runPkgCommandWithAuthRetry([
          'pkg',
          'install',
          testPkg1Ref
        ]);
      expect(error).to.be.undefined;
      expect(
        stderr.trim(),
        'install stderr should be empty'
      ).to.equal('');
      expect(stdout).to.contain(
        'The following packages have been installed'
      );
      expect(stdout).to.contain(testPkg1Ref);
    });
  });

  describe('multiple package installation', () => {
    it('should install multiple packages using manifest', async () => {
      const manifestPath = await createManifestFile([
        {name: testPkg1, version: testPkg1Version},
        {name: testPkg2, version: testPkg2Version}
      ]);

      const {stderr, error, stdout} =
        await runPkgCommandWithAuthRetry([
          'pkg',
          'install',
          manifestPath
        ]);
      expect(error).to.be.undefined;
      expect(
        stderr.trim(),
        'install stderr should be empty'
      ).to.equal('');
      expect(stdout).to.contain(
        'The following packages have been installed'
      );
      expect(stdout).to.contain(testPkg1Ref);
      expect(stdout).to.contain(testPkg2Ref);
    });

    it('should install multiple packages with mixed license requirements using manifest', async () => {
      const manifestPath = await createManifestFile([
        {name: testPkg1, version: testPkg1Version},
        {name: testPkgWithLicense, version: testPkgWithLicenseVersion}
      ]);

      const {stderr, error, stdout} =
        await runPkgCommandWithAuthRetry([
          'pkg',
          'install',
          manifestPath,
          '--acceptLicense'
        ]);
      expect(error).to.be.undefined;
      expect(
        stderr.trim(),
        'install stderr should be empty'
      ).to.equal('');
      expect(stdout).to.contain(
        'The following packages have been installed'
      );
      expect(stdout).to.contain(testPkg1Ref);
      expect(stdout).to.contain(testPkgWithLicenseRef);
    });
  });

  describe('manifest file installation', () => {
    it('should install packages with version ranges from manifest', async () => {
      const manifestPath = await createManifestFile([
        {name: testPkg1, version: testPkg1Version},
        {
          name: testPkgWithLicense,
          version: testPkgWithLicenseVersionRange
        }
      ]);

      const {stderr, error, stdout} =
        await runPkgCommandWithAuthRetry([
          'pkg',
          'install',
          manifestPath,
          '--acceptLicense'
        ]);
      expect(error).to.be.undefined;
      expect(
        stderr.trim(),
        'install stderr should be empty'
      ).to.equal('');
      expect(stdout).to.contain(
        'The following packages have been installed'
      );
      expect(stdout).to.contain(testPkg1Ref);
      expect(stdout).to.contain(testPkgWithLicenseRef);
    });

    it('should skip already installed packages from manifest', async () => {
      await runPkgCommandWithAuthRetry([
        'pkg',
        'install',
        testPkg1Ref
      ]);

      const manifestPath = await createManifestFile([
        {name: testPkg1, version: testPkg1Version},
        {name: testPkg2, version: testPkg2Version}
      ]);

      const {stderr, error, stdout} =
        await runPkgCommandWithAuthRetry([
          'pkg',
          'install',
          manifestPath
        ]);
      expect(error).to.be.undefined;
      expect(
        stderr.trim(),
        'install stderr should be empty'
      ).to.equal('');

      // testPkg1 is already installed, so only testPkg2 should be newly installed
      expect(stdout).to.contain(
        'The following packages have been installed'
      );
      expect(stdout).to.contain(testPkg2Ref);
      expect(stdout).to.contain('Already installed');
      expect(stdout).to.contain(testPkg1Ref);
    });
  });
});

describe('pkg install JSON envelope', () => {
  const originalGetPackageManager = pkgInstallDeps.getPackageManager;

  afterEach(() => {
    pkgInstallDeps.getPackageManager = originalGetPackageManager;
  });

  it('returns installed/skipped/alreadyInstalled data on a successful install', async () => {
    pkgInstallDeps.getPackageManager = (async () => ({
      getInstallPlan: async () => ({
        toInstall: [{name: 'pkg-a', version: '1.0.0'}],
        alreadyInstalled: [],
        requiresLicenseAcceptance: []
      }),
      install: async () => [{name: 'pkg-a', version: '1.0.0'}]
    })) as unknown as typeof pkgInstallDeps.getPackageManager;

    const {stdout} = await runCommand(
      ['pkg', 'install', 'pkg-a/1.0.0', '--format', 'json'],
      {root: '..'}
    );

    const data = assertSuccessEnvelopeData<{
      installed: {name: string; version: string}[];
      skippedLicense: {name: string; version: string}[];
      skippedPlatform: {
        name: string;
        version: string;
        reasonCode: string;
      }[];
      alreadyInstalled: {name: string; version: string}[];
    }>(stdout, 'pkg install');

    expect(data).to.deep.equal({
      installed: [{name: 'pkg-a', version: '1.0.0'}],
      skippedLicense: [],
      skippedPlatform: [],
      alreadyInstalled: []
    });
  });

  it('returns an empty installed list with skippedPlatform/alreadyInstalled data when nothing is installable', async () => {
    pkgInstallDeps.getPackageManager = (async () => ({
      getInstallPlan: async () => ({
        toInstall: [],
        alreadyInstalled: [{name: 'pkg-b', version: '2.0.0'}],
        requiresLicenseAcceptance: [],
        skipped: [
          {
            reference: {name: 'pkg-c', version: '3.0.0'},
            reasonCode: 'UNSUPPORTED_BINARY_FOR_PLATFORM'
          }
        ]
      }),
      install: async () => []
    })) as unknown as typeof pkgInstallDeps.getPackageManager;

    const {stdout} = await runCommand(
      ['pkg', 'install', 'pkg-b/2.0.0', '--format', 'json'],
      {root: '..'}
    );

    const data = assertSuccessEnvelopeData<{
      installed: {name: string; version: string}[];
      skippedLicense: {name: string; version: string}[];
      skippedPlatform: {
        name: string;
        version: string;
        reasonCode: string;
      }[];
      alreadyInstalled: {name: string; version: string}[];
    }>(stdout, 'pkg install');

    expect(data).to.deep.equal({
      installed: [],
      skippedLicense: [],
      skippedPlatform: [
        {
          name: 'pkg-c',
          version: '3.0.0',
          reasonCode: 'UNSUPPORTED_BINARY_FOR_PLATFORM'
        }
      ],
      alreadyInstalled: [{name: 'pkg-b', version: '2.0.0'}]
    });
  });

  it('rejects a license-gated install without --acceptLicense instead of prompting', async () => {
    let installCalled = false;
    pkgInstallDeps.getPackageManager = (async () => ({
      getInstallPlan: async () => ({
        toInstall: [{name: 'pkg-d', version: '1.0.0'}],
        alreadyInstalled: [],
        requiresLicenseAcceptance: [
          {reference: {name: 'pkg-d', version: '1.0.0'}}
        ]
      }),
      install: async () => {
        installCalled = true;
        return [];
      }
    })) as unknown as typeof pkgInstallDeps.getPackageManager;

    const {stdout} = await runCommand(
      ['pkg', 'install', 'pkg-d/1.0.0', '--format', 'json'],
      {root: '..'}
    );

    const parsed = assertValidEnvelope(stdout);
    expect(parsed.ok).to.be.false;
    expect((parsed as CliErrorEnvelope).errors[0]?.code).to.equal(
      'PKG_INSTALL_LICENSE_REQUIRED'
    );
    expect(installCalled).to.be.false;
  });
});
