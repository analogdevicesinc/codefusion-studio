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

import {
  getPackageManager,
  parsePackageReference
} from '../../utils/package-manager.js';

export default class CfsPackageInformation extends Command {
  static args = {
    packageReference: Args.string({
      name: 'packageReference',
      description:
        'Package reference that includes package name and package version. eg. somePkg/2.0.0',
      multiple: false,
      required: true
    })
  };

  static description =
    'Retrieve a given package metadata. The package does not need to be installed for this information to be retrieved.';

  static flags = {
    format: Flags.string({
      char: 'f',
      default: undefined,
      summary: 'Output format',
      options: ['json']
    })
  };

  async run(): Promise<void> {
    const packman = await getPackageManager({
      includeCredentialProvider: true
    });
    const {args, flags} = await this.parse(CfsPackageInformation);
    const pkgRef = parsePackageReference(args.packageReference);

    const packageInfo = await packman.getPackageInfo(pkgRef);

    if (flags.format === 'json') {
      const packageInfoStr = JSON.stringify(packageInfo, null, 2);
      this.log(packageInfoStr);
      return;
    }

    // Display package information in a formatted, human-readable way
    this.log('Package Information');
    this.log('-------------------');
    this.log(`Name:        ${packageInfo.reference.name || 'N/A'}`);
    this.log(
      `Version:     ${packageInfo.reference.version || 'N/A'}`
    );
    this.log(`Type:        ${packageInfo.type || 'N/A'}`);
    this.log(`Description: ${packageInfo.description || 'N/A'}`);
    this.log(`License:     ${packageInfo.license || 'N/A'}`);
    this.log(`CFS Version: ${packageInfo.cfsVersion || 'N/A'}`);

    if (packageInfo.soc && packageInfo.soc.length > 0) {
      this.log('Supported SoCs:');
      for (const soc of packageInfo.soc) {
        this.log(`  - ${soc}`);
      }
    }
  }
}
