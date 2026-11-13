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

import { z } from "zod";

/**
 * Runtime validation for the `manifest` mapping of a `west.yml` file.
 *
 * Mirrors west's own `manifest-schema.yml`, deliberately including where that
 * schema is permissive: `import`, `submodules` and `userdata` are declared
 * `type: any` upstream, so they are accepted here as-is. Rejecting a manifest
 * west itself would accept is worse than passing an odd value through.
 *
 * Every object is `.loose()` so keys this editor does not model survive
 * validation. Zod's default `strip` behaviour would silently drop them, which
 * would defeat the round-trip guarantee `applyManifestEdits` makes.
 */

/**
 * The document is parsed with YAML's failsafe schema, so every scalar reaches
 * this validator as a string - including ones west types as `int` or `text`.
 * Validation therefore checks shape and required keys, not scalar types.
 */
const remoteSchema = z
  .object({
    name: z.string(),
    "url-base": z.string(),
  })
  .loose();

const defaultsSchema = z
  .object({
    remote: z.string().optional(),
    revision: z.string().optional(),
  })
  .loose();

const projectSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    remote: z.string().optional(),
    "repo-path": z.string().optional(),
    url: z.string().optional(),
    revision: z.string().optional(),
    path: z.string().optional(),
    // `type: any` upstream.
    submodules: z.unknown().optional(),
    "clone-depth": z.string().optional(),
    "west-commands": z.string().optional(),
    // `type: any` upstream.
    import: z.unknown().optional(),
    groups: z.array(z.string()).optional(),
    // `type: any` upstream.
    userdata: z.unknown().optional(),
  })
  .loose();

const selfSchema = z
  .object({
    path: z.string().optional(),
    "west-commands": z.string().optional(),
    import: z.unknown().optional(),
    userdata: z.unknown().optional(),
  })
  .loose();

const manifestSchema = z
  .object({
    version: z.string().optional(),
    defaults: defaultsSchema.optional(),
    remotes: z.array(remoteSchema).optional(),
    projects: z.array(projectSchema).optional(),
    self: selfSchema.optional(),
    "group-filter": z.array(z.string()).optional(),
  })
  .loose();

/** Renders every zod issue as a `path: message` line. */
function formatValidationErrors(result: z.ZodSafeParseError<unknown>) {
  return result.error.issues
    .map((issue: z.core.$ZodIssue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "manifest";

      return `${path}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * Validates the value of a document's `manifest` key against the west schema.
 *
 * @param manifest Value parsed from the YAML document.
 * @returns The validated value, with unmodelled keys intact. Callers adapt it
 *   into a `WestManifest` - see `parseWestManifest`.
 * @throws If the value does not match the west manifest schema.
 */
export function validateWestManifest(
  manifest: unknown,
): z.infer<typeof manifestSchema> {
  const result = manifestSchema.safeParse(manifest);

  if (!result.success) {
    throw new Error(
      `Invalid west.yml structure:\n${formatValidationErrors(result)}`,
    );
  }

  return result.data;
}
