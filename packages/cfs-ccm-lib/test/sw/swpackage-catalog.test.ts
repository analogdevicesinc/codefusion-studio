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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import JSZip from 'jszip';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SWPackageCatalog } from '../../src/index.js';
import { fileURLToPath } from 'node:url';

use(chaiAsPromised);

// Test base dir
const localStorageDir: string = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'testLocalStorage',
    'catalog',
);

describe('SWPackageCatalog tests', () => {
    const swPackage = {
        id: 'package-1',
        license: 'Apache-2.0',
        name: 'Package 1',
        repo: {
            authRequired: false,
            disabledByDefault: false,
            id: 'repo-1',
            packageFormat: 'conan',
            repoUrl: 'https://example.com/packages',
        },
        version: '1.0.0',
    };

    let directory: string;
    let catalog: SWPackageCatalog;

    before(async () => {
        await fs.mkdir(localStorageDir, { recursive: true });
    });

    afterEach(async function (this: Mocha.Context) {
        if (this.currentTest?.isPassed()) {
            if (catalog) {
                await catalog.dispose();
            }
            if (directory) {
                await fs.rm(directory, {
                    recursive: true,
                    force: true,
                });
            }
        } else {
            if (this.currentTest?.err) {
                this.currentTest.err.message += ` (local storage dir: ${directory})`;
            }
            console.error('\t', 'local storage dir:', directory);
        }
    });

    it('imports and validates software packages in offline mode', async () => {
        directory = await fs.mkdtemp(
            path.join(localStorageDir, 'swpackage-catalog-test-'),
        );
        const zipPath = path.join(directory, 'catalog.zip');
        const zip = new JSZip();
        zip.file(
            'swpackage-catalog.json',
            JSON.stringify({ swpackage: [swPackage] }),
        );
        await fs.writeFile(
            zipPath,
            await zip.generateAsync({ type: 'nodebuffer' }),
        );

        catalog = new SWPackageCatalog({ directory });
        await catalog.import(zipPath);

        expect(catalog.entityTag).to.equal('swpackage');
        expect(catalog.ZIP_FILE_MEMBER).to.equal(
            'swpackage-catalog.json',
        );
        await expect(
            catalog.get('package-1'),
        ).to.eventually.deep.equal(swPackage);
    });

    it('rejects invalid software package data', async () => {
        directory = await fs.mkdtemp(
            path.join(localStorageDir, 'swpackage-catalog-test-'),
        );
        const zipPath = path.join(directory, 'catalog.zip');
        const zip = new JSZip();
        zip.file(
            'swpackage-catalog.json',
            JSON.stringify({ swpackage: [{ id: 'invalid' }] }),
        );
        await fs.writeFile(
            zipPath,
            await zip.generateAsync({ type: 'nodebuffer' }),
        );

        catalog = new SWPackageCatalog({ directory });
        await expect(catalog.import(zipPath)).to.be.rejected;
    });
});
