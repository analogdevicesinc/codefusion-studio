/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import type { AccessTag, SWPackageTag } from './rest-types.js';

export class SwPackagesTags {
    public readonly TAG = 'swpackagetag';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        accessTag,
        description,
        packageTag,
        repoUrl,
    }: {
        accessTag: AccessTag;
        description?: string;
        packageTag: string;
        repoUrl: string;
    }): Promise<SWPackageTag> {
        const { data, error, response } = await this.apiClient.POST(
            '/sw/packages/tags',
            {
                body: {
                    accessTag,
                    description,
                    packageTag,
                    repoUrl,
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

    async delete({ tagID }: { tagID: string }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
            '/sw/packages/tags/{tagID}',
            {
                params: {
                    path: {
                        tagID,
                    },
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }

    async *list(): AsyncGenerator<SWPackageTag[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error, response } =
                await this.apiClient.GET('/sw/packages/tags', {
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

    async getAll(): Promise<SWPackageTag[]> {
        const results: SWPackageTag[] = [];
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
        tagID,
        accessTag,
        description,
        packageTag,
    }: {
        tagID: string;
        accessTag?: AccessTag;
        description?: string;
        packageTag?: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.PATCH(
            '/sw/packages/tags/{tagID}',
            {
                params: {
                    path: {
                        tagID,
                    },
                },
                body: {
                    accessTag,
                    description,
                    packageTag,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }
}
