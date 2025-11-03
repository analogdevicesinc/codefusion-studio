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

import _ from 'lodash';
import { CfsApiClient } from '../cfsapi-client.js';
import { zSoC } from '../../gen/rest-types.zod.js';
import { Catalog, StorageOptions } from '../../catalog/catalog.js';
import { SoC } from '../../gen/index.js';
/**
 * SoC Catalog that can be used in online (uses CFS API) or offline modes.
 */
export class SocCatalog extends Catalog<SoC> {
    #socParser?: ReturnType<typeof zSoC.refine>;

    /**
     * Instantiates in online (uses CFS API) or offline modes.
     * In online mode, the catalog can be loaded from the API using refresh() and is stored locally.
     * In offline mode, the catalog must already exist locally, or be imported using import().
     * Two data stores are created to keep operations atomic: one for the primary data and one for temporary data.
     * The temp store is cleaned up when the catalog is disposed of, if the cleanTmp option was set to true.
     * eg., given a directory of '/path/to/data':
     * - the primary store is at '/path/to/data/soc/db/soc-catalog.json'
     * - the temp store is at '/path/to/data/soc/db.<random string>.tmp/soc-catalog.json'.
     * @param options Options for the underlying storage.
     * @param options.directory The directory where the catalog data should be stored. Will be created if it doesn't exist.
     * @param options.storage The class to use for local storage operations. Defaults to LowDBDataStore.
     * @param options.cleanTmp Whether to delete the temporary data when the catalog is disposed of.
     * @param cfsApiClient CFS API client object for online mode.
     * @throws {CatalogError}
     * @example const catalogWithClient = new SocCatalog({ directory: '/path/to/data' }, cfsApiClient);
     * @example const catalogWithoutClient = new SocCatalog({ directory: '/path/to/data' });
     * @example const catalogWithDifferentStore = new SocCatalog({ directory: '/path/to/data', storage: MyCustomStoreClass });
     * @example const catalogThatKeepsTmpData = new SocCatalog({ directory: '/path/to/data', cleanTmp: false });
     */
    public constructor(
        options: StorageOptions,
        cfsApiClient?: CfsApiClient,
    ) {
        super(options, 'soc', cfsApiClient?.rest.socs);
    }

    /**
     * Returns the parser for SoC objects.
     * @returns The parser for SoC objects.
     */
    protected get itemParser(): ReturnType<typeof zSoC.refine> {
        this.#socParser ??= zSoC
            // remove unknown properties
            .strip()
            // find any mismatched SoC ids in child objects
            // superRefine to report multiple issues
            .superRefine((s, ctx) => {
                const search = (
                    obj: unknown,
                    key: string,
                    expected: string,
                    path?: string[],
                ) => {
                    if (
                        _.has(obj, key) &&
                        ((typeof obj[key] === 'string' &&
                            obj[key] !== expected) ||
                            (Array.isArray(obj[key]) &&
                                !(obj[key] as unknown[]).includes(
                                    expected,
                                )))
                    ) {
                        ctx.addIssue({
                            message: `Mismatched SoC id: expected "${expected}", received "${obj[key]}"`,
                            code: 'custom',
                            path: [...(path ?? []), key],
                        });
                    }
                    _.forOwn(obj, (value, pkey) => {
                        if (_.isObject(value)) {
                            return search(value, key, expected, [
                                ...(path ?? []),
                                pkey,
                            ]);
                        }
                    });
                };
                search(s, 'socID', s.id);
                search(s, 'socIDs', s.id);
            });
        return this.#socParser;
    }

    /**
     * Retrieves a summary of the SoCs in the catalog.
     * @returns A promise that resolves to a list of SoCs with only the id, display name, and description.
     */
    public async summary(): Promise<
        (Pick<SoC, 'id' | 'name' | 'description'> & {
            familyName: string;
        })[]
    > {
        return (await this.getAll()).map((s) => {
            return {
                id: s.id,
                name: s.name,
                description: s.description,
                familyName: s.family.name,
            };
        });
    }
}
