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
import {Args, Flags} from '@oclif/core';
import type {CfsPackageReference} from 'cfs-package-manager';

import {BaseCommand} from '../../utils/base-command.js';

import {getPackageManager} from '../../utils/package-manager.js';

export const pkgListDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

export default class CfsPackageList extends BaseCommand<
  typeof CfsPackageList
> {
  static args = {
    pattern: Args.string({
      name: 'pattern',
      description:
        'Optional pattern to be matched with package names. eg. "pkgName/1.*", "pkgNa*".',
      multiple: false,
      required: false
    })
  };

  static description = 'List installed packages.';
  static useResponseEnvelope = true;

  static flags = {
    filter: Flags.string({
      charAliases: ['f'],
      deprecateAliases: true,
      description:
        'Optional argument in the form KEY=VALUE used to filter returned packages only to the ones with matching metadata. If this argument is used multiple times, all conditions must be satisfied',
      multiple: true,
      required: false
    })
  };

  async run(): Promise<{packages: CfsPackageReference[]}> {
    const packman = await pkgListDeps.getPackageManager();
    const {args, flags} = this;

    const filterPairs = flags.filter?.map((x) => x.split('='));
    const filter = Object.fromEntries(filterPairs ?? []);

    const packageRefs = await packman.list(args.pattern, filter);

    if (packageRefs.length === 0) {
      this.log('No packages installed');
    } else {
      this.log('Installed Packages: ');
      for (const pkg of packageRefs) {
        this.log(`- ${pkg.name}/${pkg.version}`);
      }
    }

    return {packages: packageRefs};
  }
}
