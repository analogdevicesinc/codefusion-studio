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
import {Args, Command} from '@oclif/core';

import {getPackageManager} from '../../utils/package-manager.js';

export const pkgEnableRemoteDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

export default class CfsPackageEnableRemote extends Command {
  static args = {
    remoteName: Args.string({
      description: 'Name of the remote package server.',
      multiple: false,
      required: true
    })
  };

  static description =
    'Enables a previously registered remote package server.';

  async run(): Promise<void> {
    const packman = await pkgEnableRemoteDeps.getPackageManager(
      {
        useRemotes: true
      },
      undefined,
      this
    );

    const {args} = await this.parse(CfsPackageEnableRemote);
    await packman.enableRemote(args.remoteName);

    this.log(`Enabled remote package server successfully`);
  }
}
