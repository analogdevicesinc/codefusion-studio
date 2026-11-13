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
import { Messenger } from "vscode-messenger";
import type {
  CfsPackageManagerProvider,
  CfsPackageReference,
} from "cfs-package-manager";
import { isConanGraphFailure } from "cfs-package-manager";
import { BROADCAST } from "vscode-messenger-common";
import { ViewProviderPanel } from "../view-provider/view-provider-panel";
import {
  addRemoteRequest,
  customRemoteIndexingType,
  fetchLicenseDataRequest,
  getCustomRemoteIndexingRequest,
  getInstallPlanRequest,
  getLoggedInStatusRequest,
  getPackageDependentsRequest,
  getPackageDependenciesBatchRequest,
  getPackageListRequest,
  getPackageCacheStateRequest,
  getPreferenceRequest,
  getRemotesRequest,
  getSocListRequest,
  isLoggedInStatusType,
  packageManagerRemotesUpdatedType,
  openLicensePreviewRequest,
  removeRemoteRequest,
  setPreferenceRequest,
  setRemoteCredentialsRequest,
  setRemoteEnabledRequest,
  signInRequest,
  uninstallPackagesRequest,
  type PackageManagerRemoteCredentials,
  type RemotesChangeResult,
  type FetchLicenseDataResponse,
  HIDE_UNINSTALL_CONFIRMATION_KEY,
  installPackagesRequest,
  installProgressShownNotification,
  PKG_MANAGER_NOT_AVAILABLE,
} from "../constants/messages/package-manager-messages";
import {
  getRequiredPackages,
  formatErrorForDisplay,
  listWebviewRemotes,
} from "../utils/package-manager";
import type { PackageCatalogService } from "../utils/package-catalog";
import type { CustomRemoteCatalogService } from "../utils/custom-remote-catalog";
import { getCatalogManager } from "../utils/catalog";
import {
  buildPackageList,
  getMissingRequiredPackages,
  filterByEnabledRemotes,
} from "../utils/package-list";
import { CLOUD_CATALOG_AUTH } from "../commands/constants";
import { EXTENSION_ID, SDK_PATH } from "../constants";
import type { AuthService } from "../services/auth-service";
import { logger } from "../utils/logger";
import {
  PackageManagerRemotesWatcher,
  type RemotesFiles,
} from "../providers/package-manager-remotes-file-watcher";

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

type LicensePreviewParams = {
  packageName: string;
  version: string;
  license: string;
};

const PACKAGE_MANAGER_VIEW_TYPE = "cfs.packman.view";
const LICENSE_PREVIEW_VIEW_TYPE = "cfs.packman.licensePreview";
const PACKAGE_CATALOG_NOT_AVAILABLE = "Package catalog not available";

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
    throw new Error(PKG_MANAGER_NOT_AVAILABLE);
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

/**
 * Applies a remotes change requested by the webview, reports its success to
 * the user and resolves with the updated remote list. A failure is reported
 * to the user here and then passed on, so the webview only has to roll back
 * its own state.
 *
 * If the change goes through but the list can't be read back, that is
 * reported too, and the result is `undefined` rather than a rejection: the
 * webview must not roll back a change that was applied.
 */
async function changeRemotes(
  pkgManager: CfsPackageManagerProvider | undefined,
  customRemoteCatalog: CustomRemoteCatalogService | undefined,
  failureMessage: string,
  successMessage: string,
  change: (pkgManager: CfsPackageManagerProvider) => Promise<void>,
): Promise<RemotesChangeResult> {
  if (!pkgManager) {
    throw new Error(PKG_MANAGER_NOT_AVAILABLE);
  }

  // A change rewrites the remotes files more than once; notify once, after the
  // updated list has been read back for the response
  let files: RemotesFiles | undefined;
  return PackageManagerRemotesWatcher.pause(
    async () => {
      try {
        await change(pkgManager);
      } catch (error) {
        logger.error(`${failureMessage}:`, error);
        void vscode.window.showErrorMessage(
          `CFS: ${failureMessage}.${formatErrorForDisplay(error)}`,
        );
        throw error;
      }

      void vscode.window.showInformationMessage(`CFS: ${successMessage}.`);

      try {
        // Read before the list, so the list is at least as new as the files
        files = await PackageManagerRemotesWatcher.readFiles?.();
        return await listWebviewRemotes(pkgManager, customRemoteCatalog);
      } catch (error) {
        logger.error("Failed to refresh the remote list:", error);
        void vscode.window.showErrorMessage(
          `CFS: Failed to refresh the remote list.${formatErrorForDisplay(error)}`,
        );
        return undefined;
      }
    },
    // The webviews take these remotes instead of reloading them
    (remotes) => (remotes && files ? { remotes, files } : undefined),
  );
}

/**
 * Throws unless the credentials are complete. Conan asks for a missing
 * password interactively, which a background call can never answer.
 */
function assertLoginCredentials(
  credentials: Extract<
    PackageManagerRemoteCredentials,
    { auth: "usernamePassword" }
  >,
): void {
  if (!credentials.username || !credentials.password) {
    throw new Error("A username and password are required to log in.");
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
  private _disposables: vscode.Disposable[] = [];

  private constructor(
    panel: WebviewPanel,
    context: vscode.ExtensionContext,
    messenger: Messenger,
    pkgManager: CfsPackageManagerProvider | undefined,
    packageCatalog: PackageCatalogService | undefined,
    customRemoteCatalog: CustomRemoteCatalogService | undefined,
    private readonly authService: AuthService,
  ) {
    this._panel = panel;
    this._viewProviderPanel = new ViewProviderPanel(context, {
      distDir: "out/package-manager",
      indexPath: "out/package-manager/index.html",
    });

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._registerMessengerHandlers(
      context,
      messenger,
      pkgManager,
      packageCatalog,
      customRemoteCatalog,
    );

    void this._viewProviderPanel.resolveWebviewView(this._panel);
  }

  private getLoggedInStatus = async (): Promise<boolean> => {
    try {
      const session = await this.authService.getSession();
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
    packageCatalog: PackageCatalogService | undefined,
    customRemoteCatalog: CustomRemoteCatalogService | undefined,
  ) {
    const participant = messenger.registerWebviewPanel(this._panel, {
      broadcastMethods: [
        isLoggedInStatusType.method,
        packageManagerRemotesUpdatedType.method,
        customRemoteIndexingType.method,
      ],
    });

    // Credentials live in conan's own database, which the remotes file watcher
    // doesn't see, so logins and logouts are announced here. They change which
    // packages the remotes offer, and whether the custom ones can be indexed,
    // so those are indexed again too.
    const announceCredentialsChange = () => {
      messenger.sendNotification(
        packageManagerRemotesUpdatedType,
        BROADCAST,
        undefined,
      );
      customRemoteCatalog?.update();
    };

    // Register handlers for messages from the webview
    const handlers: vscode.Disposable[] = [
      messenger.onRequest(
        getPackageListRequest,
        async () => {
          if (!pkgManager) {
            throw new Error(PKG_MANAGER_NOT_AVAILABLE);
          }
          if (!packageCatalog) {
            throw new Error(PACKAGE_CATALOG_NOT_AVAILABLE);
          }

          // Names, versions and per-version metadata come from the catalog and
          // the custom remotes; Conan contributes cache / installed state and
          // which remotes are enabled. Manifests and bundled tools are local.
          const sdkPath = vscode.workspace
            .getConfiguration(EXTENSION_ID)
            .get<string>(SDK_PATH);
          const [
            catalogPackages,
            customPackages,
            remotes,
            cachedPackages,
            requiredPackages,
            builtinVersions,
          ] = await Promise.all([
            packageCatalog.getPackages(),
            customRemoteCatalog?.getPackages() ?? [],
            pkgManager.listRemoteStates(),
            pkgManager.listCache("*/*"),
            getRequiredPackages(),
            getBuiltinVersions(sdkPath),
          ]);
          const packages = filterByEnabledRemotes(
            [...catalogPackages, ...customPackages],
            remotes,
          );

          return {
            packageList: buildPackageList(
              packages,
              cachedPackages,
              requiredPackages,
              builtinVersions,
            ),
            missingRequiredPackages: getMissingRequiredPackages(
              packages,
              requiredPackages,
            ),
          };
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getPackageCacheStateRequest,
        async ({ names }) => {
          if (!pkgManager) {
            throw new Error(PKG_MANAGER_NOT_AVAILABLE);
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
          // A fresh manager per request picks up the current session, so
          // restricted SoCs appear after login; it is disposed afterwards.
          const catalogManager = await getCatalogManager(this.authService);
          if (!catalogManager) {
            throw new Error("Catalog Manager not available");
          }

          try {
            await catalogManager.loadCatalog();
            const socs = await catalogManager.socCatalog.getAll();

            return {
              socs: socs
                .map((soc) => ({ id: soc.id, name: soc.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
            };
          } finally {
            await catalogManager.dispose();
          }
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
            throw new Error(PKG_MANAGER_NOT_AVAILABLE);
          }
          if (packages.length === 0) {
            throw new Error("No packages provided for install");
          }

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
            // Install without showing progress notification here.
            // The notification is shown earlier by installProgressShownNotification handler
            // when the install progress page mounts, so users see it immediately.
            const installed = await pkgManager.install(packages, options);

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
      // Show VS Code notification immediately when install progress page is shown
      messenger.onNotification(
        installProgressShownNotification,
        ({ packageCount, packages }) => {
          const title =
            packageCount > 1
              ? `CFS: Installing ${packageCount} selected packages...`
              : `CFS: Installing package ${packages[0].name}/${packages[0].version}...`;

          vscode.window.showInformationMessage(title);
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
            throw new Error(PKG_MANAGER_NOT_AVAILABLE);
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
            throw new Error(PKG_MANAGER_NOT_AVAILABLE);
          }

          return pkgManager.localConsumers(reference.name);
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getPackageDependenciesBatchRequest,
        async ({ references }) => {
          if (!pkgManager) {
            throw new Error(PKG_MANAGER_NOT_AVAILABLE);
          }

          try {
            return {
              dependencies: await pkgManager.dependenciesBatch(references),
            };
          } catch (error) {
            // A conflict describes the selection rather than a broken call, so
            // it travels in the response where its structure survives.
            if (isConanGraphFailure(error)) {
              // In case of a conflict, resolve each package individually to avoid Conan failure
              // Conan fails on first conflict encounter, leaving dependencies empty
              let dependencies: Record<string, CfsPackageReference[]> = {};

              try {
                dependencies =
                  await pkgManager.dependenciesSequential(references);
              } catch {
                // TODO: Display generic error
              }

              return {
                dependencies,
                conflict: error.conflict,
                failure: error.message,
              };
            }

            throw error;
          }
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getInstallPlanRequest,
        async ({ input }) => {
          if (!pkgManager) {
            throw new Error(PKG_MANAGER_NOT_AVAILABLE);
          }

          return pkgManager.getInstallPlan(input);
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
      messenger.onRequest(
        getRemotesRequest,
        async () => {
          if (!pkgManager) {
            throw new Error(PKG_MANAGER_NOT_AVAILABLE);
          }

          return listWebviewRemotes(pkgManager, customRemoteCatalog);
        },
        { sender: participant },
      ),
      messenger.onRequest(
        getCustomRemoteIndexingRequest,
        () => customRemoteCatalog?.indexing ?? { remotes: [] },
        { sender: participant },
      ),
      messenger.onRequest(
        addRemoteRequest,
        async ({ name, url, credentials }) => {
          const performAddRemote = () =>
            changeRemotes(
              pkgManager,
              customRemoteCatalog,
              `Failed to add remote "${name}"`,
              `Successfully added remote "${name}" with URL "${url}"`,
              async (pm) => {
                if (credentials.auth === "none") {
                  await pm.addRemote(name, url);
                  return;
                }

                assertLoginCredentials(credentials);
                await pm.addRemote(name, url);

                try {
                  await pm.login(
                    name,
                    credentials.username,
                    credentials.password,
                  );
                } catch (error) {
                  // Remove the remote again so the form can be resubmitted as is.
                  try {
                    await pm.deleteRemote(name);
                  } catch (deleteError) {
                    // It stays, without credentials. Report it as added so the
                    // webview lists it and its login can be retried from there.
                    logger.error(
                      `Failed to log in to remote "${name}":`,
                      error,
                      "Removing it again failed too:",
                      deleteError,
                    );
                    void vscode.window.showErrorMessage(
                      `CFS: Remote "${name}" was added, but logging in to it failed.${formatErrorForDisplay(error)}`,
                    );
                    return;
                  }

                  throw error;
                }
              },
            );

          // Start the operation
          const operationPromise = performAddRemote();

          // Show notification with Dismiss button
          const dismissPromise = vscode.window.showInformationMessage(
            `CFS: Adding remote "${name}"...`,
            "Dismiss",
          );

          // Race between operation completion and dismiss button
          const result = await Promise.race([
            operationPromise.then((remotes) => ({ remotes, completed: true })),
            dismissPromise.then(() => ({
              remotes: undefined,
              completed: false,
            })),
          ]);

          if (result.completed) {
            // Operation completed before dismiss - return result
            if (credentials.auth === "usernamePassword") {
              announceCredentialsChange();
            }
            return result.remotes;
          }

          // Dismissed - move to status bar and wait for operation
          const remotes = await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Window,
              title: `CFS: Adding remote "${name}"...`,
            },
            async () => await operationPromise,
          );

          if (credentials.auth === "usernamePassword") {
            announceCredentialsChange();
          }

          return remotes;
        },
        { sender: participant },
      ),
      messenger.onRequest(
        removeRemoteRequest,
        async ({ name }) =>
          changeRemotes(
            pkgManager,
            customRemoteCatalog,
            `Failed to remove remote "${name}"`,
            `Successfully removed remote "${name}"`,
            (pm) => pm.deleteRemote(name),
          ),
        { sender: participant },
      ),
      messenger.onRequest(
        setRemoteEnabledRequest,
        async ({ name, enabled }) =>
          changeRemotes(
            pkgManager,
            customRemoteCatalog,
            `Failed to ${enabled ? "enable" : "disable"} remote "${name}"`,
            `Successfully ${enabled ? "enabled" : "disabled"} remote "${name}"`,
            (pm) => (enabled ? pm.enableRemote(name) : pm.disableRemote(name)),
          ),
        { sender: participant },
      ),
      messenger.onRequest(
        setRemoteCredentialsRequest,
        async ({ name, credentials }) => {
          const remotes = await changeRemotes(
            pkgManager,
            customRemoteCatalog,
            `Failed to set authentication for remote "${name}"`,
            `Successfully set authentication for remote "${name}"`,
            async (pm) => {
              if (credentials.auth === "none") {
                await pm.logout(name);
                return;
              }

              assertLoginCredentials(credentials);
              await pm.login(name, credentials.username, credentials.password);
            },
          );

          announceCredentialsChange();

          return remotes;
        },
        { sender: participant },
      ),
    ];

    this._disposables.push(...handlers);
  }

  public static render(
    context: vscode.ExtensionContext,
    messenger: Messenger,
    pkgManager: CfsPackageManagerProvider | undefined,
    packageCatalog: PackageCatalogService | undefined,
    customRemoteCatalog: CustomRemoteCatalogService | undefined,
    authService: AuthService,
  ) {
    customRemoteCatalog?.update();
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
        packageCatalog,
        customRemoteCatalog,
        authService,
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
