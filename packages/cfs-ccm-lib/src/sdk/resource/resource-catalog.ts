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

import { CfsApiClient } from '../cfsapi-client.js';
import { zResource } from 'cfs-ccm-api/rest-types/zod';
import { Catalog } from '../../catalog/catalog.js';
import type { StorageOptions } from '../../catalog/catalog.js';
import type { Resource } from 'cfs-ccm-api/rest-types';
import { LIB_VERSION } from '../../config/constants.cjs';
/**
 * Resource Catalog that can be used in online (uses CFS API) or offline modes.
 */
export class ResourceCatalog extends Catalog<Resource> {
    protected readonly itemParser = zResource;

    /**
     * Instantiates in online (uses CFS API) or offline modes.
     * In online mode, the catalog can be loaded from the API using refresh() and is stored locally.
     * In offline mode, the catalog must already exist locally, or be imported using import().
     * Two data stores are created to keep operations atomic: one for the primary data and one for temporary data.
     * The temp store is cleaned up when the catalog is disposed of, if the cleanTmp option was set to true.
     * eg., given a directory of '/path/to/data':
     * - the primary store is at '/path/to/data/resource/db/resource-catalog.json'
     * - the temp store is at '/path/to/data/resource/db.<random string>.tmp/resource-catalog.json'.
     * @param options Options for the underlying storage.
     * @param options.directory The directory where the catalog data should be stored. Will be created if it doesn't exist.
     * @param options.storage The class to use for local storage operations. Defaults to LowDBDataStore.
     * @param options.cleanTmp Whether to delete the temporary data when the catalog is disposed of.
     * @param cfsApiClient CFS API client object for online mode.
     * @param cfsVersion CFS version to use when fetching Resources from the API. Defaults to LIB_VERSION.
     * @throws {CatalogError}
     * @example const catalogWithClient = new ResourceCatalog({ directory: '/path/to/data' }, cfsApiClient);
     * @example const catalogWithoutClient = new ResourceCatalog({ directory: '/path/to/data' });
     * @example const catalogWithDifferentStore = new ResourceCatalog({ directory: '/path/to/data', storage: MyCustomStoreClass });
     * @example const catalogThatKeepsTmpData = new ResourceCatalog({ directory: '/path/to/data', cleanTmp: false });
     */
    public constructor(
        options: StorageOptions,
        cfsApiClient?: CfsApiClient,
        cfsVersion: string = LIB_VERSION,
    ) {
        super(
            options,
            'resource',
            cfsApiClient?.rest.resources,
            cfsVersion,
        );
    }
}
