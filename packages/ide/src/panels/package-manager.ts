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

import { ViewColumn, WebviewPanel, window } from "vscode";
import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import * as fg from "fast-glob";
import * as semver from "semver";
import { Messenger } from "vscode-messenger";
import type {
  CfsCachedPackage,
  CfsPackageManagerProvider,
  CfsPackageReference,
} from "cfs-package-manager";
import { MANIFEST_FILE_NAME } from "cfs-package-manager";
import { ViewProviderPanel } from "../view-provider/view-provider-panel";
import type { SoC } from "cfs-ccm-lib";
import {
  fetchLicenseDataRequest,
  getLoggedInStatusRequest,
  getPackageDependentsRequest,
  getPackageDependenciesBatchRequest,
  getPackageListRequest,
  getPackageDetailsRequest,
  getPackageCacheStateRequest,
  getPreferenceRequest,
  getSocListRequest,
  isLoggedInStatusType,
  packageManagerRemotesUpdatedType,
  openLicensePreviewRequest,
  setPreferenceRequest,
  signInRequest,
  uninstallPackagesRequest,
  type MissingRequiredPackage,
  type PackageListEntry,
  type FetchLicenseDataResponse,
  HIDE_UNINSTALL_CONFIRMATION_KEY,
  installPackagesRequest,
} from "../constants/messages/package-manager-messages";
import {
  getManifestPackages,
  formatErrorForDisplay,
} from "../utils/package-manager";
import { getCatalogManager } from "../utils/catalog";
import { CLOUD_CATALOG_AUTH } from "../commands/constants";
import { EXTENSION_ID, SDK_PATH } from "../constants";
import { SessionManager } from "cfs-lib";
import { AuthConfigParser } from "../utils/auth-config";
import { logger } from "../utils/logger";

/**
 * Reads every `.cfsdependencies` manifest in the workspace and returns a map
 * of package name → all required version constraints collected across manifests.
 * Pure file reads — no conan calls.
 */
async function getRequiredPackages(): Promise<Map<string, string[]>> {
  const required = new Map<string, string[]>();

  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return required;
  }

  const manifestPathLists = await Promise.all(
    folders.map((folder) =>
      fg.async(`**/${MANIFEST_FILE_NAME}`, {
        cwd: folder.uri.fsPath,
        absolute: true,
        dot: true,
        onlyFiles: true,
      }),
    ),
  );

  for (const manifestPath of manifestPathLists.flat()) {
    try {
      for (const pkg of getManifestPackages(manifestPath)) {
        const existing = required.get(pkg.name);
        if (existing) {
          existing.push(pkg.version);
        } else {
          required.set(pkg.name, [pkg.version]);
        }
      }
    } catch {
      // Ignore buggy/malformed manifests
    }
  }

  return required;
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
 * Builds the ordered package list from a set of references, folding in local
 * cache/installed state and workspace-required names. Cached/installed
 * versions are added even if no remote listed them, so an installed package
 * always appears.
 */
async function buildPackageList(
  refs: CfsPackageReference[],
  cachedPackages: CfsCachedPackage[],
  requiredPackages: Map<string, string[]>,
  sdkPath: string | undefined,
): Promise<PackageListEntry[]> {
  const versionsByName = new Map<string, Set<string>>();
  const addVersion = (name: string, version: string) => {
    let versions = versionsByName.get(name);
    if (!versions) {
      versions = new Set<string>();
      versionsByName.set(name, versions);
    }
    versions.add(version);
  };
  for (const ref of refs) {
    addVersion(ref.name, ref.version);
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

  const builtinVersions = await getBuiltinVersions(sdkPath);

  const entries: PackageListEntry[] = [];
  for (const [name, versions] of versionsByName) {
    const requiredVersions = requiredPackages.get(name);
    const builtInVersion = builtinVersions.get(name);
    const installedVersion = installedVersionByName.get(name) ?? builtInVersion;
    entries.push({
      name,
      versions: [...versions],
      isRequired: !!requiredVersions,
      requiredVersions,
      installedVersion: installedVersion,
      cachedVersions: [...(cachedVersionsByName.get(name) ?? [])],
      builtIn: !!builtInVersion,
      builtInVersion,
      state: installedVersion !== undefined ? "installed" : "not-installed",
    });
  }

  return orderPackageList(entries);
}

/**
 * Resolves the full uninstall order for the given package names, expanding each
 * to include its dependents (consumers) first so that packages are always
 * removed before the packages they depend on.
 *
 * NOTE: Batch uninstall is fully supported by the backend (the handler below
 * accepts an array of names), but the frontend currently only ever sends a
 * single package. The batch-uninstall UI was removed from the package list;
 * this capability is retained for when it is reintroduced.
 */
async function resolveUninstallOrder(
  pkgManager: CfsPackageManagerProvider,
  names: string[],
): Promise<string[]> {
  const order: string[] = [];
  const visited = new Set<string>();

  async function visit(name: string): Promise<void> {
    if (visited.has(name)) return;
    visited.add(name);
    const consumers = await pkgManager.localConsumers(name);
    for (const consumer of consumers) {
      await visit(consumer.name);
    }
    order.push(name);
  }

  for (const name of names) {
    await visit(name);
  }
  return order;
}

/**
 * Whether an available version satisfies a required constraint. Coerce's
 * the version with includePrerelease (so a prerelease isn't flattened to
 * its release) + semver.satisfies, with an exact-string fallback for
 * non-semver inputs.
 */
function versionSatisfies(version: string, constraint: string): boolean {
  const coerced = semver.coerce(version, { includePrerelease: true });

  if (coerced) {
    try {
      return semver.satisfies(coerced, constraint);
    } catch {
      return version === constraint;
    }
  }

  return version === constraint;
}

/**
 * Required packages (from workspace manifests) the user has no access to: a
 * required version is "missing" when no version returned by the catalog search
 * satisfies it. Covers both an entirely absent package and an exclusive version
 * (e.g. a prerelease) of an otherwise-visible package. Only the unsatisfiable
 * required versions are reported.
 */
function getMissingRequiredPackages(
  refs: CfsPackageReference[],
  requiredPackages: Map<string, string[]>,
): MissingRequiredPackage[] {
  const availableVersionsByName = new Map<string, string[]>();
  for (const ref of refs) {
    const versions = availableVersionsByName.get(ref.name);
    if (versions) {
      versions.push(ref.version);
    } else {
      availableVersionsByName.set(ref.name, [ref.version]);
    }
  }

  const missing: MissingRequiredPackage[] = [];
  for (const [name, requiredVersions] of requiredPackages) {
    const available = availableVersionsByName.get(name) ?? [];
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

type LicensePreviewParams = {
  packageName: string;
  version: string;
  license: string;
};

const PACKAGE_MANAGER_VIEW_TYPE = "cfs.packman.view";
const LICENSE_PREVIEW_VIEW_TYPE = "cfs.packman.licensePreview";

/** Subdirectory under the SDK install path where bundled tools reside. */
const SDK_TOOLS_SUBDIR = "SDK";
export const BUILTIN_PACKAGE_NAMES = ["msdk", "zephyr"];

export async function isBuiltinPackage(
  sdkPath: string | undefined,
  name: string,
): Promise<boolean> {
  if (!sdkPath || !BUILTIN_PACKAGE_NAMES.includes(name)) return false;
  return (await getBuiltinVersions(sdkPath)).has(name);
}

/**
 * Scans tool.json files under <sdkPath>/SDK and returns a map of
 * tool id -> version for packages in BUILTIN_PACKAGE_NAMES.
 */
async function getBuiltinVersions(
  sdkPath: string | undefined,
): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  if (!sdkPath) return versions;

  const searchDir = path.join(sdkPath, SDK_TOOLS_SUBDIR);
  const toolJsonPaths = await fg.async("**/tool.json", {
    cwd: searchDir,
    onlyFiles: true,
    absolute: true,
    suppressErrors: true,
    deep: 3,
  });

  await Promise.all(
    toolJsonPaths.map(async (toolJsonPath) => {
      try {
        const info = JSON.parse(
          await fs.promises.readFile(toolJsonPath, "utf-8"),
        ) as { id: string; version: string };
        if (BUILTIN_PACKAGE_NAMES.includes(info.id)) {
          versions.set(info.id, info.version);
        }
      } catch (error) {
        console.error(`Failed to parse tool.json at ${toolJsonPath}`, error);
      }
    }),
  );

  return versions;
}

function makeLicensePreviewKey(params: LicensePreviewParams): string {
  return `${params.packageName}@${params.version}`;
}

function makeLicensePreviewTitle(params: LicensePreviewParams): string {
  return `License: ${params.packageName} ${params.version}`;
}

/** Fetches a package's license id and text. Shared by the license-data handlers. */
async function fetchLicenseData(
  pkgManager: CfsPackageManagerProvider | undefined,
  name: string,
  version: string,
): Promise<FetchLicenseDataResponse> {
  if (!pkgManager) {
    throw new Error("Package Manager not available");
  }

  const pkg = await pkgManager.getPackageInfo({ name, version });

  return {
    packageName: name,
    version,
    licenseId: pkg.license,
    licenseText: pkg.licenseText,
  };
}

function validatePreferenceKey(
  key: string,
): asserts key is typeof HIDE_UNINSTALL_CONFIRMATION_KEY {
  if (key !== HIDE_UNINSTALL_CONFIRMATION_KEY) {
    throw new Error(`Unsupported preference key: ${key}`);
  }
}

export class PackageManagerPagePanel {
  public static currentPanel: PackageManagerPagePanel | undefined;
  private static readonly licensePreviewPanels = new Map<
    string,
    WebviewPanel
  >();

  private readonly _panel: WebviewPanel;
  private readonly _viewProviderPanel: ViewProviderPanel;
  private _sessionManager: SessionManager | undefined;
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: WebviewPanel,
    context: vscode.ExtensionContext,
    messenger: Messenger,
    pkgManager: CfsPackageManagerProvider | undefined,
  ) {
    this._panel = panel;
    this._viewProviderPanel = new ViewProviderPanel(context, {
      distDir: "out/package-manager",
      indexPath: "out/package-manager/index.html",
    });

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._registerMessengerHandlers(context, messenger, pkgManager);

    void this._viewProviderPanel.resolveWebviewView(this._panel);
  }

  private getLoggedInStatus = async (): Promise<boolean> => {
    try {
      // initialize session manager if it has failed before
      if (!this._sessionManager) {
        const authConfig = new AuthConfigParser().getConfig();
        this._sessionManager = new SessionManager(authConfig);
      }

      const session = await this._sessionManager.getSession();
      return Boolean(session);
    } catch (error) {
      console.debug(
        "Failed to check login status:",
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  };

  private _registerMessengerHandlers(
    context: vscode.ExtensionContext,
    messenger: Messenger,
    pkgManager: CfsPackageManagerProvider | undefined,
  ) {
    const participant = messenger.registerWebviewPanel(this._panel, {
      broadcastMethods: [
        isLoggedInStatusType.method,
        packageManagerRemotesUpdatedType.method,
      ],
    });

    // Register handlers for messages from the webview
    const handlers: vscode.Disposable[] = [
      messenger.onRequest(
        getPackageListRequest,
        async ({ pattern }) => {
          if (!pkgManager) {
            throw new Error("Package Manager not available");
          }

          const searchPattern = pattern ? `${pattern}*` : "*/*";

          // Cheap calls only: refs from remotes, local cache state, and the
          // required-package versions from workspace manifests. No per-package
          // metadata — that is fetched via the details (batch) request.
          const [refs, cachedPackages, requiredPackages] = await Promise.all([
            pkgManager.search(searchPattern),
            pkgManager.listCache(searchPattern),
            getRequiredPackages(),
          ]);

          const sdkPath = vscode.workspace
            .getConfiguration(EXTENSION_ID)
            .get<string>(SDK_PATH);
          const packageList = await buildPackageList(
            refs,
            cachedPackages,
            requiredPackages,
            sdkPath,
          );

          const missingRequiredPackages = getMissingRequiredPackages(
            refs,
            requiredPackages,
          );

          return { packageList, missingRequiredPackages };
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getPackageDetailsRequest,
        async ({ references }) => {
          if (!pkgManager) {
            throw new Error("Package Manager not available");
          }

          const packages = await pkgManager.getPackageInfo(references);
          return { packages };
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getPackageCacheStateRequest,
        async ({ names }) => {
          if (!pkgManager) {
            throw new Error("Package Manager not available");
          }
          if (names.length === 0) {
            return { cached: [] };
          }

          const requested = new Set(names);
          const cached = await pkgManager.listCache(
            names.length === 1 ? `${names[0]}/*` : "*/*",
          );

          return {
            cached: cached.filter((pkg) => requested.has(pkg.reference.name)),
          };
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getSocListRequest,
        async () => {
          const catalogManager = await getCatalogManager();
          if (!catalogManager) {
            throw new Error("Catalog Manager not available");
          }

          await catalogManager.loadCatalog();
          const socs = await catalogManager.socCatalog.getAll();

          return {
            socs: socs
              .map((soc: SoC) => ({ id: soc.id, name: soc.name }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          };
        },
        { sender: participant },
      ),
      messenger.onRequest(
        signInRequest,
        async () => {
          await vscode.commands.executeCommand(CLOUD_CATALOG_AUTH.LOGIN);
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getLoggedInStatusRequest,
        async () => ({ loggedIn: await this.getLoggedInStatus() }),
        { sender: participant },
      ),
      messenger.onRequest(
        installPackagesRequest,
        async ({ packages, options }) => {
          if (!pkgManager) {
            throw new Error("Package Manager not available");
          }
          if (packages.length === 0) {
            throw new Error("No packages provided for install");
          }

          const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title:
              packages.length > 1
                ? `CFS: Installing ${packages.length} selected packages...`
                : `CFS: Installing package ${packages[0].name}/${packages[0].version}...`,
            cancellable: false,
          };

          // Which packages are already present, asked *before* installing —
          // afterwards everything is installed and the distinction is lost.
          let alreadyInstalled: CfsPackageReference[] = [];
          try {
            const plan = await pkgManager.getInstallPlan(packages);
            alreadyInstalled = plan.alreadyInstalled;
          } catch (err) {
            // Non-fatal: the install itself is unaffected. The webview just
            // falls back to reporting skipped packages as failures.
            logger.warn("Failed to compute install plan:", err);
          }

          try {
            const installed = await vscode.window.withProgress(
              progressOptions,
              () => pkgManager.install(packages, options),
            );

            if (installed.length > 0) {
              vscode.window.showInformationMessage(
                `CFS: Successfully installed ${installed
                  .map((r) => r.name)
                  .join(", ")}.`,
              );
            }

            return {
              successful: true,
              installed,
              alreadyInstalled,
            };
          } catch (err) {
            logger.error("Failed to install packages:", err);
            const errorDetail = formatErrorForDisplay(err);
            const baseMessage =
              packages.length > 1
                ? "Failed to install selected packages (and any dependents)."
                : "Failed to install selected package (and any dependents).";
            vscode.window.showErrorMessage(`${baseMessage}${errorDetail}`);
            return { successful: false, installed: [], alreadyInstalled };
          }
        },
        { sender: participant },
      ),
      // Accepts a batch of package names to uninstall. The backend handles
      // batches (including dependent resolution), but the frontend currently
      // only sends one name at a time since the batch-uninstall UI is not yet
      // implemented in the package list.
      messenger.onRequest(
        uninstallPackagesRequest,
        async ({ names }) => {
          if (!pkgManager) {
            throw new Error("Package Manager not available");
          }
          if (names.length === 0) {
            throw new Error("No package names provided for uninstall");
          }
          const uninstalledSoFar: string[] = [];

          try {
            const allNames = await resolveUninstallOrder(pkgManager, names);

            const progressOptions: vscode.ProgressOptions = {
              location: vscode.ProgressLocation.Notification,
              title: `CFS: Uninstalling package${
                allNames.length > 1 ? "s" : ""
              }...`,
              cancellable: false,
            };

            // Checking again for safety because the packages might have changed
            const sdkPath = vscode.workspace
              .getConfiguration(EXTENSION_ID)
              .get<string>(SDK_PATH);
            const builtinVersions = await getBuiltinVersions(sdkPath);

            await vscode.window.withProgress(progressOptions, async () => {
              for (const name of allNames) {
                const builtinVersion = builtinVersions.get(name);
                if (builtinVersion !== undefined) {
                  const cached = await pkgManager.listCache(`${name}/*`);
                  const installedVersion = cached.find(
                    (p) => p.isInstalled && p.reference.name === name,
                  )?.reference.version;
                  if (installedVersion === builtinVersion) {
                    vscode.window.showWarningMessage(
                      `Cannot uninstall built-in package: ${name}`,
                    );
                    continue;
                  }
                }
                await pkgManager.uninstall(name);
                uninstalledSoFar.push(name);
              }
              if (uninstalledSoFar.length > 0) {
                vscode.window.showInformationMessage(
                  uninstalledSoFar.length > 1
                    ? `${uninstalledSoFar.length} packages uninstalled successfully.`
                    : `Package uninstalled successfully.`,
                );
              }
            });
            // Return successful only when every resolved package was actually
            // uninstalled. If any were skipped (e.g. built-in), use
            // successful:false so the webview restores their optimistic state.
            return {
              successful: uninstalledSoFar.length === allNames.length,
              uninstalledNames: uninstalledSoFar,
            };
          } catch (error) {
            logger.error("Failed to uninstall packages:", error);
            const errorDetail = formatErrorForDisplay(error);
            const baseMessage =
              names.length > 1
                ? "Failed to uninstall selected packages (and any dependents)."
                : "Failed to uninstall selected package (and any dependents).";
            vscode.window.showErrorMessage(`${baseMessage}${errorDetail}`);
            return { successful: false, uninstalledNames: uninstalledSoFar };
          }
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getPackageDependentsRequest,
        async ({ reference }) => {
          if (!pkgManager) {
            throw new Error("Package Manager not available");
          }

          return pkgManager.localConsumers(reference.name);
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getPackageDependenciesBatchRequest,
        async ({ references }) => {
          if (!pkgManager) {
            throw new Error("Package Manager not available");
          }

          return pkgManager.dependenciesBatch(references);
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getPreferenceRequest,
        async ({ key }) => {
          validatePreferenceKey(key);
          return context.globalState.get<boolean>(key) ?? false;
        },
        { sender: participant },
      ),
      messenger.onRequest(
        setPreferenceRequest,
        async ({ key, value }) => {
          validatePreferenceKey(key);
          await context.globalState.update(key, value);
        },
        { sender: participant },
      ),
      messenger.onRequest(
        openLicensePreviewRequest,
        ({ name, version, license }) => {
          PackageManagerPagePanel.renderLicensePreview(
            context,
            messenger,
            pkgManager,
            {
              packageName: name,
              version,
              license,
            },
          );
        },
        { sender: participant },
      ),
      messenger.onRequest(
        fetchLicenseDataRequest,
        async ({ name, version }) =>
          fetchLicenseData(pkgManager, name, version),
        { sender: participant },
      ),
    ];

    this._disposables.push(...handlers);
  }

  public static render(
    context: vscode.ExtensionContext,
    messenger: Messenger,
    pkgManager: CfsPackageManagerProvider | undefined,
  ) {
    if (PackageManagerPagePanel.currentPanel) {
      // If the webview panel already exists reveal it
      PackageManagerPagePanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        PACKAGE_MANAGER_VIEW_TYPE,
        // Panel title
        "CFS Package Manager",
        // The editor column the panel should be displayed in
        ViewColumn.One,
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          retainContextWhenHidden: true,
        },
      );

      PackageManagerPagePanel.currentPanel = new PackageManagerPagePanel(
        panel,
        context,
        messenger,
        pkgManager,
      );
    }
  }

  /**
   * Determines the target editor column for a new license preview tab.
   *
   * If any license preview panel is already open, its column is reused so
   * that additional license previews open as tabs within the same editor
   * group. When no license preview is open, {@link ViewColumn.Beside} is
   * returned to create a new group beside the active editor.
   *
   * @returns The {@link ViewColumn} in which the new license preview should open.
   */
  private static getLicensePreviewTargetColumn(): ViewColumn {
    for (const panel of PackageManagerPagePanel.licensePreviewPanels.values()) {
      if (panel.viewColumn !== undefined) {
        return panel.viewColumn;
      }
    }

    return ViewColumn.Beside;
  }

  /**
   * Opens the license preview in a new editor tab. The new tab loads the same
   * package-manager webview, but with `commandArgs` to instead load
   * `<LicensePreviewPage />` component (instead of the package list).
   *
   * Re-opening the same `{packageName, version}` reveals the
   * existing tab instead of creating a duplicate.
   */
  public static renderLicensePreview(
    context: vscode.ExtensionContext,
    messenger: Messenger,
    pkgManager: CfsPackageManagerProvider | undefined,
    params: LicensePreviewParams,
  ) {
    const key = makeLicensePreviewKey(params);
    const existing = PackageManagerPagePanel.licensePreviewPanels.get(key);
    if (existing) {
      existing.reveal(existing.viewColumn ?? ViewColumn.Beside, false);
      return;
    }

    const panel = window.createWebviewPanel(
      LICENSE_PREVIEW_VIEW_TYPE,
      makeLicensePreviewTitle(params),
      PackageManagerPagePanel.getLicensePreviewTargetColumn(),
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    PackageManagerPagePanel.licensePreviewPanels.set(key, panel);

    // Register the panel with vscode-messenger so the webview can
    // send requests to the extension host.
    const participant = messenger.registerWebviewPanel(panel);

    const fetchHandler = messenger.onRequest(
      fetchLicenseDataRequest,
      async ({ name, version }) => {
        const data = await fetchLicenseData(pkgManager, name, version);
        // Update the panel title now that we have the license id
        panel.title = `License: ${data.licenseId} - ${params.packageName} ${params.version}`;

        return data;
      },
      { sender: participant },
    );

    panel.onDidDispose(() => {
      PackageManagerPagePanel.licensePreviewPanels.delete(key);
      fetchHandler.dispose();
    });

    const viewProvider = new ViewProviderPanel(context, {
      distDir: "out/package-manager",
      indexPath: "out/package-manager/index.html",
    });

    void viewProvider.resolveWebviewView(panel, {
      view: "license-preview",
      packageName: params.packageName,
      packageVersion: params.version,
      packageLicense: params.license,
    });
  }

  public dispose() {
    PackageManagerPagePanel.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) associated with the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
