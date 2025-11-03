/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import JSZip from 'jszip';
import temp from 'temp';
import _ from 'lodash';

import path from 'node:path';
import { promises as fs, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RequestOptions } from 'node:http';
import { ZodError } from 'zod';

import {
    CfsApiClient,
    PublicAuthorizer,
    SocCatalog,
} from '../../src/index.js';
import {
    CatalogError,
    DataStoreError,
    DataStore,
    StoreItem,
} from '../../src/catalog/types.js';

import {
    LIB_NAME,
    LIB_VERSION,
} from '../../src/config/constants.cjs';

use(chaiAsPromised);

// data sets returned by the mock data store and mock api
let mockData: Map<string, [string, StoreItem][]>;
let mockMetaData: Map<string, Record<string, unknown> | undefined>;

// test setups for bad schema tests
const badSchemaTestConfigs = new Map<
    string,
    { zodErrors: number; dataKey: string }
>([
    [
        'wrong property type',
        {
            zodErrors: 1,
            dataKey: 'wrong_prop_type',
        },
    ],
    [
        'missing required property',
        {
            zodErrors: 1,
            dataKey: 'missing_prop',
        },
    ],
    [
        'IDs not unique',
        {
            zodErrors: 0,
            dataKey: 'duplicate_id',
        },
    ],
    [
        'child element with wrong property type',
        {
            zodErrors: 1,
            dataKey: 'child_wrong_prop_type',
        },
    ],
    [
        'array property with wrong element type',
        {
            zodErrors: 1,
            dataKey: 'wrong_array_type',
        },
    ],
    [
        'deep element missing required properties',
        {
            zodErrors: 2,
            dataKey: 'deep_missing_props',
        },
    ],
    [
        'child element with socID property not matching the parent ID',
        {
            zodErrors: 1,
            dataKey: 'mismatched_child_id',
        },
    ],
    // Can't be tested until the schema contains such an element
    // [
    //     'child element with socID array property not containing the parent ID',
    //     {
    //         zodErrors: 1,
    //         dataKey: 'mismatched_child_id_array',
    //     },
    // ],
]);

const badMetadataTestConfigs = new Map<
    string,
    { zodErrors: number; dataKey: string }
>([
    [
        'wrong property type in metadata',
        {
            zodErrors: 1,
            dataKey: 'meta:wrong_prop_type',
        },
    ],
    [
        'invalid metadata',
        {
            zodErrors: 1,
            dataKey: 'meta:invalid',
        },
    ],
]);

// Closure to access the primary MockDataStore in tests
let primaryCatalogStore: () => MockDataStore;
// Closure to access the temp MockDataStore in tests
let tempCatalogStore: () => MockDataStore;

// Mock implementation of DataStore
class MockDataStore implements DataStore {
    readonly itemTag = 'MockItem';
    private data: Map<string, StoreItem>;
    private metadata?: Record<string, unknown> = undefined;
    #closeCalled = false;
    #destroyCalled = false;

    constructor(dirname: string) {
        const parentDir = path
            .relative(process.cwd(), dirname)
            .split(path.sep)[0]; // extract just the first directory name
        switch (true) {
            case parentDir === 'empty':
            case dirname.endsWith('.tmp'): // temp storage is always empty
                this.data = new Map<string, StoreItem>();
                break;
            case parentDir.startsWith('meta:'): {
                const metadata = mockMetaData.get(
                    parentDir.split(':')[1],
                );
                if (
                    !metadata &&
                    parentDir.split(':')[1] !== 'empty'
                ) {
                    throw new Error(
                        `Test setup error, invalid mock metadata for: "${parentDir}" (dirname = "${dirname}")`,
                    );
                }
                this.metadata = _.cloneDeep(metadata);
                this.data = new Map<string, StoreItem>();
                break;
            }
            case mockData.has(parentDir): {
                const data = mockData.get(parentDir);
                if (!data) {
                    throw new Error(
                        `Test setup error, invalid mock data for: "${parentDir}" (dirname = "${dirname}")`,
                    );
                }
                this.data = new Map<string, StoreItem>(
                    _.cloneDeep(data),
                );
                this.metadata = _.cloneDeep(
                    mockMetaData.get('valid'),
                );
                break;
            }
            default:
                throw new Error(
                    `Test setup error, mock data not found for: "${parentDir}" (dirname = "${dirname}")`,
                );
        }

        if (dirname.endsWith('.tmp')) {
            tempCatalogStore = () => this;
        } else {
            primaryCatalogStore = () => this;
        }
    }

    get closeCalled(): boolean {
        return this.#closeCalled;
    }

    get destroyCalled(): boolean {
        return this.#destroyCalled;
    }

    async close(): Promise<void> {
        this.#closeCalled = true;
    }

    async destroy(): Promise<void> {
        this.#destroyCalled = true;
    }

    async set(itm: StoreItem | StoreItem[]): Promise<void> {
        if (!Array.isArray(itm)) {
            itm = [itm];
        }
        itm.forEach((s) => this.data.set(s.id, s));
    }

    async get(id: string): Promise<StoreItem | undefined> {
        return this.data.get(id);
    }

    async setMetadata(
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        this.metadata = metadata;
    }

    async getMetadata(): Promise<
        Record<string, unknown> | undefined
    > {
        return this.metadata;
    }

    async list(): Promise<StoreItem[]> {
        return Array.from(this.data.values());
    }

    async isEmpty(): Promise<boolean> {
        return this.data.size === 0;
    }

    async purge(): Promise<void> {
        this.data.clear();
        this.metadata = undefined;
    }

    async replace(incoming: DataStore): Promise<void> {
        this.data = new Map<string, StoreItem>(
            (await incoming.list()).map((itm) => [itm.id, itm]),
        );
        this.metadata = await incoming.getMetadata();
    }

    async validate(): Promise<void> {
        // no-op
    }
}

class ErroringDataStore implements DataStore {
    errorType: DataStoreError['type'];
    readonly itemTag = 'MockItem';
    constructor(dirname: string) {
        const parentDir = path
            .relative(process.cwd(), dirname)
            .split(path.sep)[0]; // extract just the first directory name
        if (parentDir === 'error') {
            throw new DataStoreError({
                message: 'Error from data store',
                type: 'IO_ERROR',
            });
        }
        this.errorType =
            parentDir === 'invalidData' ? 'INVALID_DATA' : 'IO_ERROR';
    }

    private _err(): DataStoreError {
        return new DataStoreError({
            message: 'Error from data store',
            type: this.errorType,
        });
    }

    async close(): Promise<void> {
        throw this._err();
    }

    async destroy(): Promise<void> {
        throw this._err();
    }

    async get(_id: string): Promise<StoreItem | undefined> {
        void _id;
        throw this._err();
    }

    async list(): Promise<StoreItem[]> {
        throw this._err();
    }

    async isEmpty(): Promise<boolean> {
        throw this._err();
    }

    async purge(): Promise<void> {
        throw this._err();
    }

    async replace(_incoming: DataStore): Promise<void> {
        void _incoming;
        throw this._err();
    }

    async set(_itm: StoreItem | StoreItem[]): Promise<void> {
        void _itm;
        throw this._err();
    }

    async validate(): Promise<void> {
        throw this._err();
    }

    async setMetadata(
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        void metadata;
        throw this._err();
    }

    async getMetadata(): Promise<
        Record<string, unknown> | undefined
    > {
        throw this._err();
    }
}

const setupTestData = () => {
    // Data used for store contents or api responses
    mockData = new Map<string, [string, StoreItem][]>([
        [
            'valid', // valid data
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'soc1Name',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
                [
                    'soc2Id',
                    {
                        id: 'soc2Id',
                        name: 'soc2Name',
                        description: 'soc2Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc2Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'reordered', // same valid data but entries in the array swapped
            [
                [
                    'soc2Id',
                    {
                        id: 'soc2Id',
                        name: 'soc2Name',
                        description: 'soc2Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc2Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'soc1Name',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'changed_prop', // same valid data but one property changed
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'soc1Name',
                        description: 'changed', // different description
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
                [
                    'soc2Id',
                    {
                        id: 'soc2Id',
                        name: 'soc2Name',
                        description: 'soc2Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc2Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'extra_entry', // same valid data with one extra entry
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'soc1Name',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
                [
                    'soc2Id',
                    {
                        id: 'soc2Id',
                        name: 'soc2Name',
                        description: 'soc2Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc2Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
                [
                    'soc3Id',
                    {
                        id: 'soc3Id',
                        name: 'soc3Name',
                        description: 'soc3Desc',
                        family: {
                            id: 'family2Id',
                            name: 'familyN2ame',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc3Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'removed_entry', // same valid data but with one entry removed
            [
                [
                    'soc2Id',
                    {
                        id: 'soc2Id',
                        name: 'soc2Name',
                        description: 'soc2Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc2Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'deep_optional_prop', // deep optional props included/excluded
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'soc1Name',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                                supportsTrustZone: true,
                            },
                            {
                                id: 'core1',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                                supportsTrustZone: false,
                            },
                            {
                                id: 'core2',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                                // nil supportsTrustZone
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'no_entry', // no data is returned (but valid so no error)
            [],
        ],
        [
            'extra_prop', // same valid data with extra properties
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'soc1Name',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                        myNewProperty: 'myNewValue',
                    },
                ],
                [
                    'soc2Id',
                    {
                        id: 'soc2Id',
                        name: 'soc2Name',
                        description: 'soc2Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc2Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                        myNewProperty: 'myNewValue',
                    },
                ],
            ],
        ],
        [
            'duplicate_id', // valid entries but the ids aren't unique
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'soc1Name',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
                [
                    'soc1duplId', // test data is stored in a map so this is a different key
                    {
                        id: 'soc1Id',
                        name: 'soc1Name',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'one_bad_entry', // two valid entries and one with a schema error
            [
                [
                    'soc1Id', // valid
                    {
                        id: 'soc1Id',
                        name: 'soc1Name',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
                [
                    'soc2Id', // valid
                    {
                        id: 'soc2Id',
                        name: 'soc2Name',
                        description: 'soc2Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc2Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
                [
                    'soc3Id', // invalid
                    {
                        id: 'soc3Id',
                        name: 'soc3Name',
                        description: 'soc3Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                // missing name property
                                primary: false,
                                socID: 'soc3Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'wrong_prop_type',
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 123, // should be string
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'wrong_array_type',
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'soc1Id',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core0',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: [4], // should be strings
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'missing_prop',
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        // name property missing
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core1',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'child_wrong_prop_type',
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'socName',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core4',
                                name: 123, // should be string
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'deep_missing_props',
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'socName',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core7',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    // missing id property,
                                    // missing isa property,
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'mismatched_child_id',
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'socName',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core9',
                                name: 'coreName',
                                primary: false,
                                socID: 'wrongId',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                    },
                ],
            ],
        ],
        [
            'mismatched_child_id_array',
            [
                [
                    'soc1Id',
                    {
                        id: 'soc1Id',
                        name: 'socName',
                        description: 'soc1Desc',
                        family: {
                            id: 'familyId',
                            name: 'familyName',
                        },
                        cores: [
                            {
                                id: 'core9',
                                name: 'coreName',
                                primary: false,
                                socID: 'soc1Id',
                                coreType: {
                                    architecture: 'arch',
                                    description: 'desc',
                                    id: 'id',
                                    isa: 'isa',
                                },
                                extensions: ['ext'],
                                dataModelCoreID: 'CM0',
                            },
                        ],
                        boards: [],
                        packages: [],
                        documentation: [],
                        media: [],
                        foo: {
                            id: 'foo',
                            name: 'fooName',
                            socIDs: ['wrongId'],
                            dataModelCoreID: 'CM0',
                        },
                    },
                ],
            ],
        ],
    ]);

    mockMetaData = new Map<
        string,
        Record<string, unknown> | undefined
    >([
        [
            'valid',
            {
                data: {
                    fetchedAt: '2021-01-01T00:00:00.000Z',
                    libName: LIB_NAME,
                    libVersion: LIB_VERSION,
                },
            },
        ],
        [
            'updated',
            {
                data: {
                    fetchedAt: '2025-05-05T00:00:00.000Z',
                    libName: 'my-lib',
                    libVersion: '2.0.0',
                },
            },
        ],
        [
            'extra_prop',
            {
                data: {
                    fetchedAt: '2021-01-01T00:00:00.000Z',
                    libName: LIB_NAME,
                    libVersion: LIB_VERSION,
                    myNewProperty: 'myNewValue',
                },
            },
        ],
        [
            'wrong_prop_type',
            {
                data: {
                    fetchedAt: 12345, // should be a string
                    libName: LIB_NAME,
                    libVersion: LIB_VERSION,
                },
            },
        ],
        ['empty', undefined],
    ]);
    // @ts-expect-error - intentionally invalid data for testing (array rather than object)
    mockMetaData.set('invalid', []);
};

// Helper function, returns a clone of test data or throws error if not found
const mockApiData = (response: string): StoreItem[] => {
    const data = mockData?.get(response);
    if (!data) {
        throw new Error(
            `Test setup error, invalid mock data for: "${response}"`,
        );
    }
    return _.cloneDeep(data).map(([, itm]) => itm);
};

// setup the nock scope routes/methods to list and get SoCs
const setupNockMocks = (scope: nock.Scope, socData: StoreItem[]) => {
    scope
        .get(`/socs?cfsVersion=${LIB_VERSION}`) // get list of SoCs
        .reply(200, {
            items: socData.map((soc) => ({
                id: soc.id,
                name: soc.name,
                description: soc.description,
            })),
        });
    socData.forEach((soc: StoreItem) => {
        scope
            .get(`/socs/${soc.id}?cfsVersion=${LIB_VERSION}`) // get a specific SoC
            .reply(200, { item: soc });
    });
};

describe('SocCatalog tests', async () => {
    // arbitrary/dummy api url value
    const API_URL = new URL('http://api.test.me');

    // CFS API client options
    const apiOptions = {
        // (using default public auth and no cache)
        baseUrl: API_URL,
        isCache: false,
        authorizer: new PublicAuthorizer(),
    } as const;

    // catalog defaults
    const catalogDefaults = {
        storage: MockDataStore,
        cleanTmp: false,
    } as const;

    // test base dir
    const localStorageDir: string = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        'testLocalStorage',
        'catalog',
    );

    // keep track of per-test temp dirs for cleanup
    const testDirs: string[] = [];

    // current cwd
    const cwd: string = process.cwd();

    // flag to determine if the parent directory should be cleaned up
    let cleanLocalStorageDir: boolean = true;

    // per-test objects
    let emptyOnlineCatalog: SocCatalog;
    let emptyOnlineCatalogStore: () => MockDataStore;
    let emptyOfflineCatalog: SocCatalog;
    let emptyOfflineCatalogStore: () => MockDataStore;
    let populatedOnlineCatalog: SocCatalog;
    let populatedOnlineCatalogStore: () => MockDataStore;
    let populatedOfflineCatalog: SocCatalog;
    let erroringOnlineCatalog: SocCatalog;
    let erroringOfflineCatalog: SocCatalog;
    let updatedOnlineCatalog: SocCatalog;
    let updatedOnlineCatalogStore: () => MockDataStore;
    let updatedOfflineCatalog: SocCatalog;
    let updatedOfflineCatalogStore: () => MockDataStore;

    let nockScope: nock.Scope;
    const nockListener = (req: { options: RequestOptions }) => {
        // Fail the test if any un-mocked API call is made
        expect(req.options.hostname).to.not.equal(
            API_URL.hostname,
            `no matching mocks for hostname ${API_URL.hostname}`,
        );
    };
    let testStorageDir: string | undefined;

    before(async function () {
        // Create a temporary directory for local storage
        await fs.mkdir(localStorageDir, { recursive: true });
        process.chdir(localStorageDir); // make sure that anything that gets created using a relative path will be in the local storage dir

        // setup nock to throw an error if any unexpected HTTP requests are made to the API
        // this is to make sure that offline mode is working correctly
        nock.emitter.on('no match', nockListener);
    });

    // before each test
    beforeEach(async function () {
        // setup the test data objects
        setupTestData();

        // setup the nock scope
        nockScope = nock(API_URL, { allowUnmocked: false });

        // Create the catalog objects
        emptyOnlineCatalog = new SocCatalog(
            { ...catalogDefaults, directory: 'empty' },
            new CfsApiClient(apiOptions),
        );
        emptyOnlineCatalogStore = primaryCatalogStore; // closure to call later to get the data from the MockDataStore

        emptyOfflineCatalog = new SocCatalog({
            ...catalogDefaults,
            directory: 'empty',
        }); // no api client for offline
        emptyOfflineCatalogStore = primaryCatalogStore; // closure to call later to get the data from the MockDataStore

        populatedOnlineCatalog = new SocCatalog(
            { ...catalogDefaults, directory: 'valid' },
            new CfsApiClient(apiOptions),
        );
        populatedOnlineCatalogStore = primaryCatalogStore; // closure to call later to get the data from the MockDataStore

        populatedOfflineCatalog = new SocCatalog({
            ...catalogDefaults,
            directory: 'valid',
        }); // no api client for offline

        erroringOnlineCatalog = new SocCatalog(
            {
                directory: 'empty',
                storage: ErroringDataStore,
                cleanTmp: false,
            },
            new CfsApiClient(apiOptions),
        );

        erroringOfflineCatalog = new SocCatalog({
            directory: 'empty',
            storage: ErroringDataStore,
            cleanTmp: false,
        }); // no api client for offline

        updatedOnlineCatalog = new SocCatalog(
            { ...catalogDefaults, directory: 'extra_prop' },
            new CfsApiClient(apiOptions),
        );
        updatedOnlineCatalogStore = primaryCatalogStore; // closure to call later to get the data from the MockDataStore

        updatedOfflineCatalog = new SocCatalog({
            ...catalogDefaults,
            directory: 'extra_prop',
        }); // no api client for offline
        updatedOfflineCatalogStore = primaryCatalogStore; // closure to call later to get the data from the MockDataStore

        // Check the catalogs are setup correctly
        await expect(
            populatedOnlineCatalog.isEmpty(),
            'catalog is empty, should be populated',
        ).to.eventually.be.false;

        await expect(
            emptyOnlineCatalog.isEmpty(),
            'catalog is not empty, should be',
        ).to.eventually.be.true;

        await expect(
            updatedOnlineCatalog.isEmpty(),
            'catalog is empty, should be populated',
        ).to.eventually.be.false;

        await expect(
            populatedOfflineCatalog.isEmpty(),
            'catalog is empty, should be populated',
        ).to.eventually.be.false;

        await expect(
            emptyOfflineCatalog.isEmpty(),
            'catalog is not empty, should be',
        ).to.eventually.be.true;

        await expect(
            updatedOfflineCatalog.isEmpty(),
            'catalog is empty, should be populated',
        ).to.eventually.be.false;
    });

    // after each test
    afterEach(async function (this: Mocha.Context) {
        // Make sure we got the expected HTTP requests
        nockScope.done();

        // Keep track of any test directories that should be cleaned up
        if (testStorageDir) {
            if (this.currentTest?.isPassed()) {
                // Mark the directory for cleanup if the test passed
                testDirs.push(testStorageDir);
            } else if (this.currentTest?.err) {
                // Keep the directory if the test failed
                // and add its path to the error message
                this.currentTest.err.message += ` (local storage dir: ${testStorageDir})`;
                // sometimes the error message isn't printed, so log it here too
                console.error(
                    '\t',
                    'local storage dir:',
                    testStorageDir,
                );
                cleanLocalStorageDir = false; // don't clean up the parent directory
            }
            testStorageDir = undefined;
        }

        // reset nock for the next test
        nock.cleanAll();
    });

    // after all tests
    // TODO: this could be better done as a global/root (or suite ?) hook that checked if all tests passed
    after(async function () {
        nock.emitter.off('no match', nockListener); // remove the listener
        process.chdir(cwd); // restore the original cwd
        // Clean up parent directory if all tests passed
        if (cleanLocalStorageDir) {
            await fs.rm(localStorageDir, {
                force: true,
                recursive: true,
            });
        } else {
            // Clean up dirs of the tests that passed
            const rmDirs = await Promise.allSettled(
                testDirs.map((dir) =>
                    fs.rm(dir, { force: true, recursive: true }),
                ),
            );
            rmDirs.forEach((res) => {
                if (res.status === 'rejected') {
                    console.error(
                        'Error cleaning up test directory:',
                        res.reason,
                    );
                }
            });
        }
    });
    /*
     * Class initialization
     */
    describe('new', async function () {
        it('should throw an error if the data store throws an error during initialization', async function () {
            expect(
                () =>
                    new SocCatalog({
                        directory: 'error',
                        storage: ErroringDataStore,
                    }),
            )
                .to.throw(CatalogError)
                .that.satisfies((err: CatalogError) => {
                    return (
                        err.type === 'PERSISTENCE_ERROR' &&
                        err.cause instanceof DataStoreError &&
                        err.cause.type === 'IO_ERROR'
                    );
                });
        });
    });

    /*
     * updateAvailable()
     */
    describe('updateAvailable', async function () {
        describe('ONLINE - calls are made to the API', async function () {
            beforeEach(async function () {
                // setup the nock scope routes/methods
                setupNockMocks(nockScope, mockApiData('valid'));
            });

            it('should return true if new data is available', async function () {
                await expect(emptyOnlineCatalog.isEmpty()).to
                    .eventually.be.true;
                await expect(emptyOnlineCatalog.updateAvailable()).to
                    .eventually.be.true;
            });

            it('should return false if no new data is available', async function () {
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;
            });

            it('should not be affected by the order the data is returned in', async function () {
                // catalog should be up to date
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;

                // now update the catalog with the same data in a different order
                setupNockMocks(nockScope, mockApiData('reordered'));
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;
            });

            it('should return true when only properties of existing SoCs change', async function () {
                // catalog should be up to date
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;

                setupNockMocks(
                    nockScope,
                    mockApiData('changed_prop'),
                );

                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.true; // gets response
            });

            it('should return true when the number of SoCs decrease', async function () {
                // catalog should be up to date
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;

                setupNockMocks(
                    nockScope,
                    mockApiData('removed_entry'),
                );

                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.true; // gets response
            });

            it('should return true when the number of SoCs changes to zero', async function () {
                // catalog should be up to date
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;

                setupNockMocks(nockScope, mockApiData('no_entry'));

                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.true; // gets response
            });

            it('should return false when only extra properties have changed', async function () {
                // catalog should be up to date
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;

                setupNockMocks(nockScope, mockApiData('extra_prop'));

                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false; // gets response with extra properties
            });

            it('should wrap an error thrown by the API', async function () {
                // should pass
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;

                // now throw an error from the API
                nockScope
                    .get(`/socs?cfsVersion=${LIB_VERSION}`)
                    .replyWithError('Error from API');

                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.rejectedWith(CatalogError)
                    .that.has.property('type', 'SERVICE_ERROR');
            });
        });

        describe('OFFLINE - no calls are made to the API', function () {
            // no routes are expected to be called so no nock scope is setup for these tests
            // any HTTP requests to the API will cause the test to fail
            it('should return false if the catalog is offline', async function () {
                await expect(emptyOfflineCatalog.updateAvailable()).to
                    .eventually.be.false;
            });
        });
    });

    /*
     * refresh()
     */
    describe('refresh', function () {
        describe('ONLINE - calls are made to the API', async function () {
            beforeEach(function () {
                // setup the nock scope routes/methods
                setupNockMocks(nockScope, mockApiData('valid'));
            });

            // load catalog from HTTP, then check that catalog returns correct data and sends expected HTTP requests
            it('should load expected SoC(s) from the backend', async function () {
                // Call the backend to get the data
                await emptyOnlineCatalog.refresh();

                // check that the catalog is populated as expected
                await getAndVerifyCatalog(
                    emptyOnlineCatalog,
                    mockApiData('valid'),
                );
            });

            it('should replace the existing catalog with the new data from the backend', async function () {
                await emptyOnlineCatalog.refresh(); // gets default api response
                await getAndVerifyCatalog(
                    emptyOnlineCatalog,
                    mockApiData('valid'),
                );

                setupNockMocks(nockScope, mockApiData('extra_entry'));
                await emptyOnlineCatalog.refresh(); // gets api response with an extra entry

                // check that the catalog is now updated
                await getAndVerifyCatalog(
                    emptyOnlineCatalog,
                    mockApiData('extra_entry'),
                );
            });

            it('should wrap an error thrown by the API', async function () {
                // should pass
                await populatedOnlineCatalog.refresh();

                // now throw an error from the API
                nockScope
                    .get(`/socs?cfsVersion=${LIB_VERSION}`)
                    .replyWithError('Error from API');

                await expect(populatedOnlineCatalog.refresh())
                    .to.eventually.be.rejectedWith(CatalogError)
                    .that.has.property('type', 'SERVICE_ERROR');
            });

            it('should wrap an error thrown by the data store during refresh', async function () {
                await expect(erroringOnlineCatalog.refresh())
                    .to.eventually.be.rejectedWith(CatalogError)
                    .that.satisfies((err: CatalogError) => {
                        return (
                            err.type === 'PERSISTENCE_ERROR' &&
                            err.cause instanceof DataStoreError &&
                            err.cause.type === 'IO_ERROR'
                        );
                    });
            });

            it('should not replace the existing catalog if an error is thrown by the API', async function () {
                // should pass
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;

                // now throw an error from the API
                nockScope
                    .get(`/socs?cfsVersion=${LIB_VERSION}`)
                    .replyWithError('Error from API');

                await expect(populatedOnlineCatalog.refresh())
                    .to.eventually.be.rejectedWith(CatalogError)
                    .that.has.property('type', 'SERVICE_ERROR');

                // check that the catalog is still populated
                await getAndVerifyCatalog(
                    populatedOnlineCatalog,
                    mockApiData('valid'),
                );
            });

            describe('should throw an error if the API returns invalid SoC data', function () {
                badSchemaTestConfigs.forEach((test, name) => {
                    it(name, async function () {
                        await expect(
                            populatedOnlineCatalog.updateAvailable(),
                        ).to.eventually.be.false;

                        setupNockMocks(
                            nockScope,
                            mockApiData(test.dataKey),
                        );

                        await expect(populatedOnlineCatalog.refresh())
                            .to.eventually.be.rejectedWith(
                                CatalogError,
                            )
                            .that.satisfies((err: CatalogError) =>
                                err.type === 'INVALID_CONTENTS' &&
                                test.zodErrors > 0
                                    ? err.cause instanceof ZodError &&
                                      err.cause.errors.length ===
                                          test.zodErrors
                                    : true,
                            );
                    });
                });
            });

            it('should not replace the existing catalog if the API returns invalid SoC data', async function () {
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;

                setupNockMocks(
                    nockScope,
                    mockApiData('one_bad_entry'),
                );

                await expect(populatedOnlineCatalog.refresh())
                    .to.eventually.be.rejectedWith(CatalogError)
                    .that.has.property('type', 'INVALID_CONTENTS');

                // check that the catalog is still populated
                await getAndVerifyCatalog(
                    populatedOnlineCatalog,
                    mockApiData('valid'),
                );
            });

            it('should preserve unknown keys in the data store', async function () {
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;

                setupNockMocks(nockScope, mockApiData('extra_prop'));

                await populatedOnlineCatalog.refresh();

                // check that the catalog data store contains the new data
                expect(
                    await populatedOnlineCatalogStore().list(),
                    'data store does not contain extra keys',
                ).to.deep.equal(mockApiData('extra_prop'));

                // but output should not have the unknown key
                await getAndVerifyCatalog(
                    populatedOnlineCatalog,
                    mockApiData('valid'),
                );
            });

            it('should add catalog metadata upon refresh', async function () {
                await expect(emptyOnlineCatalog.updateAvailable()).to
                    .eventually.be.true;
                await expect(emptyOnlineCatalog.getMetadata()).to
                    .eventually.be.undefined;

                setupNockMocks(nockScope, mockApiData('valid'));

                await emptyOnlineCatalog.refresh();
                await expect(emptyOnlineCatalog.getMetadata())
                    .to.eventually.have.property('data')
                    .that.satisfies((obj: unknown) => {
                        expect(obj).to.be.an('object');
                        expect(obj)
                            .to.have.property('fetchedAt')
                            .that.is.a('string');
                        // check that the fetchedAt date is a valid date
                        expect(
                            Date.parse(
                                (
                                    obj as unknown & {
                                        fetchedAt: string;
                                    }
                                ).fetchedAt,
                            ),
                        ).not.to.be.NaN;
                        expect(obj)
                            .to.have.property('libName')
                            .that.equals(LIB_NAME);
                        expect(obj)
                            .to.have.property('libVersion')
                            .that.equals(LIB_VERSION);
                        return true;
                    });
            });

            it('should replace catalog metadata upon refresh', async function () {
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;
                await expect(
                    populatedOnlineCatalog.getMetadata(),
                ).to.eventually.deep.equal(mockMetaData.get('valid'));

                setupNockMocks(
                    nockScope,
                    mockApiData('changed_prop'),
                );

                await populatedOnlineCatalog.refresh();
                await expect(
                    populatedOnlineCatalog.getMetadata(),
                ).to.eventually.not.deep.equal(
                    mockMetaData.get('valid'),
                );
            });

            it('should not replace the metadata if an error is thrown by the API', async function () {
                await expect(populatedOnlineCatalog.updateAvailable())
                    .to.eventually.be.false;
                await expect(
                    populatedOnlineCatalog.getMetadata(),
                ).to.eventually.deep.equal(mockMetaData.get('valid'));

                // throw an error from the API
                nockScope
                    .get(`/socs?cfsVersion=${LIB_VERSION}`)
                    .replyWithError('Error from API');

                await expect(populatedOnlineCatalog.refresh())
                    .to.eventually.be.rejectedWith(CatalogError)
                    .that.has.property('type', 'SERVICE_ERROR');

                // check that the catalog is still populated
                await expect(
                    populatedOnlineCatalog.getMetadata(),
                ).to.eventually.deep.equal(mockMetaData.get('valid'));
            });
        });

        describe('OFFLINE - no calls are made to the API', function () {
            // no routes are expected to be called so no nock scope is setup for these tests
            // any calls to the API will cause the test to fail
            it('should not do anything in offline mode', async function () {
                // Refresh should be a no-op in offline mode
                await emptyOfflineCatalog.refresh();

                await expect(
                    emptyOfflineCatalog.isEmpty(),
                    'offline catalog not empty, should be',
                ).to.eventually.be.true;
            });

            it('should not update the metadata in offline mode', async function () {
                await expect(emptyOfflineCatalog.getMetadata()).to
                    .eventually.be.undefined;
                await emptyOfflineCatalog.refresh();
                await expect(emptyOfflineCatalog.getMetadata()).to
                    .eventually.be.undefined;
            });
        });
    });

    /*
     * get()
     * getAll()
     * summary()
     * purge()
     * isEmpty()
     */
    describe('get/getAll/summary/purge/isEmpty', function () {
        // no routes are expected to be called so no nock scope is setup for these tests
        // any HTTP requests to the API will cause the test to fail

        // Define a function to run the tests for both online and offline catalogs
        const runTests = (online: boolean) => {
            describe('error handling', function () {
                describe('should wrap an error thrown by the data store', async function () {
                    let catalog: SocCatalog;
                    const testFns = new Map<
                        string,
                        () => Promise<unknown>
                    >([
                        ['get', async () => catalog.get('soc1Id')],
                        ['getAll', async () => catalog.getAll()],
                        ['summary', async () => catalog.summary()],
                        ['purge', async () => catalog.purge()],
                        ['isEmpty', async () => catalog.isEmpty()],
                    ]);

                    for (const [fnName, testFn] of testFns) {
                        it(fnName, async function () {
                            catalog = online
                                ? erroringOnlineCatalog
                                : erroringOfflineCatalog;
                            await expect(testFn())
                                .to.eventually.be.rejectedWith(
                                    CatalogError,
                                )
                                .that.satisfies(
                                    (err: CatalogError) => {
                                        return (
                                            err.type ===
                                                'PERSISTENCE_ERROR' &&
                                            err.cause instanceof
                                                DataStoreError &&
                                            err.cause.type ===
                                                'IO_ERROR'
                                        );
                                    },
                                );
                        });
                    }
                });

                describe('should throw an error if the store contains invalid data', function () {
                    let catalog: SocCatalog;
                    const tests = new Map<
                        string,
                        () => Promise<unknown>
                    >([
                        ['get', async () => catalog.get('soc1Id')],
                        ['getAll', async () => catalog.getAll()],
                        ['summary', async () => catalog.summary()],
                    ]);

                    for (const [fnName, testFn] of tests) {
                        describe(fnName, function () {
                            badSchemaTestConfigs.forEach(
                                (test, name) => {
                                    if (
                                        fnName === 'get' &&
                                        test.dataKey ===
                                            'duplicate_id'
                                    ) {
                                        // skip this test for get (as only one SoC is returned)
                                        return;
                                    }

                                    it(name, async function () {
                                        catalog = new SocCatalog(
                                            {
                                                directory:
                                                    test.dataKey,
                                                storage:
                                                    MockDataStore,
                                            },
                                            online
                                                ? new CfsApiClient(
                                                      apiOptions,
                                                  )
                                                : undefined,
                                        );

                                        await expect(testFn())
                                            .to.eventually.be.rejectedWith(
                                                CatalogError,
                                            )
                                            .that.satisfies(
                                                (
                                                    err: CatalogError,
                                                ) =>
                                                    err.type ===
                                                        'INVALID_CONTENTS' &&
                                                    test.zodErrors > 0
                                                        ? err.cause instanceof
                                                              ZodError &&
                                                          err.cause
                                                              .errors
                                                              .length ===
                                                              test.zodErrors
                                                        : true,
                                            );
                                    });
                                },
                            );
                        });
                    }
                });
            });

            describe('get', function () {
                it('should return a SoC by ID from the local catalog', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const soc = await catalog.get('soc1Id');
                    expect(soc).to.deep.equal(
                        mockApiData('valid')[0],
                    );
                });

                it('should return undefined for a missing SoC ID', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const soc = await catalog.get('missingId');
                    expect(soc).to.be.undefined;
                });

                it('should not output extra keys', async function () {
                    const catalog = online
                        ? updatedOnlineCatalog
                        : updatedOfflineCatalog;
                    const soc = await catalog.get('soc1Id');
                    expect(soc).to.not.have.property('myNewProperty');
                });
            });

            describe('getAll', function () {
                it('should return all SoCs from the local catalog', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const socs = await catalog.getAll();
                    expect(socs).to.deep.equal(mockApiData('valid'));
                });

                it('should return an empty array if the catalog is empty', async function () {
                    const catalog = online
                        ? emptyOnlineCatalog
                        : emptyOfflineCatalog;
                    const socs = await catalog.getAll();
                    expect(socs).to.be.an('array').with.length(0);
                });

                it('should not output extra keys', async function () {
                    const catalog = online
                        ? updatedOnlineCatalog
                        : updatedOfflineCatalog;
                    const socs = await catalog.getAll();
                    expect(socs).to.be.an('array').that.is.not.empty;
                    socs.forEach((soc) => {
                        expect(soc).to.not.have.property(
                            'myNewProperty',
                        );
                    });
                });
            });

            describe('summary', function () {
                it('should return a summary of the local catalog', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const summary = await catalog.summary();
                    expect(summary).to.be.an('array').that.is.not
                        .empty;
                    summary.forEach((itm) => {
                        // check that each entry has only the expected properties
                        expect(itm)
                            .to.be.an('object')
                            .with.all.keys(
                                'id',
                                'name',
                                'description',
                                'familyName',
                            );
                    });
                });
            });

            describe('purge', function () {
                it('should purge the local catalog', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    // purge the catalog
                    await catalog.purge();

                    // check that the catalog is now empty
                    await expect(
                        catalog.isEmpty(),
                        'purged catalog is not empty, should be',
                    ).to.eventually.be.true;
                });

                it('should set metadata to undefined', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    await expect(catalog.getMetadata()).to.eventually
                        .not.be.undefined;
                    await catalog.purge();
                    await expect(catalog.getMetadata()).to.eventually
                        .be.undefined;
                });
            });

            describe('isEmpty', function () {
                it('should report if the local catalog is empty', async function () {
                    const catalog = online
                        ? emptyOnlineCatalog
                        : emptyOfflineCatalog;
                    // purge the catalog
                    await catalog.purge();

                    // check that there are no entries in the catalog
                    // could probaly also use the mock data store to check this
                    await getAndVerifyCatalog(emptyOnlineCatalog, []);
                    // check that the catalog reports it is empty
                    await expect(
                        catalog.isEmpty(),
                        'catalog is not empty, should be',
                    ).to.eventually.be.true;
                });
            });
        };

        describe('ONLINE - no calls are made to the API', function () {
            runTests(true);
        });

        describe('OFFLINE - no calls are made to the API', function () {
            runTests(false);
        });
    });

    /**
     * getMetadata()
     */
    describe('getMetadata', function () {
        const runTests = (online: boolean) => {
            it('should return the metadata for the catalog', async function () {
                const catalog = new SocCatalog(
                    {
                        directory: 'meta:valid',
                        storage: MockDataStore,
                    },
                    online ? new CfsApiClient(apiOptions) : undefined,
                );
                await expect(
                    catalog.getMetadata(),
                ).to.eventually.deep.equal(mockMetaData.get('valid'));
            });

            it('should return undefined if the catalog has no metadata', async function () {
                const catalog = new SocCatalog(
                    {
                        directory: 'meta:empty',
                        storage: MockDataStore,
                    },
                    online ? new CfsApiClient(apiOptions) : undefined,
                );
                await expect(catalog.getMetadata()).to.eventually.be
                    .undefined;
            });

            it('should not throw an error if the catalog metadata contains extra properties', async function () {
                const catalog = new SocCatalog(
                    {
                        directory: 'meta:extra_prop',
                        storage: MockDataStore,
                    },
                    online ? new CfsApiClient(apiOptions) : undefined,
                );
                // should not throw an error, but the extra property should be stripped
                await expect(catalog.getMetadata())
                    .to.eventually.have.property('data')
                    .that.satisfies((data: unknown) => {
                        expect(data).to.be.an('object');
                        expect(data)
                            .to.have.property('fetchedAt')
                            .that.is.a('string');
                        expect(
                            Date.parse(
                                (
                                    data as unknown & {
                                        fetchedAt: string;
                                    }
                                ).fetchedAt,
                            ),
                        ).not.to.be.NaN;
                        expect(data)
                            .to.have.property('libName')
                            .that.equals(LIB_NAME);
                        expect(data)
                            .to.have.property('libVersion')
                            .that.equals(LIB_VERSION);
                        expect(data).to.not.have.property(
                            'myNewProperty',
                        );
                        return true;
                    });
            });
        };

        describe('ONLINE - no calls are made to the API', function () {
            runTests(true);
        });

        describe('OFFLINE - no calls are made to the API', function () {
            runTests(false);
        });
    });

    /**
     * validate()
     */
    describe('validate', function () {
        const runTests = (online: boolean) => {
            it('should not throw if a catalog is valid', async function () {
                const catalog = online
                    ? populatedOnlineCatalog
                    : populatedOfflineCatalog;
                await expect(catalog.validate()).to.not.be.rejected;
            });

            describe('should throw an error if the store contains invalid data or metadata', function () {
                const combinedBadSchemaTestConfigs = new Map([
                    ...badSchemaTestConfigs.entries(),
                    ...badMetadataTestConfigs.entries(),
                ]);
                combinedBadSchemaTestConfigs.forEach((test, name) => {
                    it(name, async function () {
                        const catalog = new SocCatalog(
                            {
                                ...catalogDefaults,
                                directory: test.dataKey,
                            },
                            online
                                ? new CfsApiClient(apiOptions)
                                : undefined,
                        );

                        await expect(catalog.validate())
                            .to.eventually.be.rejectedWith(
                                CatalogError,
                            )
                            .that.satisfies((err: CatalogError) =>
                                err.type === 'INVALID_CONTENTS' &&
                                test.zodErrors > 0
                                    ? err.cause instanceof ZodError &&
                                      err.cause.errors.length ===
                                          test.zodErrors
                                    : true,
                            );
                    });
                });
            });

            it('should throw an error if store validation fails', function () {
                const catalog = new SocCatalog(
                    {
                        ...catalogDefaults,
                        directory: 'invalidData',
                        storage: ErroringDataStore,
                    },
                    online ? new CfsApiClient(apiOptions) : undefined,
                );
                return expect(catalog.validate())
                    .to.eventually.be.rejectedWith(CatalogError)
                    .that.satisfies(
                        (err: CatalogError) =>
                            err.type === 'PERSISTENCE_ERROR' &&
                            err.cause instanceof DataStoreError &&
                            err.cause.type === 'INVALID_DATA',
                    );
            });
        };
        describe('ONLINE - no calls are made to the API', function () {
            runTests(true);
        });
        describe('OFFLINE - no calls are made to the API', function () {
            runTests(false);
        });
    });

    /*
     * export()
     * import()
     */
    describe('export/import', function () {
        beforeEach(async function () {
            //  create per-test temporary directories to save the zip files in
            testStorageDir = temp.path({
                // we don't use temp.mkdirSync() because we want to keep the directory if the test fails
                dir: localStorageDir,
            });
            await fs.mkdir(testStorageDir, { recursive: true });
        });

        // Define a function to run the tests for both online and offline catalogs
        const runTests = (online: boolean) => {
            describe('export', function () {
                it('should export the catalog to a zip file', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'export.zip',
                    );

                    // export the catalog and verify the zip file
                    await catalog.export(zipFilePath);
                    await verifyZip(
                        zipFilePath,
                        catalog.ZIP_FILE_MEMBER,
                        mockApiData('valid'),
                        mockMetaData.get('valid'),
                    );
                });

                it('should update the catalog in an existing zip file', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;

                    const socs = mockApiData('extra_entry');
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'existing.zip',
                    );

                    // create a zip file with the SoC test data that has an extra entry
                    const zip = new JSZip();
                    const data = JSON.stringify({
                        soc: socs,
                    });
                    zip.file(catalog.ZIP_FILE_MEMBER, data);
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);
                    await verifyZip(
                        zipFilePath,
                        catalog.ZIP_FILE_MEMBER,
                        mockApiData('extra_entry'),
                        mockMetaData.get('extra_entry'),
                    );

                    // export the catalog and verify the zip file
                    // has the default valid catalog data, not the previous zip contents
                    await catalog.export(zipFilePath);
                    await verifyZip(
                        zipFilePath,
                        catalog.ZIP_FILE_MEMBER,
                        mockApiData('valid'),
                        mockMetaData.get('valid'),
                    );
                });

                it('should leave other files in an existing zip file alone', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;

                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'existing.zip',
                    );

                    // create a zip file with the SoC test data that has an extra entry
                    const zip = new JSZip();
                    const data = JSON.stringify({
                        something_else: [{ data: 'test' }],
                    });
                    zip.file('another_file.json', data);
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    // export the catalog and verify the zip file
                    // has the default valid catalog data ...
                    await catalog.export(zipFilePath);
                    await verifyZip(
                        zipFilePath,
                        catalog.ZIP_FILE_MEMBER,
                        mockApiData('valid'),
                        mockMetaData.get('valid'),
                    );
                    // ... and the previous zip contents
                    const readZip = await zip.loadAsync(
                        fs.readFile(zipFilePath),
                    );
                    expect(readZip.files).to.have.property(
                        'another_file.json',
                    );
                    const readData: unknown = JSON.parse(
                        await readZip.files[
                            'another_file.json'
                        ].async('string'),
                    );
                    expect(
                        readData,
                        'zip file contents not as expected',
                    ).to.deep.equals(JSON.parse(data));
                });

                it('should successfully export an empty catalog', async function () {
                    const catalog = online
                        ? emptyOnlineCatalog
                        : emptyOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'export.zip',
                    );

                    await catalog.export(zipFilePath);
                    await getAndVerifyCatalog(catalog, []); // make sure the catalog is empty
                    await verifyZip(
                        // make sure the exported catalog is empty
                        zipFilePath,
                        catalog.ZIP_FILE_MEMBER,
                        [],
                        undefined, // no metadata
                    );
                });

                it('should add export metadata to the exported file', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'export.zip',
                    );

                    // export the catalog and verify the zip file
                    await catalog.export(zipFilePath);
                    await verifyZip(
                        zipFilePath,
                        catalog.ZIP_FILE_MEMBER,
                        mockApiData('valid'),
                        mockMetaData.get('valid'),
                    );

                    // read the zip file and check that the export metadata is present
                    const zip = new JSZip();
                    const zipData = await zip.loadAsync(
                        fs.readFile(zipFilePath),
                    );
                    const zipContents = JSON.parse(
                        await zipData.files[
                            catalog.ZIP_FILE_MEMBER
                        ]!.async('string'),
                    );
                    expect(zipContents)
                        .to.be.an('object')
                        .with.property('export')
                        .that.satisfies((obj: unknown) => {
                            expect(obj).to.be.an('object');
                            expect(obj)
                                .to.have.property('exportedAt')
                                .that.is.a('string');
                            // check that the export date is a valid date
                            expect(
                                Date.parse(
                                    (
                                        obj as unknown & {
                                            exportedAt: string;
                                        }
                                    ).exportedAt,
                                ),
                            ).not.to.be.NaN;
                            expect(obj)
                                .to.have.property('libName')
                                .that.equals(LIB_NAME);
                            expect(obj)
                                .to.have.property('libVersion')
                                .that.equals(LIB_VERSION);
                            return true;
                        });
                });

                it('should wrap an error thrown by the data store during export', async function () {
                    const catalog = online
                        ? erroringOnlineCatalog
                        : erroringOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'export.zip',
                    );
                    await expect(catalog.export(zipFilePath))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.satisfies((err: CatalogError) => {
                            return (
                                err.type === 'PERSISTENCE_ERROR' &&
                                err.cause instanceof DataStoreError &&
                                err.cause.type === 'IO_ERROR'
                            );
                        });
                });

                it('should not export extra keys in SoC objects', async function () {
                    const catalog = online
                        ? updatedOnlineCatalog
                        : updatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'export.zip',
                    );
                    // verify catalog data store contains the extra keys
                    expect(
                        await (
                            online
                                ? updatedOnlineCatalogStore()
                                : updatedOfflineCatalogStore()
                        ).list(),
                    ).to.deep.equal(
                        mockApiData('extra_prop'), // catalog has extra keys
                        'data store does not contain extra keys',
                    );
                    // export the catalog and verify the zip file
                    await catalog.export(zipFilePath);
                    await verifyZip(
                        zipFilePath,
                        catalog.ZIP_FILE_MEMBER,
                        mockApiData('valid'), // zip file should not have the extra keys
                        mockMetaData.get('valid'),
                    );
                });

                it('should not export extra keys in metadata', async function () {
                    const catalog = new SocCatalog(
                        {
                            directory: 'meta:extra_prop', // metadata has extra keys
                            storage: MockDataStore,
                        },
                        online
                            ? new CfsApiClient(apiOptions)
                            : undefined,
                    );
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'export.zip',
                    );

                    // export the catalog and verify the zip file
                    await catalog.export(zipFilePath);
                    await verifyZip(
                        zipFilePath,
                        catalog.ZIP_FILE_MEMBER,
                        [], // empty catalog
                        mockMetaData.get('valid'), // zip file should not have the extra key
                    );
                });

                describe('should throw an error if the data store contains invalid data', function () {
                    badSchemaTestConfigs.forEach((test, name) => {
                        it(name, async function () {
                            const catalog = new SocCatalog(
                                {
                                    ...catalogDefaults,
                                    directory: test.dataKey,
                                },
                                online
                                    ? new CfsApiClient(apiOptions)
                                    : undefined,
                            );
                            const zipFilePath: string = path.join(
                                testStorageDir!,
                                'export.zip',
                            );

                            await expect(catalog.export(zipFilePath))
                                .to.eventually.be.rejectedWith(
                                    CatalogError,
                                )
                                .that.satisfies(
                                    (err: CatalogError) =>
                                        err.type ===
                                            'INVALID_CONTENTS' &&
                                        test.zodErrors > 0
                                            ? err.cause instanceof
                                                  ZodError &&
                                              err.cause.errors
                                                  .length ===
                                                  test.zodErrors
                                            : true,
                                );
                            expect(existsSync(zipFilePath)).to.be
                                .false;
                        });
                    });
                });

                it('should throw an error if the metadata is invalid', async function () {
                    const catalog = new SocCatalog(
                        {
                            directory: 'meta:invalid',
                            storage: MockDataStore,
                        },
                        online
                            ? new CfsApiClient(apiOptions)
                            : undefined,
                    );
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'export.zip',
                    );

                    await expect(catalog.export(zipFilePath))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.satisfies(
                            (err: CatalogError) =>
                                err.type === 'INVALID_CONTENTS',
                        );
                    expect(existsSync(zipFilePath)).to.be.false;
                });
            });

            describe('import', function () {
                it('should overwrite the existing SoC data with the imported data', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const socs = mockApiData('extra_entry');
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );

                    // create a zip file with the SoC test data
                    const zip = new JSZip();
                    const data = JSON.stringify({
                        soc: socs,
                    });
                    zip.file(catalog.ZIP_FILE_MEMBER, data);
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    // check that the catalog has the initial entries
                    await getAndVerifyCatalog(
                        catalog,
                        mockApiData('valid'),
                    );

                    // import the zip file
                    await catalog.import(zipFilePath);

                    // check that the catalog has the imported entries
                    await getAndVerifyCatalog(catalog, socs);
                });

                it('should overwrite the existing metadata with the imported metadata', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );

                    // create a zip file with the metadata
                    const zip = new JSZip();
                    const data = JSON.stringify({
                        soc: [],
                        metadata: mockMetaData.get('updated'),
                    });
                    zip.file(catalog.ZIP_FILE_MEMBER, data);
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    await verifyZip(
                        zipFilePath,
                        catalog.ZIP_FILE_MEMBER,
                        [],
                        mockMetaData.get('updated'),
                    );

                    // check that the catalog has the initial metadata
                    await expect(
                        catalog.getMetadata(),
                    ).to.eventually.deep.equal(
                        mockMetaData.get('valid'),
                    );

                    // import the zip file
                    await catalog.import(zipFilePath);

                    // check that the catalog has the imported metadata
                    await expect(
                        catalog.getMetadata(),
                    ).to.eventually.deep.equal(
                        mockMetaData.get('updated'),
                    );
                });

                it('should import a zip exported from another catalog', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'export.zip',
                    );

                    // export the catalog
                    await catalog.export(zipFilePath);
                    await verifyZip(
                        zipFilePath,
                        catalog.ZIP_FILE_MEMBER,
                        mockApiData('valid'),
                        mockMetaData.get('valid'),
                    );

                    // create a new catalog and import the zip file
                    const newCatalog = online
                        ? emptyOnlineCatalog
                        : emptyOfflineCatalog;

                    // check that the new catalog has no metadata
                    await expect(newCatalog.getMetadata()).to
                        .eventually.be.undefined;

                    await newCatalog.import(zipFilePath);
                    await getAndVerifyCatalog(
                        newCatalog,
                        mockApiData('valid'),
                    );

                    // check that the new catalog has the metadata from the imported catalog
                    await expect(
                        newCatalog.getMetadata(),
                    ).to.eventually.deep.equal(
                        mockMetaData.get('valid'),
                    );
                });

                it('should import an empty catalog', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );

                    // create a zip file with empty SoC data
                    const zip = new JSZip();
                    const data = JSON.stringify({ soc: [] });
                    zip.file(catalog.ZIP_FILE_MEMBER, data);
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    // check that the catalog has the initial entries (isn't already empty)
                    await getAndVerifyCatalog(
                        catalog,
                        mockApiData('valid'),
                    );

                    // catalog should have metadata
                    expect(await catalog.getMetadata()).to.not.be
                        .undefined;

                    // import the zip file
                    await catalog.import(zipFilePath);
                    await getAndVerifyCatalog(catalog, []);

                    // check that the catalog has no metadata
                    expect(await catalog.getMetadata()).to.be
                        .undefined;
                });

                it('should select the correct zip file member if multiple are present', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );

                    const zip = new JSZip();
                    zip.file(
                        'anotherFile.json',
                        JSON.stringify({
                            data: [
                                {
                                    id: 'item1',
                                    name: 'some sort of item',
                                    description:
                                        'valid, just not related to SoCs',
                                },
                            ],
                        }),
                    );
                    zip.file(
                        catalog.ZIP_FILE_MEMBER,
                        JSON.stringify({
                            soc: mockApiData('extra_entry'),
                        }),
                    );
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    // import the zip file
                    await catalog.import(zipFilePath);
                    await getAndVerifyCatalog(
                        catalog,
                        mockApiData('extra_entry'),
                    );
                });

                it('should throw an error if the zip file does not exist', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    await expect(catalog.import('non-existent.zip'))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.has.property(
                            'type',
                            'UNHANDLED_EXCEPTION',
                        );
                });

                it('should throw an error if the zip file contains invalid JSON', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );
                    const zip = new JSZip();
                    zip.file(catalog.ZIP_FILE_MEMBER, '{');
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    await expect(catalog.import(zipFilePath))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.has.property('type', 'INVALID_DATA');
                });

                it('should throw an error if the zip file is empty', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );
                    const zip = new JSZip();
                    zip.file(catalog.ZIP_FILE_MEMBER, '');
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    await expect(catalog.import(zipFilePath))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.has.property('type', 'INVALID_DATA');
                });

                it('should throw an error if the zip file contains incompatible schema', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );
                    const zip = new JSZip();
                    zip.file(
                        catalog.ZIP_FILE_MEMBER,
                        '{"foo": "bar"}',
                    );
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    await expect(catalog.import(zipFilePath))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.has.property('type', 'INVALID_DATA');
                });

                describe('should throw an error if the zip file contains invalid data', function () {
                    const combinedBadSchemaTestConfigs = new Map([
                        ...badSchemaTestConfigs.entries(),
                        ...badMetadataTestConfigs.entries(),
                    ]);
                    combinedBadSchemaTestConfigs.forEach(
                        (test, name) => {
                            it(name, async function () {
                                const catalog = online
                                    ? populatedOnlineCatalog
                                    : populatedOfflineCatalog;
                                const zipFilePath: string = path.join(
                                    testStorageDir!,
                                    'import.zip',
                                );
                                const zip = new JSZip();
                                zip.file(
                                    catalog.ZIP_FILE_MEMBER,
                                    JSON.stringify({
                                        soc: mockApiData(
                                            test.dataKey.startsWith(
                                                'meta:',
                                            )
                                                ? 'valid'
                                                : test.dataKey,
                                        ),
                                        metadata: mockMetaData.get(
                                            test.dataKey.startsWith(
                                                'meta:',
                                            )
                                                ? test.dataKey.split(
                                                      ':',
                                                  )[1]
                                                : 'undefined',
                                        ),
                                    }),
                                );
                                const zipData =
                                    await zip.generateAsync({
                                        type: 'nodebuffer',
                                        streamFiles: true,
                                    });
                                await fs.writeFile(
                                    zipFilePath,
                                    zipData,
                                );

                                await expect(
                                    catalog.import(zipFilePath),
                                )
                                    .to.eventually.be.rejectedWith(
                                        CatalogError,
                                    )
                                    .that.satisfies(
                                        (err: CatalogError) =>
                                            err.type ===
                                                'INVALID_CONTENTS' &&
                                            test.zodErrors > 0
                                                ? err.cause instanceof
                                                      ZodError &&
                                                  err.cause.errors
                                                      .length ===
                                                      test.zodErrors
                                                : true,
                                    );
                            });
                        },
                    );
                });

                it('should throw an error if the zip file does not contain the expected member', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );
                    const zip = new JSZip();
                    zip.file('foo.json', '{"soc": []}');
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    await expect(catalog.import(zipFilePath))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.has.property('type', 'INVALID_DATA');
                });

                it('should throw an error if the zip file does not contain the expected member (empty zip)', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );
                    const zip = new JSZip();
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    await expect(catalog.import(zipFilePath))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.has.property('type', 'INVALID_DATA');
                });

                it('should wrap an error thrown by the data store during import', async function () {
                    const catalog = online
                        ? erroringOnlineCatalog
                        : erroringOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );
                    const data = JSON.stringify({ soc: [] });
                    const zip = new JSZip();
                    zip.file(catalog.ZIP_FILE_MEMBER, data);
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    await expect(catalog.import(zipFilePath))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.satisfies((err: CatalogError) => {
                            return (
                                err.type === 'PERSISTENCE_ERROR' &&
                                err.cause instanceof DataStoreError &&
                                err.cause.type === 'IO_ERROR'
                            );
                        });
                });

                // catalog invalid data errors should be discernable from data store invalid data errors
                it('should wrap INVALID_DATA errors thrown by the data store as PERSISTENCE_ERROR', async function () {
                    const catalog = new SocCatalog(
                        {
                            directory: 'invalidData',
                            storage: ErroringDataStore,
                        },
                        online
                            ? new CfsApiClient(apiOptions)
                            : undefined,
                    );

                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );
                    const data = JSON.stringify({ soc: [] });
                    const zip = new JSZip();
                    zip.file(catalog.ZIP_FILE_MEMBER, data);
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    await expect(catalog.import(zipFilePath))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.satisfies((err: CatalogError) => {
                            return (
                                err.type === 'PERSISTENCE_ERROR' &&
                                err.cause instanceof DataStoreError &&
                                err.cause.type === 'INVALID_DATA'
                            );
                        });
                });

                it('should not change the catalog if the import fails', async function () {
                    const catalog = online
                        ? populatedOnlineCatalog
                        : populatedOfflineCatalog;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );

                    const zip = new JSZip();
                    zip.file(
                        catalog.ZIP_FILE_MEMBER,
                        '{"socks": [{"foo": "bar"}]}',
                    );
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    // check that the catalog has the initial entries
                    await getAndVerifyCatalog(
                        catalog,
                        mockApiData('valid'),
                    );

                    await expect(
                        catalog.getMetadata(),
                    ).to.eventually.deep.equal(
                        mockMetaData.get('valid'),
                    );

                    // import the zip file
                    await expect(catalog.import(zipFilePath))
                        .to.eventually.be.rejectedWith(CatalogError)
                        .that.has.property('type', 'INVALID_DATA');

                    // check that the catalog still has the initial entries
                    await getAndVerifyCatalog(
                        catalog,
                        mockApiData('valid'),
                    );

                    // check that the catalog still has the initial metadata
                    await expect(
                        catalog.getMetadata(),
                    ).to.eventually.deep.equal(
                        mockMetaData.get('valid'),
                    );
                });

                it('should preserve unknown keys', async function () {
                    const catalog = online
                        ? emptyOnlineCatalog
                        : emptyOfflineCatalog;

                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );

                    // create a zip file with the SoC test data
                    const zip = new JSZip();
                    const data = JSON.stringify({
                        soc: mockApiData('extra_prop'),
                    });
                    zip.file(catalog.ZIP_FILE_MEMBER, data);
                    const zipData = await zip.generateAsync({
                        type: 'nodebuffer',
                        streamFiles: true,
                    });
                    await fs.writeFile(zipFilePath, zipData);

                    // import the zip file
                    await catalog.import(zipFilePath);

                    expect(
                        await (
                            online
                                ? emptyOnlineCatalogStore()
                                : emptyOfflineCatalogStore()
                        ).list(),
                    ).to.deep.equal(
                        mockApiData('extra_prop'), // catalog data store has the extra keys
                        'data store does not contain extra keys',
                    );
                    // although the extra keys are not returned in the output
                    await getAndVerifyCatalog(
                        catalog,
                        mockApiData('valid'),
                    );
                });
            });
        };

        describe('ONLINE - no calls are made to the API', function () {
            runTests(true);
        });

        describe('OFFLINE - no calls are made to the API', function () {
            runTests(false);
        });
    });

    describe('dispose', function () {
        let catalog: SocCatalog;
        let mockTempStore: MockDataStore;
        let mockPrimaryStore: MockDataStore;

        // Define a function to run the tests for both online and offline catalogs
        const runTests = (online: boolean) => {
            const testSetup = (cleanTmp: boolean) => {
                catalog = new SocCatalog(
                    {
                        directory: 'valid',
                        storage: MockDataStore,
                        cleanTmp: cleanTmp,
                    },
                    online ? new CfsApiClient(apiOptions) : undefined,
                );

                mockTempStore = tempCatalogStore();
                expect(mockTempStore).to.be.an.instanceOf(
                    MockDataStore,
                );
                mockPrimaryStore = primaryCatalogStore();
                expect(mockPrimaryStore).to.be.an.instanceOf(
                    MockDataStore,
                );
                expect(mockPrimaryStore).to.not.equal(mockTempStore);
            };
            for (const cleanTmp of [true, false]) {
                describe(`cleanTmp = ${cleanTmp}`, function () {
                    it(`should ${cleanTmp ? '' : 'not '}destroy the temporary store`, async function () {
                        // Setup the test
                        testSetup(cleanTmp);

                        // dispose the catalog
                        await catalog.dispose();

                        // Check if the temp data store has been destroyed
                        expect(mockTempStore.destroyCalled).to.equal(
                            cleanTmp,
                        );
                    });

                    it('should not destroy the primary store', async function () {
                        // Setup the test
                        testSetup(cleanTmp);

                        // dispose the catalog
                        await catalog.dispose();

                        // Verify that the primary data store has not been destroyed
                        expect(
                            mockPrimaryStore.destroyCalled,
                        ).to.equal(false);
                    });

                    it('should close the primary store', async function () {
                        // Setup the test
                        testSetup(cleanTmp);

                        // dispose the catalog
                        await catalog.dispose();

                        // Verify that the primary data store has been closed
                        expect(mockPrimaryStore.closeCalled).to.equal(
                            true,
                        );
                    });

                    it('should close the temporary store', async function () {
                        // Setup the test
                        testSetup(cleanTmp);

                        // dispose the catalog
                        await catalog.dispose();

                        // Verify that the temp data store has been closed
                        expect(mockTempStore.closeCalled).to.equal(
                            true,
                        );
                    });

                    it('should wrap errors thrown during dispose', async function () {
                        const errCatalog = online
                            ? erroringOnlineCatalog
                            : erroringOfflineCatalog;

                        // dispose the catalog
                        await expect(errCatalog.dispose())
                            .to.eventually.be.rejectedWith(
                                CatalogError,
                            )
                            .that.satisfies((err: CatalogError) => {
                                return (
                                    err.type ===
                                        'PERSISTENCE_ERROR' &&
                                    err.cause instanceof
                                        DataStoreError &&
                                    err.cause.type === 'IO_ERROR'
                                );
                            });
                    });
                });
            }
        };

        describe('ONLINE - no calls are made to the API', function () {
            runTests(true);
        });

        describe('OFFLINE - no calls are made to the API', function () {
            runTests(false);
        });
    });

    describe('destroy', function () {
        let catalog: SocCatalog;
        let mockTempStore: MockDataStore;
        let mockPrimaryStore: MockDataStore;

        // Define a function to run the tests for both online and offline catalogs
        const runTests = (online: boolean) => {
            const testSetup = () => {
                catalog = new SocCatalog(
                    {
                        directory: 'valid',
                        storage: MockDataStore,
                    },
                    online ? new CfsApiClient(apiOptions) : undefined,
                );

                mockTempStore = tempCatalogStore();
                expect(mockTempStore).to.be.an.instanceOf(
                    MockDataStore,
                );
                mockPrimaryStore = primaryCatalogStore();
                expect(mockPrimaryStore).to.be.an.instanceOf(
                    MockDataStore,
                );
                expect(mockPrimaryStore).to.not.equal(mockTempStore);
            };

            it(`should destroy the primary store`, async function () {
                // Setup the test
                testSetup();

                // destroy the catalog
                await catalog.destroy();

                // Check if the primary data store has been destroyed
                expect(mockPrimaryStore.destroyCalled).to.equal(true);
            });

            it(`should destroy the temporary store`, async function () {
                // Setup the test
                testSetup();

                // destroy the catalog
                await catalog.destroy();

                // Check if the temp data store has been destroyed
                expect(mockTempStore.destroyCalled).to.equal(true);
            });

            it('should close the primary store', async function () {
                // Setup the test
                testSetup();

                // destroy the catalog
                await catalog.destroy();

                // Verify that the primary data store has been closed
                expect(mockPrimaryStore.closeCalled).to.equal(true);
            });

            it('should close the temporary store', async function () {
                // Setup the test
                testSetup();

                // destroy the catalog
                await catalog.destroy();

                // Verify that the temp data store has been closed
                expect(mockTempStore.closeCalled).to.equal(true);
            });

            it('should wrap errors thrown during destroy', async function () {
                const errCatalog = online
                    ? erroringOnlineCatalog
                    : erroringOfflineCatalog;
                // destroy the catalog
                await expect(errCatalog.destroy())
                    .to.eventually.be.rejectedWith(CatalogError)
                    .that.satisfies((err: CatalogError) => {
                        return (
                            err.type === 'PERSISTENCE_ERROR' &&
                            err.cause instanceof DataStoreError &&
                            err.cause.type === 'IO_ERROR'
                        );
                    });
            });
        };

        describe('ONLINE - no calls are made to the API', function () {
            runTests(true);
        });

        describe('OFFLINE - no calls are made to the API', function () {
            runTests(false);
        });
    });

    /*
     * Helper functions
     */
    async function verifyZip(
        zipFilePath: string,
        zipFileMember: string,
        expectedSocs: unknown[],
        expectedMetadata?: unknown,
    ): Promise<void> {
        // check that the zipfile entry contains what we expect
        const zip = new JSZip();
        const zipData = await zip.loadAsync(fs.readFile(zipFilePath));

        expect(zipData.files).to.have.property(zipFileMember);
        const data: unknown = JSON.parse(
            await zipData.files[zipFileMember].async('string'),
        );
        expect(data, 'zip file contents not as expected')
            .to.have.property('soc')
            .that.deep.equals(expectedSocs);

        if (expectedMetadata) {
            expect(data, 'zip file metadata not as expected')
                .to.have.property('metadata')
                .that.deep.equals(expectedMetadata);
        } else {
            expect(data).to.not.have.property('metadata');
        }
    }

    async function getAndVerifyCatalog(
        socCatalog: SocCatalog,
        expectedSocs: unknown[],
    ): Promise<void> {
        const socList = await socCatalog.getAll();
        expect(
            socList,
            'catalog did not return expected contents',
        ).to.deep.equal(expectedSocs);
    }
});
