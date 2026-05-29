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
import type { APIKey } from './rest-types.js';

export class UsersKeys {
    public readonly TAG = 'apikey';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        description,
        readTags,
        role,
        writeTags,
    }: {
        description?: string;
        readTags: string[];
        role: 'user' | 'admin';
        writeTags: string[];
    }): Promise<APIKey> {
        const { data, error, response } = await this.apiClient.POST(
            '/users/keys',
            {
                body: {
                    description,
                    readTags,
                    role,
                    writeTags,
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

    async delete({ appKey }: { appKey: string }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
            '/users/keys/{appKey}',
            {
                params: {
                    path: {
                        appKey,
                    },
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }

    async *list({
        userID,
    }: {
        userID?: string;
    } = {}): AsyncGenerator<APIKey[]> {
        const { data, error, response } = await this.apiClient.GET(
            '/users/keys',
            {
                params: {
                    query: {
                        userID,
                    },
                },
            },
        );

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
    }

    async getAll({
        userID,
    }: {
        userID?: string;
    } = {}): Promise<APIKey[]> {
        const results: APIKey[] = [];
        for await (const items of this.list({ userID })) {
            results.push(...items);
        }

        return results;
    }
}
