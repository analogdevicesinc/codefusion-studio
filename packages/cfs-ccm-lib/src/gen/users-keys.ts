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
import { APIKey } from './rest-types.js';

export class UsersKeys {
    public readonly TAG = 'apikey';

    /**
     *
     * @param apiClient
     */
    constructor(private readonly apiClient: OpenApiClient) {}

    /**
     *
     * @param args0
     * @param args0.description
     * @param args0.readTags
     * @param args0.role
     * @param args0.writeTags
     * @returns
     */
    async create({
        description,
        readTags,
        role,
        writeTags,
    }: {
        description?: string;
        readTags?: string[];
        role?: 'user' | 'admin';
        writeTags?: string[];
    }): Promise<APIKey> {
        const { data, error } = await this.apiClient.POST(
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
     * @param args0.appKey
     */
    async delete({ appKey }: { appKey: string }): Promise<void> {
        const { error } = await this.apiClient.DELETE(
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
            throw new Error(error.message);
        }
    }

    /**
     *
     * @param args0
     * @param args0.userID
     */
    async *list({
        userID,
    }: {
        userID?: string;
    }): AsyncGenerator<APIKey[]> {
        const { data, error } = await this.apiClient.GET(
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
            throw new Error(error.message);
        }

        if (data.items) {
            yield data.items;
        } else {
            throw new Error('Unhandled exception');
        }
    }
}
