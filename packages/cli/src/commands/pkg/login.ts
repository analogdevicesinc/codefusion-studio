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

import {input, password} from '@inquirer/prompts';
import {Args, Command, Flags} from '@oclif/core';

import {getPackageManager} from '../../utils/package-manager.js';

export const pkgLoginDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

export default class CfsPackageLogin extends Command {
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

  static description = 'Log in to a package server.';

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
    })
  };

  static hidden = true;
  static state = 'deprecated';

  async run(): Promise<void> {
    const {args, flags} = await this.parse(CfsPackageLogin);
    const {remoteName} = args;

    const packman = await pkgLoginDeps.getPackageManager(
      {
        useRemotes: true
      },
      undefined,
      this
    );

    const username = flags.user ?? (await input({message: 'User'}));
    const pswd =
      flags.password ??
      (await password({message: 'Password (hidden)', mask: true}));
    await packman.login(remoteName, username, pswd);

    this.log(`Log in successful`);
  }
}
