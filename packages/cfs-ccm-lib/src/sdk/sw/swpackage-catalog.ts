/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { CfsApiClient } from '../cfsapi-client.js';
import { zSWPackage } from 'cfs-ccm-api/rest-types/zod';
import { Catalog } from '../../catalog/catalog.js';
import type { StorageOptions } from '../../catalog/catalog.js';
import type { SWPackage } from 'cfs-ccm-api/rest-types';
import { LIB_VERSION } from '../../config/constants.cjs';

/**
 * SWPackage Catalog that can be used in online (uses CFS API) or offline modes.
 */
export class SWPackageCatalog extends Catalog<SWPackage> {
    protected readonly itemParser = zSWPackage;

    /**
     * Instantiates in online (uses CFS API) or offline modes.
     * @param options Options for the underlying storage.
     * @param cfsApiClient CFS API client object for online mode.
     * @param cfsVersion CFS version to use when fetching SWPackages from the API. Defaults to LIB_VERSION.
     */
    public constructor(
        options: StorageOptions,
        cfsApiClient?: CfsApiClient,
        cfsVersion: string = LIB_VERSION,
    ) {
        super(
            options,
            'swpackage',
            cfsApiClient?.rest.swPackages,
            cfsVersion,
        );
    }
}
