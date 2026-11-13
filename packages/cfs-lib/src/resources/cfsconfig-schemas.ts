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

import type {
	CfsConfigLatestSchemaVersion,
	CfsConfigSchemaVersion
} from "cfs-types";

import { findLatestVersion } from "../utils/semantic-versioning.js";
import { cfsConfigSchema as schema_2_1_0 } from "./schemas/cfsconfig-schema-2.1.0.js";
import { cfsConfigSchema as schema_2_2_0 } from "./schemas/cfsconfig-schema-2.2.0.js";

/** A `SchemaVersion` that has a registered schema. */
export type { CfsConfigSchemaVersion };

/**
 * Registry of every known `.cfsconfig` JSON schema, keyed by the
 * `SchemaVersion` the document declares. Each schema is generated from the
 * `CfsConfig` interface in cfs-types at the time that version was released
 * (see scripts/generate-cfsconfig-schema.js) and then frozen, so older
 * documents keep validating against the shape they were written for.
 *
 * To add another version, generate its files with `yarn generate-schema` and
 * add the generated schema here. The `Record` key type ties this registry to
 * `CfsConfigSchemaVersion` in cfs-types, so the accepted versions and the
 * registered schemas cannot drift apart.
 */
export const cfsConfigSchemas: Record<
	CfsConfigSchemaVersion,
	Record<string, unknown>
> = {
	"2.1.0": schema_2_1_0,
	"2.2.0": schema_2_2_0
};

/**
 * The newest registered schema version. This is the version CFS stamps into
 * newly generated `.cfsconfig` documents, so bumping the schema is a matter of
 * registering the new version above; this constant follows automatically.
 */
export const LATEST_SCHEMA_VERSION = findLatestVersion(
	Object.keys(cfsConfigSchemas)
) as CfsConfigLatestSchemaVersion;
