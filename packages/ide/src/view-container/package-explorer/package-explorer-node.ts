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
import { CfsInstalledPackage } from "cfs-package-manager";
import { PACKAGE_EXPLORER_OPEN_FILE_COMMAND_ID } from "../../commands/constants";

export const PACKAGE_CONTEXT_VALUE = "cfsPackage";
export const PACKAGE_FOLDER_CONTEXT_VALUE = "cfsPackageFolder";
export const PACKAGE_FILE_CONTEXT_VALUE = "cfsPackageFile";

/**
 * A node representing an installed CFS package. Acts as the root of a package's
 * file tree; `resourceUri` points at the package install directory.
 */
export class PackageNode extends vscode.TreeItem {
  public readonly resourceUri: vscode.Uri;

  constructor(public readonly installedPackage: CfsInstalledPackage) {
    super(installedPackage.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.resourceUri = vscode.Uri.file(installedPackage.path);
    this.id = `cfs-package:${installedPackage.name}@${installedPackage.version}`;
    this.description = installedPackage.version;
    this.contextValue = PACKAGE_CONTEXT_VALUE;
    this.iconPath = new vscode.ThemeIcon("package");
    this.tooltip = buildPackageTooltip(installedPackage);
  }
}

/**
 * A node representing a directory inside an installed package.
 */
export class PackageDirectoryNode extends vscode.TreeItem {
  constructor(
    public readonly resourceUri: vscode.Uri,
    public readonly packageNode: PackageNode,
    public readonly parent: PackageExplorerNode,
    isSymbolicLink = false,
  ) {
    // Symbolic links are not expanded, to avoid cycles within a package tree.
    super(
      resourceUri,
      isSymbolicLink
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Collapsed,
    );

    this.id = `cfs-package-dir:${resourceUri.fsPath}`;
    this.contextValue = PACKAGE_FOLDER_CONTEXT_VALUE;

    if (isSymbolicLink) {
      this.description = vscode.l10n.t("symbolic link");
      this.iconPath = new vscode.ThemeIcon("file-symlink-directory");
    }
  }
}

/**
 * A node representing a file inside an installed package.
 */
export class PackageFileNode extends vscode.TreeItem {
  constructor(
    public readonly resourceUri: vscode.Uri,
    public readonly packageNode: PackageNode,
    public readonly parent: PackageExplorerNode,
  ) {
    super(resourceUri, vscode.TreeItemCollapsibleState.None);

    this.id = `cfs-package-file:${resourceUri.fsPath}`;
    this.contextValue = PACKAGE_FILE_CONTEXT_VALUE;
    this.command = {
      command: PACKAGE_EXPLORER_OPEN_FILE_COMMAND_ID,
      title: vscode.l10n.t("Open Package File"),
      arguments: [resourceUri],
    };
  }
}

export type PackageExplorerNode =
  | PackageNode
  | PackageDirectoryNode
  | PackageFileNode;

/**
 * Builds the hover tooltip shown for a package node.
 * @param installedPackage - The installed package the node represents.
 * @returns A markdown tooltip listing the version, type and install path.
 */
function buildPackageTooltip(
  installedPackage: CfsInstalledPackage,
): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString();
  tooltip.appendMarkdown(`**${installedPackage.name}**\n\n`);
  tooltip.appendMarkdown(
    `${vscode.l10n.t("Version: `{0}`", installedPackage.version)}\n\n`,
  );

  if (installedPackage.type) {
    tooltip.appendMarkdown(
      `${vscode.l10n.t("Type: `{0}`", installedPackage.type)}\n\n`,
    );
  }

  tooltip.appendMarkdown(vscode.l10n.t("Path: `{0}`", installedPackage.path));

  return tooltip;
}
