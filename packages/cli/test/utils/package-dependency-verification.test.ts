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

import type {
  CfsInstallPlan,
  CfsPackageManagerProvider,
  CfsPackageReference
} from 'cfs-package-manager';

import {expect} from 'chai';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
  verifyPackageDependencies,
  verifyPackageDependenciesLocally
} from '../../src/utils/package-dependency-verification.js';

const emptyInstallPlan: CfsInstallPlan = {
  toInstall: [],
  alreadyInstalled: [],
  requiresLicenseAcceptance: []
};

function createPackageManager(
  installPlan: CfsInstallPlan,
  installedPackages: CfsPackageReference[] = []
): CfsPackageManagerProvider {
  return {
    getInstallPlan: async () => installPlan,
    list: async () => installedPackages
  } as unknown as CfsPackageManagerProvider;
}

function createLocalPackageManager(
  packagesNeedingInstall: CfsPackageReference[],
  installedPackages: CfsPackageReference[] = []
): CfsPackageManagerProvider {
  return {
    checkManifest: async () => packagesNeedingInstall,
    list: async () => installedPackages
  } as unknown as CfsPackageManagerProvider;
}

describe('package dependency verification', () => {
  let testDirectory: string;

  beforeEach(() => {
    testDirectory = mkdtempSync(
      join(tmpdir(), 'cfs-package-dependency-verification-')
    );
  });

  afterEach(() => {
    rmSync(testDirectory, {recursive: true, force: true});
  });

  function writeManifest(packages: CfsPackageReference[]): string {
    const manifestPath = join(testDirectory, '.cfsdependencies');
    writeFileSync(
      manifestPath,
      JSON.stringify({version: 1, packages})
    );
    return manifestPath;
  }

  it('accepts an empty manifest', async () => {
    const manifestPath = writeManifest([]);

    expect(
      await verifyPackageDependencies(
        manifestPath,
        createPackageManager(emptyInstallPlan)
      )
    ).to.deep.equal({
      manifestPath,
      valid: true,
      packages: []
    });
  });

  it('reports an exact installed version', async () => {
    const manifestPath = writeManifest([
      {name: 'sdk', version: '1.2.3'}
    ]);
    const installedPackage = {name: 'sdk', version: '1.2.3'};

    const result = await verifyPackageDependencies(
      manifestPath,
      createPackageManager(
        {...emptyInstallPlan, alreadyInstalled: [installedPackage]},
        [installedPackage]
      )
    );

    expect(result).to.deep.equal({
      manifestPath,
      valid: true,
      packages: [
        {
          name: 'sdk',
          requiredVersion: '1.2.3',
          installedVersion: '1.2.3',
          status: 'installed'
        }
      ]
    });
  });

  it('reports the concrete version satisfying a semantic version range', async () => {
    const manifestPath = writeManifest([
      {name: 'sdk', version: '^1.0.0'}
    ]);
    const installedPackage = {name: 'sdk', version: '1.4.2'};

    const result = await verifyPackageDependencies(
      manifestPath,
      createPackageManager(
        {...emptyInstallPlan, alreadyInstalled: [installedPackage]},
        [installedPackage]
      )
    );

    expect(result.packages).to.deep.equal([
      {
        name: 'sdk',
        requiredVersion: '^1.0.0',
        installedVersion: '1.4.2',
        status: 'installed'
      }
    ]);
  });

  it('reports packages absent from the local installation', async () => {
    const manifestPath = writeManifest([
      {name: 'sdk', version: '1.2.3'}
    ]);

    const result = await verifyPackageDependencies(
      manifestPath,
      createPackageManager({
        ...emptyInstallPlan,
        toInstall: [{name: 'sdk', version: '1.2.3'}]
      })
    );

    expect(result.packages).to.deep.equal([
      {
        name: 'sdk',
        requiredVersion: '1.2.3',
        status: 'missing'
      }
    ]);
    expect(result.valid).to.be.false;
  });

  it('reports incompatible installed versions', async () => {
    const manifestPath = writeManifest([
      {name: 'sdk', version: '^2.0.0'}
    ]);
    const installedPackage = {name: 'sdk', version: '1.4.2'};

    const result = await verifyPackageDependencies(
      manifestPath,
      createPackageManager(
        {
          ...emptyInstallPlan,
          toInstall: [{name: 'sdk', version: '^2.0.0'}]
        },
        [installedPackage]
      )
    );

    expect(result.packages).to.deep.equal([
      {
        name: 'sdk',
        requiredVersion: '^2.0.0',
        installedVersion: '1.4.2',
        status: 'version-mismatch'
      }
    ]);
    expect(result.valid).to.be.false;
  });

  it('reports unsupported packages with their reason code', async () => {
    const manifestPath = writeManifest([
      {name: 'sdk', version: '1.2.3'}
    ]);

    const result = await verifyPackageDependencies(
      manifestPath,
      createPackageManager({
        ...emptyInstallPlan,
        skipped: [
          {
            reference: {name: 'sdk', version: '1.2.3'},
            reasonCode: 'UNSUPPORTED_BINARY_FOR_PLATFORM'
          }
        ]
      })
    );

    expect(result.packages).to.deep.equal([
      {
        name: 'sdk',
        requiredVersion: '1.2.3',
        status: 'unsupported',
        reasonCode: 'UNSUPPORTED_BINARY_FOR_PLATFORM'
      }
    ]);
    expect(result.valid).to.be.false;
  });

  it('retains manifest declaration order for mixed results', async () => {
    const manifestPath = writeManifest([
      {name: 'installed', version: '1.0.0'},
      {name: 'missing', version: '2.0.0'},
      {name: 'mismatch', version: '^3.0.0'},
      {name: 'unsupported', version: '4.0.0'}
    ]);

    const result = await verifyPackageDependencies(
      manifestPath,
      createPackageManager(
        {
          ...emptyInstallPlan,
          toInstall: [
            {name: 'missing', version: '2.0.0'},
            {name: 'mismatch', version: '^3.0.0'}
          ],
          alreadyInstalled: [{name: 'installed', version: '1.0.0'}],
          skipped: [
            {
              reference: {name: 'unsupported', version: '4.0.0'},
              reasonCode: 'UNSUPPORTED_BINARY_FOR_PLATFORM'
            }
          ]
        },
        [
          {name: 'installed', version: '1.0.0'},
          {name: 'mismatch', version: '2.5.0'}
        ]
      )
    );

    expect(result.valid).to.be.false;
    expect(result.packages).to.deep.equal([
      {
        name: 'installed',
        requiredVersion: '1.0.0',
        installedVersion: '1.0.0',
        status: 'installed'
      },
      {
        name: 'missing',
        requiredVersion: '2.0.0',
        status: 'missing'
      },
      {
        name: 'mismatch',
        requiredVersion: '^3.0.0',
        installedVersion: '2.5.0',
        status: 'version-mismatch'
      },
      {
        name: 'unsupported',
        requiredVersion: '4.0.0',
        status: 'unsupported',
        reasonCode: 'UNSUPPORTED_BINARY_FOR_PLATFORM'
      }
    ]);
  });

  it('propagates malformed manifest errors', async () => {
    const manifestPath = join(testDirectory, '.cfsdependencies');
    writeFileSync(manifestPath, '{not JSON');

    try {
      await verifyPackageDependencies(
        manifestPath,
        createPackageManager(emptyInstallPlan)
      );
      expect.fail('Expected malformed manifest parsing to throw.');
    } catch (error) {
      expect(error).to.be.instanceOf(SyntaxError);
    }
  });

  it('propagates manifest read errors', async () => {
    const manifestPath = join(
      testDirectory,
      'missing.cfsdependencies'
    );

    try {
      await verifyPackageDependencies(
        manifestPath,
        createPackageManager(emptyInstallPlan)
      );
      expect.fail('Expected manifest read to throw.');
    } catch (error) {
      expect((error as NodeJS.ErrnoException).code).to.equal(
        'ENOENT'
      );
    }
  });

  it('rejects duplicate package names before querying the package manager', async () => {
    const manifestPath = writeManifest([
      {name: 'sdk', version: '1.0.0'},
      {name: 'sdk', version: '2.0.0'}
    ]);
    let providerCalls = 0;
    const packageManager = {
      getInstallPlan: async () => {
        providerCalls += 1;
        return emptyInstallPlan;
      },
      list: async () => {
        providerCalls += 1;
        return [];
      }
    } as unknown as CfsPackageManagerProvider;

    try {
      await verifyPackageDependencies(manifestPath, packageManager);
      expect.fail('Expected duplicate package names to throw.');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.include(
        "Duplicate package name 'sdk'"
      );
    }

    expect(providerCalls).to.equal(0);
  });

  it('rejects incomplete package installation plans', async () => {
    const manifestPath = writeManifest([
      {name: 'sdk', version: '1.0.0'}
    ]);

    try {
      await verifyPackageDependencies(
        manifestPath,
        createPackageManager(emptyInstallPlan)
      );
      expect.fail('Expected incomplete installation plan to throw.');
    } catch (error) {
      expect((error as Error).message).to.equal(
        "Package installation plan did not include 'sdk'."
      );
    }
  });

  it('propagates package-manager planning errors', async () => {
    const manifestPath = writeManifest([]);
    const error = new Error('Package resolution failed');
    const packageManager = {
      getInstallPlan: async () => Promise.reject(error),
      list: async () => []
    } as unknown as CfsPackageManagerProvider;

    try {
      await verifyPackageDependencies(manifestPath, packageManager);
      expect.fail('Expected package-manager planning to throw.');
    } catch (caughtError) {
      expect(caughtError).to.equal(error);
    }
  });

  it('propagates installed-package lookup errors', async () => {
    const manifestPath = writeManifest([]);
    const error = new Error('Installed package lookup failed');
    const packageManager = {
      getInstallPlan: async () => emptyInstallPlan,
      list: async () => Promise.reject(error)
    } as unknown as CfsPackageManagerProvider;

    try {
      await verifyPackageDependencies(manifestPath, packageManager);
      expect.fail('Expected installed-package lookup to throw.');
    } catch (caughtError) {
      expect(caughtError).to.equal(error);
    }
  });

  describe('verifyPackageDependenciesLocally', () => {
    it('accepts an empty manifest', async () => {
      const manifestPath = writeManifest([]);

      expect(
        await verifyPackageDependenciesLocally(
          manifestPath,
          createLocalPackageManager([])
        )
      ).to.deep.equal({
        manifestPath,
        valid: true,
        packages: []
      });
    });

    it('reports a package absent from checkManifest as installed', async () => {
      const manifestPath = writeManifest([
        {name: 'sdk', version: '1.2.3'}
      ]);
      const installedPackage = {name: 'sdk', version: '1.2.3'};

      const result = await verifyPackageDependenciesLocally(
        manifestPath,
        createLocalPackageManager([], [installedPackage])
      );

      expect(result).to.deep.equal({
        manifestPath,
        valid: true,
        packages: [
          {
            name: 'sdk',
            requiredVersion: '1.2.3',
            installedVersion: '1.2.3',
            status: 'installed'
          }
        ]
      });
    });

    it('reports a package needing install with no local copy as missing', async () => {
      const manifestPath = writeManifest([
        {name: 'sdk', version: '1.2.3'}
      ]);

      const result = await verifyPackageDependenciesLocally(
        manifestPath,
        createLocalPackageManager([{name: 'sdk', version: '1.2.3'}])
      );

      expect(result).to.deep.equal({
        manifestPath,
        valid: false,
        packages: [
          {
            name: 'sdk',
            requiredVersion: '1.2.3',
            status: 'missing'
          }
        ]
      });
    });

    it('reports a version mismatch when checkManifest and list disagree', async () => {
      const manifestPath = writeManifest([
        {name: 'sdk', version: '1.2.3'}
      ]);
      const installedPackage = {name: 'sdk', version: '1.0.0'};

      const result = await verifyPackageDependenciesLocally(
        manifestPath,
        createLocalPackageManager(
          [{name: 'sdk', version: '1.2.3'}],
          [installedPackage]
        )
      );

      expect(result).to.deep.equal({
        manifestPath,
        valid: false,
        packages: [
          {
            name: 'sdk',
            requiredVersion: '1.2.3',
            installedVersion: '1.0.0',
            status: 'version-mismatch'
          }
        ]
      });
    });
  });
});
