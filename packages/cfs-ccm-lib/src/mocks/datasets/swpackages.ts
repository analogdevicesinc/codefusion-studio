/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type { SWPackage } from 'cfs-ccm-api/rest-types';

/** Names of the available software package mock datasets. */
export type SWPackageDataset = keyof typeof swPackageDatasets;

const defaultSWPackages: SWPackage[] = [
    {
        description: 'Default software package mock',
        id: 'swpackage-default',
        license: 'Apache-2.0',
        name: 'Default SW Package',
        repo: {
            authRequired: false,
            disabledByDefault: false,
            id: 'swpackage-repo-default',
            packageFormat: 'conan',
            repoUrl: 'https://example.com/packages',
        },
        version: '1.0.0',
    },
];

const exampleSWPackages: SWPackage[] = [
    {
        cfsVersionConstraint: '>=2.3.0 <3.0.0',
        compatibleHardware: {
            soc: ['max32690', 'max32690-wlp'],
        },
        id: 'swpackage-plugin',
        license: 'MIT',
        name: 'Sensor Plugin',
        repo: {
            authRequired: false,
            disabledByDefault: false,
            id: 'swpackage-repo-conan',
            packageFormat: 'conan',
            repoUrl: 'https://example.com/conan',
        },
        type: 'plugin',
        version: '1.4.2',
    },
    {
        compatibleHardware: {
            soc: ['adsp-21835', 'adsp-21836'],
        },
        id: 'swpackage-sdk',
        license: 'Apache-2.0',
        name: 'SHARC SDK',
        repo: {
            authRequired: true,
            disabledByDefault: false,
            id: 'swpackage-repo-sharc',
            packageFormat: 'conan',
            repoUrl: 'https://example.com/sharc',
        },
        type: 'sdk',
        version: '3.2.0',
    },
    {
        cfsVersionConstraint: '^2.4.0',
        compatibleHardware: {
            soc: ['max78000', 'max78002'],
        },
        id: 'swpackage-toolchain',
        license: 'BSD-3-Clause',
        name: 'MAX Toolchain',
        repo: {
            authRequired: false,
            disabledByDefault: true,
            id: 'swpackage-repo-toolchain',
            packageFormat: 'archive',
            repoUrl: 'https://example.com/toolchains',
        },
        type: 'toolchain',
        version: '5.1.0',
    },
    {
        id: 'swpackage-tool',
        license: 'MIT',
        name: 'Workspace Analyzer',
        repo: {
            authRequired: false,
            disabledByDefault: false,
            id: 'swpackage-repo-tools',
            packageFormat: 'npm',
            repoUrl: 'https://example.com/tools',
        },
        type: 'tool',
        version: '0.9.1',
    },
    {
        cfsVersionConstraint: '>=2.2.0',
        compatibleHardware: {
            soc: ['max32650', 'max32655', 'max32670'],
        },
        id: 'swpackage-data-model',
        license: 'Apache-2.0',
        name: 'Peripheral Data Model',
        repo: {
            authRequired: true,
            disabledByDefault: false,
            id: 'swpackage-repo-data-model',
            packageFormat: 'archive',
            repoUrl: 'https://example.com/data-models',
        },
        type: 'data-model',
        version: '2.7.3',
    },
];

/** Software package datasets available to the mock helpers. */
export const swPackageDatasets = {
    default: defaultSWPackages,
    example: exampleSWPackages,
} as const satisfies Record<string, SWPackage[]>;

/**
 * Returns a copy of the selected software package mock dataset.
 * @param dataset Name of the dataset to copy.
 * @returns A cloned array of software packages.
 */
export function getSWPackageDataset(
    dataset: SWPackageDataset = 'default',
): SWPackage[] {
    return structuredClone(swPackageDatasets[dataset]);
}
