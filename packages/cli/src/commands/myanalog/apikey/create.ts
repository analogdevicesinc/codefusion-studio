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

import {Flags} from '@oclif/core';

import {getApiClient} from '../../../utils/api-client.js';
import {BaseCommand} from '../../../utils/base-command.js';
import {RecoverableError} from '../../../utils/recoverable-error.js';

export const apiKeyCreateDeps: {
  getApiClient: typeof getApiClient;
} = {
  getApiClient
};

export default class CfsApiKeyCreate extends BaseCommand<
  typeof CfsApiKeyCreate
> {
  static description = 'Create a new API key.';

  static flags = {
    ...BaseCommand.baseFlags,
    description: Flags.string({
      description: 'Optional description for the key.',
      required: false
    }),
    role: Flags.string({
      description: 'Role assigned to the key.',
      options: ['user', 'admin'],
      default: 'user',
      required: false,
      hidden: true
    }),
    'read-tag': Flags.string({
      description: 'Read access tag. Can be provided multiple times.',
      multiple: true,
      required: false,
      hidden: true
    }),
    'write-tag': Flags.string({
      description:
        'Write access tag. Can be provided multiple times.',
      multiple: true,
      required: false,
      hidden: true
    })
  };

  static hiddenAliases = ['myanalog:apikeys:create'];

  async run(): Promise<void> {
    const {flags} = this;
    const apiClient = await apiKeyCreateDeps.getApiClient(
      {
        auth: ['session']
      },
      this
    );

    const apiKey = await apiClient.rest.usersKeys.create({
      description: flags.description,
      readTags: flags['read-tag'] ?? [],
      role: flags.role as 'admin' | 'user',
      writeTags: flags['write-tag'] ?? []
    });

    if (!apiKey.key) {
      throw new RecoverableError(
        'The server reported success but the API key was not returned in the response.',
        {
          suggestion:
            'Delete the API key then run this command again to create a new one.',
          run: `cfsutil myanalog apikey delete ${apiKey.id}`
        }
      );
    }

    if (this.jsonEnabled()) {
      this.logJson(apiKey);
      return;
    }

    this.log('API key created successfully.\n');
    this.log(`ID: ${apiKey.id}`);
    this.log(`Role: ${apiKey.role}`);
    this.log(`Masked key: ${apiKey.maskedKey}`);
    this.log(`Created: ${apiKey.createdAt}`);
    this.log(`Expires: ${apiKey.expiration}`);
    if (apiKey.description) {
      this.log(`Description: ${apiKey.description}`);
    }

    if (apiKey.read.length > 0) {
      this.log(`Read tags: ${apiKey.read.join(', ')}`);
    }

    if (apiKey.write.length > 0) {
      this.log(`Write tags: ${apiKey.write.join(', ')}`);
    }

    this.log(`Key: ${apiKey.key}`);
    this.log(
      '\nStore this key securely now. It cannot be shown again.'
    );
    this.log(
      '\nTo use the key, set the environment variable CFS_API_KEY to the key value.'
    );
  }
}
