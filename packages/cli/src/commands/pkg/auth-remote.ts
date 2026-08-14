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
import {input, password} from '@inquirer/prompts';
import {Args, Command, Flags} from '@oclif/core';

import {getPackageManager} from '../../utils/package-manager.js';

export const pkgAuthRemoteDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

export default class CfsPackageAuthRemote extends Command {
  static args = {
    remoteName: Args.string({
      description: 'Name of the remote package server.',
      multiple: false,
      required: true
    })
  };

  static description = `To view the currently configured authentication methods, use '<%= config.bin %> pkg list-remotes'.`;

  static examples = [
    {
      description: 'Specify a username and password',
      command: `<%= config.bin %> <%= command.id %> REMOTENAME --user USERNAME --password PASSWORD`
    },
    {
      description: 'Specify a username and be prompted for password',
      command: `<%= config.bin %> <%= command.id %> REMOTENAME --user USERNAME`
    },
    {
      description: 'Do not use any authentication',
      command: `<%= config.bin %> <%= command.id %> REMOTENAME --none`
    }
  ];

  static flags = {
    none: Flags.boolean({
      char: 'n',
      aliases: ['no-auth'],
      description: 'Do not use any authentication.',
      required: false,
      exactlyOne: ['none', 'user']
    }),
    user: Flags.string({
      char: 'u',
      description:
        'Authenticate with a username and password. If no password is provided, you will be prompted for one.',
      helpValue: 'USERNAME',
      multiple: false,
      required: false,
      exactlyOne: ['none', 'user']
    }),
    password: Flags.string({
      char: 'p',
      description:
        'User password, API key or token to authenticate with.',
      helpValue: 'PASSWORD',
      multiple: false,
      required: false,
      dependsOn: ['user']
    })
  };

  static summary =
    'Set the method used to authenticate to a remote package server.';

  static usage = `<%= command.id %> REMOTENAME {--user USERNAME [--password PASSWORD] | --none}`;

  async run(): Promise<void> {
    const {args, flags} = await this.parse(CfsPackageAuthRemote);
    const {remoteName} = args;

    const packman = await pkgAuthRemoteDeps.getPackageManager(
      {
        useRemotes: true
      },
      undefined,
      this
    );
    if (flags.none) {
      // Remove any authentication
      await packman.logout(remoteName);
    } else {
      // Use a username and password
      const username =
        flags.user ?? (await input({message: 'Username'}));
      const pswd =
        flags.password ??
        (await password({message: 'Password (hidden)', mask: true}));
      await packman.login(remoteName, username, pswd);
    }

    this.log(`Authentication method set successfully`);
  }
}
