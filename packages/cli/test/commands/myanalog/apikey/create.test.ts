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

import {apiKeyCreateDeps} from '../../../../src/commands/myanalog/apikey/create.js';

type CreateApiKeyPayload = {
  description?: string;
  readTags: string[];
  role: 'user' | 'admin';
  writeTags: string[];
};

describe('myanalog apikey create', () => {
  const originalGetApiClient = apiKeyCreateDeps.getApiClient;

  afterEach(() => {
    apiKeyCreateDeps.getApiClient = originalGetApiClient;
  });

  it('creates an API key with provided options', async () => {
    let capturedOptions:
      | {
          auth?: ('api-key' | 'public' | 'session')[];
          optional?: boolean;
        }
      | undefined;
    let capturedPayload: CreateApiKeyPayload | undefined;

    apiKeyCreateDeps.getApiClient = async (options) => {
      capturedOptions = options;
      return {
        rest: {
          usersKeys: {
            create: async (payload: CreateApiKeyPayload) => {
              capturedPayload = payload;
              return {
                id: 'key-1',
                role: 'user',
                maskedKey: '****abcd',
                createdAt: '2026-01-01T00:00:00.000Z',
                expiration: '2027-01-01T00:00:00.000Z',
                ownerEmail: 'test@example.com',
                ownerID: 'owner-1',
                read: [],
                write: [],
                description: payload.description,
                key: 'abc123'
              };
            }
          }
        }
      } as never;
    };

    const {stdout, error} = await runCommand(
      [
        'myanalog',
        'apikey',
        'create',
        '--description',
        '"CI key"',
        '--read-tag',
        'public',
        '--write-tag',
        'private'
      ],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(capturedOptions).to.deep.equal({
      auth: ['session']
    });
    expect(capturedPayload).to.deep.equal({
      description: 'CI key',
      readTags: ['public'],
      role: 'user',
      writeTags: ['private']
    });
    expect(stdout).to.contain('API key created successfully.');
    expect(stdout).to.contain('Key: abc123');
  });

  it('uses admin role when --role admin is specified', async () => {
    let capturedPayload: CreateApiKeyPayload | undefined;

    apiKeyCreateDeps.getApiClient = async () =>
      ({
        rest: {
          usersKeys: {
            create: async (payload: CreateApiKeyPayload) => {
              capturedPayload = payload;
              return {
                id: 'key-admin',
                role: payload.role,
                maskedKey: '****admn',
                createdAt: '2026-01-01T00:00:00.000Z',
                expiration: '2027-01-01T00:00:00.000Z',
                ownerEmail: 'admin@example.com',
                ownerID: 'owner-admin',
                read: [],
                write: [],
                key: 'admin123'
              };
            }
          }
        }
      }) as never;

    const {error} = await runCommand(
      ['myanalog', 'apikey', 'create', '--role', 'admin'],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    expect(capturedPayload?.role).to.equal('admin');
  });

  it('uses user role by default when --role is not specified', async () => {
    let capturedPayload: CreateApiKeyPayload | undefined;

    apiKeyCreateDeps.getApiClient = async () =>
      ({
        rest: {
          usersKeys: {
            create: async (payload: CreateApiKeyPayload) => {
              capturedPayload = payload;
              return {
                id: 'key-default-role',
                role: payload.role,
                maskedKey: '****user',
                createdAt: '2026-01-01T00:00:00.000Z',
                expiration: '2027-01-01T00:00:00.000Z',
                ownerEmail: 'user@example.com',
                ownerID: 'owner-user',
                read: [],
                write: [],
                key: 'user123'
              };
            }
          }
        }
      }) as never;

    const {error} = await runCommand(
      ['myanalog', 'apikey', 'create'],
      {
        root: '..'
      }
    );

    expect(error).to.be.undefined;
    expect(capturedPayload?.role).to.equal('user');
  });

  it('rejects invalid role values', async () => {
    let calledGetApiClient = false;

    apiKeyCreateDeps.getApiClient = async () => {
      calledGetApiClient = true;
      throw new Error('getApiClient should not be called');
    };

    const {error} = await runCommand(
      ['myanalog', 'apikey', 'create', '--role', 'superuser'],
      {root: '..'}
    );

    expect(error).to.not.be.undefined;
    expect(error?.message).to.contain('--role');
    expect(error?.message).to.contain('user');
    expect(error?.message).to.contain('admin');
    expect(calledGetApiClient).to.equal(false);
  });

  it('prints json when --format json is used', async () => {
    apiKeyCreateDeps.getApiClient = async () =>
      ({
        rest: {
          usersKeys: {
            create: async () => ({
              id: 'key-2',
              role: 'admin',
              maskedKey: '****efgh',
              createdAt: '2026-01-01T00:00:00.000Z',
              expiration: '2027-01-01T00:00:00.000Z',
              ownerEmail: 'admin@example.com',
              ownerID: 'owner-2',
              key: 'def456',
              read: ['*'],
              write: ['*']
            })
          }
        }
      }) as never;

    const {stdout, error} = await runCommand(
      ['myanalog', 'apikey', 'create', '--format', 'json'],
      {root: '..'}
    );

    expect(error).to.be.undefined;
    const parsed = JSON.parse(stdout);
    expect(parsed.id).to.equal('key-2');
    expect(parsed.role).to.equal('admin');
  });

  it('works with hidden apikeys:create alias', async () => {
    apiKeyCreateDeps.getApiClient = async () =>
      ({
        rest: {
          usersKeys: {
            create: async () => ({
              id: 'key-3',
              role: 'user',
              maskedKey: '****ijkl',
              createdAt: '2026-01-01T00:00:00.000Z',
              expiration: '2027-01-01T00:00:00.000Z',
              ownerEmail: 'user@example.com',
              ownerID: 'owner-3',
              read: [],
              write: [],
              key: 'alias123'
            })
          }
        }
      }) as never;

    const {stdout, error} = await runCommand(
      ['myanalog', 'apikeys', 'create'],
      {
        root: '..'
      }
    );

    expect(error).to.be.undefined;
    expect(stdout).to.contain('API key created successfully.');
    expect(stdout).to.contain('Key: alias123');
  });
});
