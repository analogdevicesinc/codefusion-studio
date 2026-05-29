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
import type { AccessTag, Board } from './rest-types.js';

export class SocsBoards {
    public readonly TAG = 'board';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        socID,
        accessTag,
        cfsVersionConstraint,
        description,
        id,
        name,
        packageIDs,
        productUrl,
    }: {
        socID: string;
        accessTag?: AccessTag;
        /**
         * Format: semver_constraint
         * @example >=1.0.0, <2.0.0
         */
        cfsVersionConstraint?: string;
        description: string;
        id?: string;
        name: string;
        packageIDs: string[];
        productUrl?: string;
    }): Promise<Board> {
        const { data, error, response } = await this.apiClient.POST(
            '/socs/{socID}/boards',
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
                    id,
                    name,
                    packageIDs,
                    productUrl,
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
        boardID,
        socID,
    }: {
        boardID: string;
        socID: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
            '/socs/{socID}/boards/{boardID}',
            {
                params: {
                    path: {
                        boardID,
                        socID,
                    },
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }

    async update({
        boardID,
        socID,
        accessTag,
        cfsVersionConstraint,
        description,
        name,
        packageIDs,
        productUrl,
    }: {
        boardID: string;
        socID: string;
        accessTag?: AccessTag;
        cfsVersionConstraint?: string | null;
        description?: string;
        name?: string;
        packageIDs?: string[];
        productUrl?: string | null;
    }): Promise<void> {
        const { error, response } = await this.apiClient.PATCH(
            '/socs/{socID}/boards/{boardID}',
            {
                params: {
                    path: {
                        boardID,
                        socID,
                    },
                },
                body: {
                    accessTag,
                    cfsVersionConstraint,
                    description,
                    name,
                    packageIDs,
                    productUrl,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }
}
