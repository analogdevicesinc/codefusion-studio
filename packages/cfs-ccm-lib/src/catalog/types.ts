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

import { CfsCcmError } from '../error/error.js';

/**
 * Local data store for CFS catalogs.
 * This interface is used to abstract the storage mechanism for catalogs used in CFS.
 * @internal
 */
export interface DataStore {
    readonly itemTag: string;
    set: (input: StoreItem | StoreItem[]) => Promise<void>;
    get: (id: string) => Promise<StoreItem | undefined>;
    getMetadata: () => Promise<Record<string, unknown> | undefined>;
    setMetadata: (
        metadata?: Record<string, unknown>,
    ) => Promise<void>;
    list: () => Promise<StoreItem[]>;
    isEmpty: () => Promise<boolean>;
    purge: () => Promise<void>;
    replace: (incoming: DataStore) => Promise<void>;
    close: () => Promise<void>;
    destroy: () => Promise<void>;
    validate: () => Promise<void>;
}

/** Data store object @internal */
export type StoreItem = {
    id: string;
    [key: string]: unknown;
};

/**
 * Custom error class for catalog errors.
 * @internal
 */
type CatalogErrorType =
    | 'PERSISTENCE_ERROR'
    | 'SERVICE_ERROR'
    | 'INVALID_CONTENTS'
    | 'INVALID_DATA'
    | 'UNHANDLED_EXCEPTION';

export class CatalogError extends CfsCcmError<CatalogErrorType> {}

type DataStoreErrorType =
    | 'IO_ERROR'
    | 'INVALID_DATA'
    | 'UNHANDLED_EXCEPTION';

export class DataStoreError extends CfsCcmError<DataStoreErrorType> {}
