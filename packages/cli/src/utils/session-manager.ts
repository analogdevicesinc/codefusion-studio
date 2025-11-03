/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import {
  AuthConfig,
  SessionManager,
  checkIfFileExists,
  readJsonFile
} from 'cfs-lib';
import envPaths from 'env-paths';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authConfigFile = path.resolve(dirname, '../config/auth.json');

// Default session file path
const defaultSessionFile = path.join(
  envPaths('com.analog.cfs', {suffix: ''})[
    process.platform === 'darwin' ? 'config' : 'data'
  ],
  'session'
);

try {
  const dotenv = await import('dotenv');
  // Look for a .env file to load
  dotenv.config({
    path: [
      // First match wins
      path.resolve(process.cwd(), '.env'), // cwd
      path.resolve(dirname, '../..', '.env'), // this package
      path.resolve(dirname, '../../../..', '.env') // root package
    ]
  });
} catch {
  // dotenv may not be available outside of dev environment
}

export function getSessionManager(): SessionManager {
  const authConfig = getAuthConfig();
  return new SessionManager(authConfig);
}

// function to get auth config variables from json file and/or the environment
export function getAuthConfig(): AuthConfig {
  try {
    let authConfig;
    if (checkIfFileExists(authConfigFile)) {
      authConfig = readJsonFile(authConfigFile) as Partial<
        Omit<AuthConfig, 'sessionFile'>
      >;
    }

    const authCallbacks = (
      process.env.CFS_AUTH_CALLBACK?.split(/\s+/) ||
      authConfig?.authCallbacks
    )?.map((url) => new URL(url)); // validate URLs
    const authUrl = process.env.CFS_AUTH_URL
      ? new URL(process.env.CFS_AUTH_URL)
      : authConfig?.authUrl
        ? new URL(authConfig.authUrl)
        : undefined;
    const ccmUrl = process.env.CFS_API_URL
      ? new URL(process.env.CFS_API_URL)
      : authConfig?.ccmUrl
        ? new URL(authConfig.ccmUrl)
        : undefined;
    const clientId =
      process.env.CFS_AUTH_CLIENT_ID?.trim() || authConfig?.clientId;
    const sessionFile = process.env.CFS_SESSION_FILE
      ? path.resolve(process.env.CFS_SESSION_FILE)
      : defaultSessionFile;
    const scopes =
      process.env.CFS_AUTH_SCOPE?.split(/\s+/).map((scope) =>
        scope.trim()
      ) || authConfig?.scopes;

    if (
      [
        authCallbacks,
        authUrl,
        ccmUrl,
        clientId,
        sessionFile
      ].includes(undefined)
    ) {
      throw new Error('Missing required auth config fields');
    }

    return {
      authUrl,
      ccmUrl,
      clientId,
      authCallbacks,
      sessionFile,
      scopes
    } as AuthConfig;
  } catch (error) {
    throw new Error(
      'Invalid auth config. Please reinstall this utility.',
      {cause: error}
    );
  }
}
