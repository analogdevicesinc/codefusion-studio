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
import type {Command} from '@oclif/core';

import {
  ApiKeyAuthorizer,
  type AuthConfig,
  CfsApiClient,
  CfsApiError
} from 'cfs-lib';

import {getAuthConfig, getSessionManager} from './session-manager.js';

export const apiClientDeps: {
  getAuthConfig: typeof getAuthConfig;
  getSessionManager: typeof getSessionManager;
  createApiClient: (
    options?: ConstructorParameters<typeof CfsApiClient>[0]
  ) => CfsApiClient;
} = {
  getAuthConfig,
  getSessionManager,
  createApiClient: (options) => new CfsApiClient(options)
};

/** Auth methods accepted by {@link getApiClient} */
export type AuthMethod = 'api-key' | 'public' | 'session';

function isAuthMethod(method: string): asserts method is AuthMethod {
  if (!['api-key', 'public', 'session'].includes(method)) {
    throw new Error(`Unsupported authentication method: ${method}`);
  }
}

/**
 * Thrown when the operation requires authentication but no valid credentials
 * (session or API key) are present. Catch this to distinguish "not signed in"
 * from infrastructure or configuration failures.
 */
export class AuthenticationRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

function newAuthRequiredError(
  auth: AuthMethod[],
  apiKey: string | undefined
): AuthenticationRequiredError {
  const allowsApiKey = auth.includes('api-key');
  const allowsSession = auth.includes('session');

  if (allowsSession && apiKey && !allowsApiKey) {
    return new AuthenticationRequiredError(
      'This operation requires a myAnalog login session and cannot be used with an API key.'
    );
  }

  return new AuthenticationRequiredError(
    `This operation requires authentication. Please ${allowsSession ? 'log in to myAnalog' : ''}${allowsApiKey ? (allowsSession ? ' or' : '') + ' set environment variable CFS_API_KEY' : ''} then try again.`
  );
}

type GetApiClientOptions = {
  /**
   * Auth methods to attempt, tried in the order given.
   * Defaults to `['api-key', 'session', 'public']`.
   */
  auth?: AuthMethod[];
  /**
   * When `true`, returns `undefined` instead of throwing when the auth
   * configuration is missing or invalid (e.g. not yet set up in this
   * environment). {@link AuthenticationRequiredError} is still thrown even
   * when `optional` is `true` — catch it explicitly if the caller can
   * gracefully continue without credentials.
   * Defaults to `false`.
   */
  optional?: boolean;
};

export async function getApiClient(
  options?: {
    auth?: AuthMethod[];
    optional?: false;
  },
  command?: Command
): Promise<CfsApiClient>;
export async function getApiClient(
  options: {
    auth?: AuthMethod[];
    optional: true;
  },
  command?: Command
): Promise<CfsApiClient | undefined>;
export async function getApiClient(
  options?: GetApiClientOptions,
  command?: Command
): Promise<CfsApiClient | undefined> {
  const {auth = ['api-key', 'session', 'public'], optional = false} =
    options ?? {};
  const authMethods =
    auth.length === 0
      ? (['api-key', 'session', 'public'] as AuthMethod[])
      : auth;
  const apiKey = process.env.CFS_API_KEY?.trim();
  let authcfg: AuthConfig | undefined;

  // Separate the config-loading step so optional only suppresses config errors.
  try {
    authcfg = apiClientDeps.getAuthConfig();
  } catch (error) {
    if (!optional) {
      throw error;
    }

    if (!process.env.CFS_AUTH_SKIP_CONFIG) {
      command?.warn(
        `Failed to load auth config, only public data will be available\n${error instanceof Error ? error.message : String(error)}`
      );
    }

    return authMethods.includes('public')
      ? apiClientDeps.createApiClient() // Default public client with default URL
      : undefined;
  }

  for (const method of authMethods) {
    switch (method) {
      case 'api-key': {
        if (apiKey) {
          return createApiKeyClient(apiKey, authcfg.ccmUrl);
        }

        break;
      }

      case 'session': {
        const session = await apiClientDeps
          .getSessionManager()
          .getSession();
        if (session) {
          return apiClientDeps.createApiClient({
            baseUrl: authcfg.ccmUrl,
            authorizer: session.authorizer
          });
        }

        break;
      }

      case 'public': {
        return apiClientDeps.createApiClient({
          baseUrl: authcfg.ccmUrl
        });
      }

      default: {
        isAuthMethod(method);
      }
    }
  }

  // None of the requested auth methods succeeded
  throw newAuthRequiredError(authMethods, apiKey);
}

async function createApiKeyClient(
  apiKey: string,
  ccmUrl: URL | string
): Promise<CfsApiClient> {
  const client = apiClientDeps.createApiClient({
    baseUrl: ccmUrl,
    authorizer: new ApiKeyAuthorizer({apiKey})
  });

  try {
    await client.testConnection(10_000);
  } catch (error) {
    if (
      error instanceof CfsApiError &&
      error.type === 'AUTHN_REQUIRED'
    ) {
      throw new Error(
        'The provided API key is invalid or has expired. Please check your CFS_API_KEY environment variable and try again.',
        {cause: error}
      );
    }

    throw error;
  }

  return client;
}
