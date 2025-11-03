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

import {getPackageManager} from '../../utils/package-manager.js';

export default class CfsPackageSearch extends Command {
  static args = {
    pattern: Args.string({
      name: 'pattern',
      description:
        "A pattern in the form pkg_name/version that may contain '*' as a wildcard character.",
      multiple: false,
      required: true
    })
  };

  static description = 'Retrieve packages available for install.';

  async run(): Promise<void> {
    const packman = await getPackageManager({
      includeCredentialProvider: true
    });
    const {args} = await this.parse(CfsPackageSearch);
    const packageRefs = await packman.search(args.pattern);

    if (packageRefs.length === 0) {
      this.log(
        `No packages matched the search query "${args.pattern}". Please try a different pattern.`
      );
      return;
    }

    this.log('Packages available for installation: ');
    for (const pkg of packageRefs) {
      this.log(`- ${pkg.name}/${pkg.version}`);
    }
  }
}
