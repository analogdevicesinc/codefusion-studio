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
import Table from 'cli-table3';

import {getApiClient} from '../../../utils/api-client.js';
import {BaseCommand} from '../../../utils/base-command.js';
import {tableOutputStyles} from '../../../utils/utils.js';

export const apiKeyListDeps: {
  getApiClient: typeof getApiClient;
} = {
  getApiClient
};

export default class CfsApiKeyList extends BaseCommand<
  typeof CfsApiKeyList
> {
  static description = 'List API keys.';

  static flags = {
    ...BaseCommand.baseFlags,
    user: Flags.string({
      description:
        'User email/user ID (or "*") to list API keys for. Requires admin role.',
      required: false,
      hidden: true
    })
  };

  static hiddenAliases = ['myanalog:apikeys:list'];

  async run(): Promise<void> {
    const {flags} = this;
    const apiClient = await apiKeyListDeps.getApiClient(
      {
        auth: ['session']
      },
      this
    );

    const apiKeys = await apiClient.rest.usersKeys.getAll({
      userID: flags.user
    });

    if (this.jsonEnabled()) {
      this.logJson(apiKeys);
      return;
    }

    if (apiKeys.length === 0) {
      this.log('No API keys found.');
      return;
    }

    // avoid showing empty columns for optional fields
    const hasDescription = apiKeys.some((key) => key.description);
    const hasRole = apiKeys.some((key) => key.role !== 'user');
    const hasReadTags = apiKeys.some((key) => key.read.length > 0);
    const hasWriteTags = apiKeys.some((key) => key.write.length > 0);

    const tableData = apiKeys.map((key) => [
      key.id,
      ...(flags.user ? [key.ownerID, key.ownerEmail] : []),
      ...(hasDescription ? [key.description ?? ''] : []),
      ...(hasRole ? [key.role] : []),
      key.maskedKey,
      key.createdAt,
      key.expiration,
      ...(hasReadTags ? [key.read.join(', ')] : []),
      ...(hasWriteTags ? [key.write.join(', ')] : [])
    ]);

    const head = ['ID'];
    if (flags.user) {
      head.push('Owner ID', 'Owner Email');
    }

    if (hasDescription) {
      head.push('Description');
    }

    if (hasRole) {
      head.push('Role');
    }

    head.push('Masked Key', 'Created', 'Expires');
    if (hasReadTags) {
      head.push('Read Tags');
    }

    if (hasWriteTags) {
      head.push('Write Tags');
    }

    const table = new Table({
      head,
      wordWrap: true,
      wrapOnWordBoundary: true,
      colWidths: head.map((col) => {
        if (col === 'Description') {
          return 25;
        }

        return null;
      }),
      ...tableOutputStyles()
    });

    table.push(...tableData);
    this.log(table.toString());
  }
}
