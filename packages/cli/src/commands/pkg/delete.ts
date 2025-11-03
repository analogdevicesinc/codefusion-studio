/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
export default class CfsPackageDelete extends Command {
  static args = {
    pattern: Args.string({
      name: 'pattern',
      description:
        "A pattern in the form pkg_name/version that may contain '*' as a wildcard character.",
      multiple: false,
      required: true
    })
  };

  static description =
    'Delete packages from the local cache. To use a deleted package again, reinstall it using the `cfsutil pkg install` command.';

  async run() {
    const packman = await getPackageManager();
    const {args} = await this.parse(CfsPackageDelete);

    this.log('Deleting packages...');

    // Delete packages matching the pattern
    // and get the list of deleted packages
    const deleted = await packman.delete(args.pattern);

    if (deleted.length === 0) {
      this.log('No packages were deleted.');
    } else {
      this.log(`Successfully deleted ${deleted.length} package(s):`);
      for (const {name, version} of deleted) {
        this.log(`- ${name}/${version}`);
      }
    }
  }
}
