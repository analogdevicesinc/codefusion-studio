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
import {Args, Command, Flags} from '@oclif/core';

import {
  getPackageManager,
  parsePackageReference
} from '../../utils/package-manager.js';

export const pkgDependenciesDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

export default class CfsPackageDependencies extends Command {
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
    'Retrieves dependencies of a package (including transitive dependencies), showing concrete resolved versions by default.';

  static flags = {
    unresolved: Flags.boolean({
      char: 'u',
      aliases: ['non-concrete'],
      description:
        'Show unresolved dependency requirements instead of concrete resolved versions'
    }),
    local: Flags.boolean({
      aliases: ['offline'],
      description:
        'Resolve dependencies only from local cache and installed packages'
    })
  };

  async run(): Promise<void> {
    const {args, flags} = await this.parse(CfsPackageDependencies);
    const pkgRef = parsePackageReference(args.packageReference);
    const packman = await pkgDependenciesDeps.getPackageManager(
      {
        useRemotes: !flags.local
      },
      undefined,
      this
    );

    const packageRefs = await packman.dependencies(pkgRef, {
      unresolved: flags.unresolved,
      localOnly: flags.local
    });

    if (packageRefs.length === 0) {
      this.log(
        `${args.packageReference} does not require any other package`
      );
      return;
    }

    this.log(
      `${args.packageReference} requires the following packages:`
    );
    for (const pkg of packageRefs) {
      this.log(`- ${pkg.name}/${pkg.version}`);
    }
  }
}
