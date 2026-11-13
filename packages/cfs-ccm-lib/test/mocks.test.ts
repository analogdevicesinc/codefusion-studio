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

import { expect } from 'chai';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import type { SWPackage } from 'cfs-ccm-api/rest-types';
import {
    createSWPackageCatalogMock,
    disableApiMocks,
    enableApiMocks,
} from '../src/mocks/index.js';
import { CfsApiClient } from '../src/index.js';
import { getSWPackageDataset } from '../src/mocks/datasets/swpackages.js';

chai.use(chaiAsPromised);

describe('mocks', () => {
    const baseUrl = 'http://api.test.me';

    afterEach(() => {
        disableApiMocks();
    });

    it('mocks software packages and allows unmatched routes through', async () => {
        enableApiMocks({
            baseUrl,
            mocks: { swPackageDataset: 'default' },
        });
        const pingScope = nock(baseUrl)
            .get('/ping')
            .reply(200, 'Healthy Connection');
        const client = new CfsApiClient({ baseUrl, isCache: false });

        await expect(
            client.rest.swPackages.getAll(),
        ).to.eventually.deep.equal(getSWPackageDataset());
        await expect(client.isOnline()).to.eventually.be.true;
        expect(pingScope.isDone()).to.be.true;
    });

    it('uses the selected software package dataset', async () => {
        enableApiMocks({
            baseUrl,
            mocks: { swPackageDataset: 'example' },
        });
        const client = new CfsApiClient({ baseUrl, isCache: false });

        await expect(
            client.rest.swPackages.getAll(),
        ).to.eventually.deep.equal(getSWPackageDataset('example'));
    });

    it('uses an explicitly supplied software package array', async () => {
        const packages: SWPackage[] = [
            {
                id: 'swpackage-custom',
                license: 'BSD-3-Clause',
                name: 'Custom SW Package',
                repo: {
                    authRequired: false,
                    disabledByDefault: false,
                    id: 'swpackage-repo-custom',
                    packageFormat: 'conan',
                    repoUrl: 'https://example.com/custom-packages',
                },
                version: '3.0.0',
            },
        ];
        enableApiMocks({
            baseUrl,
            mocks: { swPackageDataset: packages },
        });
        const client = new CfsApiClient({ baseUrl, isCache: false });

        await expect(
            client.rest.swPackages.getAll(),
        ).to.eventually.deep.equal(packages);
    });

    it('disables enabled API mocks', async () => {
        enableApiMocks({
            baseUrl,
            mocks: { swPackageDataset: 'default' },
        });
        const client = new CfsApiClient({ baseUrl, isCache: false });
        await expect(client.rest.swPackages.getAll()).to.be.fulfilled;
        disableApiMocks();
        await expect(client.rest.swPackages.getAll()).to.be.rejected;
    });

    it('does not activate routes that are not requested', async () => {
        enableApiMocks({ baseUrl, mocks: {} });
        expect(nock.activeMocks()).to.deep.equal([]);
    });

    it('creates a populated offline catalog', async () => {
        const catalog = createSWPackageCatalogMock({
            dataset: 'example',
        });

        await expect(catalog.getAll()).to.eventually.deep.equal(
            getSWPackageDataset('example'),
        );
        await catalog.dispose();
    });

    it('creates a catalog from an explicitly supplied package array', async () => {
        const packages: SWPackage[] = [
            {
                id: 'swpackage-catalog-custom',
                license: 'BSD-3-Clause',
                name: 'Custom Catalog SW Package',
                repo: {
                    authRequired: false,
                    disabledByDefault: false,
                    id: 'swpackage-catalog-repo-custom',
                    packageFormat: 'conan',
                    repoUrl: 'https://example.com/catalog-packages',
                },
                version: '3.0.0',
            },
        ];
        const catalog = createSWPackageCatalogMock({
            dataset: packages,
        });

        await expect(catalog.getAll()).to.eventually.deep.equal(
            packages,
        );
        await catalog.dispose();
    });
});
