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

import nock from 'nock';

import { getSWPackageDataset } from './datasets/swpackages.js';
import type { SWPackageDataset } from './datasets/swpackages.js';
import type { SWPackage } from 'cfs-ccm-api/rest-types';
import type { paths } from 'cfs-ccm-api/api-types';

type SWPackageRoute = Extract<keyof paths, '/sw/packages'>;
type SWPackageResponse =
    paths[SWPackageRoute]['get']['responses'][200]['content']['application/json'];

/** Mock datasets used to enable individual API mocks. */
export interface ApiMocks {
    /** SW package dataset to serve from the `/sw/packages` route. */
    swPackageDataset?: SWPackageDataset | SWPackage[];
}

/** Options for enabling API mocks. */
export interface ApiMockOptions {
    /** Base URL whose origin and path prefix are used by the mock routes. */
    baseUrl?: string | URL;
    /** Whether requests to routes without mocks should reach the real API. */
    allowUnmocked?: boolean;
    /** The individual API mocks to activate. */
    mocks: ApiMocks;
}

const activeInterceptors: nock.Interceptor[] = [];

/**
 * Enables the configured API route mocks.
 * @param options Options for the API mocks.
 */
export function enableApiMocks(options: ApiMockOptions): void {
    const {
        baseUrl = 'http://api.test.me',
        allowUnmocked = true,
        mocks,
    } = options;

    if (mocks.swPackageDataset !== undefined) {
        const route: SWPackageRoute = '/sw/packages';
        const packages = Array.isArray(mocks.swPackageDataset)
            ? structuredClone(mocks.swPackageDataset)
            : getSWPackageDataset(mocks.swPackageDataset);
        const response: SWPackageResponse = {
            count: packages.length,
            items: packages,
        };

        const url = new URL(baseUrl);
        const routePath = `${url.pathname.replace(/\/$/, '')}${route}`;

        const intercept = nock(url.origin, { allowUnmocked })
            .persist()
            .get(routePath)
            .query(true);

        intercept.reply(200, response);

        activeInterceptors.push(intercept);
    }
}

/**
 * Disables all API mocks registered with Nock.
 */
export function disableApiMocks(): void {
    while (activeInterceptors.length > 0) {
        const interceptor = activeInterceptors.pop();
        if (interceptor) {
            nock.removeInterceptor(interceptor);
        }
    }
}
