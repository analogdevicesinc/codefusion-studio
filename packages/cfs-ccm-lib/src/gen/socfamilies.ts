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

/* This file is generated automatically ! Manual edits will be overwritten */

import { OpenApiClient } from '../sdk/openapi-client.js';
import { SoCFamily } from './rest-types.js';

export class Socfamilies {
    public readonly TAG = 'socfamily';

    /**
     *
     * @param apiClient
     */
    constructor(private readonly apiClient: OpenApiClient) {}

    /**
     *
     * @param args0
     * @param args0.name
     * @returns
     */
    async create({ name }: { name: string }): Promise<SoCFamily> {
        const { data, error } = await this.apiClient.POST(
            '/socfamilies',
            {
                body: {
                    name,
                },
            },
        );

        if (error) {
            throw new Error(error.message);
        }

        if (data.item) {
            return data.item;
        } else {
            throw new Error('Unhandled exception');
        }
    }

    /**
     *
     * @param args0
     * @param args0.id
     * @returns
     */
    async get({
        id: socFamilyID,
    }: {
        id: string;
    }): Promise<SoCFamily> {
        const { data, error } = await this.apiClient.GET(
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
            throw new Error(error.message);
        }

        if (data.item) {
            return data.item;
        } else {
            throw new Error('Unhandled exception');
        }
    }

    /**
     *
     * @returns
     */
    async getAll(): Promise<SoCFamily[]> {
        const results: SoCFamily[] = [];
        for await (const items of this.list()) {
            results.push(...items);
        }

        return results;
    }

    /**
     *
     */
    async *list(): AsyncGenerator<SoCFamily[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error } = await this.apiClient.GET(
                '/socfamilies',
                {
                    params: {
                        query: {
                            continue: continuationToken,
                        },
                    },
                },
            );

            if (error) {
                throw new Error(error.message);
            }

            if (data.items) {
                yield data.items;
            } else {
                throw new Error('Unhandled exception');
            }

            continuationToken = data.continuationToken;
        } while (continuationToken);
    }
}
