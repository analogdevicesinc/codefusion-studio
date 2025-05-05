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
import { User } from './rest-types.js';

export class Users {
    public readonly TAG = 'user';

    /**
     *
     * @param apiClient
     */
    constructor(private readonly apiClient: OpenApiClient) {}

    /**
     *
     * @param args0
     * @param args0.email
     * @param args0.readTags
     * @param args0.userType
     * @param args0.writeTags
     * @returns
     */
    async create({
        email,
        readTags,
        userType,
        writeTags,
    }: {
        email: string;
        readTags?: string[];
        userType: 'user' | 'admin';
        writeTags?: string[];
    }): Promise<User> {
        const { data, error } = await this.apiClient.POST('/users', {
            body: {
                email,
                readTags,
                userType,
                writeTags,
            },
        });

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
     * @param args0.userID
     */
    async delete({ userID }: { userID: string }): Promise<void> {
        const { error } = await this.apiClient.DELETE(
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
            throw new Error(error.message);
        }
    }

    /**
     *
     */
    async *list(): AsyncGenerator<User[]> {
        const { data, error } = await this.apiClient.GET('/users');

        if (error) {
            throw new Error(error.message);
        }

        if (data.items) {
            yield data.items;
        } else {
            throw new Error('Unhandled exception');
        }
    }

    /**
     *
     * @param args0
     * @param args0.userID
     * @param args0.readTags
     * @param args0.userType
     * @param args0.writeTags
     */
    async update({
        userID,
        readTags,
        userType,
        writeTags,
    }: {
        userID: string;
        readTags?: string[];
        userType?: 'user' | 'admin';
        writeTags?: string[];
    }): Promise<void> {
        const { error } = await this.apiClient.PUT(
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
            throw new Error(error.message);
        }
    }
}
