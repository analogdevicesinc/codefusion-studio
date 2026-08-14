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

import {Config} from '@oclif/core';
import {CatalogManager, CfsApiClient, SocCatalog} from 'cfs-lib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  AuthenticationRequiredError,
  getApiClient
} from './api-client.js';
import {
  getCFSInstallPath,
  getCustomCatalogStorePath,
  getVersionFromConfig
} from './utils.js';

const ACCESS_ERROR =
  'Unable to create online session. Please ensure you are logged into your myAnalog account or have a valid API key in CFS_API_KEY.';

/* Return the SoC catalog
 * @param config - The Oclif configuration object
 * @param forceOnline - If true, forces fetching the catalog from the online source, otherwise uses local backup
 * @returns Promise resolving to the SoC catalog
 * @throws Error if there is an issue accessing the catalog, such as authentication errors when forceOnline is true or issues with the local backup file.
 */
export async function getSocCatalog(
  config: Config,
  forceOnline = false
): Promise<SocCatalog> {
  let apiClient: CfsApiClient | undefined;

  if (forceOnline) {
    try {
      apiClient = await getApiClient({auth: ['api-key', 'session']});
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) {
        // eslint-disable-next-line unicorn/prefer-type-error
        throw new Error(ACCESS_ERROR, {cause: error});
      }

      throw new Error(
        `Error creating API client for catalog access` +
          (error instanceof Error ? `: ${error.message}` : '')
      );
    }
  }

  // Use custom catalog store path from config if available, otherwise use default
  const customCatalogPath = getCustomCatalogStorePath(config);

  const catalogStoreDir =
    customCatalogPath ??
    path.resolve(
      os.homedir(),
      'cfs',
      getVersionFromConfig(config),
      '.catalog'
    );

  const cfsPath = getCFSInstallPath(config);
  const catalogBackupStore =
    cfsPath && path.resolve(cfsPath, 'Data', 'SoC', 'catalog.zip');
  const catalogBackupZipFile =
    catalogBackupStore &&
    fs.existsSync(catalogBackupStore) &&
    !forceOnline
      ? catalogBackupStore
      : undefined;

  const catalogManager = new CatalogManager({
    catalogStoreDir,
    catalogBackupZipFile,
    apiClient
  });

  await catalogManager.loadCatalog();

  return catalogManager.socCatalog;
}
