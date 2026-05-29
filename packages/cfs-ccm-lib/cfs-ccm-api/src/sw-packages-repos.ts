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
import type { SWPackageRepo } from './rest-types.js';

export class SwPackagesRepos {
    public readonly TAG = 'swpackagerepo';

    constructor(private readonly apiClient: OpenApiClient) {}

    async *list(): AsyncGenerator<SWPackageRepo[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error, response } =
                await this.apiClient.GET('/sw/packages/repos', {
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

    async getAll(): Promise<SWPackageRepo[]> {
        const results: SWPackageRepo[] = [];
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
}
