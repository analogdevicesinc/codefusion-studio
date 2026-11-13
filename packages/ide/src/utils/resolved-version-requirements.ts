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

import semver from "semver";
import type { CfsConfig } from "cfs-types";

type SemverApi = typeof semver;

function unwrapSemverApi(): SemverApi {
  let candidate: unknown = semver;
  const seenCandidates = new Set<unknown>();

  while (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof (candidate as Partial<SemverApi>).valid !== "function" &&
    "default" in candidate &&
    !seenCandidates.has(candidate)
  ) {
    seenCandidates.add(candidate);
    candidate = (candidate as { default: unknown }).default;
  }

  if (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof (candidate as Partial<SemverApi>).valid === "function"
  ) {
    return candidate as SemverApi;
  }

  throw new Error("Unable to load the semver API.");
}

const semverApi = unwrapSemverApi();

/**
 * Raises the lower bound of a version requirement to the version that was
 * actually resolved while preserving upper constraints. Exact versions remain
 * pinned. Caret (`^`) and tilde (`~`) ranges retain their original prefix;
 * other valid ranges may be normalized to comparator form.
 *
 * @param requestedVersion Version or range stored in the configuration.
 * @param resolvedVersion Exact version selected by the component manager.
 * @returns The rebased range, or the original value when it cannot be safely
 * rebased.
 */
export function rebaseResolvedVersionRange(
  requestedVersion: string,
  resolvedVersion: string,
): string {
  const requested = requestedVersion.trim();
  const resolved = semverApi.valid(resolvedVersion);

  if (
    !requested ||
    !resolved ||
    semverApi.valid(requested) ||
    !semverApi.validRange(requested) ||
    !semverApi.satisfies(resolved, requested)
  ) {
    return requestedVersion;
  }

  for (const operator of ["^", "~"] as const) {
    if (requested.startsWith(operator)) {
      const requestedBase = requested.slice(operator.length).trim();

      if (semverApi.valid(requestedBase)) {
        return `${operator}${resolved}`;
      }
    }
  }

  const matchingComparatorSets = new semverApi.Range(requested).set.filter(
    (comparators) =>
      comparators.every((comparator) => comparator.test(resolved)),
  );

  if (matchingComparatorSets.length === 0) {
    return requestedVersion;
  }

  return matchingComparatorSets
    .map((comparators) => {
      const nonLowerBoundComparators = comparators
        .filter(
          (comparator) =>
            comparator.operator !== ">" && comparator.operator !== ">=",
        )
        .map((comparator) => comparator.value)
        .filter(Boolean);

      return [`>=${resolved}`, ...nonLowerBoundComparators].join(" ");
    })
    .join(" || ");
}

/**
 * Updates component requirements in a CFS configuration to reflect the exact
 * versions selected for the current editor session.
 *
 * @param config Configuration to update in place.
 * @param resolvedDataModelVersion Exact resolved data-model version.
 * @param resolvedPluginVersions Exact resolved plugin versions by project ID.
 * @returns Whether any requirement was changed.
 */
export function applyResolvedVersionRequirements(
  config: CfsConfig,
  resolvedDataModelVersion: string,
  resolvedPluginVersions: Readonly<Record<string, string>>,
): boolean {
  let changed = false;
  const dataModelVersion = rebaseResolvedVersionRange(
    config.DataModelVersion,
    resolvedDataModelVersion,
  );

  if (dataModelVersion !== config.DataModelVersion) {
    config.DataModelVersion = dataModelVersion;
    changed = true;
  }

  for (const project of config.Projects) {
    if (
      project.ExternallyManaged ||
      !Object.prototype.hasOwnProperty.call(
        resolvedPluginVersions,
        project.ProjectId,
      )
    ) {
      continue;
    }

    const pluginVersion = rebaseResolvedVersionRange(
      project.PluginVersion,
      resolvedPluginVersions[project.ProjectId],
    );

    if (pluginVersion !== project.PluginVersion) {
      project.PluginVersion = pluginVersion;
      changed = true;
    }
  }

  return changed;
}
