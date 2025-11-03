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
import { LIB_VERSION } from '../config/constants.cjs';
import {
    AccessTag,
    CreateInputBoard,
    CreateInputCore,
    CreateInputFamily,
    CreateInputPackage,
    Documentation,
    Media,
    SoC,
    SoCSummary,
} from './rest-types.js';

export class Socs {
    public readonly TAG = 'soc';

    /**
     *
     * @param apiClient
     */
    constructor(private readonly apiClient: OpenApiClient) {}

    /**
     *
     * @param args0
     * @param args0.accessTag
     * @param args0.boards
     * @param args0.cores
     * @param args0.description
     * @param args0.documentation
     * @param args0.family
     * @param args0.media
     * @param args0.name
     * @param args0.packages
     * @returns
     */
    async create({
        accessTag,
        boards,
        cores,
        description,
        documentation,
        family,
        media,
        name,
        packages,
    }: {
        accessTag?: AccessTag;
        boards?: CreateInputBoard[];
        cores: CreateInputCore[];
        description: string;
        documentation?: Documentation[];
        family: CreateInputFamily;
        media?: Media[];
        name: string;
        packages?: CreateInputPackage[];
    }): Promise<SoC> {
        const { data, error } = await this.apiClient.POST('/socs', {
            body: {
                accessTag,
                boards,
                cores,
                description,
                documentation,
                family,
                media,
                name,
                packages,
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
     * @param args0.id
     * @returns
     */
    async get({ id: socID }: { id: string }): Promise<SoC> {
        const { data, error } = await this.apiClient.GET(
            '/socs/{socID}',
            {
                params: {
                    path: {
                        socID,
                    },
                    query: {
                        cfsVersion: LIB_VERSION,
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
    async getAll(): Promise<SoC[]> {
        const results: Promise<SoC>[] = [];
        for await (const items of this.list()) {
            for (const item of items) {
                results.push(this.get(item));
            }
        }

        return Promise.all(results);
    }

    /**
     *
     */
    async *list(): AsyncGenerator<SoCSummary[]> {
        let continuationToken: string | undefined;
        do {
            const { data, error } = await this.apiClient.GET(
                '/socs',
                {
                    params: {
                        query: {
                            cfsVersion: LIB_VERSION,
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
}
