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
import { CoreType } from './rest-types.js';

export class Coretypes {
    public readonly TAG = 'coretype';

    /**
     *
     * @param apiClient
     */
    constructor(private readonly apiClient: OpenApiClient) {}

    /**
     *
     * @param args0
     * @param args0.architecture
     * @param args0.description
     * @param args0.isa
     * @returns
     */
    async create({
        architecture,
        description,
        isa,
    }: {
        architecture: string;
        description?: string;
        isa: string;
    }): Promise<CoreType> {
        const { data, error } = await this.apiClient.POST(
            '/coretypes',
            {
                body: {
                    architecture,
                    description,
                    isa,
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
    async get({ id: coreTypeID }: { id: string }): Promise<CoreType> {
        const { data, error } = await this.apiClient.GET(
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
    async getAll(): Promise<CoreType[]> {
        const results: CoreType[] = [];
        for await (const items of this.list()) {
            results.push(...items);
        }

        return results;
    }

    /**
     *
     */
    async *list(): AsyncGenerator<CoreType[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error } = await this.apiClient.GET(
                '/coretypes',
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
