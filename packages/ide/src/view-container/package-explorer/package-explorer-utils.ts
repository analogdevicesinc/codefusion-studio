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

import * as vscode from "vscode";

/** The subset of an installed package these helpers need. */
export interface PackageSummary {
  name: string;
  type?: string;
}

export interface PackageExplorerFilterState {
  /** Restricts the tree to packages declared in a workspace `.cfsdependencies` manifest. */
  dependenciesOnly: boolean;
  /** Restricts the tree to the selected package types. An empty array means no type filter. */
  types: string[];
}

/** A directory entry to be ordered within the tree. */
export interface PackageEntry {
  name: string;
  isDirectory: boolean;
}

/**
 * Resolves persisted filter state, applying defaults for anything missing.
 * @param stored - The persisted state, if the view has been used before.
 * @returns The filter state to start from.
 */
export function resolveFilterState(
  stored: Partial<PackageExplorerFilterState> | undefined,
): PackageExplorerFilterState {
  return {
    // Workspace dependencies are the default view; an explicit opt out is persisted.
    dependenciesOnly: stored?.dependenciesOnly ?? true,
    types: Array.isArray(stored?.types) ? stored.types : [],
  };
}

/**
 * Reports whether any filter is currently narrowing the package list.
 * @param state - The filter state to inspect.
 * @returns True when at least one filter is active.
 */
export function isFilterActive(state: PackageExplorerFilterState): boolean {
  return state.dependenciesOnly || state.types.length > 0;
}

/**
 * Applies the active filters to an installed package list.
 * @param packages - The installed packages to filter.
 * @param state - The filter state to apply.
 * @param requiredNames - Names declared in the workspace `.cfsdependencies` manifests.
 * @returns The packages matching every active filter.
 */
export function applyPackageFilters<T extends PackageSummary>(
  packages: T[],
  state: PackageExplorerFilterState,
  requiredNames: ReadonlySet<string>,
): T[] {
  const types = new Set(state.types);

  return packages.filter((pkg) => {
    if (state.dependenciesOnly && !requiredNames.has(pkg.name)) {
      return false;
    }

    return types.size === 0 || types.has(pkg.type ?? "");
  });
}

/**
 * Counts how many installed packages declare each package type.
 * @param packages - The installed packages to tally.
 * @returns A map of package type to package count, keyed by the raw type and by
 * an empty string for packages that declare no type.
 */
export function countPackageTypes(
  packages: PackageSummary[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const pkg of packages) {
    const type = pkg.type ?? "";
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return counts;
}

/**
 * Gets the display label for a package type.
 * @param type - The raw package type, or an empty string for untyped packages.
 * @returns A friendly label, falling back to the raw type for unknown values.
 */
export function getTypeLabel(type: string): string {
  switch (type) {
    case "":
      return vscode.l10n.t("Untyped");
    case "data-model":
      return vscode.l10n.t("Data Model");
    case "plugin":
      return vscode.l10n.t("Plugin");
    case "sdk":
      return vscode.l10n.t("SDK");
    case "tool":
      return vscode.l10n.t("Tool");
    case "toolchain":
      return vscode.l10n.t("Toolchain");
    default:
      return type;
  }
}

/**
 * Orders directory entries with folders first, then by name.
 * @param entries - The entries to order. The input array is not modified.
 * @returns A new array in display order.
 */
export function sortPackageEntries<T extends PackageEntry>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }

    return comparePackageNames(a.name, b.name);
  });
}

/**
 * Compares two names case insensitively, falling back to a stable case
 * sensitive comparison so entries differing only in case keep a fixed order.
 * @param a - The first name to compare.
 * @param b - The second name to compare.
 * @returns A negative number when `a` sorts first, a positive number otherwise.
 */
export function comparePackageNames(a: string, b: string): number {
  return (
    a.localeCompare(b, undefined, { sensitivity: "base" }) || a.localeCompare(b)
  );
}

/**
 * Normalizes a path for the clipboard. `Uri.fsPath` lowercases Windows drive
 * letters, which the built-in Copy Path command does not, so restore the
 * conventional uppercase form.
 * @param fsPath - The file system path to normalize.
 * @returns The path with an uppercase drive letter on Windows.
 */
export function toClipboardPath(fsPath: string): string {
  return /^[a-z]:[\\/]/.test(fsPath)
    ? fsPath[0].toUpperCase() + fsPath.slice(1)
    : fsPath;
}
