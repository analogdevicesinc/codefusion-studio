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
import {Args} from '@oclif/core';

import {BaseCommand} from '../../utils/base-command.js';

import {
  getPackageManager,
  parsePackageReference
} from '../../utils/package-manager.js';
import {CfsPackage} from 'cfs-package-manager';

export const pkgInfoDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

export default class CfsPackageInformation extends BaseCommand<
  typeof CfsPackageInformation
> {
  static useResponseEnvelope = true;

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

  async run(): Promise<CfsPackage> {
    const packman = await pkgInfoDeps.getPackageManager(
      {
        useRemotes: true
      },
      undefined,
      this
    );
    const {args} = this;
    const pkgRef = parsePackageReference(args.packageReference);

    const packageInfo = await packman.getPackageInfo(pkgRef);

    // Display package information in a formatted, human-readable way
    // (suppressed in JSON mode; the data is returned as the envelope's
    // `data` payload instead).
    if (!this.jsonEnabled()) {
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

    return packageInfo;
  }
}
