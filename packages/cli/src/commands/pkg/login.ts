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
import {Args, Command, Flags, ux} from '@oclif/core';

import {getPackageManager} from '../../utils/package-manager.js';

export default class CfsPackageLogin extends Command {
  static args = {
    remoteName: Args.string({
      name: 'remoteName',
      description: 'Local name given to the server on addRemote.',
      multiple: false,
      required: true
    })
  };

  static description = 'Login to a package server.';

  static flags = {
    user: Flags.string({
      char: 'u',
      description:
        'User name to be used on the remote server. If not provided it will be prompted during command execution',
      multiple: false,
      required: false
    }),
    password: Flags.string({
      char: 'p',
      description:
        'User password, API key or token to authenticate into the server. If not provided it will be prompted (and properly hidden) during command execution',
      multiple: false,
      required: false
    }),
    'with-myanalog': Flags.boolean({
      description: 'Use myAnalog session to obtain credentials',
      required: false,
      exclusive: ['password', 'user']
    })
  };

  async run(): Promise<void> {
    const {args, flags} = await this.parse(CfsPackageLogin);
    const {remoteName} = args;

    const packman = await getPackageManager({
      includeCredentialProvider: true
    });
    if (flags['with-myanalog']) {
      await packman.setRemoteCredentialProvider(
        remoteName,
        'myAnalog'
      );
    } else {
      const username = flags.user ?? (await ux.ux.prompt('User'));
      const password =
        flags.password ??
        (await ux.ux.prompt('Password', {type: 'hide'}));
      await packman.login(remoteName, username, password);
    }

    this.log(`Login successful!`);
  }
}
