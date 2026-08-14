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

import {apiKeyListDeps} from '../../../../src/commands/myanalog/apikey/list.js';

describe('myanalog apikey list', () => {
  const originalGetApiClient = apiKeyListDeps.getApiClient;

  afterEach(() => {
    apiKeyListDeps.getApiClient = originalGetApiClient;
  });

  it('prints message when no API keys exist', async () => {
    apiKeyListDeps.getApiClient = async () =>
      ({
        rest: {
          usersKeys: {
            getAll: async () => []
          }
        }
      }) as never;

    const {stdout, error} = await runCommand(
      ['myanalog', 'apikey', 'list'],
      {
        root: '..'
      }
    );

    expect(error).to.be.undefined;
    expect(stdout.trim()).to.equal('No API keys found.');
  });

  it('prints json when --format json is used', async () => {
    apiKeyListDeps.getApiClient = async () =>
      ({
        rest: {
          usersKeys: {
            getAll: async () => [
              {
                id: 'key-1',
                role: 'user',
                maskedKey: '****1234',
                createdAt: '2026-01-01T00:00:00.000Z',
                expiration: '2027-01-01T00:00:00.000Z',
                ownerEmail: 'u@example.com',
                ownerID: 'owner-1',
                read: [],
                write: []
              }
            ]
          }
        }
      }) as never;

    const {stdout, error} = await runCommand(
      ['myanalog', 'apikey', 'list', '--format', 'json'],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    const parsed = JSON.parse(stdout);
    expect(parsed).to.have.lengthOf(1);
    expect(parsed[0].id).to.equal('key-1');
  });

  it('renders keys table in text format', async () => {
    apiKeyListDeps.getApiClient = async (options) => {
      expect(options).to.deep.equal({
        auth: ['session']
      });
      return {
        rest: {
          usersKeys: {
            getAll: async () => [
              {
                id: 'key-2',
                description: 'build',
                role: 'admin',
                maskedKey: '****5678',
                createdAt: '2026-01-02T00:00:00.000Z',
                expiration: '2027-01-02T00:00:00.000Z',
                ownerEmail: 'a@example.com',
                ownerID: 'owner-2',
                read: ['*'],
                write: ['*']
              }
            ]
          }
        }
      } as never;
    };

    const {stdout, error} = await runCommand(
      ['myanalog', 'apikey', 'list'],
      {
        root: '..'
      }
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain('ID');
    expect(stdout).to.contain('Description');
    expect(stdout).to.contain('Role');
    expect(stdout).to.contain('Masked Key');
    expect(stdout).to.contain('Created');
    expect(stdout).to.contain('Expires');
    expect(stdout).to.contain('Read Tags');
    expect(stdout).to.contain('Write Tags');
    expect(stdout).to.contain('key-2');
    expect(stdout).to.contain('build');
    expect(stdout).to.contain('admin');
    expect(stdout).to.contain('****5678');
    expect(stdout).to.contain('2026-01-02T00:00:00.000Z');
    expect(stdout).to.contain('2027-01-02T00:00:00.000Z');
    expect(stdout).to.contain('*');
  });

  it('omits optional columns when all values are empty/default', async () => {
    apiKeyListDeps.getApiClient = async () =>
      ({
        rest: {
          usersKeys: {
            getAll: async () => [
              {
                id: 'key-3',
                description: '',
                role: 'user',
                maskedKey: '****0000',
                createdAt: '2026-01-03T00:00:00.000Z',
                expiration: '2027-01-03T00:00:00.000Z',
                ownerEmail: 'u2@example.com',
                ownerID: 'owner-3',
                read: [],
                write: []
              }
            ]
          }
        }
      }) as never;

    const {stdout, error} = await runCommand(
      ['myanalog', 'apikey', 'list'],
      {
        root: '..'
      }
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain('ID');
    expect(stdout).to.contain('Masked Key');
    expect(stdout).to.contain('Created');
    expect(stdout).to.contain('Expires');
    expect(stdout).to.not.contain('Description');
    expect(stdout).to.not.contain('Role');
    expect(stdout).to.not.contain('Read Tags');
    expect(stdout).to.not.contain('Write Tags');
  });

  it('includes owner columns and forwards --user when provided', async () => {
    let capturedUserId: string | undefined;

    apiKeyListDeps.getApiClient = async () =>
      ({
        rest: {
          usersKeys: {
            getAll: async ({userID}: {userID?: string}) => {
              capturedUserId = userID;
              return [
                {
                  id: 'key-4',
                  role: 'user',
                  maskedKey: '****1111',
                  createdAt: '2026-01-04T00:00:00.000Z',
                  expiration: '2027-01-04T00:00:00.000Z',
                  ownerEmail: 'target@example.com',
                  ownerID: 'owner-4',
                  read: [],
                  write: []
                }
              ];
            }
          }
        }
      }) as never;

    const {stdout, error} = await runCommand(
      ['myanalog', 'apikey', 'list', '--user', 'target@example.com'],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(capturedUserId).to.equal('target@example.com');
    expect(stdout).to.contain('Owner ID');
    expect(stdout).to.contain('Owner Email');
    expect(stdout).to.contain('owner-4');
    expect(stdout).to.contain('target@example.com');
  });

  it('works with hidden apikeys:list alias', async () => {
    apiKeyListDeps.getApiClient = async () =>
      ({
        rest: {
          usersKeys: {
            getAll: async () => []
          }
        }
      }) as never;

    const {stdout, error} = await runCommand(
      ['myanalog', 'apikeys', 'list'],
      {
        root: '..'
      }
    );

    expect(error).to.be.undefined;
    expect(stdout.trim()).to.equal('No API keys found.');
  });
});
