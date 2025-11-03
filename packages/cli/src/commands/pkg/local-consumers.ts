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
import {Args, Command} from '@oclif/core';

import {
  getPackageManager,
  validatePackageName
} from '../../utils/package-manager.js';

export default class CfsPackageLocalConsumers extends Command {
  static args = {
    name: Args.string({
      name: 'packageName',
      description:
        'Name of the package to retrieve information about. Note that since only one version of a package can be installed at a given time, it is not required to provide the version.',
      multiple: false,
      required: true
    })
  };

  static description =
    'Retrieves a list of all installed packages that depend on a given package, including transitive consumers.';

  async run(): Promise<void> {
    const packman = await getPackageManager();
    const {args} = await this.parse(CfsPackageLocalConsumers);

    validatePackageName(args.name);

    const packageRefs = await packman.localConsumers(args.name);

    if (packageRefs.length === 0) {
      this.log(`${args.name} is not required by any other package`);
      return;
    }

    this.log(`${args.name} is required by the following packages:`);
    for (const pkg of packageRefs) {
      this.log(`- ${pkg.name}/${pkg.version}`);
    }
  }
}
