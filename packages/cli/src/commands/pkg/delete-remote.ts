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
import {Args} from '@oclif/core';

import {BaseCommand} from '../../utils/base-command.js';

import {getPackageManager} from '../../utils/package-manager.js';

export const pkgDeleteRemoteDeps: {
  getPackageManager: typeof getPackageManager;
} = {
  getPackageManager
};

export default class CfsPackageDeleteRemote extends BaseCommand<
  typeof CfsPackageDeleteRemote
> {
  static args = {
    remoteName: Args.string({
      description: 'Name of the remote package server.',
      multiple: false,
      required: true
    })
  };

  static description =
    'Unregister a package server so it is no longer considered for package retrieval.';

  static useResponseEnvelope = true;

  async run(): Promise<{remote: string; deleted: boolean}> {
    const packman = await pkgDeleteRemoteDeps.getPackageManager(
      {
        useRemotes: true
      },
      undefined,
      this
    );
    const {args} = this;

    await packman.deleteRemote(args.remoteName);

    this.log(`Removed remote package server successfully`);

    return {remote: args.remoteName, deleted: true};
  }
}
