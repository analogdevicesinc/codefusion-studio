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

import {getApiClient} from '../../../utils/api-client.js';
import {BaseCommand} from '../../../utils/base-command.js';

export const apiKeyDeleteDeps: {
  getApiClient: typeof getApiClient;
} = {
  getApiClient
};

export default class CfsApiKeyDelete extends BaseCommand<
  typeof CfsApiKeyDelete
> {
  static args = {
    appKey: Args.string({
      description: 'API key ID to delete.',
      required: true
    })
  };

  static description = 'Delete an API key.';
  static flags = {
    ...BaseCommand.baseFlags
  };

  static hiddenAliases = ['myanalog:apikeys:delete'];

  async run(): Promise<void> {
    const {args} = this;
    const apiClient = await apiKeyDeleteDeps.getApiClient(
      {
        auth: ['session']
      },
      this
    );

    await apiClient.rest.usersKeys.delete({appKey: args.appKey});

    if (this.jsonEnabled()) {
      this.logJson({msg: 'API key deleted successfully.'});
      return;
    }

    this.log('API key deleted successfully.');
  }
}
