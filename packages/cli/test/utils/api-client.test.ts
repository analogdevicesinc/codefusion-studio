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
import {CfsApiError} from 'cfs-lib';

import {
  apiClientDeps,
  AuthenticationRequiredError,
  getApiClient
} from '../../src/utils/api-client.js';
import {PublicAuthorizer} from 'cfs-ccm-lib';

describe('api-client auth selection', () => {
  const originalDeps = {
    getAuthConfig: apiClientDeps.getAuthConfig,
    getSessionManager: apiClientDeps.getSessionManager,
    createApiClient: apiClientDeps.createApiClient
  };
  const originalApiKeyEnv = process.env.CFS_API_KEY;

  afterEach(() => {
    apiClientDeps.getAuthConfig = originalDeps.getAuthConfig;
    apiClientDeps.getSessionManager = originalDeps.getSessionManager;
    apiClientDeps.createApiClient = originalDeps.createApiClient;

    if (originalApiKeyEnv === undefined) {
      delete process.env.CFS_API_KEY;
    } else {
      process.env.CFS_API_KEY = originalApiKeyEnv;
    }
  });

  it('uses API key auth when CFS_API_KEY is set and included in auth array', async () => {
    process.env.CFS_API_KEY = 'test-api-key';

    apiClientDeps.getAuthConfig = () =>
      ({
        authUrl: new URL('https://auth.example.com'),
        ccmUrl: new URL('https://ccm.example.com'),
        clientId: 'client',
        authCallbacks: [new URL('https://localhost/callback')],
        sessionFile: '/tmp/session',
        scopes: ['openid']
      }) as never;

    apiClientDeps.getSessionManager = (() => ({
      getSession: async () => {
        throw new Error('should not request session');
      }
    })) as never;

    let capturedAuthorizer:
      | {
          onRequest: ({request}: {request: Request}) => Request;
        }
      | undefined;

    const fakeClient = {
      id: 'api-client',
      testConnection: async () => undefined
    };
    apiClientDeps.createApiClient = ((options: {
      authorizer: unknown;
    }) => {
      capturedAuthorizer = options.authorizer as never;
      return fakeClient as never;
    }) as never;

    const result = await getApiClient({auth: ['api-key']});

    expect(result).to.equal(fakeClient);
    const request = new Request('https://example.com');
    capturedAuthorizer?.onRequest({request});
    expect(request.headers.get('X-Api-Key')).to.equal('test-api-key');
  });

  it('uses token session authorizer when session is found', async () => {
    delete process.env.CFS_API_KEY;

    const sessionAuthorizer = {
      onRequest: () => undefined
    };

    apiClientDeps.getAuthConfig = () =>
      ({
        authUrl: new URL('https://auth.example.com'),
        ccmUrl: new URL('https://ccm.example.com'),
        clientId: 'client',
        authCallbacks: [new URL('https://localhost/callback')],
        sessionFile: '/tmp/session',
        scopes: ['openid']
      }) as never;

    apiClientDeps.getSessionManager = (() => ({
      getSession: async () => ({authorizer: sessionAuthorizer})
    })) as never;

    let capturedAuthorizer: unknown;
    const fakeClient = {
      id: 'api-client',
      testConnection: async () => undefined
    };
    apiClientDeps.createApiClient = ((options: {
      authorizer: unknown;
    }) => {
      capturedAuthorizer = options.authorizer;
      return fakeClient as never;
    }) as never;

    const result = await getApiClient();

    expect(result).to.equal(fakeClient);
    expect(capturedAuthorizer).to.equal(sessionAuthorizer);
  });

  it('returns undefined when auth config is missing and optional is true (no public auth allowed)', async () => {
    delete process.env.CFS_API_KEY;

    apiClientDeps.getAuthConfig = () => {
      throw new Error('auth config not found');
    };

    apiClientDeps.getSessionManager = (() => ({
      getSession: async () => {
        throw new Error('should not be called');
      }
    })) as never;

    const result = await getApiClient({
      auth: ['api-key', 'session'],
      optional: true
    });
    expect(result).to.equal(undefined);
  });

  it('returns a public client with the default URL when auth config is missing and optional is true (public auth allowed)', async () => {
    delete process.env.CFS_API_KEY;

    apiClientDeps.getAuthConfig = () => {
      throw new Error('auth config not found');
    };

    apiClientDeps.getSessionManager = (() => ({
      getSession: async () => {
        throw new Error('should not be called');
      }
    })) as never;

    let capturedAuthorizer: unknown;
    let capturedBaseUrl: unknown;
    const fakeClient = {
      id: 'api-client',
      testConnection: async () => undefined
    };
    apiClientDeps.createApiClient = ((
      options:
        | {
            authorizer: unknown;
            baseUrl: unknown;
          }
        | undefined
    ) => {
      capturedAuthorizer = options?.authorizer;
      capturedBaseUrl = options?.baseUrl;
      return fakeClient as never;
    }) as never;

    const result = await getApiClient({
      auth: ['api-key', 'session', 'public'],
      optional: true
    });
    expect(result).to.equal(fakeClient);
    expect(capturedBaseUrl).to.satisfy(
      (val: unknown) =>
        val === undefined ||
        ((typeof val === 'string' || val instanceof URL) &&
          new URL(val).href ===
            'https://ccm.codefusion.app.analog.com/')
    );
    expect(capturedAuthorizer).to.satisfy(
      (val: unknown) =>
        val === undefined || val instanceof PublicAuthorizer
    );
  });

  it('throws AuthenticationRequiredError when no auth method succeeds', async () => {
    process.env.CFS_API_KEY = 'test-api-key';

    apiClientDeps.getAuthConfig = () =>
      ({
        authUrl: new URL('https://auth.example.com'),
        ccmUrl: new URL('https://ccm.example.com'),
        clientId: 'client',
        authCallbacks: [new URL('https://localhost/callback')],
        sessionFile: '/tmp/session',
        scopes: ['openid']
      }) as never;

    apiClientDeps.getSessionManager = (() => ({
      getSession: async () => undefined
    })) as never;

    let error: AuthenticationRequiredError | undefined;
    try {
      await getApiClient({auth: ['session']});
    } catch (e) {
      error = e as AuthenticationRequiredError;
    }

    expect(error).to.be.instanceOf(AuthenticationRequiredError);
    expect(error?.message).to.contain(
      'requires a myAnalog login session'
    );
  });

  it('prefers api-key over session when both available and api-key is first in auth array', async () => {
    process.env.CFS_API_KEY = 'test-api-key';

    const sessionAuthorizer = {
      onRequest: () => undefined
    };

    apiClientDeps.getAuthConfig = () =>
      ({
        authUrl: new URL('https://auth.example.com'),
        ccmUrl: new URL('https://ccm.example.com'),
        clientId: 'client',
        authCallbacks: [new URL('https://localhost/callback')],
        sessionFile: '/tmp/session',
        scopes: ['openid']
      }) as never;

    apiClientDeps.getSessionManager = (() => ({
      getSession: async () => ({authorizer: sessionAuthorizer})
    })) as never;

    let capturedAuthorizer: unknown;
    const fakeClient = {
      id: 'api-client',
      testConnection: async () => undefined
    };
    apiClientDeps.createApiClient = ((options: {
      authorizer: unknown;
    }) => {
      capturedAuthorizer = options.authorizer;
      return fakeClient as never;
    }) as never;

    const result = await getApiClient({auth: ['api-key', 'session']});

    expect(result).to.equal(fakeClient);
    const request = new Request('https://example.com');
    (capturedAuthorizer as any)?.onRequest({request});
    expect(request.headers.get('X-Api-Key')).to.equal('test-api-key');
  });

  it('throws AuthenticationRequiredError even with optional: true when no auth succeeds', async () => {
    delete process.env.CFS_API_KEY;

    apiClientDeps.getAuthConfig = () =>
      ({
        authUrl: new URL('https://auth.example.com'),
        ccmUrl: new URL('https://ccm.example.com'),
        clientId: 'client',
        authCallbacks: [new URL('https://localhost/callback')],
        sessionFile: '/tmp/session',
        scopes: ['openid']
      }) as never;

    apiClientDeps.getSessionManager = (() => ({
      getSession: async () => undefined
    })) as never;

    let error: AuthenticationRequiredError | undefined;
    try {
      await getApiClient({auth: ['session'], optional: true});
    } catch (e) {
      error = e as AuthenticationRequiredError;
    }

    expect(error).to.be.instanceOf(AuthenticationRequiredError);
  });

  it('throws an invalid API key error when testConnection returns AUTHN_REQUIRED', async () => {
    process.env.CFS_API_KEY = 'invalid-api-key';

    apiClientDeps.getAuthConfig = () =>
      ({
        authUrl: new URL('https://auth.example.com'),
        ccmUrl: new URL('https://ccm.example.com'),
        clientId: 'client',
        authCallbacks: [new URL('https://localhost/callback')],
        sessionFile: '/tmp/session',
        scopes: ['openid']
      }) as never;

    apiClientDeps.getSessionManager = (() => ({
      getSession: async () => {
        throw new Error('should not request session');
      }
    })) as never;

    const authnRequiredError = new CfsApiError({
      type: 'AUTHN_REQUIRED',
      message: 'Authentication required'
    });

    apiClientDeps.createApiClient = (() =>
      ({
        testConnection: async () => {
          throw authnRequiredError;
        }
      }) as never) as never;

    let error: (Error & {cause?: unknown}) | undefined;
    try {
      await getApiClient({auth: ['api-key']});
    } catch (e) {
      error = e as Error & {cause?: unknown};
    }

    expect(error).to.be.instanceOf(Error);
    expect(error?.message).to.equal(
      'The provided API key is invalid or has expired. Please check your CFS_API_KEY environment variable and try again.'
    );
    expect(error?.cause).to.equal(authnRequiredError);
  });
});
