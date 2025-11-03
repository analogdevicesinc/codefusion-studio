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

import temp from 'temp';
import path from 'node:path';
import {
    promises as fs,
    createWriteStream,
    existsSync,
} from 'node:fs';
import JSZip from 'jszip';
import { z } from 'zod';
import _ from 'lodash';
import { valid as validSemver } from 'semver';
import { LowDBDataStore } from './data.js';
import { CfsApiClient } from '../sdk/cfsapi-client.js';
import { DataStore, CatalogError, DataStoreError } from './types.js';
import { RequireOptional } from '../types.js';
import { LIB_NAME, LIB_VERSION } from '../config/constants.cjs';

// Any object that is returned by the REST client
type RestObject = {
    id: string; // the unique identifier for the object
    [key: string]: unknown; // other properties of the object
};

// These are the REST entities which can be stored in a catalog
// (because they have a class with a getAll() method and an entity
// tag in the REST client)
type RestEntity = {
    [K in keyof CfsApiClient['rest']]: CfsApiClient['rest'][K] extends {
        getAll(): infer R extends Promise<RestObject[]>;
        TAG: string;
    }
        ? Awaited<R>[number]
        : never;
}[keyof CfsApiClient['rest']];

// The class in the REST client which returns the entity
type RestClass<T extends RestEntity> = {
    [K in keyof CfsApiClient['rest']]: CfsApiClient['rest'][K] extends {
        getAll(): Promise<T[]>;
        TAG: string;
    }
        ? CfsApiClient['rest'][K]
        : never;
}[keyof CfsApiClient['rest']];

// The tag for the entity in the REST client class
type EntityTag<T extends RestEntity> = RestClass<T>['TAG'];

export interface StorageOptions {
    directory: string; // The directory where the catalog data should be stored. Will have the entity tag appended and be created if it doesn't exist.  Multiple catalogs can be stored in the same directory as long as they store different entity types.
    storage?: new (directory: string, itemTag: string) => DataStore; // The class to use for local storage operations. Defaults to LowDBDataStore.
    cleanTmp?: boolean; // Whether to clean up the temp data directory when the catalog is disposed of. Defaults to true.
}

export type CatalogMetadata = {
    data?: {
        fetchedAt?: string; // the datetime the data was fetched from the API
        libName?: string; // the name of the library that fetched the data
        libVersion?: string; // the version (semver) of the library that fetched the data
    };
};

const zCatalogMetadata = z
    .object({
        data: z
            .object({
                fetchedAt: z
                    .string()
                    .datetime({ offset: true })
                    .optional(),
                libName: z
                    .string()
                    .min(1, { message: 'String cannot be empty' })
                    .optional(),
                libVersion: z
                    .string()
                    .refine((ver) => validSemver(ver), {
                        message: 'Value is not a valid semver',
                    })
                    .optional(),
            })
            .optional(),
    })
    .strip();

const defaultStorageOpts: RequireOptional<StorageOptions> = {
    cleanTmp: true,
    storage: LowDBDataStore,
};

/**
 * Base REST entity Catalog with offline mode.
 * Stores items in a local data store.
 * Subclasses provide the item parser, entity tag, and the REST client class to use.
 * @template T REST entity type to store
 */
export abstract class Catalog<T extends RestEntity>
    implements AsyncDisposable
{
    private readonly cleanTmp: boolean;
    private readonly primaryStore: DataStore;
    private readonly tempStore: DataStore;
    protected abstract readonly itemParser: z.ZodSchema<T>;
    public readonly ZIP_FILE_MEMBER: string;

    /**
     * Create a new catalog.
     * @param options Options for the underlying storage.
     * @param options.directory The directory where the catalog data should be stored. Will have the entityTag appended and be created if it doesn't exist.
     * @param options.storage The class to use for local storage operations. Defaults to LowDBDataStore.
     * @param options.cleanTmp Whether to delete temporary data when the catalog is disposed of.
     * @param entityTag A string that identifies the entity type, used in datastore locations and exported data files.
     * @param entityClient An instance of a class in the CFS API REST client that can fetch the entities.  Catalog works offline if not provided.
     * @throws {CatalogError}
     */
    protected constructor(
        options: StorageOptions,
        public readonly entityTag: EntityTag<T>,
        protected readonly entityClient?: RestClass<T>,
    ) {
        const opts = { ...defaultStorageOpts, ...options };
        this.ZIP_FILE_MEMBER = `${this.entityTag}-catalog.json`;
        this.cleanTmp = opts.cleanTmp;
        try {
            const storageDir = path.resolve(
                opts.directory,
                this.entityTag,
                'db',
            );
            this.primaryStore = new opts.storage(
                path.join(storageDir, 'A'),
                this.entityTag,
            );
            this.tempStore = new opts.storage(
                temp.path({
                    suffix: '.tmp',
                    prefix: 'db.',
                    dir: path.dirname(storageDir),
                }),
                this.entityTag,
            );
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * Static method to convert an error to a CatalogError.
     * @param err The error to convert.
     * @returns The error as a CatalogError.
     */
    protected static asCatalogError = (
        err: unknown,
    ): CatalogError => {
        if (err instanceof CatalogError) {
            return err;
        }
        if (err instanceof DataStoreError) {
            return new CatalogError({
                message:
                    'Encountered an error during a data store operation',
                cause: err,
                type: 'PERSISTENCE_ERROR',
            });
        }

        return new CatalogError({
            message: 'Unhandled exception occurred',
            cause: err,
            type: 'UNHANDLED_EXCEPTION',
        });
    };

    /**
     * Get the metadata associated with the catalog.
     * @returns A promise that resolves to the metadata object or undefined if no metadata is set.
     * @throws {CatalogError}
     */
    public async getMetadata(): Promise<CatalogMetadata | undefined> {
        try {
            const meta = await this.primaryStore.getMetadata();
            if (meta) {
                this._assertIsMetadata(meta); // validate the metadata
                // return with extra properties stripped
                return zCatalogMetadata.parse(meta);
            }
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * Dispose of the catalog.
     * Closes the primary data store, and
     * removes the temp data store if the
     * cleanTmp option was set to true.
     * @throws {CatalogError}
     */
    public async [Symbol.asyncDispose]() {
        const res = await Promise.allSettled([
            this.primaryStore.close(),
            this.tempStore.close(),
        ]);
        try {
            if (this.cleanTmp) {
                await this.tempStore.destroy();
            }

            // report any prior errors
            res.forEach((r) => {
                if (r.status === 'rejected') {
                    throw r.reason;
                }
            });
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * Dispose of the catalog.
     */
    public async dispose(): Promise<void> {
        await this[Symbol.asyncDispose]();
    }

    /**
     * Destroy the catalog.
     * Removes all stored data
     * @returns Promise that resolves when the catalog is destroyed.
     * @throws {CatalogError}
     */
    public async destroy(): Promise<void> {
        // try closing before destroying
        await Promise.allSettled([
            this.primaryStore.close(),
            this.tempStore.close(),
        ]); // ignore errors

        // destroy the stores
        const res = await Promise.allSettled([
            this.primaryStore.destroy(),
            this.tempStore.destroy(),
        ]);

        // report errors
        res.forEach((r) => {
            if (r.status === 'rejected') {
                throw Catalog.asCatalogError(r.reason);
            }
        });
    }

    /**
     * Compare the items in two DataStores.
     * @param a The first store to compare.
     * @param b The second store to compare.
     * @returns Promise that resolves to true if the stores are different.
     */
    private async _diff(
        a: DataStore,
        b: DataStore,
    ): Promise<boolean> {
        const itemsA = (await a.list()).map(this._validateItem, this); // only compare known properties so we don't report an update
        const itemsB = (await b.list()).map(this._validateItem, this); // if nothing will change in catalog output after a refresh
        return !_.isEqual(
            _.sortBy(itemsA, 'id'),
            _.sortBy(itemsB, 'id'),
        );
    }

    /**
     * Empties the store associated with the catalog.
     * @returns Promise that resolves when the storage is purged.
     * @throws {CatalogError}
     */
    public async purge(): Promise<void> {
        try {
            await Promise.all([
                this.primaryStore.purge(),
                this.tempStore.purge(),
            ]);
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * Checks if the catalog is empty.
     * @returns Promise that resolves to true if the catalog is empty.
     * @throws {CatalogError}
     */
    public async isEmpty(): Promise<boolean> {
        try {
            return await this.primaryStore.isEmpty();
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * For online mode, replace local store with the latest data from the API.
     * Has no effect in offline mode (if not using the API).
     * @returns Promise that resolves when the catalog is loaded.
     * @throws {CatalogError} with type INVALID_CONTENTS if the data received doesn't satisfy the catalog schema.
     * @throws {CatalogError} with type PERSISTENCE_ERROR if an error occurs during store operations.
     * @throws {CatalogError} with type UNHANDLED_EXCEPTION if an unhandled exception occurs.
     */
    public async refresh(): Promise<void> {
        if (this.entityClient) {
            try {
                await this._refresh(this.tempStore);
                await this.primaryStore.replace(this.tempStore);
            } catch (err) {
                throw Catalog.asCatalogError(err);
            }
        }
    }

    /**
     * Checks if there is newer data available if the catalog is online.
     * Always returns false if offline.
     * @returns Promise that resolves to true if there is newer data available.
     * @throws {CatalogError}
     */
    public async updateAvailable(): Promise<boolean> {
        if (!this.entityClient) {
            return false;
        }
        try {
            await this._refresh(this.tempStore);
            return await this._diff(
                this.primaryStore,
                this.tempStore,
            );
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * Method to refresh the catalog data.
     * Calls getAll() in the REST entity client to fetch items from the API,
     * then saves them to the store.
     * @param store The store to save the items to.
     * @returns Promise that resolves when the store is updated.
     * @throws {CatalogError}
     */
    private async _refresh(store: DataStore): Promise<void> {
        if (!this.entityClient) {
            throw new CatalogError({
                message: '_refresh() called in offline mode',
                type: 'UNHANDLED_EXCEPTION',
            });
        }

        let objs: unknown[];
        try {
            objs = await this.entityClient.getAll();
        } catch (err: unknown) {
            throw new CatalogError({
                message: 'Error fetching items from the API',
                cause: err,
                type: 'SERVICE_ERROR',
            });
        }

        try {
            this._assertIsUniqueItemArray(objs); // objects are valid
            await store.purge();
            await store.set(objs);
            const meta: CatalogMetadata = {
                data: {
                    fetchedAt: new Date().toISOString(),
                    libName: LIB_NAME,
                    libVersion: LIB_VERSION,
                },
            };
            await store.setMetadata(meta);
        } catch (err: unknown) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * Exports catalog contents to the given zip file; this is suitable for use with the `import()` function in this class.
     * Create or updates a zip file with a JSON file named `this.ZIP_FILE_MEMBER` at the root containing the catalog data.
     * Schema of the created JSON file:
     * ```json
     * {
     *    "${this.entityTag}": [ {Item}, {Item}, ... ],
     *    "exportDate": "ISO8601 date string",
     *    "libName": "string",
     *    "libVersion": "semver string"
     * }
     * ```
     * @param zipFilePath Path to the zip file to be generated.
     * @returns Promise that resolves when the export is complete.
     * @throws {CatalogError}
     * @example await store.export('/data/export.zip');
     */
    public async export(zipFilePath: string): Promise<void> {
        try {
            zipFilePath = path.resolve(zipFilePath);
            const data = {
                // do not include extra keys (exported data should match lib version)
                [this.entityTag]: await this.getAll(),
                metadata: await this.getMetadata(), // catalog metadata
                // metadata about the export
                export: {
                    exportedAt: new Date().toISOString(),
                    libName: LIB_NAME,
                    libVersion: LIB_VERSION,
                },
            };

            const outDir = path.dirname(zipFilePath);
            if (!existsSync(outDir)) {
                await fs.mkdir(outDir, {
                    recursive: true,
                });
            }

            const zip = new JSZip();
            // Add to or update the zip file if it already exists
            if (existsSync(zipFilePath)) {
                // load the existing zip file
                await zip.loadAsync(fs.readFile(zipFilePath));
            }
            zip.file(this.ZIP_FILE_MEMBER, JSON.stringify(data));
            const zipStream = zip.generateNodeStream({
                type: 'nodebuffer',
                streamFiles: true,
            });

            const writeStream = createWriteStream(zipFilePath);
            zipStream.pipe(writeStream);
            await new Promise<void>((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * Replace catalog contents with contents from a zipped JSON.
     * Expects a path to a zip file that has a file named `this.ZIP_FILE_MEMBER` at the root containing the catalog data,
     * with schema as described in `export()`.
     * @param zipFilePath Path to the zip file to be imported.
     * @returns A void promise that resolves when the import is complete.
     * @throws {CatalogError} with type INVALID_DATA if the zip file is invalid.
     * @throws {CatalogError} with type INVALID_CONTENTS if the data doesn't satisfy the catalog schema.
     * @throws {CatalogError} with type PERSISTENCE_ERROR if an error occurs during store operations.
     * @throws {CatalogError} with type UNHANDLED_EXCEPTION if an unhandled exception occurs.
     */
    public async import(zipFilePath: string): Promise<void> {
        try {
            zipFilePath = path.resolve(zipFilePath);
            const zip = new JSZip();
            let objs: unknown[];
            let metaObj: unknown;
            const data = await zip.loadAsync(
                fs.readFile(zipFilePath),
            );
            try {
                const dbFile = data.file(this.ZIP_FILE_MEMBER);
                if (!dbFile) {
                    throw `Missing ${this.ZIP_FILE_MEMBER} in zip file`;
                }

                const fileContent = await dbFile.async('text');
                const json = JSON.parse(fileContent);
                objs = json[this.entityTag];
                metaObj = json.metadata;

                if (!objs || !Array.isArray(objs)) {
                    throw 'Invalid data in zip file';
                }
            } catch (err) {
                throw new CatalogError({
                    message: 'Error importing zip file',
                    cause: err,
                    type: 'INVALID_DATA',
                });
            }

            // replace the data store with the imported data
            this._assertIsUniqueItemArray(objs); // objects are items
            await this.tempStore.purge();
            await this.tempStore.set(objs);

            // import metadata if present
            let meta: CatalogMetadata | undefined;
            if (metaObj) {
                this._assertIsMetadata(metaObj);
                meta = metaObj;
            }
            await this.tempStore.setMetadata(meta);

            // replace primary store if no errors
            await this.primaryStore.replace(this.tempStore);
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * Retrieves the stored item for a given id.
     * @param itemId the id of the item to return.
     * @returns A promise that resolves to the item, or undefined if not found.
     * @throws {CatalogError}
     */
    public async get(itemId: string): Promise<T | undefined> {
        try {
            const item = await this.primaryStore.get(itemId);
            return item ? this._validateItem(item) : undefined;
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * Retrieves all items in the catalog.
     * @returns A promise that resolves to a list of items.
     * @throws {CatalogError}
     */
    public async getAll(): Promise<T[]> {
        try {
            const allItems = await this.primaryStore.list();
            this._assertIsUniqueItemArray(allItems); // ensure all items have unique IDs
            return allItems.map(this._validateItem, this); // return only known properties
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
    }

    /**
     * Check that the data store and items in the catalog are valid.
     * @returns A promise that resolves when the validation is complete.
     * @throws {CatalogError} if an error is encountered during validation, or if there are duplicate item ids.
     */
    public async validate(): Promise<void> {
        try {
            await this.primaryStore.validate();
        } catch (err) {
            throw Catalog.asCatalogError(err);
        }
        void (await Promise.all([this.getAll(), this.getMetadata()])); // will throw if there are any issues
    }

    /**
     * Asserts that the given object is a valid metadata object.
     * @param obj The object to check.
     * @throws {CatalogError} if the object is not a valid metadata object.
     */
    private _assertIsMetadata(
        obj: unknown,
    ): asserts obj is CatalogMetadata {
        try {
            void zCatalogMetadata.parse(obj);
        } catch (err) {
            throw new CatalogError({
                message: 'Error validating catalog metadata',
                cause: err,
                type: 'INVALID_CONTENTS',
            });
        }
    }

    /**
     * Validate an object is a valid entity item and return it with extra properties removed.
     * @param obj The object to validate.
     * @returns The object with extra properties removed.
     * @throws {CatalogError} if the object is not a valid entity.
     */
    private _validateItem(obj: unknown): T {
        try {
            return this.itemParser.parse(obj);
        } catch (err) {
            throw new CatalogError({
                message: 'Error validating item',
                cause: err,
                type: 'INVALID_CONTENTS',
            });
        }
    }

    /**
     * Check that the given array of objects have unique item ids and
     * that each object is a valid entity.
     * @param obj An array of objects to check.
     * @throws {CatalogError} if the array contains invalid entities or duplicate ids.
     */
    private _assertIsUniqueItemArray(
        obj: unknown[],
    ): asserts obj is T[] {
        const ids = new Set<string>();
        obj.forEach((o) => {
            const item = this._validateItem(o);
            if (ids.has(item.id)) {
                throw new CatalogError({
                    message: `Duplicate item id: ${item.id}`,
                    type: 'INVALID_CONTENTS',
                });
            }
            ids.add(item.id);
        });
    }
}
