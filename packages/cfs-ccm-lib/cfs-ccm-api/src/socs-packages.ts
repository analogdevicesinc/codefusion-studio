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
import type { AccessTag, Package } from './rest-types.js';

export class SocsPackages {
    public readonly TAG = 'package';

    constructor(private readonly apiClient: OpenApiClient) {}

    async create({
        socID,
        cfsVersionConstraint,
        dataModelPackageID,
        description,
        id,
        name,
        packageType,
    }: {
        socID: string;
        /**
         * Format: semver_constraint
         * @example >=1.0.0, <2.0.0
         */
        cfsVersionConstraint?: string;
        dataModelPackageID?: string;
        description: string;
        id?: string;
        name: string;
        packageType:
            | 'WLP'
            | 'TQFN'
            | 'TQFP'
            | 'CTBGA'
            | 'CSBGA'
            | 'BGAED'
            | 'EWLB'
            | 'LFCSP'
            | 'LGA';
    }): Promise<Package> {
        const { data, error, response } = await this.apiClient.POST(
            '/socs/{socID}/packages',
            {
                params: {
                    path: {
                        socID,
                    },
                },
                body: {
                    cfsVersionConstraint,
                    dataModelPackageID,
                    description,
                    id,
                    name,
                    packageType,
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
        packageID,
        socID,
    }: {
        packageID: string;
        socID: string;
    }): Promise<void> {
        const { error, response } = await this.apiClient.DELETE(
            '/socs/{socID}/packages/{packageID}',
            {
                params: {
                    path: {
                        packageID,
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
        packageID,
        socID,
        accessTag,
        cfsVersionConstraint,
        dataModelPackageID,
        description,
        name,
        packageType,
    }: {
        packageID: string;
        socID: string;
        accessTag?: AccessTag;
        cfsVersionConstraint?: string | null;
        dataModelPackageID?: string | null;
        description?: string;
        name?: string;
        packageType?:
            | 'WLP'
            | 'TQFN'
            | 'TQFP'
            | 'CTBGA'
            | 'CSBGA'
            | 'BGAED'
            | 'EWLB'
            | 'LFCSP'
            | 'LGA';
    }): Promise<void> {
        const { error, response } = await this.apiClient.PATCH(
            '/socs/{socID}/packages/{packageID}',
            {
                params: {
                    path: {
                        packageID,
                        socID,
                    },
                },
                body: {
                    accessTag,
                    cfsVersionConstraint,
                    dataModelPackageID,
                    description,
                    name,
                    packageType,
                },
            },
        );

        if (error) {
            throw new Error(error.message, { cause: response });
        }
    }
}
