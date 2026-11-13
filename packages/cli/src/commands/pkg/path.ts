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
import {
  getPackageManager,
  validatePackageName
} from '../../utils/package-manager.js';

export const pkgPathDeps: {
  getPackageManager: typeof getPackageManager;
  validatePackageName: typeof validatePackageName;
} = {
  getPackageManager,
  validatePackageName
};

export default class CfsPackagePath extends BaseCommand<
  typeof CfsPackagePath
> {
  static args = {
    pkgName: Args.string({
      description: 'Name of the package, without version.',
      multiple: false,
      required: true
    })
  };

  static description = 'Retrieve path of an installed package.';
  static useResponseEnvelope = true;

  async run(): Promise<{path: string}> {
    const packman = await pkgPathDeps.getPackageManager(
      {
        useRemotes: false
      },
      undefined,
      this
    );
    const {args} = this;

    pkgPathDeps.validatePackageName(args.pkgName);

    const packagePath = await packman.getPath(args.pkgName);

    this.log(`${packagePath}`);

    return {path: packagePath};
  }
}
