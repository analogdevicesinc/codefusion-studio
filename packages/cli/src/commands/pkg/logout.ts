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
import {Args, Command} from '@oclif/core';

import {getPackageManager} from '../../utils/package-manager.js';

export const pkgLogoutDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

export default class CfsPackageLogout extends Command {
  static args = {
    remoteName: Args.string({
      name: 'remoteName',
      description: 'Local name given to the server on addRemote.',
      multiple: false,
      required: true
    })
  };

  static deprecationOptions = {
    message: `This command is deprecated and will be removed in a future release. Please use 'pkg auth-remote' instead.`
  };

  static description = 'Log out from a package server.';

  static hidden = true;
  static state = 'deprecated';

  async run(): Promise<void> {
    const packman = await pkgLogoutDeps.getPackageManager(
      {
        useRemotes: true
      },
      undefined,
      this
    );
    const {args} = await this.parse(CfsPackageLogout);
    await packman.logout(args.remoteName);

    this.log(`Log out successful`);
  }
}
