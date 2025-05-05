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
import temp from 'temp';
import _ from 'lodash';

import { fileURLToPath } from 'node:url';
import { promises as fs, existsSync } from 'node:fs';
import path from 'node:path';

import { LowDBDataStore } from '../../src/catalog/data.js';
import {
    DataStoreError,
    DataStore,
    StoreItem,
} from '../../src/catalog/types.js';

use(chaiAsPromised);
const testDir: string = path.dirname(fileURLToPath(import.meta.url));
const localStorageDir = path.join(
    testDir,
    'testLocalStorage',
    'data',
);

// mock to get bad data into a store for testing replace()
class UnsafeDataStore implements DataStore {
    constructor(
        private readonly data: StoreItem[],
        private readonly metadata?: Record<string, unknown>,
    ) {}
    itemTag: string = 'soc';
    isEmpty: () => Promise<boolean>;
    purge: () => Promise<void>;
    replace: (incoming: DataStore) => Promise<void>;
    get: (id: string) => Promise<StoreItem | undefined>;
    set: (data: StoreItem | StoreItem[]) => Promise<void>;
    setMetadata: (
        metadata?: Record<string, unknown>,
    ) => Promise<void>;
    close: () => Promise<void>;
    destroy: () => Promise<void>;
    validate: () => Promise<void>;

    async list(): Promise<StoreItem[]> {
        return this.data;
    }

    async getMetadata(): Promise<
        Record<string, unknown> | undefined
    > {
        return this.metadata;
    }
}

let testDataMap: Map<string, StoreItem>;
let testMetadataMap: Map<string, Record<string, unknown>>;

const resetTestData = () => {
    testDataMap = new Map([
        [
            'item1',
            {
                id: 'test1',
                name: 'Test 1',
                description: 'A test item 1',
                cores: [],
                boards: [],
                packages: [],
            },
        ],
        [
            'item2',
            {
                id: 'test2',
                name: 'Test 2',
                description: 'A test item 2',
                cores: [],
                boards: [],
                packages: [],
            },
        ],
        [
            'item3',
            {
                id: 'test3',
                name: 'Test 3',
                description: 'A test item 3',
                cores: [],
                boards: [],
                packages: [],
            },
        ],
        [
            'updateditem1',
            {
                id: 'test1',
                name: 'Test 1',
                description: 'An updated test item 1',
                cores: [],
                boards: [],
                packages: [],
            },
        ],
        [
            'updateditem2',
            {
                id: 'test2',
                name: 'Test 2',
                description: 'An updated test item 2',
                cores: [],
                boards: [],
                packages: [],
            },
        ],
    ]);

    // Deliberately bad data for testing replace(), set() and new
    // @ts-expect-error - intentionally bad data (missing required 'id' key)
    testDataMap.set('missing-id', {
        name: 'Test 1',
        description: 'A test item 1',
    });
    testDataMap.set('non-string-id', {
        // @ts-expect-error - intentionally bad data (wrong type for 'id' key)
        id: true,
        name: 'Test 1',
        description: 'A test item 1',
    });
    testDataMap.set('empty-id', {
        id: '',
        name: 'Test 1',
        description: 'A test item 1',
    });
    // @ts-expect-error - intentionally bad data (item is a string instead of an object)
    testDataMap.set('non-object', 'foo');
};

const resetTestMetadata = () => {
    testMetadataMap = new Map([
        ['meta1', { time: 'now', version: '1.0.0' }],
        ['meta2', { lib: 'myLibrary' }],
        ['updatedMeta1', { time: 'yesterday', version: '1.0.0' }],
    ]);
    // @ts-expect-error - intentionally bad data (item is a string instead of an object)
    testMetadataMap.set('non-object', 'foo');
};

// Helper function, returns a clone of test data or throws error if not found
const testData = (id: string) => {
    const data = testDataMap.get(id);
    if (!data) {
        throw new Error(`Test data not found for id: ${id}`);
    }
    return _.cloneDeep(data);
};

// Helper function, returns a clone of test metadata or throws error if not found
const testMetadata = (id: string) => {
    const data = testMetadataMap.get(id);
    if (!data) {
        throw new Error(`Test metadata not found for id: ${id}`);
    }
    return _.cloneDeep(data);
};

// Test config for bad schema tests
const badSchemaTests: Map<string, string> = new Map([
    ['missing id key', 'missing-id'],
    ['id is not a string', 'non-string-id'],
    ['id is empty string', 'empty-id'],
    ['item is not an object', 'non-object'],
]);

// Pick one of the bad schema tests at random
const randomBadSchemaTest = (): [string, string] => {
    const testKeys = Array.from(badSchemaTests.keys());
    const testKey =
        testKeys[Math.floor(Math.random() * testKeys.length)];
    const dataKey = badSchemaTests.get(testKey);
    if (!dataKey) {
        throw new Error(`Test data not found for key: ${testKey}`);
    }
    return [testKey, dataKey];
};

describe('LowDBDataStore tests', () => {
    let store: LowDBDataStore<'soc'>;
    let testStorageDir: string;
    let dbDir: string;
    let cleanLocalStorageDir: boolean = true;
    const testDirs: string[] = []; // keep track of test temp dirs for cleanup

    before(async () => {
        await fs.mkdir(localStorageDir, { recursive: true });
    });

    beforeEach(async () => {
        // create a new temp dir for each test
        testStorageDir = temp.path({ dir: localStorageDir });
        expect(existsSync(testStorageDir)).to.be.false;
        await fs.mkdir(testStorageDir, { recursive: true });

        // create a new store for each test
        dbDir = path.join(testStorageDir, 'db');
        expect(existsSync(dbDir)).to.be.false;
        store = new LowDBDataStore(dbDir, 'soc');
        // reset test data
        resetTestData();
        resetTestMetadata();
    });

    // after each test
    afterEach(async function (this: Mocha.Context) {
        if (this.currentTest?.isPassed()) {
            // Mark the directory for cleanup if the test passed
            testDirs.push(testStorageDir);
        } else if (this.currentTest?.err) {
            // Keep the directory if the test failed
            // and add its path to the error message
            this.currentTest.err.message += ` (local storage dir: ${testStorageDir})`;
            // sometimes the error message isn't printed, so log it here too
            console.error('\t', 'local storage dir:', testStorageDir);
            cleanLocalStorageDir = false; // don't clean up the parent directory
        }
    });

    // after all tests
    // TODO: this could be better done as a global/root (or suite ?) hook that checked if all tests passed
    after(async () => {
        // Clean up parent directory if all tests passed
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

    describe('new', () => {
        it('should create a new directory for the database when the db is initialized', async () => {
            await store.validate();
            expect(existsSync(dbDir)).to.be.true;
        });

        it('should create new directories recursively if they do not exist when the db is initialized', async () => {
            const nestedDir = path.join(
                testStorageDir,
                'nested',
                'dir',
            );
            expect(existsSync(nestedDir)).to.be.false;
            const myStore = new LowDBDataStore(nestedDir, 'soc');
            await myStore.validate();
            expect(existsSync(nestedDir)).to.be.true;
        });

        it('should create a new database file after initizalization if it does not exist', async () => {
            await store.validate();
            expect(existsSync(path.join(dbDir, store.DB_FILE_NAME)))
                .to.be.true;
        });

        it('should use an existing database file if one exists', async () => {
            const existingDir = path.join(
                testStorageDir,
                'existing-db',
            );
            expect(existsSync(existingDir)).to.be.false;
            await fs.mkdir(existingDir, { recursive: true });
            await fs.writeFile(
                path.join(existingDir, store.DB_FILE_NAME),
                JSON.stringify({
                    soc: [testData('item1')],
                }),
            );
            const existingStore = new LowDBDataStore(
                existingDir,
                'soc',
            );
            await expect(existingStore.isEmpty()).to.eventually.be
                .false;
            await expect(
                existingStore.list(),
            ).to.eventually.deep.equal([testData('item1')]);
        });

        it('should use an existing database file with no entries', async () => {
            const existingDir = path.join(
                testStorageDir,
                'existing-db',
            );
            expect(existsSync(existingDir)).to.be.false;
            await fs.mkdir(existingDir, { recursive: true });
            await fs.writeFile(
                path.join(existingDir, store.DB_FILE_NAME),
                JSON.stringify({
                    soc: [],
                }),
            );
            const existingStore = new LowDBDataStore(
                existingDir,
                'soc',
            );
            await expect(existingStore.isEmpty()).to.eventually.be
                .true;
            await expect(
                existingStore.list(),
            ).to.eventually.deep.equal([]);
        });

        it('should not throw at instansiation if the existing database file has incorrect schema', async () => {
            const existingDir = path.join(
                testStorageDir,
                'existing-db',
            );
            const [, dataKey] = randomBadSchemaTest();
            expect(existsSync(existingDir)).to.be.false;
            await fs.mkdir(existingDir, { recursive: true });
            await fs.writeFile(
                path.join(existingDir, store.DB_FILE_NAME),
                JSON.stringify({
                    item: [testData(dataKey)],
                }),
            );
            expect(new LowDBDataStore(existingDir, 'soc')).not.to
                .throw;
        });

        it('should not throw at the next call to destroy after instansiation if the existing database file has incorrect schema', async () => {
            const existingDir = path.join(
                testStorageDir,
                'existing-db',
            );
            const [desc, dataKey] = randomBadSchemaTest();
            expect(existsSync(existingDir)).to.be.false;
            await fs.mkdir(existingDir, { recursive: true });
            await fs.writeFile(
                path.join(existingDir, store.DB_FILE_NAME),
                JSON.stringify({
                    soc: [testData(dataKey)],
                }),
            );
            const existingStore = new LowDBDataStore(
                existingDir,
                'soc',
            );
            expect(
                await existingStore.destroy(),
                `"${desc}" (${existingDir})`,
            ).not.to.throw;
        });

        describe('should throw at the next call of other methods after instansiation if the existing database file has incorrect schema', () => {
            resetTestData();
            const testCalls: [string, unknown?][] = [
                ['isEmpty'],
                ['list'],
                ['get', 'test1'],
                ['set', testData('item1')],
                ['purge'],
                ['replace', new UnsafeDataStore([testData('item1')])],
                ['close'],
                ['validate'],
            ];

            for (const [methodName, ...methodArgs] of testCalls) {
                it(methodName, async () => {
                    const existingDir = path.join(
                        testStorageDir,
                        'existing-db',
                    );
                    const [desc, dataKey] = randomBadSchemaTest();
                    expect(existsSync(existingDir)).to.be.false;
                    await fs.mkdir(existingDir, { recursive: true });
                    await fs.writeFile(
                        path.join(existingDir, store.DB_FILE_NAME),
                        JSON.stringify({
                            item: [testData(dataKey)],
                        }),
                    );
                    const existingStore = new LowDBDataStore(
                        existingDir,
                        'soc',
                    );
                    await expect(
                        existingStore[methodName](...methodArgs),
                        `"${desc}" (${existingDir})`,
                    )
                        .to.eventually.be.rejectedWith(DataStoreError)
                        .with.property('type', 'INVALID_DATA');
                });
            }
        });
    });

    describe('validate', () => {
        describe('should error if the database file has incorrect schema', () => {
            const badDBSchema: Map<string, unknown> = new Map([
                [
                    'missing item key',
                    {
                        foo: 'bar',
                    },
                ],
                [
                    'item is not an array',
                    {
                        item: 'foo',
                    },
                ],
                [
                    'item is null',
                    {
                        item: null,
                    },
                ],
                [
                    'file is empty',
                    '' as unknown, // not sure why this is needed, but putting an empty string here seems to change the map type to <string, string>
                ],
                [
                    'metadata is not an object',
                    {
                        item: [],
                        metadata: 'foo',
                    },
                ],
                [
                    'metadata is null',
                    {
                        item: [],
                        metadata: null,
                    },
                ],
                [
                    'metadata is an array',
                    {
                        item: [],
                        metadata: [],
                    },
                ],
            ]);

            for (const [desc, data] of badDBSchema) {
                it(desc, async () => {
                    const existingDir = path.join(
                        testStorageDir,
                        'existing-db',
                    );
                    expect(existsSync(existingDir)).to.be.false;
                    await fs.mkdir(existingDir, { recursive: true });
                    await fs.writeFile(
                        path.join(existingDir, store.DB_FILE_NAME),
                        JSON.stringify(data),
                    );
                    const existingStore = new LowDBDataStore(
                        existingDir,
                        'soc',
                    );
                    await expect(
                        existingStore.validate(),
                        `"${desc}" (${existingDir})`,
                    )
                        .to.eventually.be.rejectedWith(DataStoreError)
                        .with.property('type', 'INVALID_DATA');
                });
            }
        });

        describe('should error if any of the database items have incorrect schema', () => {
            for (const [desc, dataKey] of badSchemaTests) {
                it(desc, async () => {
                    const existingDir = path.join(
                        testStorageDir,
                        'existing-db',
                    );
                    expect(existsSync(existingDir)).to.be.false;
                    await fs.mkdir(existingDir, { recursive: true });
                    const data = testData(dataKey);
                    await fs.writeFile(
                        path.join(existingDir, store.DB_FILE_NAME),
                        JSON.stringify({
                            item: [
                                testData('item1'),
                                data,
                                testData('item2'),
                            ],
                        }),
                    );
                    const existingStore = new LowDBDataStore(
                        existingDir,
                        'soc',
                    );
                    await expect(
                        existingStore.validate(),
                        `"${desc}" (${existingDir})`,
                    )
                        .to.eventually.be.rejectedWith(DataStoreError)
                        .with.property('type', 'INVALID_DATA');
                });
            }
        });
    });

    describe('isEmpty', () => {
        it('should return true if the database is empty', async () => {
            await expect(store.list()).to.eventually.deep.equal([]);
            await expect(store.isEmpty()).to.eventually.be.true;
        });

        it('should return false if the database is not empty', async () => {
            await expect(store.isEmpty()).to.eventually.be.true;
            await store.set(testData('item1'));
            await expect(store.isEmpty()).to.eventually.be.false;
        });
    });

    describe('purge', () => {
        it('should remove everything from the database', async () => {
            await store.set(testData('item1'));
            await expect(store.isEmpty()).to.eventually.be.false;
            await store.purge();
            // await expect(store.isEmpty()).to.eventually.be.true;
            await expect(store.list()).to.eventually.deep.equal([]);
        });
    });

    describe('set', () => {
        it('should add an entry to the database if not already present', async () => {
            await expect(store.get('test1')).to.eventually.be
                .undefined;
            await store.set(testData('item1'));
            await expect(store.get('test1')).to.eventually.deep.equal(
                testData('item1'),
            );
        });

        describe('should fail to add an invalid entry to the database', () => {
            for (const [desc, dataKey] of badSchemaTests) {
                it(desc, async () => {
                    const data = testData(dataKey);
                    await expect(store.set(data), `"${desc}"`)
                        .to.eventually.be.rejectedWith(DataStoreError)
                        .that.has.property('type', 'INVALID_DATA');
                });
            }
        });

        it('should remain unchanged after failing to add an entry', async () => {
            await store.set(testData('item1'));
            const [desc, dataKey] = randomBadSchemaTest();
            const data = testData(dataKey);
            await expect(store.set(data), `"${desc}"`)
                .to.eventually.be.rejectedWith(DataStoreError)
                .that.has.property('type', 'INVALID_DATA');
            await expect(store.list()).to.eventually.deep.equal([
                testData('item1'),
            ]);
        });

        it('should update an item in the database', async () => {
            await store.set(testData('item1'));
            await expect(store.get('test1')).to.eventually.not.be
                .undefined;
            await store.set(testData('updateditem1'));
            await expect(store.get('test1')).to.eventually.deep.equal(
                testData('updateditem1'),
            );
        });

        it('should add multiple entries to the database', async () => {
            await expect(store.list()).to.eventually.deep.equal([]);
            await store.set([testData('item1'), testData('item2')]);
            await expect(store.list()).to.eventually.deep.equal([
                testData('item1'),
                testData('item2'),
            ]);
        });

        it('should update multiple entries in the database', async () => {
            await store.set([testData('item1'), testData('item2')]);
            await store.set([
                testData('updateditem1'),
                testData('updateditem2'),
            ]);
            await expect(store.list()).to.eventually.deep.equal([
                testData('updateditem1'),
                testData('updateditem2'),
            ]);
        });

        it('should allow for both adding and updating entries in the database from the same array', async () => {
            await store.set([testData('item1'), testData('item2')]);
            await store.set([
                testData('updateditem1'),
                testData('item3'),
            ]);
            await expect(store.list()).to.eventually.deep.equal([
                testData('updateditem1'), // updated
                testData('item2'), // unchanged
                testData('item3'), // added
            ]);
        });

        it('should only add the last entry with the same ID in the array', async () => {
            const items = [
                testData('item1'),
                testData('item2'),
                testData('item3'),
            ];
            items[1].id = 'test1'; // duplicate ID
            items[2].id = 'test1'; // duplicate ID
            await store.set(items);
            await expect(store.list()).to.eventually.deep.equal([
                items[2], // only last entry with the same ID is present
            ]);
        });

        describe('should fail to add an array with an invalid entry', () => {
            for (const [desc, dataKey] of badSchemaTests) {
                it(desc, async () => {
                    const data = testData(dataKey);
                    await expect(
                        store.set([
                            testData('item1'),
                            testData('item2'),
                            data,
                            testData('item3'),
                        ]),
                        desc,
                    )
                        .to.eventually.be.rejectedWith(DataStoreError)
                        .that.has.property('type', 'INVALID_DATA');
                });
            }
        });

        it('should remain unchanged after failing to add an array with an invalid entry', async () => {
            await store.set(testData('item1'));
            const [desc, dataKey] = randomBadSchemaTest();
            const data = testData(dataKey);
            await expect(
                store.set([
                    testData('item2'),
                    data,
                    testData('item3'),
                ]),
                desc,
            )
                .to.eventually.be.rejectedWith(DataStoreError)
                .that.has.property('type', 'INVALID_DATA');
            await expect(store.list()).to.eventually.deep.equal([
                testData('item1'),
            ]);
        });

        it('should store a clone of the data', async () => {
            const item = testData('item1');
            await store.set(item);
            item.name = 'Changed'; // change a value in the original object
            const result = await store.get('test1');
            expect(result).to.not.equal(item); // not deep equal, testing that these are different objects not that they have different properties
            // Verify that this didn't change the stored object
            expect(result).to.deep.equal(testData('item1'));
        });

        it('should store a clone of the data (array)', async () => {
            const items = [testData('item1'), testData('item2')];
            await store.set(items);
            items[0].name = 'Changed'; // change a value in the original object
            const result = await store.get('test1');
            expect(result).to.not.equal(items[0]); // not deep equal, testing that these are different objects not that they have different properties
            // Verify that this didn't change the stored object
            expect(result).to.deep.equal(testData('item1'));
        });
    });

    describe('setMetadata', () => {
        it('should add metadata to the database if not already present', async () => {
            await expect(store.getMetadata()).to.eventually.be
                .undefined;
            await store.setMetadata(testMetadata('meta1'));
            await expect(
                store.getMetadata(),
            ).to.eventually.deep.equal(testMetadata('meta1'));
        });

        it('should fail to add non-object metadata to the database', async () => {
            await expect(
                store.setMetadata(testMetadata('non-object')),
            )
                .to.eventually.be.rejectedWith(DataStoreError)
                .that.has.property('type', 'INVALID_DATA');
        });

        it('should remain unchanged after failing to set metadata', async () => {
            await store.setMetadata(testMetadata('meta1'));
            await expect(
                store.setMetadata(testMetadata('non-object')),
            )
                .to.eventually.be.rejectedWith(DataStoreError)
                .that.has.property('type', 'INVALID_DATA');
            await expect(
                store.getMetadata(),
            ).to.eventually.deep.equal(testMetadata('meta1'));
        });

        it('should update metadata', async () => {
            await store.setMetadata(testMetadata('meta1'));
            await expect(store.getMetadata()).to.eventually.not.be
                .undefined;
            await store.setMetadata(testMetadata('updatedMeta1'));
            await expect(
                store.getMetadata(),
            ).to.eventually.deep.equal(testMetadata('updatedMeta1'));
        });

        it('should remove metadata if set to undefined', async () => {
            await store.setMetadata(testMetadata('meta1'));
            await expect(store.getMetadata()).to.eventually.not.be
                .undefined;
            await store.setMetadata(undefined);
            await expect(store.getMetadata()).to.eventually.be
                .undefined;
        });

        it('should store a clone of the metadata', async () => {
            const meta = testMetadata('meta1');
            await store.setMetadata(meta);
            meta.time = 'Changed'; // change a value in the original object
            const result = await store.getMetadata();
            expect(result).to.not.equal(meta); // not deep equal, testing that these are different objects not that they have different properties
            // Verify that this didn't change the stored object
            expect(result).to.deep.equal(testMetadata('meta1'));
        });
    });

    describe('get', () => {
        it('should return undefined if the entry is not in the database', async () => {
            await expect(store.get('doesnotexist')).to.eventually.be
                .undefined;
        });

        it('should return the entry if it is in the database', async () => {
            await store.set(testData('item1'));
            await expect(store.get('test1')).to.eventually.deep.equal(
                testData('item1'),
            );
        });

        it('should return cloned data', async () => {
            await store.set(testData('item1'));

            const result = await store.get('test1');
            expect(result).to.not.be.undefined;
            result!.name = 'Changed'; // change a value in the returned object
            // Verify that this didn't change the stored object
            await expect(store.get('test1')).to.eventually.deep.equal(
                testData('item1'),
            );
        });
    });

    describe('getMetadata', () => {
        it('should return undefined if there is no metadata in the database', async () => {
            await expect(store.getMetadata()).to.eventually.be
                .undefined;
        });

        it('should return metadata if it is in the database', async () => {
            await store.setMetadata(testMetadata('meta1'));
            await expect(
                store.getMetadata(),
            ).to.eventually.deep.equal(testMetadata('meta1'));
        });

        it('should return cloned data', async () => {
            await store.setMetadata(testMetadata('meta1'));
            const result = await store.getMetadata();
            expect(result).to.not.be.undefined;
            result!.time = 'Changed'; // change a value in the returned object
            // Verify that this didn't change the stored object
            await expect(
                store.getMetadata(),
            ).to.eventually.deep.equal(testMetadata('meta1'));
        });
    });

    describe('list', () => {
        it('should return an empty array if the database is empty', async () => {
            await expect(store.list()).to.eventually.deep.equal([]);
        });

        it('should return all entries in the database', async () => {
            await store.set([testData('item1'), testData('item2')]);
            await expect(store.list()).to.eventually.deep.equal([
                testData('item1'),
                testData('item2'),
            ]);
        });

        it('should return cloned data', async () => {
            await store.set([testData('item1'), testData('item2')]);
            const result = await store.list();
            result[0].name = 'Changed'; // change a value in the returned object
            // Verify that this didn't change the stored object
            await expect(store.list()).to.eventually.deep.equal([
                testData('item1'),
                testData('item2'),
            ]);
        });
    });

    describe('replace', () => {
        let incomingStore: LowDBDataStore<'soc'>;
        let otherTagStore: LowDBDataStore<'coretypes'>;

        beforeEach(async () => {
            const incomingStorageDir = path.join(
                testStorageDir,
                'incoming-db',
            );
            const otherTagStorageDir = path.join(
                testStorageDir,
                'othertag-db',
            );
            incomingStore = new LowDBDataStore(
                incomingStorageDir,
                'soc',
            );
            otherTagStore = new LowDBDataStore(
                otherTagStorageDir,
                'coretypes',
            );
        });

        it('should replace data from another DataStore instance', async () => {
            // initial data
            await store.set(testData('item1'));
            // incoming data
            await incomingStore.set(testData('item2'));

            // replace the store with the incoming data
            await store.replace(incomingStore);

            await expect(store.list()).to.eventually.deep.equal([
                testData('item2'),
            ]);
        });

        it('should clone the incoming data', async () => {
            // incoming data
            await incomingStore.set(testData('item2'));

            // replace the store with the incoming data
            await store.replace(incomingStore);

            // verify the store data contents
            await expect(store.list()).to.eventually.deep.equal([
                testData('item2'),
            ]);

            // modify the store that was imported from
            await incomingStore.set({
                id: 'test2',
                name: 'Changed',
            });

            // verify the receiving store data was not modified
            await expect(store.list()).to.eventually.deep.equal([
                testData('item2'),
            ]);
        });

        it('should still replace data if incoming store is empty', async () => {
            // initial data
            await store.set(testData('item1'));

            await expect(incomingStore.isEmpty()).to.eventually.be
                .true;

            await store.replace(incomingStore);

            // verify data gets overwritten
            await expect(store.isEmpty()).to.eventually.be.true;
        });

        describe('should fail to replace if incoming store is contains invalid items', () => {
            for (const [desc, dataKey] of badSchemaTests) {
                it(desc, async () => {
                    // initial data
                    await store.set(testData('item1'));
                    await store.setMetadata(testMetadata('meta1'));
                    // incoming invalid data
                    const data = testData(dataKey);
                    const invalidStore = new UnsafeDataStore(
                        [
                            testData('item1'),
                            testData('item2'),
                            data,
                            testData('item3'),
                        ],
                        testMetadata('meta2'),
                    );

                    await expect(store.replace(invalidStore))
                        .to.eventually.be.rejectedWith(DataStoreError)
                        .that.has.property('type', 'INVALID_DATA');

                    // verify store remains unchanged
                    await expect(
                        store.list(),
                    ).to.eventually.deep.equal([testData('item1')]);
                    await expect(
                        store.getMetadata(),
                    ).to.eventually.deep.equal(testMetadata('meta1'));
                });
            }
        });

        it('should replace metadata from another DataStore instance', async () => {
            // initial data
            await store.setMetadata(testMetadata('meta1'));
            // incoming data
            await incomingStore.setMetadata(testMetadata('meta2'));

            // replace the store with the incoming data
            await store.replace(incomingStore);

            await expect(
                store.getMetadata(),
            ).to.eventually.deep.equal(testMetadata('meta2'));
        });

        it('should clone the incoming metadata', async () => {
            // incoming data
            await incomingStore.setMetadata(testMetadata('meta1'));

            // replace the store with the incoming data
            await store.replace(incomingStore);

            // verify the store data contents
            await expect(
                store.getMetadata(),
            ).to.eventually.deep.equal(testMetadata('meta1'));

            // modify the store that was imported from
            await incomingStore.setMetadata(
                testMetadata('updatedMeta1'),
            );

            // verify the receiving store data was not modified
            await expect(
                store.getMetadata(),
            ).to.eventually.deep.equal(testMetadata('meta1'));
        });

        it('should remove metadata if the incoming store does not have any', async () => {
            // initial data
            await store.setMetadata(testMetadata('meta1'));

            await expect(incomingStore.getMetadata()).to.eventually.be
                .undefined;

            await store.replace(incomingStore);

            // verify data gets overwritten
            await expect(store.getMetadata()).to.eventually.be
                .undefined;
        });

        it('should fail to replace if incoming store contains invalid metadata', async () => {
            // add invalid metadata to incoming store
            const invalidStore = new UnsafeDataStore(
                [testData('item2')],
                testMetadata('non-object'),
            );

            // initial store
            await store.setMetadata(testMetadata('meta1'));
            await store.set(testData('item1'));
            // incoming invalid store
            await expect(store.replace(invalidStore))
                .to.eventually.be.rejectedWith(DataStoreError)
                .that.has.property('type', 'INVALID_DATA');

            // verify store remains unchanged
            await expect(
                store.getMetadata(),
            ).to.eventually.deep.equal(testMetadata('meta1'));
            await expect(store.list()).to.eventually.deep.equal([
                testData('item1'),
            ]);
        });

        it('should fail to replace if incoming store has a different item tag', async () => {
            // initial store
            await store.set(testData('item1'));
            // incoming store with different item tag
            await otherTagStore.set(testData('item1'));

            await expect(store.replace(otherTagStore))
                .to.eventually.be.rejectedWith(DataStoreError)
                .that.has.property('type', 'INVALID_DATA');

            // verify store remains unchanged
            await expect(store.list()).to.eventually.deep.equal([
                testData('item1'),
            ]);
        });
    });

    describe('close', () => {
        it('should not throw an error if the data directory exists', async () => {
            await store.validate(); // initialize the db
            expect(existsSync(dbDir)).to.be.true;
            await expect(store.close()).to.eventually.be.fulfilled;
            expect(existsSync(dbDir)).to.be.true;
        });

        it('should throw an error if the data directory has been removed', async () => {
            await store.validate();
            await fs.rm(dbDir, { recursive: true });
            expect(existsSync(dbDir)).to.be.false;
            await expect(store.close())
                .to.eventually.be.rejectedWith(DataStoreError)
                .that.has.property('type', 'IO_ERROR');
        });
    });

    describe('destroy', () => {
        it('should remove the data directory', async () => {
            await store.validate(); // initialize the db
            expect(existsSync(dbDir)).to.be.true;
            await expect(store.destroy()).to.eventually.be.fulfilled;
            expect(existsSync(dbDir)).to.be.false;
        });

        it('should throw an error if the data directory has already been removed', async () => {
            await store.validate();
            await fs.rm(dbDir, { recursive: true });
            expect(existsSync(dbDir)).to.be.false;
            await expect(store.destroy())
                .to.eventually.be.rejectedWith(DataStoreError)
                .that.has.property('type', 'IO_ERROR');
        });
    });
});
