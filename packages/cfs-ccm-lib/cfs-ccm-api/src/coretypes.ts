/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

/* This file is generated automatically ! Manual edits will be overwritten */

import type { OpenApiClient } from './openapi-client.js';
import type { CoreType } from './rest-types.js';

export class Coretypes {
    public readonly TAG = 'coretype';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        architecture,
        description,
        id,
        isa,
    }: {
        architecture: string;
        description?: string;
        id?: string;
        isa: string;
    }): Promise<CoreType> {
        const { data, error, response } = await this.apiClient.POST(
            '/coretypes',
            {
                body: {
                    architecture,
                    description,
                    id,
                    isa,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }

        if (data.item) {
            return data.item;
        } else {
            throw new Error(
                'Unexpected response: missing item field',
                { cause: response },
            );
        }
    }

    async delete({
        coreTypeID,
    }: {
        coreTypeID: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
            '/coretypes/{coreTypeID}',
            {
                params: {
                    path: {
                        coreTypeID,
                    },
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }

    async get({ id: coreTypeID }: { id: string }): Promise<CoreType> {
        const { data, error, response } = await this.apiClient.GET(
            '/coretypes/{coreTypeID}',
            {
                params: {
                    path: {
                        coreTypeID,
                    },
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }

        if (data.item) {
            return data.item;
        } else {
            throw new Error(
                'Unexpected response: missing item field',
                { cause: response },
            );
        }
    }

    async *list(): AsyncGenerator<CoreType[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error, response } =
                await this.apiClient.GET('/coretypes', {
                    params: {
                        query: {
                            continue: continuationToken,
                        },
                    },
                });

            if (error) {
                throw new Error(error.message, { cause: response });
            }

            if (data.items) {
                yield data.items;
            } else {
                throw new Error(
                    'Unexpected response: missing items field',
                    { cause: response },
                );
            }

            continuationToken = data.continuationToken;
        } while (continuationToken);
    }

    async getAll(): Promise<CoreType[]> {
        const results: CoreType[] = [];
        const seenIDs = new Set<string>();
        for await (const items of this.list()) {
            for (const item of items) {
                if (seenIDs.has(item.id)) {
                    continue;
                }
                seenIDs.add(item.id);
                results.push(item);
            }
        }

        return results;
    }

    async update({
        coreTypeID,
        architecture,
        description,
        isa,
    }: {
        coreTypeID: string;
        architecture?: string;
        description?: string;
        isa?: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.PATCH(
            '/coretypes/{coreTypeID}',
            {
                params: {
                    path: {
                        coreTypeID,
                    },
                },
                body: {
                    architecture,
                    description,
                    isa,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }
}
