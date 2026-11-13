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
  PackageDependencyResult,
  PackageDependencyVerification
} from '../../utils/package-dependency-verification.js';

import {Flags} from '@oclif/core';
import {getSkippedPackageReasonMessage} from 'cfs-package-manager';
import {statSync} from 'node:fs';
import path from 'node:path';

import {BaseCommand} from '../../utils/base-command.js';
import {verifyPackageDependencies} from '../../utils/package-dependency-verification.js';
import {getPackageManager} from '../../utils/package-manager.js';
import {RecoverableError} from '../../utils/recoverable-error.js';
import {
  findWorkspaceDependencyManifests,
  findWorkspaceRoot
} from '../../utils/workspace-utils.js';

export const validateDependenciesDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

/**
 * Implements `cfsutil validate dependencies`, checking that packages
 * declared in a CFS dependency manifest are installed at compatible
 * versions.
 */
export default class ValidateDependencies extends BaseCommand<
  typeof ValidateDependencies
> {
  static aliases = ['validate:deps'];

  static description =
    'Validate that packages declared in CFS dependency manifests are installed.';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --workspace ./my-workspace',
    '<%= config.bin %> <%= command.id %> --input ./workspace/.cfs/.cfsdependencies',
    '<%= config.bin %> <%= command.id %> --format json'
  ];

  static flags = {
    workspace: Flags.directory({
      char: 'w',
      required: false,
      exclusive: ['input'],
      summary:
        'Path to the CFS workspace. Defaults to the current directory.'
    }),
    input: Flags.file({
      char: 'i',
      required: false,
      exclusive: ['workspace'],
      summary: 'Path to a standalone .cfsdependencies manifest.'
    })
  };

  /**
   * Resolves the dependency manifests, verifies their declared packages
   * against installed packages, and prints the results in text mode.
   * @returns One dependency verification result per manifest.
   */
  async run(): Promise<PackageDependencyVerification[]> {
    const {flags} = this;

    const manifestPaths = flags.input
      ? [this.resolveExplicitManifest(flags.input)]
      : this.discoverManifests(
          path.resolve(flags.workspace ?? process.cwd()),
          flags.workspace !== undefined
        );

    const packageManager =
      await validateDependenciesDeps.getPackageManager(
        {useRemotes: true},
        undefined,
        this
      );

    const results: PackageDependencyVerification[] = [];
    for (const manifestPath of manifestPaths) {
      const result = await verifyPackageDependencies(
        manifestPath,
        packageManager
      );
      results.push(result);

      if (!this.jsonEnabled()) {
        this.printResult(result);
      }
    }

    if (results.some((result) => !result.valid)) {
      process.exitCode = 1;
    }

    return results;
  }

  /**
   * Discovers the dependency manifests for the nearest CFS workspace
   * starting from the given directory, distinguishing a missing workspace
   * from a workspace that simply has no manifest.
   * @param startPath - The directory to search from (the `--workspace` flag
   * value, or the current directory by default).
   * @param explicitWorkspace - Whether `--workspace` was explicitly passed,
   * used to keep the "no workspace found" error message readable for the
   * default (current directory) case.
   * @returns The absolute manifest paths.
   * @throws A RecoverableError when no workspace or no manifest is found.
   */
  private discoverManifests(
    startPath: string,
    explicitWorkspace: boolean
  ): string[] {
    const workspaceRoot = findWorkspaceRoot(startPath);

    if (!workspaceRoot) {
      const location = explicitWorkspace
        ? `starting from '${startPath}'`
        : 'from the current directory';
      throw new RecoverableError(
        `No CFS workspace was found ${location}.`,
        {
          suggestion:
            'Run this command from within a CFS workspace, provide --workspace, or provide --input with an explicit manifest path.',
          example:
            'cfsutil validate dependencies --input ./workspace/.cfs/.cfsdependencies'
        }
      );
    }

    const manifestPaths = findWorkspaceDependencyManifests(startPath);
    if (manifestPaths.length === 0) {
      throw new RecoverableError(
        `The CFS workspace at '${workspaceRoot}' does not declare a '.cfs/.cfsdependencies' manifest in the workspace or its projects.`,
        {
          suggestion:
            'Add a .cfs/.cfsdependencies manifest to the workspace, or provide --input with an explicit manifest path.'
        }
      );
    }

    // Reuse the explicit-path file check so a discovered path that exists
    // but isn't a file (e.g. a directory) reports the same friendly error.
    return manifestPaths.map((manifestPath) =>
      this.resolveExplicitManifest(manifestPath)
    );
  }

  /**
   * Formats one package result as a single human-readable line.
   * @param pkg - The package result to format.
   * @returns The formatted line, without a leading list marker.
   */
  private formatPackageLine(pkg: PackageDependencyResult): string {
    const constraint = `${pkg.name}/${pkg.requiredVersion}`;

    if (pkg.status === 'installed') {
      return `${constraint}: installed (${pkg.installedVersion})`;
    }

    if (pkg.status === 'missing') {
      return `${constraint}: missing`;
    }

    if (pkg.status === 'version-mismatch') {
      return `${constraint}: installed version '${pkg.installedVersion}' does not satisfy the requirement`;
    }

    const reason = pkg.reasonCode
      ? ` (${getSkippedPackageReasonMessage(pkg.reasonCode)})`
      : '';
    return `${constraint}: unsupported on this platform${reason}`;
  }

  /**
   * Prints the text-mode summary and every requirement's status.
   * @param result - The verification result to print.
   * @returns Nothing.
   */
  private printResult(result: PackageDependencyVerification): void {
    if (result.packages.length === 0) {
      this.log(
        `No packages are declared in '${result.manifestPath}'.`
      );
      return;
    }

    this.log(
      result.valid
        ? `All packages declared in '${result.manifestPath}' are installed.`
        : `Unmet package dependencies in '${result.manifestPath}':`
    );

    for (const pkg of result.packages) {
      this.log(`- ${this.formatPackageLine(pkg)}`);
    }
  }

  /**
   * Resolves an explicit manifest argument relative to the current
   * directory and requires it to be a readable file.
   * @param manifestArg - The user-supplied manifest path.
   * @returns The resolved absolute manifest path.
   * @throws A RecoverableError when the path is not an existing file.
   */
  private resolveExplicitManifest(manifestArg: string): string {
    const resolvedPath = path.resolve(manifestArg);

    let pathExists = false;
    let isFile = false;
    try {
      isFile = statSync(resolvedPath).isFile();
      pathExists = true;
    } catch (error) {
      const errorCode =
        error && typeof error === 'object' && 'code' in error
          ? error.code
          : undefined;

      if (errorCode !== 'ENOENT' && errorCode !== 'ENOTDIR') {
        throw error;
      }
    }

    if (!isFile) {
      throw new RecoverableError(
        pathExists
          ? `The dependency manifest '${resolvedPath}' is not a file.`
          : `The dependency manifest '${resolvedPath}' was not found.`,
        {
          suggestion:
            'Provide a path to an existing .cfsdependencies manifest.'
        }
      );
    }

    return resolvedPath;
  }
}
