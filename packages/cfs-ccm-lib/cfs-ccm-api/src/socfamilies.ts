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
import type { SoCFamily } from './rest-types.js';

export class Socfamilies {
    public readonly TAG = 'socfamily';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        id,
        name,
    }: {
        id?: string;
        name: string;
    }): Promise<SoCFamily> {
        const { data, error, response } = await this.apiClient.POST(
            '/socfamilies',
            {
                body: {
                    id,
                    name,
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
        socFamilyID,
    }: {
        socFamilyID: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
            '/socfamilies/{socFamilyID}',
            {
                params: {
                    path: {
                        socFamilyID,
                    },
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }

    async get({
        id: socFamilyID,
    }: {
        id: string;
    }): Promise<SoCFamily> {
        const { data, error, response } = await this.apiClient.GET(
            '/socfamilies/{socFamilyID}',
            {
                params: {
                    path: {
                        socFamilyID,
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

    async *list(): AsyncGenerator<SoCFamily[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error, response } =
                await this.apiClient.GET('/socfamilies', {
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

    async getAll(): Promise<SoCFamily[]> {
        const results: SoCFamily[] = [];
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
        socFamilyID,
        name,
    }: {
        socFamilyID: string;
        name?: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.PATCH(
            '/socfamilies/{socFamilyID}',
            {
                params: {
                    path: {
                        socFamilyID,
                    },
                },
                body: {
                    name,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }
}
