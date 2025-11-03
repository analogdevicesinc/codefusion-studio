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

export default class CfsPackageLogout extends Command {
  static args = {
    remoteName: Args.string({
      name: 'remoteName',
      description: 'Local name given to the server on addRemote.',
      multiple: false,
      required: true
    })
  };

  static description = 'Logout from a package server.';

  async run(): Promise<void> {
    const packman = await getPackageManager({
      includeCredentialProvider: true
    });
    const {args} = await this.parse(CfsPackageLogout);
    await packman.logout(args.remoteName);

    this.log(`Logout successful!`);
  }
}
