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

/**
 * Fails when the checked-in `.cfsconfig` schema for the current version
 * (src/types/schemas/cfsconfig-schema-<version>.json and
 * src/resources/schemas/cfsconfig-schema-<version>.ts) doesn't match
 * the `CfsConfig` TypeScript interface it's generated from
 * (packages/cfs-types/src/types/cfs-config.ts).
 *
 * Schema regeneration is a deliberate, manual step (`yarn generate-schema`)
 * rather than something that happens automatically on every build, so that
 * the checked-in schema only changes when someone reviews and commits that
 * change on purpose. This script is the guard that enforces it - it runs as
 * part of `yarn lint` and returns a non-zero exit code when the schema has
 * drifted from the Typescript type.
 *
 * The .ts and.json files should match, so in theory this script could check
 * just one of them, but check both to be safe.
 */

import { readFileSync } from "node:fs";
import {
	buildSchema,
	getSchemaVersion,
	renderJson,
	renderTs,
	schemaPaths
} from "./generate-cfsconfig-schema.js";

/**
 * Normalizes line endings so a CRLF-vs-LF difference (e.g. a Windows
 * checkout or git `core.autocrlf`) doesn't get reported as drift when the
 * meaningful content is identical.
 * @param {string} contents - The text to normalize.
 * @returns {string} The text with all line endings converted to `\n`.
 */
function normalizeLineEndings(contents) {
	return contents.replace(/\r\n/g, "\n");
}

/**
 * Reads a checked-in schema file, treating a missing file as drift rather
 * than a hard crash so the error message can point at the fix.
 * @param {string} filePath - The file to read.
 * @returns {string | null} The contents, or null if the file is absent.
 */
function readIfPresent(filePath) {
	try {
		return readFileSync(filePath, "utf8");
	} catch {
		return null;
	}
}

const freshSchema = buildSchema();
const version = getSchemaVersion(freshSchema);
const { jsonPath, tsPath } = schemaPaths(version);

const expected = {
	[jsonPath]: renderJson(freshSchema),
	[tsPath]: renderTs(freshSchema)
};

const stale = Object.entries(expected).filter(([filePath, contents]) => {
	const actual = readIfPresent(filePath);
	return (
		actual === null ||
		normalizeLineEndings(actual) !== normalizeLineEndings(contents)
	);
});

if (stale.length > 0) {
	console.error(
		[
			"",
			"[cfs-lib] ERROR: the checked-in .cfsconfig schema is out of date.",
			`The following files no longer match the \`CfsConfig\` interface`,
			"(packages/cfs-types/src/types/cfs-config.ts):",
			...stale.map(([filePath]) => `  - ${filePath}`),
			"",
			"Run `yarn ws:lib generate-schema` and commit the result. If you",
			"changed the schema shape, bump `CfsConfig.SchemaVersion` in cfs-types",
			"first so a new frozen version is generated.",
			""
		].join("\n")
	);
	process.exit(1);
}

