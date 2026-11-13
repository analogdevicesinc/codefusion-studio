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
  CfsPackageManagerProvider,
  CfsPackageManifest,
  CfsPackageReference,
  CfsSkippedPackageReasonCode
} from 'cfs-package-manager';

import {readFile} from 'node:fs/promises';

/** The state of a package declared in a dependency manifest. */
export type PackageDependencyStatus =
  | 'installed'
  | 'missing'
  | 'version-mismatch'
  | 'unsupported';

/** The verification result for one dependency-manifest package declaration. */
export interface PackageDependencyResult {
  name: string;
  requiredVersion: string;
  installedVersion?: string;
  status: PackageDependencyStatus;
  reasonCode?: CfsSkippedPackageReasonCode;
}

/** The complete verification result for a dependency manifest. */
export interface PackageDependencyVerification {
  manifestPath: string;
  valid: boolean;
  packages: PackageDependencyResult[];
}

function isPackageReference(
  value: unknown
): value is CfsPackageReference {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const {name, version} = value as Record<string, unknown>;
  return typeof name === 'string' && typeof version === 'string';
}

function parsePackageManifest(content: string): CfsPackageManifest {
  const manifest: unknown = JSON.parse(content);

  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Invalid CFS dependency manifest.');
  }

  const {version, packages} = manifest as Record<string, unknown>;
  if (typeof version !== 'number' || !Array.isArray(packages)) {
    throw new Error(
      'Invalid CFS dependency manifest. Expected a numeric version and packages array.'
    );
  }

  const packageNames = new Set<string>();
  for (const packageReference of packages) {
    if (!isPackageReference(packageReference)) {
      throw new Error(
        'Invalid CFS dependency manifest. Each package must include a name and version.'
      );
    }

    if (packageNames.has(packageReference.name)) {
      throw new Error(
        `Invalid CFS dependency manifest. Duplicate package name '${packageReference.name}'.`
      );
    }

    packageNames.add(packageReference.name);
  }

  return {version, packages};
}

function mapReferencesByName(
  references: CfsPackageReference[]
): Map<string, CfsPackageReference> {
  return new Map(
    references.map((reference) => [reference.name, reference])
  );
}

/**
 * Verifies that packages declared in a dependency manifest are installed.
 *
 * @param manifestPath - The dependency manifest to verify.
 * @param packageManager - The initialized package manager to query.
 * @returns Ordered verification results for every manifest package.
 */
export async function verifyPackageDependencies(
  manifestPath: string,
  packageManager: CfsPackageManagerProvider
): Promise<PackageDependencyVerification> {
  const manifest = parsePackageManifest(
    await readFile(manifestPath, 'utf8')
  );
  const [installPlan, installedPackages] = await Promise.all([
    packageManager.getInstallPlan(manifestPath),
    packageManager.list()
  ]);
  const installedByName = mapReferencesByName(installedPackages);
  const plannedInstallations = new Set(
    installPlan.toInstall.map(({name}) => name)
  );
  const plannedInstalled = mapReferencesByName(
    installPlan.alreadyInstalled
  );
  const plannedSkipped = new Map(
    installPlan.skipped?.map(({reference, reasonCode}) => [
      reference.name,
      reasonCode
    ])
  );

  const packages = manifest.packages.map((requiredPackage) => {
    const installedPackage = plannedInstalled.get(
      requiredPackage.name
    );
    if (installedPackage) {
      return {
        name: requiredPackage.name,
        requiredVersion: requiredPackage.version,
        installedVersion: installedPackage.version,
        status: 'installed' as const
      };
    }

    const reasonCode = plannedSkipped.get(requiredPackage.name);
    if (reasonCode) {
      return {
        name: requiredPackage.name,
        requiredVersion: requiredPackage.version,
        status: 'unsupported' as const,
        reasonCode
      };
    }

    if (plannedInstallations.has(requiredPackage.name)) {
      const locallyInstalledPackage = installedByName.get(
        requiredPackage.name
      );

      return {
        name: requiredPackage.name,
        requiredVersion: requiredPackage.version,
        ...(locallyInstalledPackage && {
          installedVersion: locallyInstalledPackage.version
        }),
        status: locallyInstalledPackage
          ? ('version-mismatch' as const)
          : ('missing' as const)
      };
    }

    throw new Error(
      `Package installation plan did not include '${requiredPackage.name}'.`
    );
  });

  return {
    manifestPath,
    valid: packages.every(({status}) => status === 'installed'),
    packages
  };
}

/**
 * Verifies that packages declared in a dependency manifest are installed,
 * using only the local package cache. Unlike {@link verifyPackageDependencies},
 * this never triggers remote-registry resolution (`checkManifest()` does not
 * call `_ensureRemotesReady()` the way `getInstallPlan()` does), so it cannot
 * report the `unsupported` status, which depends on remote binary-availability
 * checks.
 *
 * @param manifestPath - The dependency manifest to verify.
 * @param packageManager - The initialized package manager to query.
 * @returns Ordered verification results for every manifest package.
 */
export async function verifyPackageDependenciesLocally(
  manifestPath: string,
  packageManager: CfsPackageManagerProvider
): Promise<PackageDependencyVerification> {
  const manifest = parsePackageManifest(
    await readFile(manifestPath, 'utf8')
  );
  const [packagesNeedingInstall, installedPackages] =
    await Promise.all([
      packageManager.checkManifest(manifestPath),
      packageManager.list()
    ]);
  const needsInstallByName = mapReferencesByName(
    packagesNeedingInstall
  );
  const installedByName = mapReferencesByName(installedPackages);

  const packages = manifest.packages.map((requiredPackage) => {
    const installedPackage = installedByName.get(
      requiredPackage.name
    );

    if (!needsInstallByName.has(requiredPackage.name)) {
      return {
        name: requiredPackage.name,
        requiredVersion: requiredPackage.version,
        ...(installedPackage && {
          installedVersion: installedPackage.version
        }),
        status: 'installed' as const
      };
    }

    return {
      name: requiredPackage.name,
      requiredVersion: requiredPackage.version,
      ...(installedPackage && {
        installedVersion: installedPackage.version
      }),
      status: installedPackage
        ? ('version-mismatch' as const)
        : ('missing' as const)
    };
  });

  return {
    manifestPath,
    valid: packages.every(({status}) => status === 'installed'),
    packages
  };
}
