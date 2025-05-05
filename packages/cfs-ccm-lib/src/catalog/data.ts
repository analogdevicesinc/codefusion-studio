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

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { promises as fs, existsSync } from 'node:fs';
import { z } from 'zod';
import _ from 'lodash';
import path from 'node:path';

import { DataStore, DataStoreError, StoreItem } from './types.js';

/**
 * Data structure for store data file.
 * @internal
 */
type StoreDB<ItemTag extends string> = {
    [key in ItemTag]: StoreItem[];
} & {
    metadata?: Record<string, unknown>;
};

/** Data store zod object @internal */
const zStoreItem = z
    .object({
        id: z
            .string()
            .min(1, { message: 'ID must be a non-empty string' }),
    })
    .passthrough(); // Allow additional properties

/**
 * Represents an implementation of the {@link DataStore} interface using LowDB.
 * Stores items from a CFS catalog as {@link StoreItem} objects in a local JSON file.
 * @internal
 */
export class LowDBDataStore<ItemTag extends string>
    implements DataStore
{
    public readonly DB_FILE_NAME: string;
    private readonly dbPath: string;
    private readonly dbPromise: Promise<Low<StoreDB<ItemTag>>>;

    /**
     * Initializes the local storage database with the given storage directory
     * - If DB_FILE_NAME is present in the directory, it will be used as the database store file.
     * - If DB_FILE_NAME is not present, it will be created.
     * @param storageDir The directory where the database file is stored, or where it will be created if it doesn't exist.
     * @param itemTag The tag to use to identify the type of stored objects.
     */
    public constructor(
        storageDir: string,
        public readonly itemTag: ItemTag,
    ) {
        this.DB_FILE_NAME = `lowdb-${itemTag}-data.json`;
        this.dbPath = path.resolve(storageDir, this.DB_FILE_NAME);
        this.dbPromise = this._loadDB();
    }

    /**
     * Zod schema for the store data file.
     * @returns z.ZodObject<StoreDB<ItemTag>>
     * @internal
     */
    private get zStoreDB() {
        return z.object({
            [this.itemTag]: z.array(zStoreItem),
            metadata: z.record(z.unknown()).optional(),
        });
    }

    /**
     * Closes the data store.
     * @returns A void promise that resolves when the store is closed.
     */
    public async close(): Promise<void> {
        await this._write();
    }

    /**
     * Destroys the data store (purges all items and deletes the database file and storage directory).
     * @returns A void promise that resolves when the store is destroyed.
     */
    public async destroy(): Promise<void> {
        try {
            await this.purge();
        } catch {
            // ignore errors
        }

        try {
            await fs.unlink(this.dbPath);
            await fs.rmdir(path.dirname(this.dbPath));
        } catch (err) {
            throw new DataStoreError({
                message: 'Error destroying database',
                cause: err,
                type: 'IO_ERROR',
            });
        }
    }

    /**
     * Replaces the store with the contents of an incoming data store.
     * @param incoming The incoming data store.
     */
    public async replace(incoming: DataStore): Promise<void> {
        if (incoming.itemTag !== this.itemTag) {
            throw new DataStoreError({
                message:
                    'Incoming data store item tag does not match',
                type: 'INVALID_DATA',
            });
        }
        // cloneDeep to avoid modifications by reference affecting the stored data
        const data: unknown = {
            [this.itemTag]: _.cloneDeep(await incoming.list()),
            metadata: _.cloneDeep(await incoming.getMetadata()),
        };

        // validate the schema of the incoming data
        this._assertIsStoreDB(data);

        const db = await this.dbPromise;
        db.data = data;
        await this._write();
    }

    /**
     * List all items in the data store.
     * @returns A promise that resolves to an array of all objects in the data store.
     */
    public async list(): Promise<StoreItem[]> {
        // return a clone to avoid the caller modifiying the data store by reference
        const db = await this.dbPromise;
        const items = _.cloneDeep(db.data[this.itemTag]);
        this._assertAreStoreItems(items);
        return items;
    }

    /**
     * Checks if the data store is empty.
     * @returns A promise that resolves to a boolean indicating whether the data store is empty.
     */
    public async isEmpty(): Promise<boolean> {
        const db = await this.dbPromise;
        return db.data[this.itemTag].length === 0;
    }

    /**
     * Purges all objects from the data store if it is not empty.
     * @returns A void promise that resolves when the purge is complete.
     */
    public async purge(): Promise<void> {
        if (await this.isEmpty()) {
            return;
        }

        const db = await this.dbPromise;
        db.data = {
            [this.itemTag]: [],
            metadata: undefined,
        } as StoreDB<ItemTag>;
        await this._write();
    }

    /**
     * Retrieves the metadata from the data store if present.
     * @returns A promise that resolves to the metadata, or undefined if none present.
     */
    public async getMetadata(): Promise<
        Record<string, unknown> | undefined
    > {
        const db = await this.dbPromise;
        return _.cloneDeep(db.data.metadata);
    }

    /**
     * Sets the metadata in the data store.
     * @param metadata The metadata to set (or undefined to remove existing metadata).
     * @returns A void promise that resolves when the metadata is set.
     */
    public async setMetadata(
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        const meta = _.cloneDeep(metadata);

        // validate the schema of the incoming metadata
        this._assertIsMetadata(meta);

        const db = await this.dbPromise;
        db.data.metadata = meta;
        await this._write();
    }

    /**
     * Retrieves a specific store item from the data store by its ID.
     * @param id The ID of the item to retrieve.
     * @returns A promise that resolves to the item if found, or undefined if not found.
     */
    public async get(id: string): Promise<StoreItem | undefined> {
        if (await this.isEmpty()) {
            return undefined;
        }

        const db = await this.dbPromise;

        const item = db.data[this.itemTag].find(
            (item) => item.id === id,
        );

        // return a clone to avoid the caller modifiying the data store by reference
        return item ? _.cloneDeep(item) : undefined;
    }

    /**
     * Sets a single store item, or an array of store items, in the data store.
     * For each item, if it already exists (by ID), it will be replaced, otherwise it will be added.
     * @param items - The store item to set, or an array of objects to set.
     * If multiple items with the same ID are passed, the last one will be set.
     * @returns A void promise that resolves when the item is set.
     * @example
     * await store.set({ < item1 parameters > });
     * @example
     * const items = [
     *    { < item1 parameters > },
     *    { < item2 parameters > },
     * ];
     * await store.set(items);
     */
    public async set(items: StoreItem | StoreItem[]): Promise<void> {
        // clone the incoming object so the caller can't modify the stored data by reference
        const data: unknown[] = _.cloneDeep(
            Array.isArray(items) ? items : [items],
        );

        // validate the schema of the incoming data
        this._assertAreStoreItems(data);

        if (data.length > 0) {
            const db = await this.dbPromise;
            data.forEach((newItem) => {
                const idx = db.data[this.itemTag].findIndex(
                    (storedItem) => storedItem.id === newItem.id,
                );
                if (idx >= 0) {
                    db.data[this.itemTag][idx] = newItem;
                } else {
                    db.data[this.itemTag].push(newItem);
                }
            });

            await this._write();
        }
    }

    /**
     * Checks that the database contents are valid and accessible
     * @throws {DataStoreError<'INVALID_DATA'>} if the contents are invalid
     * @throws {DataStoreError<'IO_ERROR'>} if there is an error reading the file
     * @throws {DataStoreError<'UNHANDLED_EXCEPTION'>} if there is an unhandled exception
     */
    public async validate(): Promise<void> {
        void (await this.dbPromise); // throws if db contents are invalid or cannot be read
    }

    /**
     * Loads/creates the database file and returns a LowDB instance.
     * @throws {DataStoreError<'IO_ERROR'>} if there is an error reading the file.
     * @throws {DataStoreError<'INVALID_DATA'>} if the file contents is invalid.
     * @returns A promise that resolves to a LowDB instance.
     * @internal
     */
    private async _loadDB(): Promise<Low<StoreDB<ItemTag>>> {
        const db = new Low(
            new JSONFile<StoreDB<ItemTag>>(this.dbPath),
            {
                [this.itemTag]: [],
                metadata: undefined,
            } as StoreDB<ItemTag>,
        );

        try {
            // if the file exists
            if (existsSync(this.dbPath)) {
                // make sure it's valid JSON
                const file = await fs.readFile(this.dbPath, 'utf-8');
                let json: unknown;
                try {
                    json = JSON.parse(file);
                } catch (err) {
                    throw new DataStoreError({
                        message: 'Invalid JSON in database file',
                        cause: err,
                        type: 'INVALID_DATA',
                    });
                }

                // and check it's contents are valid (will error for incorrect itemTag)
                this._assertIsStoreDB(json);

                // then load it into the db
                await db.read();
            } else {
                // make sure the storage directory exists
                await fs.mkdir(path.dirname(this.dbPath), {
                    recursive: true,
                });
                await db.write(); // create the db file (note: don't call this._write() here)
            }
        } catch (err) {
            if (err instanceof DataStoreError) {
                throw err;
            } else {
                throw new DataStoreError({
                    message: `Error reading from ${this.DB_FILE_NAME}`,
                    cause: err,
                    type: 'IO_ERROR',
                });
            }
        }
        return db;
    }

    /**
     * Wrapper function for this.db.write() allowing for error handling.
     * @throws {DataStoreError<'IO_ERROR'>} if there is an error writing to the file.
     * @internal
     */
    private async _write() {
        try {
            const db = await this.dbPromise;
            await db.write();
        } catch (err) {
            if (err instanceof DataStoreError) {
                throw err;
            } else {
                throw new DataStoreError({
                    message: `Error writing to ${this.DB_FILE_NAME}`,
                    cause: err,
                    type: 'IO_ERROR',
                });
            }
        }
    }

    /**
     * Asserts the passed object is an array of valid data store items.
     * @param items Array of objects to validate.
     * @throws {DataStoreError<'INVALID_DATA'>}
     * @internal
     */
    private _assertAreStoreItems(
        items: unknown[],
    ): asserts items is StoreItem[] {
        try {
            void items.every((item) => zStoreItem.parse(item));
        } catch (err) {
            throw new DataStoreError({
                message: 'Invalid store item schema',
                cause: err,
                type: 'INVALID_DATA',
            });
        }
    }

    /**
     * Asserts the passed object is a valid metadata.
     * @param data The object to validate
     * @throws {DataStoreError<'INVALID_DATA'>}
     * @internal
     */
    private _assertIsMetadata(
        data: unknown,
    ): asserts data is StoreDB<ItemTag>['metadata'] {
        try {
            void this.zStoreDB.shape.metadata.parse(data);
        } catch (err) {
            throw new DataStoreError({
                message: 'Invalid metadata schema',
                cause: err,
                type: 'INVALID_DATA',
            });
        }
    }

    /**
     * Asserts the passed object is a valid data store DB.
     * @param data The object to validate
     * @throws {DataStoreError<'INVALID_DATA'>}
     * @internal
     */
    private _assertIsStoreDB(
        data: unknown,
    ): asserts data is StoreDB<ItemTag> {
        try {
            void this.zStoreDB.parse(data);
        } catch (err) {
            throw new DataStoreError({
                message: 'Invalid database schema',
                cause: err,
                type: 'INVALID_DATA',
            });
        }
    }
}
