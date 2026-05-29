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
    CorePart,
    CreateInputCoreType,
    UpdateCoreType,
} from './rest-types.js';

export class SocsCores {
    public readonly TAG = 'corepart';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        socID,
        accessTag,
        cfsVersionConstraint,
        coreType,
        dataModelCoreID,
        description,
        extensions,
        id,
        name,
        primary,
        supportsAI,
        supportsTrustZone,
    }: {
        socID: string;
        accessTag?: AccessTag;
        cfsVersionConstraint?: string;
        coreType: CreateInputCoreType;
        dataModelCoreID: string;
        description?: string;
        extensions: string[];
        id?: string;
        name: string;
        primary?: boolean;
        supportsAI?: boolean;
        supportsTrustZone?: boolean;
    }): Promise<CorePart> {
        const { data, error, response } = await this.apiClient.POST(
            '/socs/{socID}/cores',
            {
                params: {
                    path: {
                        socID,
                    },
                },
                body: {
                    accessTag,
                    cfsVersionConstraint,
                    coreType,
                    dataModelCoreID,
                    description,
                    extensions,
                    id,
                    name,
                    primary,
                    supportsAI,
                    supportsTrustZone,
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
        coreID,
        socID,
    }: {
        coreID: string;
        socID: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
            '/socs/{socID}/cores/{coreID}',
            {
                params: {
                    path: {
                        coreID,
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
        coreID,
        socID,
        accessTag,
        cfsVersionConstraint,
        coreType,
        dataModelCoreID,
        description,
        extensions,
        name,
        primary,
        supportsAI,
        supportsTrustZone,
    }: {
        coreID: string;
        socID: string;
        accessTag?: AccessTag;
        cfsVersionConstraint?: string | null;
        coreType?: UpdateCoreType;
        dataModelCoreID?: string;
        description?: string;
        extensions?: string[];
        name?: string;
        primary?: boolean;
        supportsAI?: boolean | null;
        supportsTrustZone?: boolean | null;
    }): Promise<void> {
        const { error, response } = await this.apiClient.PATCH(
            '/socs/{socID}/cores/{coreID}',
            {
                params: {
                    path: {
                        coreID,
                        socID,
                    },
                },
                body: {
                    accessTag,
                    cfsVersionConstraint,
                    coreType,
                    dataModelCoreID,
                    description,
                    extensions,
                    name,
                    primary,
                    supportsAI,
                    supportsTrustZone,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }
}
