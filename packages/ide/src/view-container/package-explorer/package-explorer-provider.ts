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
import type {
  CfsInstalledPackage,
  CfsPackageManagerProvider,
} from "cfs-package-manager";
import { logger } from "../../utils/logger";
import { getRequiredPackages } from "../../utils/package-manager";
import { PackageExplorerFilters } from "./package-explorer-filters";
import {
  comparePackageNames,
  sortPackageEntries,
} from "./package-explorer-utils";
import {
  PackageDirectoryNode,
  PackageExplorerNode,
  PackageFileNode,
  PackageNode,
} from "./package-explorer-node";

/** Drives whether the view shows its "no packages are installed" welcome content. */
const HAS_PACKAGES_CONTEXT_KEY = "cfs.packageExplorer.hasPackages";

/** Suppresses the welcome content when the installed package list could not be read. */
const LOAD_FAILED_CONTEXT_KEY = "cfs.packageExplorer.loadFailed";

/**
 * Supplies the tree data for the Packages view, which lists the installed CFS
 * packages and lazily browses the contents of each package install directory.
 */
export class PackageExplorerProvider implements vscode.TreeDataProvider<PackageExplorerNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    PackageExplorerNode | undefined
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // Package manager calls serialize on a cross process lock, so the installed
  // package list is fetched once per refresh and reused for every expansion.
  private installedPackages: Promise<CfsInstalledPackage[]> | undefined;
  private requiredPackageNames: Promise<ReadonlySet<string>> | undefined;
  private treeView: vscode.TreeView<PackageExplorerNode> | undefined;

  constructor(
    private readonly pkgManager: CfsPackageManagerProvider | undefined,
    private readonly filters: PackageExplorerFilters,
  ) {}

  /**
   * Associates the view this provider feeds, so it can show status messages.
   * @param treeView - The Packages tree view.
   */
  attachTreeView(treeView: vscode.TreeView<PackageExplorerNode>): void {
    this.treeView = treeView;
  }

  /**
   * Discards cached package data and asks the view to reload. Use when the
   * installed packages or the workspace manifests may have changed.
   * @param node - The subtree to reload. Reloads the whole view when omitted.
   */
  refresh(node?: PackageExplorerNode): void {
    if (!node) {
      this.installedPackages = undefined;
      this.requiredPackageNames = undefined;
    }

    this._onDidChangeTreeData.fire(node);
  }

  /**
   * Repaints the view from the cached package data. Use when only presentation
   * state, such as the active filters, has changed.
   */
  refreshView(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  /**
   * Gets the installed packages, ignoring the active filters.
   * @returns The full installed package list.
   * @throws When the package manager cannot read the installed package list.
   */
  async getInstalledPackages(): Promise<CfsInstalledPackage[]> {
    if (!this.pkgManager) {
      return [];
    }

    this.installedPackages ??= this.pkgManager.getInstalledPackageInfo();

    return this.installedPackages;
  }

  /**
   * Gets the tree item associated with the specified element.
   * @param element - The element for which the UI representation is needed.
   * @returns The tree item representation of the provided element.
   */
  getTreeItem(element: PackageExplorerNode): vscode.TreeItem {
    return element;
  }

  /**
   * Gets the parent of the given element, so the view supports `reveal`.
   * @param element - The element whose parent is requested.
   * @returns The parent node, or undefined for a root level package.
   */
  getParent(element: PackageExplorerNode): PackageExplorerNode | undefined {
    return element instanceof PackageNode ? undefined : element.parent;
  }

  /**
   * Retrieves the children for an element in the tree view.
   * @param element - The parent element, or undefined for the root level.
   * @returns The packages matching the active filters at the root level, or the
   * directory entries contained in the given package or folder node.
   */
  async getChildren(
    element?: PackageExplorerNode,
  ): Promise<PackageExplorerNode[]> {
    if (!element) {
      return this.getRootNodes();
    }

    if (element instanceof PackageFileNode) {
      return [];
    }

    const packageNode =
      element instanceof PackageNode ? element : element.packageNode;

    return this.getDirectoryEntries(element.resourceUri, packageNode, element);
  }

  /**
   * Builds the root level nodes from the packages matching the active filters.
   * @returns A node per matching package, sorted by package name.
   */
  private async getRootNodes(): Promise<PackageNode[]> {
    let packages: CfsInstalledPackage[];

    try {
      packages = await this.getInstalledPackages();
    } catch (error) {
      logger.error(`Failed to list installed packages: ${String(error)}`);
      this.showLoadFailure();

      return [];
    }

    void vscode.commands.executeCommand(
      "setContext",
      LOAD_FAILED_CONTEXT_KEY,
      false,
    );
    void vscode.commands.executeCommand(
      "setContext",
      HAS_PACKAGES_CONTEXT_KEY,
      packages.length > 0,
    );

    if (packages.length === 0) {
      // The view's welcome content already explains that nothing is installed.
      this.clearViewHeader();

      return [];
    }

    const requiredNames = await this.getRequiredPackageNames();
    const matching = this.filters.apply(packages, requiredNames);

    this.updateViewHeader(
      matching.length,
      packages.length,
      requiredNames.size > 0,
    );

    return [...matching]
      .sort((a, b) => comparePackageNames(a.name, b.name))
      .map((installedPackage) => new PackageNode(installedPackage));
  }

  /**
   * Removes the filter summary and status message from the view header.
   */
  private clearViewHeader(): void {
    if (!this.treeView) {
      return;
    }

    this.treeView.description = undefined;
    this.treeView.message = undefined;
  }

  /**
   * Reports that the installed package list could not be read, so the failure
   * is not mistaken for an empty installation.
   */
  private showLoadFailure(): void {
    void vscode.commands.executeCommand(
      "setContext",
      LOAD_FAILED_CONTEXT_KEY,
      true,
    );

    if (!this.treeView) {
      return;
    }

    this.treeView.description = undefined;
    this.treeView.message = vscode.l10n.t(
      "Could not load the installed packages. Refresh the view to try again.",
    );
  }

  /**
   * Reflects the active filters in the view header.
   * @param shown - The number of packages currently listed.
   * @param total - The number of installed packages.
   * @param hasWorkspaceDependencies - Whether the workspace declares any package dependencies.
   */
  private updateViewHeader(
    shown: number,
    total: number,
    hasWorkspaceDependencies: boolean,
  ): void {
    if (!this.treeView) {
      return;
    }

    this.treeView.description = this.filters.isActive
      ? vscode.l10n.t("{0} of {1}", shown, total)
      : undefined;
    this.treeView.message = this.getEmptyStateMessage(
      shown,
      hasWorkspaceDependencies,
    );
  }

  /**
   * Builds the message shown when the active filters leave the view empty.
   * @param shown - The number of packages currently listed.
   * @param hasWorkspaceDependencies - Whether the workspace declares any package dependencies.
   * @returns The message to show, or undefined when packages are listed.
   */
  private getEmptyStateMessage(
    shown: number,
    hasWorkspaceDependencies: boolean,
  ): string | undefined {
    if (shown > 0 || !this.filters.isActive) {
      return undefined;
    }

    // The dependency filter is on by default, so an empty workspace needs an explanation.
    if (this.filters.dependenciesOnly && !hasWorkspaceDependencies) {
      return vscode.l10n.t(
        "This workspace does not declare any package dependencies. Use Show All Installed Packages to browse every installed package.",
      );
    }

    return vscode.l10n.t("No packages match the current filters.");
  }

  /**
   * Gets the package names declared in the workspace `.cfsdependencies` manifests.
   * @returns The set of required package names for the current workspace.
   */
  private async getRequiredPackageNames(): Promise<ReadonlySet<string>> {
    let pending = this.requiredPackageNames;

    if (!pending) {
      pending = getRequiredPackages()
        .then((required) => new Set(required.keys()))
        .catch((error: unknown) => {
          logger.error(
            `Failed to read workspace package manifests: ${String(error)}`,
          );

          return new Set<string>();
        });
      this.requiredPackageNames = pending;
    }

    return pending;
  }

  /**
   * Reads a single directory level inside a package.
   * @param uri - The directory to read.
   * @param packageNode - The package node owning the directory.
   * @param parent - The node the entries are rendered under.
   * @returns The directory entries, with folders listed before files.
   */
  private async getDirectoryEntries(
    uri: vscode.Uri,
    packageNode: PackageNode,
    parent: PackageExplorerNode,
  ): Promise<PackageExplorerNode[]> {
    let entries: [string, vscode.FileType][];

    try {
      entries = await vscode.workspace.fs.readDirectory(uri);
    } catch (error) {
      logger.error(`Failed to read ${uri.fsPath}: ${String(error)}`);

      return [];
    }

    const sorted = sortPackageEntries(
      entries.map(([name, fileType]) => ({
        name,
        fileType,
        isDirectory: (fileType & vscode.FileType.Directory) !== 0,
      })),
    );

    return sorted.map(({ name, fileType, isDirectory }) => {
      const entryUri = vscode.Uri.joinPath(uri, name);

      return isDirectory
        ? new PackageDirectoryNode(
            entryUri,
            packageNode,
            parent,
            (fileType & vscode.FileType.SymbolicLink) !== 0,
          )
        : new PackageFileNode(entryUri, packageNode, parent);
    });
  }
}
