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

import type { DataStore, StoreItem } from '../catalog/types.js';
import { SWPackageCatalog } from '../sdk/sw/swpackage-catalog.js';

import { getSWPackageDataset } from './datasets/swpackages.js';
import type { SWPackageDataset } from './datasets/swpackages.js';
import type { SWPackage } from 'cfs-ccm-api/rest-types';

import path from 'node:path';

/** In-memory catalog storage used by the populated mock catalog factory. */
class InMemoryDataStore implements DataStore {
    public readonly itemTag: string;
    private data: Map<string, StoreItem>;
    private metadata?: Record<string, unknown>;

    public constructor(
        directory: string,
        itemTag: string,
        initialData: StoreItem[],
    ) {
        this.itemTag = itemTag;
        this.data = directory.endsWith(`${path.sep}A`)
            ? new Map(initialData.map((item) => [item.id, item]))
            : new Map();
    }

    /**
     * Stores one or more catalog items by ID.
     * @param input Catalog item or items to store.
     */
    public async set(input: StoreItem | StoreItem[]): Promise<void> {
        for (const item of Array.isArray(input) ? input : [input]) {
            this.data.set(item.id, item);
        }
    }

    /**
     * Retrieves a catalog item by ID.
     * @param id ID of the item to retrieve.
     * @returns The matching item, if present.
     */
    public async get(id: string): Promise<StoreItem | undefined> {
        return this.data.get(id);
    }

    /**
     * Returns catalog metadata, if metadata has been stored.
     * @returns The stored metadata, if present.
     */
    public async getMetadata(): Promise<
        Record<string, unknown> | undefined
    > {
        return this.metadata;
    }

    /**
     * Stores catalog metadata.
     * @param metadata Metadata to store.
     */
    public async setMetadata(
        metadata?: Record<string, unknown>,
    ): Promise<void> {
        this.metadata = metadata;
    }

    /**
     * Returns all stored catalog items.
     * @returns All items currently stored.
     */
    public async list(): Promise<StoreItem[]> {
        return [...this.data.values()];
    }

    /**
     * Indicates whether the store contains no items.
     * @returns True when the store is empty.
     */
    public async isEmpty(): Promise<boolean> {
        return this.data.size === 0;
    }

    /** Removes all items and metadata from the store. */
    public async purge(): Promise<void> {
        this.data.clear();
        this.metadata = undefined;
    }

    /**
     * Replaces this store's contents with those from another store.
     * @param incoming Store whose contents should be copied.
     */
    public async replace(incoming: DataStore): Promise<void> {
        this.data = new Map(
            (await incoming.list()).map((item) => [item.id, item]),
        );
        this.metadata = await incoming.getMetadata();
    }

    /** Closes the in-memory store. */
    public async close(): Promise<void> {}

    /** Destroys the in-memory store. */
    public async destroy(): Promise<void> {}

    /** Validates the in-memory store. */
    public async validate(): Promise<void> {}
}

/**
 * Creates an offline catalog populated from the selected mock dataset.
 * @param options Catalog mock options.
 * @param options.dataset Named dataset or explicit SW package data to load.
 * @returns A populated offline SW package catalog.
 */
export function createSWPackageCatalogMock({
    dataset = 'default',
}: SWPackageCatalogMockOptions = {}): SWPackageCatalog {
    const selectedDataset = Array.isArray(dataset)
        ? structuredClone(dataset)
        : getSWPackageDataset(dataset);
    const storage = class extends InMemoryDataStore {
        public constructor(
            storageDirectory: string,
            itemTag: string,
        ) {
            super(storageDirectory, itemTag, selectedDataset);
        }
    };
    return new SWPackageCatalog({
        directory: 'swpackage-catalog-mock',
        storage,
    });
}

/** Options for creating a populated software package catalog. */
export interface SWPackageCatalogMockOptions {
    /** Named dataset or explicit SW package data to load into the catalog. */
    dataset?: SWPackageDataset | SWPackage[];
}
