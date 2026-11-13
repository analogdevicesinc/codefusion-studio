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

import * as path from "node:path";
import * as vscode from "vscode";
import type { CfsInstalledPackage } from "cfs-package-manager";
import { PackageExplorerProvider } from "../view-container/package-explorer/package-explorer-provider";
import {
  PackageExplorerFilters,
  buildTypeFilterItems,
} from "../view-container/package-explorer/package-explorer-filters";
import {
  PackageDirectoryNode,
  PackageFileNode,
  PackageNode,
} from "../view-container/package-explorer/package-explorer-node";
import { toClipboardPath } from "../view-container/package-explorer/package-explorer-utils";
import {
  PACKAGE_EXPLORER_CLEAR_FILTERS_COMMAND_ID,
  PACKAGE_EXPLORER_COPY_PATH_COMMAND_ID,
  PACKAGE_EXPLORER_COPY_RELATIVE_PATH_COMMAND_ID,
  PACKAGE_EXPLORER_DISABLE_DEPENDENCY_FILTER_COMMAND_ID,
  PACKAGE_EXPLORER_ENABLE_DEPENDENCY_FILTER_COMMAND_ID,
  PACKAGE_EXPLORER_OPEN_FILE_COMMAND_ID,
  PACKAGE_EXPLORER_REFRESH_COMMAND_ID,
  PACKAGE_EXPLORER_REVEAL_IN_OS_COMMAND_ID,
  PACKAGE_EXPLORER_SEARCH_IN_PACKAGE_COMMAND_ID,
  PACKAGE_EXPLORER_SELECT_TYPE_FILTER_COMMAND_ID,
} from "./constants";

/** Context keys driving which filter buttons the view title bar shows. */
const DEPENDENCIES_ONLY_CONTEXT_KEY = "cfs.packageExplorer.dependenciesOnly";
const FILTERS_ACTIVE_CONTEXT_KEY = "cfs.packageExplorer.filtersActive";

/** A node in the Packages view that is backed by a file system resource. */
type ResourceNode = PackageNode | PackageDirectoryNode | PackageFileNode;

/**
 * Registers the commands backing the Packages view.
 * @param context - The extension context used to dispose the commands.
 * @param provider - The Packages view data provider to refresh after a change.
 * @param filters - The filter state shared with the provider.
 */
export function registerPackageExplorerCommands(
  context: vscode.ExtensionContext,
  provider: PackageExplorerProvider,
  filters: PackageExplorerFilters,
): void {
  const applyFilterChange = async (
    change: () => Promise<void>,
  ): Promise<void> => {
    await change();
    await syncFilterContextKeys(filters);
    provider.refreshView();
  };

  void syncFilterContextKeys(filters);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      PACKAGE_EXPLORER_ENABLE_DEPENDENCY_FILTER_COMMAND_ID,
      () => applyFilterChange(() => filters.setDependenciesOnly(true)),
    ),
    vscode.commands.registerCommand(
      PACKAGE_EXPLORER_DISABLE_DEPENDENCY_FILTER_COMMAND_ID,
      () => applyFilterChange(() => filters.setDependenciesOnly(false)),
    ),
    vscode.commands.registerCommand(
      PACKAGE_EXPLORER_SELECT_TYPE_FILTER_COMMAND_ID,
      async () => {
        let packages: CfsInstalledPackage[];

        try {
          packages = await provider.getInstalledPackages();
        } catch (error) {
          vscode.window.showErrorMessage(
            vscode.l10n.t(
              "Could not load the installed packages: {0}",
              String(error),
            ),
          );

          return;
        }

        const items = buildTypeFilterItems(packages, filters.types);

        if (items.length === 0) {
          return;
        }

        const picked = await vscode.window.showQuickPick(items, {
          canPickMany: true,
          title: vscode.l10n.t("Filter Packages by Type"),
          placeHolder: vscode.l10n.t(
            "Select package types to show (none selected shows all)",
          ),
        });

        if (!picked) {
          return;
        }

        await applyFilterChange(() =>
          filters.setTypes(picked.map((item) => item.type)),
        );
      },
    ),
    vscode.commands.registerCommand(
      PACKAGE_EXPLORER_CLEAR_FILTERS_COMMAND_ID,
      () => applyFilterChange(() => filters.clear()),
    ),
    vscode.commands.registerCommand(PACKAGE_EXPLORER_REFRESH_COMMAND_ID, () => {
      provider.refresh();
    }),
    vscode.commands.registerCommand(
      PACKAGE_EXPLORER_OPEN_FILE_COMMAND_ID,
      (uri: vscode.Uri) => openPackageFile(uri),
    ),
    vscode.commands.registerCommand(
      PACKAGE_EXPLORER_SEARCH_IN_PACKAGE_COMMAND_ID,
      (node: PackageNode | PackageDirectoryNode) =>
        vscode.commands.executeCommand("workbench.action.findInFiles", {
          query: "",
          filesToInclude: node.resourceUri.fsPath,
          triggerSearch: false,
          showIncludesExcludes: true,
        }),
    ),
    vscode.commands.registerCommand(
      PACKAGE_EXPLORER_COPY_PATH_COMMAND_ID,
      (node: ResourceNode) =>
        vscode.env.clipboard.writeText(
          toClipboardPath(node.resourceUri.fsPath),
        ),
    ),
    vscode.commands.registerCommand(
      PACKAGE_EXPLORER_COPY_RELATIVE_PATH_COMMAND_ID,
      (node: PackageDirectoryNode | PackageFileNode) =>
        vscode.env.clipboard.writeText(
          path.relative(
            node.packageNode.resourceUri.fsPath,
            node.resourceUri.fsPath,
          ),
        ),
    ),
    vscode.commands.registerCommand(
      PACKAGE_EXPLORER_REVEAL_IN_OS_COMMAND_ID,
      (node: ResourceNode) =>
        vscode.commands.executeCommand("revealFileInOS", node.resourceUri),
    ),
  );
}

/**
 * Publishes the filter state as context keys, so the view title bar can show
 * the matching filter buttons.
 * @param filters - The current filter state.
 */
async function syncFilterContextKeys(
  filters: PackageExplorerFilters,
): Promise<void> {
  await vscode.commands.executeCommand(
    "setContext",
    DEPENDENCIES_ONLY_CONTEXT_KEY,
    filters.dependenciesOnly,
  );
  await vscode.commands.executeCommand(
    "setContext",
    FILTERS_ACTIVE_CONTEXT_KEY,
    filters.isActive,
  );
}

/**
 * Opens a file from an installed package and marks it read-only, so the
 * contents of an installed package cannot be edited by accident.
 * @param uri - The file to open.
 */
async function openPackageFile(uri: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand("vscode.open", uri, { preview: true });

  // Editable custom editors are the default for file types packages ship, such
  // as `*.cfsconfig`, so the read-only state has to cover every editor type.
  if (getActiveTabUri()?.toString() === uri.toString()) {
    await vscode.commands.executeCommand(
      "workbench.action.files.setActiveEditorReadonlyInSession",
    );
  }
}

/**
 * Gets the resource shown by the active tab, for the tab kinds that are backed
 * by a single file.
 * @returns The active tab resource, or undefined for any other tab kind.
 */
function getActiveTabUri(): vscode.Uri | undefined {
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;

  return input instanceof vscode.TabInputText ||
    input instanceof vscode.TabInputCustom ||
    input instanceof vscode.TabInputNotebook
    ? input.uri
    : undefined;
}
