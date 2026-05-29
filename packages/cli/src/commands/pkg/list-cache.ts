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
import {Args} from '@oclif/core';

import {BaseCommand} from '../../utils/base-command.js';
import {getPackageManager} from '../../utils/package-manager.js';

export default class CfsPackageListCache extends BaseCommand<
  typeof CfsPackageListCache
> {
  static args = {
    pattern: Args.string({
      name: 'pattern',
      description:
        'Optional pattern to be matched with package names. e.g. "pkgName/1.*", "pkgNa*".',
      multiple: false,
      required: false
    })
  };

  static description = 'List cached packages.';

  async run(): Promise<void> {
    const packman = await getPackageManager();
    const {args} = this;

    const packageRefs = await packman.listCache(args.pattern);

    if (this.jsonEnabled()) {
      this.logJson({
        packages: packageRefs.map((pkg) => ({
          name: pkg.reference.name,
          version: pkg.reference.version,
          isInstalled: pkg.isInstalled
        }))
      });
      return;
    }

    if (packageRefs.length === 0) {
      this.log('No packages cached');
      return;
    }

    this.log('Cached Packages: ');
    for (const pkg of packageRefs) {
      this.log(
        `- ${pkg.reference.name}/${pkg.reference.version} | ${pkg.isInstalled ? 'Installed' : 'Not Installed'}`
      );
    }
  }
}
