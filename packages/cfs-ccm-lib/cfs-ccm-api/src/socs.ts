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
import type {
    AccessTag,
    CreateInputBoard,
    CreateInputCore,
    CreateInputFamily,
    CreateInputPackage,
    Documentation,
    Media,
    SoC,
} from './rest-types.js';

export class Socs {
    public readonly TAG = 'soc';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        accessTag,
        boards,
        cfsVersionConstraint,
        cores,
        description,
        documentation,
        family,
        id,
        media,
        name,
        packages,
        supportsMCUboot,
    }: {
        accessTag?: AccessTag;
        boards?: CreateInputBoard[];
        /**
         * Format: semver_constraint
         * @example >=1.0.0, <2.0.0
         */
        cfsVersionConstraint?: string;
        cores: CreateInputCore[];
        description: string;
        documentation?: Documentation[];
        family: CreateInputFamily;
        id?: string;
        media?: Media[];
        name: string;
        packages?: CreateInputPackage[];
        supportsMCUboot?: boolean;
    }): Promise<SoC> {
        const { data, error, response } = await this.apiClient.POST(
            '/socs',
            {
                body: {
                    accessTag,
                    boards,
                    cfsVersionConstraint,
                    cores,
                    description,
                    documentation,
                    family,
                    id,
                    media,
                    name,
                    packages,
                    supportsMCUboot,
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

    async delete({ socID }: { socID: string }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
            '/socs/{socID}',
            {
                params: {
                    path: {
                        socID,
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
        id: socID,
    }: {
        cfsVersion?: string;
        id: string;
    }): Promise<SoC> {
        const { data, error, response } = await this.apiClient.GET(
            '/socs/{socID}',
            {
                params: {
                    path: {
                        socID,
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
    } = {}): AsyncGenerator<SoC[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error, response } =
                await this.apiClient.GET('/socs', {
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
    } = {}): Promise<SoC[]> {
        const results: SoC[] = [];
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

    async update({
        socID,
        accessTag,
        cfsVersionConstraint,
        description,
        documentation,
        media,
        name,
        supportsMCUboot,
    }: {
        socID: string;
        accessTag?: AccessTag;
        /**
         * Format: semver_constraint
         * @example >=1.0.0, <2.0.0
         */
        cfsVersionConstraint?: string;
        description?: string;
        documentation?: Documentation[];
        media?: Media[];
        name?: string;
        supportsMCUboot?: boolean | null;
    }): Promise<void> {
        const { error, response } = await this.apiClient.PATCH(
            '/socs/{socID}',
            {
                params: {
                    path: {
                        socID,
                    },
                },
                body: {
                    accessTag,
                    cfsVersionConstraint,
                    description,
                    documentation,
                    media,
                    name,
                    supportsMCUboot,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }
}
