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

/*
 * Builds the Package Manager list from catalog packages and
 * the Conan-side state (cached / installed / built-in / manifests).
 * Pure functions with no VS Code dependency.
 */

import * as semver from "semver";
import type { SWPackage } from "cfs-ccm-lib";
import type {
  CfsCachedPackage,
  CfsPackageRemoteState,
} from "cfs-package-manager";
import type {
  MissingRequiredPackage,
  PackageListEntry,
  PackageVersionMeta,
} from "../constants/messages/package-manager-messages";

/**
 * Normalises a SoC list the way the Conan backend does: entries may be
 * comma-joined, are trimmed, empty entries dropped and duplicates removed.
 * @param socs - the raw `compatibleHardware.soc` value
 * @returns the cleaned SoC names
 */
function normalizeSocs(socs: string | string[] | undefined): string[] {
  const result: string[] = [];
  for (const entry of socs === undefined ? [] : [socs].flat()) {
    for (const part of entry.split(",")) {
      const trimmed = part.trim();
      if (trimmed && !result.includes(trimmed)) {
        result.push(trimmed);
      }
    }
  }
  return result;
}

/**
 * Sorts versions newest first. Build metadata takes part in the ordering
 * (`2.4.0+73` is newer than `2.4.0`); non-semver versions such as Conan
 * test channels fall back to a lexicographic comparison.
 * @param versions - versions to sort
 * @returns a new array, newest first
 */
function sortVersionsDesc(versions: readonly string[]): string[] {
  return [...versions].sort((a, b) => {
    try {
      return semver.compareBuild(b, a, true);
    } catch {
      return b.localeCompare(a);
    }
  });
}

/**
 * Whether a version satisfies a semver range. The version is coerced so
 * loose inputs (`2.4`) work; an invalid range falls back to equality.
 * @param version - version under test
 * @param range - semver range
 * @returns true when the version satisfies the range
 */
function versionSatisfies(version: string, range: string): boolean {
  const coerced = semver.coerce(version, { includePrerelease: true });
  if (coerced && semver.validRange(range)) {
    return semver.satisfies(coerced, range);
  }
  return version === range;
}

/**
 * Groups packages by a key, keeping input order within each group.
 * @param packages - packages to group
 * @param keyOf - the grouping key of a package
 * @returns a map from key to its packages
 */
function groupPackages(
  packages: readonly SWPackage[],
  keyOf: (pkg: SWPackage) => string,
): Map<string, SWPackage[]> {
  const groups = new Map<string, SWPackage[]>();
  for (const pkg of packages) {
    const key = keyOf(pkg);
    const group = groups.get(key);
    if (group) {
      group.push(pkg);
    } else {
      groups.set(key, [pkg]);
    }
  }
  return groups;
}

/**
 * Normalises a repository URL for comparison: parsed and re-serialised
 * (so host case and default ports agree) with any trailing slash removed.
 * @param url - the URL as a string or URL object
 * @returns the comparable form
 */
function normalizeRepoUrl(url: string | URL): string {
  let href: string;
  try {
    href = new URL(url.toString()).href;
  } catch {
    href = url.toString();
  }
  return href.replace(/\/+$/, "");
}

/**
 * Keeps the packages whose repository is an enabled remote, so the list never
 * offers a package Conan cannot install. Packages are matched to remotes by
 * URL, not by name, because remote names are generated from the
 * repository. What a session may see at all is decided by the API; this
 * only applies the user's enable/disable choices.
 * @param packages - every package from the source
 * @param remotes - the remotes, with their enabled state
 * @returns the packages from enabled remotes
 */
export function filterByEnabledRemotes(
  packages: readonly SWPackage[],
  remotes: readonly CfsPackageRemoteState[],
): SWPackage[] {
  const enabled = new Set(
    remotes
      .filter((remote) => !remote.disabled)
      .map((remote) => normalizeRepoUrl(remote.url)),
  );
  return packages.filter((pkg) =>
    enabled.has(normalizeRepoUrl(pkg.repo.repoUrl)),
  );
}

/**
 * Collapses the packages of one `name/version` (one per repository) into the
 * metadata the webview renders for that version.
 * @param packages - packages sharing a name and version
 * @returns the metadata, or undefined when there are no packages
 */
export function toPackageVersionMeta(
  packages: readonly SWPackage[],
): PackageVersionMeta | undefined {
  const [first] = packages;
  if (!first) {
    return undefined;
  }
  const socs = new Set<string>();
  const repos = new Set<string>();
  const tags = new Set<string>();
  let description = first.description;
  let type = first.type;
  let cfsVersionConstraint = first.cfsVersionConstraint;
  for (const pkg of packages) {
    for (const soc of normalizeSocs(pkg.compatibleHardware?.soc)) {
      socs.add(soc);
    }
    repos.add(pkg.repo.repoName ?? pkg.repo.id);
    for (const tag of pkg.packageTags ?? []) {
      tags.add(tag.packageTag);
    }
    description ??= pkg.description;
    type ??= pkg.type;
    cfsVersionConstraint ??= pkg.cfsVersionConstraint;
  }
  return {
    version: first.version,
    license: first.license,
    ...(description !== undefined ? { description } : {}),
    ...(type !== undefined ? { type } : {}),
    ...(cfsVersionConstraint !== undefined ? { cfsVersionConstraint } : {}),
    socs: [...socs],
    repos: [...repos],
    ...(tags.size > 0 ? { tags: [...tags] } : {}),
  };
}

/** Orders package list entries: required packages first, then the rest, both alphabetical. */
function orderPackageList(entries: PackageListEntry[]): PackageListEntry[] {
  const byName = (a: PackageListEntry, b: PackageListEntry) =>
    a.name.localeCompare(b.name);
  const required = entries.filter((e) => e.isRequired).sort(byName);
  const rest = entries.filter((e) => !e.isRequired).sort(byName);
  return [...required, ...rest];
}

/**
 * Builds the ordered package list. Names, versions and per-version
 * metadata come from the catalog packages; cached, installed, built-in and
 * required state come from Conan, the SDK and workspace manifests. Cached
 * or installed versions are listed even if the catalog does not know them,
 * so an installed package always appears.
 * @param packages - the visible catalog packages
 * @param cachedPackages - the Conan cache listing
 * @param requiredPackages - package name to the version ranges required by manifests
 * @param builtinVersions - package name to the version bundled with the SDK
 * @returns the ordered entries
 */
export function buildPackageList(
  packages: readonly SWPackage[],
  cachedPackages: readonly CfsCachedPackage[],
  requiredPackages: ReadonlyMap<string, string[]>,
  builtinVersions: ReadonlyMap<string, string>,
): PackageListEntry[] {
  const byName = groupPackages(packages, (pkg) => pkg.name);
  const releasesByName = new Map<string, Record<string, PackageVersionMeta>>();
  const versionsByName = new Map<string, Set<string>>();
  const addVersion = (name: string, version: string) => {
    let versions = versionsByName.get(name);
    if (!versions) {
      versions = new Set<string>();
      versionsByName.set(name, versions);
    }
    versions.add(version);
  };

  for (const [name, group] of byName) {
    const releases: Record<string, PackageVersionMeta> = {};
    // One entry per version, merging the packages of every repository.
    for (const versionPackages of groupPackages(
      group,
      (pkg) => pkg.version,
    ).values()) {
      const meta = toPackageVersionMeta(versionPackages);
      if (meta) {
        releases[meta.version] = meta;
        addVersion(name, meta.version);
      }
    }
    releasesByName.set(name, releases);
  }

  const cachedVersionsByName = new Map<string, Set<string>>();
  const installedVersionByName = new Map<string, string>();
  for (const cached of cachedPackages) {
    const { name, version } = cached.reference;
    addVersion(name, version);
    let cachedVersions = cachedVersionsByName.get(name);
    if (!cachedVersions) {
      cachedVersions = new Set<string>();
      cachedVersionsByName.set(name, cachedVersions);
    }
    cachedVersions.add(version);
    if (cached.isInstalled) {
      installedVersionByName.set(name, version);
    }
  }

  const entries: PackageListEntry[] = [];
  for (const [name, versions] of versionsByName) {
    const requiredVersions = requiredPackages.get(name);
    const builtInVersion = builtinVersions.get(name);
    const installedVersion = installedVersionByName.get(name) ?? builtInVersion;
    entries.push({
      name,
      versions: sortVersionsDesc([...versions]),
      releases: releasesByName.get(name) ?? {},
      isRequired: !!requiredVersions,
      requiredVersions,
      installedVersion,
      cachedVersions: [...(cachedVersionsByName.get(name) ?? [])],
      builtIn: !!builtInVersion,
      builtInVersion,
      state: installedVersion !== undefined ? "installed" : "not-installed",
    });
  }

  return orderPackageList(entries);
}

/**
 * Required packages (from workspace manifests) the user has no access to:
 * a required range is "missing" when no visible catalog version satisfies
 * it. Covers both an absent package and an exclusive version (e.g. a
 * prerelease) of an otherwise visible package.
 * @param packages - the visible catalog packages
 * @param requiredPackages - package name to the version ranges required by manifests
 * @returns the unsatisfiable requirements, sorted by name
 */
export function getMissingRequiredPackages(
  packages: readonly SWPackage[],
  requiredPackages: ReadonlyMap<string, string[]>,
): MissingRequiredPackage[] {
  const availableVersionsByName = new Map<string, Set<string>>();
  for (const pkg of packages) {
    let versions = availableVersionsByName.get(pkg.name);
    if (!versions) {
      versions = new Set<string>();
      availableVersionsByName.set(pkg.name, versions);
    }
    versions.add(pkg.version);
  }

  const missing: MissingRequiredPackage[] = [];
  for (const [name, requiredVersions] of requiredPackages) {
    const available = [...(availableVersionsByName.get(name) ?? [])];
    const missingVersions = [...new Set(requiredVersions)].filter(
      (required) =>
        !available.some((version) => versionSatisfies(version, required)),
    );
    if (missingVersions.length > 0) {
      missing.push({ name, versions: missingVersions });
    }
  }

  return missing.sort((a, b) => a.name.localeCompare(b.name));
}
