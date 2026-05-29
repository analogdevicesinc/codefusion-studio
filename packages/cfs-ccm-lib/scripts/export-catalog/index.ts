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

import {
    ApiKeyAuthorizer,
    CfsApiClient,
    ResourceCatalog,
    SocCatalog,
    PublicAuthorizer,
} from 'cfs-ccm-lib';

import path from 'node:path';
import { promises as fs, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

// Look for a .env file to load
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
    path: [
        // First match wins
        path.resolve(process.cwd(), '.env'), // cwd
        path.resolve(__dirname, '../..', '.env'), // cfs-ccm-lib
        path.resolve(__dirname, '../../../..', '.env'), // root package
    ],
});

/*
 * This script reads data from a CFS backend and creates a Catalog zip file.
 * Setup:
 *      - Set environment variable CFS_API_URL (and optionally CFS_API_KEY to access non-public data),
 *        or put them in a .env file in the cwd, cfs-ccm-lib package directory, or project root.
 * Usage: `tsx index.ts [-d <catalog directory>] [-c <catalog type>].. [-o <output zip file>]`
 */

// parse command line arguments
const defaultCatalogDir = path.resolve(
    process.cwd(),
    'tmp',
    'catalog',
);

const defaultZipFile = path.resolve(process.cwd(), `cfs-catalog.zip`);

const yargsInstance = yargs(hideBin(process.argv));
const argv = await yargsInstance
    .wrap(yargsInstance.terminalWidth())
    .strict()
    .version(false)
    .usage(
        'Usage: $0 [-d <catalog directory>] [-c <catalog type>].. [-o <output zip file>] [--cfs-version <semver or *>]',
    )
    .example(
        '$0 -o ./my-catalog.zip',
        'Exports the catalog(s) to a zip file',
    )
    .option('dir', {
        alias: 'd',
        type: 'string',
        description: 'Directory to store catalog data',
        default: defaultCatalogDir,
    })
    .option('cfs-version', {
        alias: 'cfs',
        type: 'string',
        description:
            'CFS version filter to use when fetching data from the API',
        default: process.env.npm_package_version,
    })
    .option('catalog', {
        alias: 'c',
        choices: ['soc', 'resource'],
        description: 'Which catalog(s) to download/export.',
        default: ['soc', 'resource'],
        array: true,
    })
    .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output zip file',
        default: defaultZipFile,
    })
    .check(async (argv) => {
        if (!process.env.CFS_API_URL) {
            throw 'CFS_API_URL env var not set';
        }

        if (!process.env.CFS_API_KEY) {
            console.warn(
                'CFS_API_KEY env var not set - only public data will be listed',
            );
        }

        if (argv.output) {
            argv.output = path.resolve(argv.output);
            if (path.resolve(argv.dir) === defaultCatalogDir) {
                await fs.mkdir(argv.dir, { recursive: true });
            } else if (!existsSync(argv.dir)) {
                throw `Catalog directory ${argv.dir} does not exist`;
            }
        }

        return true;
    })
    .parse();

// init api client
const cfsApiClient = new CfsApiClient({
    baseUrl: process.env.CFS_API_URL!,
    authorizer: process.env.CFS_API_KEY
        ? new ApiKeyAuthorizer({
              apiKey: process.env.CFS_API_KEY,
          })
        : new PublicAuthorizer(),
});
// Check the API connection
try {
    await cfsApiClient.testConnection();
    console.log(
        `CFS API is available at ${process.env.CFS_API_URL}\n`,
    );
} catch (e: unknown) {
    throw new Error(
        `CFS API connection error from ${process.env.CFS_API_URL}`,
        { cause: e },
    );
}

// init catalogs
const catalogs = [];
if (argv.catalog.includes('soc')) {
    catalogs.push(
        new SocCatalog(
            { directory: argv.dir },
            cfsApiClient,
            argv['cfs-version'],
        ),
    );
}
if (argv.catalog.includes('resource')) {
    catalogs.push(
        new ResourceCatalog(
            { directory: argv.dir },
            cfsApiClient,
            argv['cfs-version'],
        ),
    );
}

// refresh all catalogs to get the latest data from the API
console.log(
    `Fetching catalog data ${
        argv['cfs-version']
            ? `for CFS version "${argv['cfs-version']}"`
            : 'without CFS version'
    }...`,
);
await Promise.all(catalogs.map((catalog) => catalog.refresh()));

// export sequentially
console.log(`Exporting to ${argv.output}`);
for (const catalog of catalogs) {
    const items = await catalog.getAll();
    if (items.length === 0) {
        console.warn(
            `No items found in ${catalog.entityTag}, skipping export for this catalog.`,
        );
        continue;
    }
    console.log(
        `Exporting ${catalog.entityTag} catalog with ${items.length} items...`,
    );
    await catalog.export(argv.output);
}

// dispose of all catalogs
await Promise.all(catalogs.map((catalog) => catalog.dispose()));

console.log('Done!');
