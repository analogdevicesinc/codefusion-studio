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

import {expect} from 'chai';
import {runCommand} from '@oclif/test';

import {apiKeyDeleteDeps} from '../../../../src/commands/myanalog/apikey/delete.js';

describe('myanalogapikey delete', () => {
  const originalGetApiClient = apiKeyDeleteDeps.getApiClient;

  afterEach(() => {
    apiKeyDeleteDeps.getApiClient = originalGetApiClient;
  });

  it('deletes API key by id', async () => {
    let deletedAppKey: string | undefined;

    apiKeyDeleteDeps.getApiClient = async (options) => {
      expect(options).to.deep.equal({
        auth: ['session']
      });
      return {
        rest: {
          usersKeys: {
            delete: async ({appKey}: {appKey: string}) => {
              deletedAppKey = appKey;
            }
          }
        }
      } as never;
    };

    const {stdout, error} = await runCommand(
      ['myanalog', 'apikey', 'delete', 'key-123'],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(deletedAppKey).to.equal('key-123');
    expect(stdout.trim()).to.equal('API key deleted successfully.');
  });

  it('works with hidden apikeys:delete alias', async () => {
    let deletedAppKey: string | undefined;

    apiKeyDeleteDeps.getApiClient = async () =>
      ({
        rest: {
          usersKeys: {
            delete: async ({appKey}: {appKey: string}) => {
              deletedAppKey = appKey;
            }
          }
        }
      }) as never;

    const {stdout, error} = await runCommand(
      ['myanalog', 'apikeys', 'delete', 'key-999'],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(deletedAppKey).to.equal('key-999');
    expect(stdout.trim()).to.equal('API key deleted successfully.');
  });
});
