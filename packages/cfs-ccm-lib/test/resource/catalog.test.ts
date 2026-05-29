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

import 'mocha';
import type { Context } from 'mocha';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import JSZip from 'jszip';
import temp from 'temp';
import _ from 'lodash';

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
    CfsApiClient,
    PublicAuthorizer,
    Resource,
    ResourceCatalog,
} from '../../src/index.js';
import {
    DataStore,
    StoreItem,
} from '../../src/catalog/types.js';

import { LIB_VERSION } from '../../src/config/constants.cjs';
import {
    verifyZip,
    getAndVerifyCatalog,
} from '../catalog-test-utils.js';

use(chaiAsPromised);

// data sets returned by the mock data store and mock api
let mockData: Map<string, [string, StoreItem][]>;
let mockMetaData: Map<string, Record<string, unknown> | undefined>;

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

        // Setup the data for this particular store instance
        switch (true) {
            case parentDir === 'empty':
            case dirname.endsWith('.tmp'): {
                this.data = new Map<string, StoreItem>();
                break;
            }
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

        // Store references to the mock data stores based on their directory
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

const setupTestData = () => {
    // Data used for store contents or api responses
    mockData = new Map<string, [string, StoreItem][]>([
        [
            'valid', // valid data without accessTags
            [
                [
                    'resource1Id',
                    {
                        id: 'resource1Id',
                        name: 'Resource 1',
                        url: 'https://example.com/resource1',
                        addedAt: '2024-01-01T00:00:00Z',
                        mediaType: 'article',
                    },
                ],
                [
                    'resource2Id',
                    {
                        id: 'resource2Id',
                        name: 'Resource 2',
                        url: 'https://example.com/resource2',
                        addedAt: '2024-01-02T00:00:00Z',
                        mediaType: 'video',
                        thumbnail: 'https://example.com/thumb2.jpg',
                    },
                ],
            ],
        ],
        [
            'with_access_tags', // data with accessTag fields
            [
                [
                    'resource1Id',
                    {
                        id: 'resource1Id',
                        name: 'Resource 1',
                        url: 'https://example.com/resource1',
                        addedAt: '2024-01-01T00:00:00Z',
                        mediaType: 'article',
                        accessTag: {
                            read: ['foo'],
                            write: ['bar'],
                        },
                    },
                ],
                [
                    'resource2Id',
                    {
                        id: 'resource2Id',
                        name: 'Resource 2',
                        url: 'https://example.com/resource2',
                        addedAt: '2024-01-02T00:00:00Z',
                        mediaType: 'video',
                        thumbnail: 'https://example.com/thumb2.jpg',
                        accessTag: {
                            read: ['foo', 'bar'],
                            write: ['baz'],
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
                    fetchedAt: '2024-01-01T00:00:00.000Z',
                    libName: 'cfs-ccm-lib',
                    libVersion: LIB_VERSION,
                },
            },
        ],
        ['empty', undefined],
        ['undefined', undefined],
    ]);
};

// Helper function, returns a clone of test data or throws error if not found
const mockApiData = (response: string): StoreItem[] => {
    const data = mockData.get(response);
    if (!data) {
        throw new Error(`Test setup error, mock data not found for: "${response}"`);
    }
    return _.cloneDeep(data).map((itm) => itm[1]);
};

describe('ResourceCatalog tests', async () => {
    // Arbitrary/dummy API URL
    const API_URL = new URL('http://api.test.me');

    // CFS API client options
    const apiOptions = {
        baseUrl: API_URL,
        isCache: false,
        authorizer: null as any, // Will be set in beforeEach
    } as const;

    // Catalog defaults
    const catalogDefaults = {
        storage: MockDataStore,
        cleanTmp: false,
    } as const;

    // Test base dir
    const localStorageDir: string = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        'testLocalStorage',
        'catalog',
    );

    // Keep track of per-test temp dirs for cleanup
    const testDirs: string[] = [];

    // Current cwd
    const cwd: string = process.cwd();

    // Flag to determine if the parent directory should be cleaned up
    let cleanLocalStorageDir: boolean = true;

    // Per-test objects
    let emptyOnlineCatalog: ResourceCatalog;
    let emptyOnlineCatalogStore: () => MockDataStore;
    let emptyOfflineCatalog: ResourceCatalog;
    let emptyOfflineCatalogStore: () => MockDataStore;
    let updatedOnlineCatalogWithAccessTags: ResourceCatalog;
    let updatedOnlineCatalogWithAccessTagsStore: () => MockDataStore;
    let updatedOfflineCatalogWithAccessTags: ResourceCatalog;
    let updatedOfflineCatalogWithAccessTagsStore: () => MockDataStore;

    let testStorageDir: string | undefined;

    before(async function () {
        await fs.mkdir(localStorageDir, { recursive: true });
        process.chdir(localStorageDir);
    });

    beforeEach(async function () {
        setupTestData();

        const apiOpts = {
            ...apiOptions,
            authorizer: new PublicAuthorizer(),
        };

        emptyOnlineCatalog = new ResourceCatalog(
            { ...catalogDefaults, directory: 'empty' },
            new CfsApiClient(apiOpts),
        );

        emptyOnlineCatalogStore = primaryCatalogStore;

        emptyOfflineCatalog = new ResourceCatalog({
            ...catalogDefaults,
            directory: 'empty',
        });

        emptyOfflineCatalogStore = primaryCatalogStore;

        updatedOnlineCatalogWithAccessTags = new ResourceCatalog(
            {
                ...catalogDefaults,
                directory: 'with_access_tags',
            },
            new CfsApiClient(apiOpts),
        );

        updatedOnlineCatalogWithAccessTagsStore = primaryCatalogStore;

        updatedOfflineCatalogWithAccessTags = new ResourceCatalog({
            ...catalogDefaults,
            directory: 'with_access_tags',
        });

        updatedOfflineCatalogWithAccessTagsStore = primaryCatalogStore;

        // Verify catalogs are setup correctly
        await expect(
            updatedOnlineCatalogWithAccessTags.isEmpty(),
            'catalog is empty, should be populated',
        ).to.eventually.be.false;

        await expect(
            emptyOnlineCatalog.isEmpty(),
            'catalog is not empty, should be',
        ).to.eventually.be.true;

        await expect(
            updatedOfflineCatalogWithAccessTags.isEmpty(),
            'catalog is empty, should be populated',
        ).to.eventually.be.false;

        await expect(
            emptyOfflineCatalog.isEmpty(),
            'catalog is not empty, should be',
        ).to.eventually.be.true;
    });

    afterEach(async function (this: Context) {

        if (testStorageDir) {
            if (this.currentTest?.isPassed()) {
                testDirs.push(testStorageDir);
            } else if (this.currentTest?.err) {
                this.currentTest.err.message += ` (local storage dir: ${testStorageDir})`;
                console.error('\t', 'local storage dir:', testStorageDir);
                cleanLocalStorageDir = false;
            }
            testStorageDir = undefined;
        }

        nock.cleanAll();
    });

    after(async function () {
        process.chdir(cwd);

        if (cleanLocalStorageDir) {
            await fs.rm(localStorageDir, {
                force: true,
                recursive: true,
            });
        } else {
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
     * get() / getAll()
     */
    describe('get/getAll', function () {
        // Define a function to run the tests for both online and offline catalogs
        const runTests = (online: boolean) => {
            describe('get', function () {
                it('should not output accessTags', async function () {
                    const catalog = online
                        ? updatedOnlineCatalogWithAccessTags
                        : updatedOfflineCatalogWithAccessTags;
                    const resource = await catalog.get('resource1Id');
                    expect(resource).to.not.have.deep.property('accessTag');
                });
            });

            describe('getAll', function () {
                it('should not output accessTags', async function () {
                    const catalog = online
                        ? updatedOnlineCatalogWithAccessTags
                        : updatedOfflineCatalogWithAccessTags;
                    const resources = await catalog.getAll();
                    expect(resources).to.be.an('array').that.is.not.empty;
                    resources.forEach((resource) => {
                        expect(resource).to.not.have.deep.property('accessTag');
                    });
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
     * export() / import()
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
                it('should not export accessTags', async function () {
                    const catalog = online
                        ? updatedOnlineCatalogWithAccessTags
                        : updatedOfflineCatalogWithAccessTags;
                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'export.zip',
                    );
                    // verify catalog data store contains the access tags
                    expect(
                        await (
                            online
                                ? updatedOnlineCatalogWithAccessTagsStore()
                                : updatedOfflineCatalogWithAccessTagsStore()
                        ).list(),
                    ).to.deep.equal(
                        mockApiData('with_access_tags'), // catalog contains accessTags
                        'data store does not contain expected access tags',
                    );
                    // export the catalog and verify the zip file
                    await catalog.export(zipFilePath);
                    await verifyZip(
                        catalog,
                        zipFilePath,
                        mockApiData('valid'), // zip file should not have accessTags
                        mockMetaData.get('valid'),
                    );
                });
            });

            describe('import', function () {
                it('should not import accessTags', async function () {
                    const catalog = online
                        ? emptyOnlineCatalog
                        : emptyOfflineCatalog;

                    const zipFilePath: string = path.join(
                        testStorageDir!,
                        'import.zip',
                    );

                    // create a zip file with the Resource test data
                    const zip = new JSZip();
                    const data = JSON.stringify({
                        resource: mockApiData('with_access_tags'),
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
                        mockApiData('with_access_tags'), // catalog data store contains accessTags
                        'data store does not contain expected access tags',
                    );
                    // although the accessTags are not returned in the output
                    await getAndVerifyCatalog<Resource>(
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
});
