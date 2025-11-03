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
import { Package } from './rest-types.js';

export class SocsPackages {
    public readonly TAG = 'package';

    /**
     *
     * @param apiClient
     */
    constructor(private readonly apiClient: OpenApiClient) {}

    /**
     *
     * @param args0
     * @param args0.description
     * @param args0.name
     * @param args0.packageType
     * @returns
     */
    async create({
        description,
        name,
        packageType,
    }: {
        description: string;
        name: string;
        packageType:
            | 'WLP'
            | 'TQFN'
            | 'TQFP'
            | 'CTBGA'
            | 'CSBGA'
            | 'BGAED';
    }): Promise<Package> {
        const { data, error } = await this.apiClient.POST(
            '/socs/{socID}/packages',
            {
                body: {
                    description,
                    name,
                    packageType,
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
}
