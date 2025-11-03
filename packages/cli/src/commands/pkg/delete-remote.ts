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

export default class CfsPackageDeleteRemote extends Command {
  static args = {
    remoteName: Args.string({
      name: 'remoteName',
      description: 'Remote name.',
      multiple: false,
      required: true
    })
  };

  static description =
    'Unregister a package server so it is no longer considered for package retrieval';

  async run(): Promise<void> {
    const packman = await getPackageManager({
      includeCredentialProvider: true
    });
    const {args} = await this.parse(CfsPackageDeleteRemote);

    await packman.deleteRemote(args.remoteName);

    this.log(`Removed remote package server successfully`);
  }
}
