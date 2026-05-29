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

/**
 * Common helper functions shared across catalog tests
 */

import { expect } from 'chai';
import JSZip from 'jszip';
import { promises as fs } from 'node:fs';
import _ from 'lodash';

import { Catalog, RestEntity } from '../src/catalog/catalog.js';
import { StoreItem } from '../src/catalog/types.js';

/**
 * Verify the contents of a catalog zip file
 * @param catalog The catalog instance
 * @param zipFilePath Path to the zip file
 * @param expectedEntries Expected catalog entries
 * @param expectedMetadata Expected metadata (optional)
 */
export async function verifyZip<T extends RestEntity>(
    catalog: Catalog<T>,
    zipFilePath: string,
    expectedEntries: StoreItem[],
    expectedMetadata?: Record<string, unknown>,
): Promise<void> {
    // check that the zipfile entry contains what we expect
    const zip = new JSZip();
    const zipData = await zip.loadAsync(fs.readFile(zipFilePath));

    expect(zipData.files).to.have.property(catalog.ZIP_FILE_MEMBER);
    const data: unknown = JSON.parse(
        await zipData.files[catalog.ZIP_FILE_MEMBER].async('string'),
    );
    expect(data, 'zip file contents not as expected')
        .to.have.property(catalog.entityTag)
        .that.deep.equals(expectedEntries);

    if (expectedMetadata) {
        expect(data, 'zip file metadata not as expected')
            .to.have.property('metadata')
            .that.deep.equals(expectedMetadata);
    } else {
        expect(data).to.not.have.property('metadata');
    }
}

/**
 * Verify the contents of a catalog by comparing getAll() output
 * @param catalog The catalog instance
 * @param expectedEntries Expected catalog entries
 */
export async function getAndVerifyCatalog<T extends RestEntity>(
    catalog: Catalog<T>,
    expectedEntries: StoreItem[],
): Promise<void> {
    const entryList = await catalog.getAll();
    expect(
        entryList,
        'catalog did not return expected contents',
    ).to.deep.equal(expectedEntries);
}
