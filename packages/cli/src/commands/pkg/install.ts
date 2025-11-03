/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {Args, Command, Flags} from '@oclif/core';
import * as fs from 'node:fs';

import {
  getPackageManager,
  parsePackageReference
} from '../../utils/package-manager.js';

export default class CfsPackageInstall extends Command {
  static args = {
    reference: Args.string({
      name: 'reference',
      description:
        'Package reference (name/version) or path to a manifest file containing packages to install. eg. somePkg/2.0.0 or /absolute/path/to/.cfsdependencies',
      multiple: false,
      required: true
    })
  };

  static description =
    'Install a cfs package, including all its dependencies or a list of packages as specified in a manifest file.';

  static flags = {
    local: Flags.boolean({
      char: 'l',
      summary:
        'Install packages from local cache only (without download from remotes)'
    })
  };

  async run(): Promise<void> {
    // Parse the command arguments
    const {args, flags} = await this.parse(CfsPackageInstall);

    // Get the package manager instance
    const packman = await getPackageManager({
      includeCredentialProvider: !flags.local
    });

    const input = args.reference;

    let packageRefs: Array<{name: string; version: string}>;

    // Check if input is a manifest file path
    if (this.isManifestFile(input)) {
      // Install packages from manifest file
      packageRefs = await packman.installFromManifest(input, {
        localOnly: flags.local
      });
    } else {
      // Parse as package reference
      const pkgRef = parsePackageReference(input);

      // Install the package and its dependencies
      packageRefs = await packman.install(pkgRef, {
        localOnly: flags.local
      });
    }

    if (packageRefs.length === 0) {
      this.log(
        'No packages were installed. The package may already be installed; use command "cfsutil pkg list" to check.'
      );
      return;
    }

    this.log('The following packages have been installed:');
    for (const pkg of packageRefs) {
      this.log(`- ${pkg.name}/${pkg.version}`);
    }
  }

  /**
   * Determines if the input string is a manifest file path rather than a package reference.
   * Uses filesystem utilities to check if the input is a file.
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
}
