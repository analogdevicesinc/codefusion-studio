/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
  CfsInstallInput,
  CfsInstallPlan,
  CfsPackageReference,
  CfsSkippedPackageReasonCode
} from 'cfs-package-manager';

import {Args, Flags} from '@oclif/core';

import {BaseCommand} from '../../utils/base-command.js';
import {getSkippedPackageReasonMessage} from 'cfs-package-manager';
import * as fs from 'node:fs';

import {
  getPackageManager,
  parsePackageReference
} from '../../utils/package-manager.js';

export const pkgInstallDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

/**
 * Shape of a package skipped because it has no compatible binary for the
 * current platform, flattened for the JSON response envelope.
 */
interface SkippedPlatformPackage {
  name: string;
  version: string;
  reasonCode: CfsSkippedPackageReasonCode;
}

/**
 * JSON envelope `data` payload for `pkg install`.
 */
interface PkgInstallResult {
  installed: CfsPackageReference[];
  skippedLicense: CfsPackageReference[];
  skippedPlatform: SkippedPlatformPackage[];
  alreadyInstalled: CfsPackageReference[];
}

export default class CfsPackageInstall extends BaseCommand<
  typeof CfsPackageInstall
> {
  static args = {
    reference: Args.string({
      name: 'reference',
      description:
        'Package reference (name/version) or path to a manifest file. eg. somePkg/2.0.0 or /absolute/path/to/.cfsdependencies',
      multiple: false,
      required: false
    })
  };

  static description =
    'Install a cfs package, including all its dependencies or a list of packages as specified in a manifest file.';

  static flags = {
    local: Flags.boolean({
      char: 'l',
      summary:
        'Install packages from local cache only (without download from remotes)'
    }),
    acceptLicense: Flags.boolean({
      summary:
        'Accept package license(s). Required for packages that require license acceptance. If not provided, you will be prompted interactively.'
    }),
    tar: Flags.string({
      char: 't',
      summary:
        'Path to a package tarball to install from. Cannot be combined with a package reference.'
    })
  };

  static useResponseEnvelope = true;

  async run(): Promise<PkgInstallResult> {
    // Parse the command arguments
    const {args, flags} = this;
    const input = args.reference;

    if (flags.tar !== undefined && input !== undefined) {
      this.error(
        'Specify either a package reference or --tar, not both.'
      );
    }

    // Get the package manager instance
    const packman = await pkgInstallDeps.getPackageManager(
      {
        useRemotes: !flags.local
      },
      undefined,
      this
    );

    if (flags.tar !== undefined) {
      const installed = await packman.localInstall(flags.tar);
      this.log(`Package installed from tarball: ${flags.tar}`);
      return {
        installed,
        skippedLicense: [],
        skippedPlatform: [],
        alreadyInstalled: []
      };
    }

    if (input === undefined) {
      this.error(
        'Specify a package reference, a manifest file path, or --tar <path>.'
      );
    }

    const isManifest = this.isManifestFile(input);

    // Build the install input
    const installInput: CfsInstallInput = isManifest
      ? input
      : parsePackageReference(input);

    this.telemetryMetadata = {
      packageName: isManifest
        ? 'manifest'
        : parsePackageReference(input).name,
      isLocal: flags.local ?? false,
      isManifest,
      installedCount: 0
    };

    // Get installation plan (single call for all pre-flight info)
    const plan = await packman.getInstallPlan(installInput);

    // Check if there's anything to install
    if (plan.toInstall.length === 0) {
      const skippedWithReason = plan.skipped ?? [];

      if (plan.alreadyInstalled.length > 0) {
        this.log(
          isManifest
            ? skippedWithReason.length > 0
              ? 'Some packages in the manifest are already installed; others were skipped (see below).'
              : 'All packages in the manifest are already installed.'
            : `Package ${args.reference} is already installed.`
        );
      } else {
        this.log('No packages to install.');
      }

      if (skippedWithReason.length > 0) {
        this.log(
          '\nThe following packages were skipped (not installable on this platform):'
        );
        for (const pkg of skippedWithReason) {
          this.log(
            `- ${pkg.reference.name}/${pkg.reference.version}: ${getSkippedPackageReasonMessage(pkg.reasonCode)}`
          );
        }
      }

      return {
        installed: [],
        skippedLicense: [],
        skippedPlatform:
          this.toSkippedPlatformData(skippedWithReason),
        alreadyInstalled: plan.alreadyInstalled
      };
    }

    // Handle license acceptance
    let licenseAccepted = flags.acceptLicense;
    if (
      !licenseAccepted &&
      plan.requiresLicenseAcceptance.length > 0
    ) {
      // The prompt writes to stdout, which would corrupt the JSON envelope.
      if (this.jsonEnabled()) {
        this.error(
          'License acceptance is required in JSON mode. Re-run with --acceptLicense.',
          {code: 'PKG_INSTALL_LICENSE_REQUIRED'}
        );
      }

      licenseAccepted = await this.promptForLicenseAcceptance(plan);
    } else if (plan.requiresLicenseAcceptance.length === 0) {
      // No licenses to accept
      licenseAccepted = true;
    }

    // Determine which packages to install based on license acceptance
    // Match by package name only, since toInstall may contain version ranges
    // while requiresLicenseAcceptance contains concrete versions.
    const licensedPackageNames = new Set(
      plan.requiresLicenseAcceptance.map((p) => p.reference.name)
    );

    let packagesToInstall: CfsPackageReference[] = [];
    let skipped: CfsPackageReference[] = [];

    if (licenseAccepted) {
      // User accepted licenses (or no licenses needed) - install all
      packagesToInstall = plan.toInstall;
    } else {
      // User rejected licenses - install only packages that don't require license
      packagesToInstall = plan.toInstall.filter(
        (pkg) => !licensedPackageNames.has(pkg.name)
      );
      skipped = plan.toInstall.filter((pkg) =>
        licensedPackageNames.has(pkg.name)
      );
    }

    // Install packages
    let installed: CfsPackageReference[] = [];

    if (packagesToInstall.length > 0) {
      // Note: When user accepts licenses, pass the full plan (which has pre-computed license info).
      // When user rejects licenses, pass the filtered packagesToInstall list instead.
      installed = await packman.install(
        licenseAccepted ? plan : packagesToInstall,
        {
          localOnly: flags.local,
          acceptLicense: licenseAccepted
        }
      );
    }

    this.telemetryMetadata = {
      packageName: isManifest
        ? 'manifest'
        : parsePackageReference(input).name,
      isLocal: flags.local ?? false,
      isManifest,
      installedCount: installed.length
    };

    // Report results
    this.logInstallResult(installed, skipped, plan);

    return {
      installed,
      skippedLicense: skipped,
      skippedPlatform: this.toSkippedPlatformData(plan.skipped ?? []),
      alreadyInstalled: plan.alreadyInstalled
    };
  }

  /**
   * Flattens the package manager's skipped-with-reason entries into the
   * shape used by the JSON response envelope.
   *
   * @param skipped - Packages excluded from the install plan with a reason
   * @returns The flattened skipped-platform package data
   */
  private toSkippedPlatformData(
    skipped: CfsInstallPlan['skipped']
  ): SkippedPlatformPackage[] {
    return (skipped ?? []).map((pkg) => ({
      name: pkg.reference.name,
      version: pkg.reference.version,
      reasonCode: pkg.reasonCode
    }));
  }

  /**
   * Determines if the input string is a manifest file path rather than a package reference.
   *
   * @param input - The input string to check
   * @returns true if the input is a file path, false otherwise
   */
  private isManifestFile(input: string): boolean {
    try {
      return fs.existsSync(input) && fs.statSync(input).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Logs the installation result to the console.
   *
   * @param installed - Packages that were installed
   * @param skipped - Packages that were skipped
   * @param plan - The original installation plan
   * @returns void
   */
  private logInstallResult(
    installed: CfsPackageReference[],
    skipped: CfsPackageReference[],
    plan: CfsInstallPlan
  ): void {
    const skippedWithReason = plan.skipped ?? [];

    if (
      installed.length === 0 &&
      skipped.length === 0 &&
      skippedWithReason.length === 0
    ) {
      this.log(
        'No packages were installed. The package may already be installed; use command "cfsutil pkg list" to check.'
      );
      return;
    }

    if (installed.length > 0) {
      this.log('\nThe following packages have been installed:');
      for (const pkg of installed) {
        this.log(`- ${pkg.name}/${pkg.version}`);
      }
    }

    if (skipped.length > 0) {
      this.log(
        '\nThe following packages were skipped (license not accepted):'
      );
      for (const pkg of skipped) {
        this.log(`- ${pkg.name}/${pkg.version}`);
      }
    }

    if (skippedWithReason.length > 0) {
      this.log(
        '\nThe following packages were skipped (not installable on this platform):'
      );
      for (const pkg of skippedWithReason) {
        this.log(
          `- ${pkg.reference.name}/${pkg.reference.version}: ${getSkippedPackageReasonMessage(pkg.reasonCode)}`
        );
      }
    }

    if (plan.alreadyInstalled.length > 0) {
      this.log('\nAlready installed:');
      for (const pkg of plan.alreadyInstalled) {
        this.log(`- ${pkg.name}/${pkg.version}`);
      }
    }
  }

  /**
   * Displays license information from the install plan and prompts the user to accept.
   *
   * @param plan - The installation plan containing license information
   * @returns true if the user accepts the license, false otherwise
   */
  private async promptForLicenseAcceptance(
    plan: CfsInstallPlan
  ): Promise<boolean> {
    const packages = plan.requiresLicenseAcceptance;

    // Check if stdin is a TTY (interactive terminal)
    // In non-interactive environments (CI, piped input, etc.), fail fast
    // and instruct users to use --acceptLicense flag
    if (!process.stdin.isTTY) {
      const packageList = packages
        .map((p) => `${p.reference.name}/${p.reference.version}`)
        .join(', ');
      this.error(
        `License acceptance required for: ${packageList}\n` +
          'Running in non-interactive mode. Use --acceptLicense flag to accept licenses in CI/automated environments.'
      );
      return false;
    }

    this.log(
      `\nThe following ${packages.length} package(s) require license acceptance:\n`
    );

    for (const pkg of packages) {
      this.log(
        `  - ${pkg.reference.name}/${pkg.reference.version} (${pkg.license})`
      );
    }

    this.log('\n----------------------------------------');

    // Display each package's license
    for (const pkg of packages) {
      this.log(
        `\nPackage: ${pkg.reference.name}/${pkg.reference.version}`
      );
      if (pkg.licenseText) {
        this.log(pkg.licenseText);
      } else {
        this.log(`License: ${pkg.license}`);
      }

      this.log('\n----------------------------------------');
    }

    // Prompt for acceptance
    const {stdin, stdout} = process;
    const isMultiple = packages.length > 1;

    return new Promise<boolean>((resolve) => {
      const promptMessage = isMultiple
        ? `\nDo you accept all the license agreements listed above? (y/n): `
        : `\nDo you accept the license agreement listed above? (y/n): `;

      stdout.write(promptMessage);
      stdin.setEncoding('utf8');
      stdin.resume();

      const cleanup = () => {
        stdin.off('data', onData);
        stdin.off('error', onError);
        stdin.pause();
      };

      const onData = (data: Buffer | string) => {
        const ans = data.toString().trim().toLowerCase();
        cleanup();
        resolve(ans === 'y' || ans === 'yes');
      };

      const onError = () => {
        cleanup();
        resolve(false);
      };

      stdin.on('data', onData);
      stdin.on('error', onError);
    });
  }
}
