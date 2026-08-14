/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import type {
    AccessTag,
    SWPackageRepoMetadata,
} from './rest-types.js';

export class SwPackagesReposMetadata {
    public readonly TAG = 'swpackagerepometadata';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        accessTag,
        authRequired,
        disabledByDefault,
        packageFormat,
        repoDescription,
        repoName,
        repoUrl,
    }: {
        accessTag: AccessTag;
        authRequired?: boolean;
        disabledByDefault?: boolean;
        packageFormat?: string;
        repoDescription?: string;
        repoName?: string;
        repoUrl: string;
    }): Promise<SWPackageRepoMetadata> {
        const { data, error, response } = await this.apiClient.POST(
            '/sw/packages/repos/metadata',
            {
                body: {
                    accessTag,
                    authRequired,
                    disabledByDefault,
                    packageFormat,
                    repoDescription,
                    repoName,
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

    async delete({
        metadataID,
    }: {
        metadataID: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
            '/sw/packages/repos/metadata/{metadataID}',
            {
                params: {
                    path: {
                        metadataID,
                    },
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }

    async *list(): AsyncGenerator<SWPackageRepoMetadata[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error, response } =
                await this.apiClient.GET(
                    '/sw/packages/repos/metadata',
                    {
                        params: {
                            query: {
                                continue: continuationToken,
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

            continuationToken = data.continuationToken;
        } while (continuationToken);
    }

    async getAll(): Promise<SWPackageRepoMetadata[]> {
        const results: SWPackageRepoMetadata[] = [];
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
        metadataID,
        accessTag,
        authRequired,
        disabledByDefault,
        packageFormat,
        repoDescription,
        repoName,
    }: {
        metadataID: string;
        accessTag?: AccessTag;
        authRequired?: boolean;
        disabledByDefault?: boolean;
        packageFormat?: string | null;
        repoDescription?: string | null;
        repoName?: string | null;
    }): Promise<void> {
        const { error, response } = await this.apiClient.PATCH(
            '/sw/packages/repos/metadata/{metadataID}',
            {
                params: {
                    path: {
                        metadataID,
                    },
                },
                body: {
                    accessTag,
                    authRequired,
                    disabledByDefault,
                    packageFormat,
                    repoDescription,
                    repoName,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }
}
