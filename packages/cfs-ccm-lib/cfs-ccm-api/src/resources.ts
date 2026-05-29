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
import type { AccessTag, Resource } from './rest-types.js';

export class Resources {
    public readonly TAG = 'resource';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        accessTag,
        cfsVersionConstraint,
        id,
        mediaType,
        name,
        thumbnail,
        url,
    }: {
        accessTag?: AccessTag;
        /**
         * Format: semver_constraint
         * @example >=1.0.0, <2.0.0
         */
        cfsVersionConstraint?: string;
        id?: string;
        mediaType: 'article' | 'video' | 'tutorial';
        name: string;
        thumbnail?: string;
        url: string;
    }): Promise<Resource> {
        const { data, error, response } = await this.apiClient.POST(
            '/resources',
            {
                body: {
                    accessTag,
                    cfsVersionConstraint,
                    id,
                    mediaType,
                    name,
                    thumbnail,
                    url,
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
        resourceID,
    }: {
        resourceID: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
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
            throw new Error(error.message, { cause: response });
        }
    }

    async get({
        cfsVersion,
        id: resourceID,
    }: {
        cfsVersion?: string;
        id: string;
    }): Promise<Resource> {
        const { data, error, response } = await this.apiClient.GET(
            '/resources/{resourceID}',
            {
                params: {
                    path: {
                        resourceID,
                    },
                    query: {
                        cfsVersion,
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
        cfsVersion,
    }: {
        cfsVersion?: string;
    } = {}): AsyncGenerator<Resource[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error, response } =
                await this.apiClient.GET('/resources', {
                    params: {
                        query: {
                            cfsVersion,
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

    async getAll({
        cfsVersion,
    }: {
        cfsVersion?: string;
    } = {}): Promise<Resource[]> {
        const results: Resource[] = [];
        const seenIDs = new Set<string>();
        for await (const items of this.list({ cfsVersion })) {
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

    async replace({
        resourceID,
        accessTag,
        cfsVersionConstraint,
        mediaType,
        name,
        thumbnail,
        url,
    }: {
        resourceID: string;
        accessTag?: AccessTag;
        /**
         * Format: semver_constraint
         * @example >=1.0.0, <2.0.0
         */
        cfsVersionConstraint?: string;
        mediaType: 'article' | 'video' | 'tutorial';
        name: string;
        thumbnail?: string;
        url: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.PUT(
            '/resources/{resourceID}',
            {
                params: {
                    path: {
                        resourceID,
                    },
                },
                body: {
                    accessTag,
                    cfsVersionConstraint,
                    mediaType,
                    name,
                    thumbnail,
                    url,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }
}
