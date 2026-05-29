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
import type { User } from './rest-types.js';

export class Users {
    public readonly TAG = 'user';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        email,
        readTags,
        userType,
        writeTags,
    }: {
        email: string;
        readTags: string[];
        userType: 'user' | 'admin';
        writeTags: string[];
    }): Promise<User> {
        const { data, error, response } = await this.apiClient.POST(
            '/users',
            {
                body: {
                    email,
                    readTags,
                    userType,
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

    async delete({ userID }: { userID: string }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
            '/users/{userID}',
            {
                params: {
                    path: {
                        userID,
                    },
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }

    async get({
        stored,
        id: userID,
    }: {
        stored?: boolean;
        id: string;
    }): Promise<User> {
        const { data, error, response } = await this.apiClient.GET(
            '/users/{userID}',
            {
                params: {
                    path: {
                        userID,
                    },
                    query: {
                        stored,
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

    async *list({
        stored,
    }: {
        stored?: boolean;
    } = {}): AsyncGenerator<User[]> {
        const { data, error, response } = await this.apiClient.GET(
            '/users',
            {
                params: {
                    query: {
                        stored,
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
        stored,
    }: {
        stored?: boolean;
    } = {}): Promise<User[]> {
        const results: User[] = [];
        for await (const items of this.list({ stored })) {
            results.push(...items);
        }

        return results;
    }

    async replace({
        userID,
        readTags,
        userType,
        writeTags,
    }: {
        userID: string;
        readTags: string[];
        userType: 'user' | 'admin';
        writeTags: string[];
    }): Promise<void> {
        const { error, response } = await this.apiClient.PUT(
            '/users/{userID}',
            {
                params: {
                    path: {
                        userID,
                    },
                },
                body: {
                    readTags,
                    userType,
                    writeTags,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }
}
