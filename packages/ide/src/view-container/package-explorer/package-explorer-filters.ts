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
import type { CfsInstalledPackage } from "cfs-package-manager";
import {
  PackageExplorerFilterState,
  applyPackageFilters,
  countPackageTypes,
  getTypeLabel,
  isFilterActive,
  resolveFilterState,
} from "./package-explorer-utils";

const FILTER_STATE_KEY = "cfs.packageExplorer.filters";

/**
 * Holds the Packages view filter state and persists it per workspace.
 */
export class PackageExplorerFilters {
  private state: PackageExplorerFilterState;

  constructor(private readonly workspaceState: vscode.Memento) {
    this.state = resolveFilterState(
      workspaceState.get<Partial<PackageExplorerFilterState>>(FILTER_STATE_KEY),
    );
  }

  get dependenciesOnly(): boolean {
    return this.state.dependenciesOnly;
  }

  get types(): string[] {
    return this.state.types;
  }

  get isActive(): boolean {
    return isFilterActive(this.state);
  }

  /**
   * Turns the `.cfsdependencies` filter on or off.
   * @param dependenciesOnly - Whether to restrict the view to workspace dependencies.
   * @returns A promise that resolves once the new state is persisted.
   */
  async setDependenciesOnly(dependenciesOnly: boolean): Promise<void> {
    return this.update({ dependenciesOnly });
  }

  /**
   * Replaces the selected package types.
   * @param types - The package types to keep. An empty array clears the filter.
   * @returns A promise that resolves once the new state is persisted.
   */
  async setTypes(types: string[]): Promise<void> {
    return this.update({ types });
  }

  /**
   * Clears every active filter.
   * @returns A promise that resolves once the new state is persisted.
   */
  async clear(): Promise<void> {
    return this.update({ dependenciesOnly: false, types: [] });
  }

  /**
   * Applies the active filters to an installed package list.
   * @param packages - The installed packages to filter.
   * @param requiredNames - Names declared in the workspace `.cfsdependencies` manifests.
   * @returns The packages matching every active filter.
   */
  apply(
    packages: CfsInstalledPackage[],
    requiredNames: ReadonlySet<string>,
  ): CfsInstalledPackage[] {
    return applyPackageFilters(packages, this.state, requiredNames);
  }

  /**
   * Persists a partial state change.
   * @param change - The filter fields to overwrite.
   * @returns A promise that resolves once the new state is persisted.
   */
  private async update(
    change: Partial<PackageExplorerFilterState>,
  ): Promise<void> {
    this.state = { ...this.state, ...change };
    await this.workspaceState.update(FILTER_STATE_KEY, this.state);
  }
}

/**
 * Builds the quick pick items used to choose which package types to show.
 * @param packages - The installed packages the options are derived from.
 * @param selectedTypes - The currently selected package types.
 * @returns One item per package type present in the installed package list.
 */
export function buildTypeFilterItems(
  packages: CfsInstalledPackage[],
  selectedTypes: string[],
): (vscode.QuickPickItem & { type: string })[] {
  const selected = new Set(selectedTypes);

  return [...countPackageTypes(packages).entries()]
    .sort(([a], [b]) => getTypeLabel(a).localeCompare(getTypeLabel(b)))
    .map(([type, count]) => ({
      type,
      label: getTypeLabel(type),
      description:
        count === 1
          ? vscode.l10n.t("{0} package", count)
          : vscode.l10n.t("{0} packages", count),
      picked: selected.has(type),
    }));
}
