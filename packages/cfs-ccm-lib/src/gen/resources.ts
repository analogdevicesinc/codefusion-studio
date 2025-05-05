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
import { AccessTag, Resource } from './rest-types.js';

export class Resources {
    public readonly TAG = 'resource';

    /**
     *
     * @param apiClient
     */
    constructor(private readonly apiClient: OpenApiClient) {}

    /**
     *
     * @param args0
     * @param args0.accessTag
     * @param args0.mediaType
     * @param args0.name
     * @param args0.thumbnail
     * @param args0.url
     * @returns
     */
    async create({
        accessTag,
        mediaType,
        name,
        thumbnail,
        url,
    }: {
        accessTag?: AccessTag;
        mediaType: 'article' | 'video' | 'tutorial';
        name: string;
        thumbnail?: string;
        url: string;
    }): Promise<Resource> {
        const { data, error } = await this.apiClient.POST(
            '/resources',
            {
                body: {
                    accessTag,
                    mediaType,
                    name,
                    thumbnail,
                    url,
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
     * @param args0.resourceID
     */
    async delete({
        resourceID,
    }: {
        resourceID: string;
    }): Promise<void> {
        const { error } = await this.apiClient.DELETE(
            '/resources/{resourceID}',
            {
                params: {
                    path: {
                        resourceID,
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
     * @param args0.id
     * @returns
     */
    async get({ id: resourceID }: { id: string }): Promise<Resource> {
        const { data, error } = await this.apiClient.GET(
            '/resources/{resourceID}',
            {
                params: {
                    path: {
                        resourceID,
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
    async getAll(): Promise<Resource[]> {
        const results: Resource[] = [];
        for await (const items of this.list()) {
            results.push(...items);
        }

        return results;
    }

    /**
     *
     */
    async *list(): AsyncGenerator<Resource[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error } = await this.apiClient.GET(
                '/resources',
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

    /**
     *
     * @param args0
     * @param args0.resourceID
     * @param args0.accessTag
     * @param args0.mediaType
     * @param args0.name
     * @param args0.thumbnail
     * @param args0.url
     */
    async update({
        resourceID,
        accessTag,
        mediaType,
        name,
        thumbnail,
        url,
    }: {
        resourceID: string;
        accessTag?: AccessTag;
        mediaType: 'article' | 'video' | 'tutorial';
        name: string;
        thumbnail?: string;
        url: string;
    }): Promise<void> {
        const { error } = await this.apiClient.PUT(
            '/resources/{resourceID}',
            {
                params: {
                    path: {
                        resourceID,
                    },
                },
                body: {
                    accessTag,
                    mediaType,
                    name,
                    thumbnail,
                    url,
                },
            },
        );

        if (error) {
            throw new Error(error.message);
        }
    }
}
