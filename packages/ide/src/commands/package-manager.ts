/**
 *
 * Copyright (c) 2023-2026 Analog Devices, Inc.
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
import type {
  CfsPackageManagerProvider,
  CfsPackageReference,
  CfsPackageRemote,
} from "cfs-package-manager";
import * as vscode from "vscode";
import { CLOUD_CATALOG_AUTH, PACKAGE_MANAGER_COMMANDS } from "./constants";
import { PACKAGE_MANAGER_CREDENTIAL_PROVIDER } from "../constants";
import { promptForPackageLicenseAcceptance } from "../utils/package-manager";

interface InstallPackageItem extends vscode.QuickPickItem {
  pkg: CfsPackageReference;
}

//This file contains Package Manager specific commands
export function registerPackageManagerCommands(
  context: vscode.ExtensionContext,
  pkgManager?: CfsPackageManagerProvider,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      PACKAGE_MANAGER_COMMANDS.INSTALL_PACKAGE,
      () => installPackages(pkgManager),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      PACKAGE_MANAGER_COMMANDS.UNINSTALL_PACKAGE,
      () => uninstallPackage(pkgManager),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      PACKAGE_MANAGER_COMMANDS.DELETE_PACKAGE,
      () => deletePackage(pkgManager),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(PACKAGE_MANAGER_COMMANDS.ADD_REMOTE, () =>
      addRemote(pkgManager),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      PACKAGE_MANAGER_COMMANDS.REMOVE_REMOTE,
      () => removeRemote(pkgManager),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(PACKAGE_MANAGER_COMMANDS.AUTH_REMOTE, () =>
      authRemote(pkgManager),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      PACKAGE_MANAGER_COMMANDS.MANAGE_REMOTES,
      () => manageRemotes(pkgManager),
    ),
  );
}

async function installPackages(pkgManager?: CfsPackageManagerProvider) {
  //Registering the command even if package manager is not defined as Vs Code complains about the command not being registered
  if (!pkgManager) {
    vscode.window.showErrorMessage(
      "CFS: Package Manager commands cannot be run because the package manager failed to initialize.",
    );
    return;
  }

  // Package selection
  const searchQuickPick = vscode.window.createQuickPick();
  searchQuickPick.title = "CFS: Install Package";
  searchQuickPick.placeholder = "Searching for packages...";
  searchQuickPick.busy = true;
  searchQuickPick.ignoreFocusOut = true;
  searchQuickPick.show();

  let selectedPackageRefs: CfsPackageReference[] | undefined;
  try {
    const [allPackages, installedPackages] = await Promise.all([
      pkgManager.search("*"),
      pkgManager.list(),
    ]);

    const availablePackages = allPackages.filter(
      (pkg) =>
        !installedPackages.some(
          (installed) =>
            installed.name === pkg.name && installed.version === pkg.version,
        ),
    );

    searchQuickPick.busy = false;
    searchQuickPick.ignoreFocusOut = false;

    if (availablePackages.length === 0) {
      searchQuickPick.placeholder = "";
      searchQuickPick.items = [{ label: "No new packages available" }];
      await new Promise<void>((resolve) => {
        searchQuickPick.onDidHide(() => resolve());
        searchQuickPick.onDidAccept(() => resolve());
      });
      return;
    }

    searchQuickPick.canSelectMany = true;
    searchQuickPick.placeholder = "Select package(s) to install.";
    searchQuickPick.items = availablePackages
      .map(
        (pkg): InstallPackageItem => ({
          label: pkg.name,
          description: pkg.version,
          pkg,
        }),
      )
      // Sort alphabetically by name then in descending order by version
      .sort((a, b) => {
        const nameCompare = a.label.localeCompare(b.label);
        return nameCompare !== 0
          ? nameCompare
          : -1 * a.description!.localeCompare(b.description!);
      });

    selectedPackageRefs = await new Promise<CfsPackageReference[]>(
      (resolve) => {
        let keepOpenAfterHide = false;

        const getAcceptedItems = (): InstallPackageItem[] => {
          const selectedItems = searchQuickPick.selectedItems.filter(
            (item): item is InstallPackageItem => "pkg" in item,
          );

          // Match delete-command UX: Enter on a highlighted item should proceed
          // even if the user did not explicitly toggle a checkbox.
          if (selectedItems.length > 0) {
            return [...selectedItems];
          }

          const activeItems = searchQuickPick.activeItems.filter(
            (item): item is InstallPackageItem => "pkg" in item,
          );

          return activeItems.length > 0 ? [activeItems[0]] : [];
        };

        searchQuickPick.onDidAccept(() => {
          const selected = getAcceptedItems().map((item) => item.pkg);

          if (selected.length === 0) {
            keepOpenAfterHide = true;
            vscode.window.showWarningMessage(
              "Select at least one package to install.",
            );
            searchQuickPick.show();
            return;
          }

          // Only one version per package name can be installed at a time.
          // Different packages that share the same tool.json id (e.g.
          // core-sw-sdk and core-sw-sdk-zephelin) are allowed.
          const duplicatePackageNames = new Set<string>();
          const seenPackageNames = new Set<string>();
          for (const pkg of selected) {
            if (seenPackageNames.has(pkg.name)) {
              duplicatePackageNames.add(pkg.name);
            }
            seenPackageNames.add(pkg.name);
          }

          if (duplicatePackageNames.size > 0) {
            keepOpenAfterHide = true;
            vscode.window.showWarningMessage(
              `Only one version per package name can be installed. Duplicates: ${Array.from(duplicatePackageNames).join(", ")}.`,
            );
            searchQuickPick.show();
            return;
          }

          resolve(selected);
        });
        searchQuickPick.onDidHide(() => {
          if (keepOpenAfterHide) {
            keepOpenAfterHide = false;
            return;
          }
          resolve([]);
        });
      },
    );
  } catch (err) {
    console.error(err);
    vscode.window.showErrorMessage(
      `CFS: Failed to find available packages.${err instanceof Error ? ` ${err.message}` : ""}`,
    );
    return;
  } finally {
    searchQuickPick.dispose();
  }

  if (selectedPackageRefs.length === 0) {
    return; // User cancelled
  }

  // License check
  // Show the license QuickPick immediately in busy state so there is no
  // notification popup between the package selection and the license step.
  const licenseQuickPick = vscode.window.createQuickPick();
  licenseQuickPick.title = "CFS: Gathering Package Information";
  licenseQuickPick.placeholder = "Gathering package information...";
  licenseQuickPick.ignoreFocusOut = true;
  licenseQuickPick.busy = true;
  licenseQuickPick.show();

  let cancelRequestedDuringMetadataFetch = false;
  const hideDisposable = licenseQuickPick.onDidHide(() => {
    cancelRequestedDuringMetadataFetch = true;
  });

  try {
    const plan = await pkgManager.getInstallPlan(selectedPackageRefs);

    hideDisposable.dispose();

    if (cancelRequestedDuringMetadataFetch) {
      licenseQuickPick.dispose();
      return;
    }

    let acceptedRequestedPackageLicenses = false;

    if (plan.requiresLicenseAcceptance.length > 0) {
      acceptedRequestedPackageLicenses =
        await promptForPackageLicenseAcceptance(
          plan.requiresLicenseAcceptance,
          {
            quickPick: licenseQuickPick,
            acceptDescription:
              selectedPackageRefs.length > 1
                ? "Accept the licenses and install selected packages"
                : "Accept the license and install the package",
          },
        );
      if (!acceptedRequestedPackageLicenses) {
        return;
      }
    } else {
      // No license required — dismiss the QuickPick before proceeding.
      licenseQuickPick.dispose();
    }

    // Install the package and its dependencies, showing progress and handling license acceptance for dependencies as well
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title:
          selectedPackageRefs.length > 1
            ? `CFS: Installing ${selectedPackageRefs.length} selected packages...`
            : `CFS: Installing package ${selectedPackageRefs[0].name}/${selectedPackageRefs[0].version}...`,
        cancellable: false,
      },
      async () => {
        const installed = await pkgManager.install(plan, {
          acceptLicense: acceptedRequestedPackageLicenses,
        });

        if (installed.length === 0) {
          return;
        }

        vscode.window.showInformationMessage(
          `CFS: Successfully installed ${installed.map((r) => r.name).join(", ")}.`,
        );
      },
    );
  } catch (err) {
    console.error(err);
    vscode.window.showErrorMessage("CFS: Failed to install package.");
  } finally {
    hideDisposable.dispose();
    licenseQuickPick.dispose();
  }
}

async function uninstallPackage(pkgManager?: CfsPackageManagerProvider) {
  //Registering the command even if package manager is not defined as Vs Code complains about the command not being registered
  if (!pkgManager) {
    vscode.window.showErrorMessage(
      "CFS: Package Manager commands cannot be run because the package manager failed to initialize.",
    );
    return;
  }

  //Instantiate Quick Pick
  const installedPackagesQuickPick = vscode.window.createQuickPick();

  // Initialize QuickPick UI
  installedPackagesQuickPick.title = "CFS: Uninstall Package";
  installedPackagesQuickPick.placeholder = "Fetching installed packages...";
  installedPackagesQuickPick.busy = true;
  installedPackagesQuickPick.ignoreFocusOut = true;
  installedPackagesQuickPick.show();

  //Search for installed packages
  let selectedPackageRef: CfsPackageReference | undefined = undefined;
  try {
    // Fetch installed packages
    const installedPackages = await pkgManager.list();
    installedPackagesQuickPick.busy = false;
    installedPackagesQuickPick.ignoreFocusOut = false;

    if (installedPackages.length === 0) {
      installedPackagesQuickPick.placeholder = "";
      installedPackagesQuickPick.items = [{ label: "No packages installed" }];
      await new Promise<void>((resolve) => {
        installedPackagesQuickPick.onDidHide(() => resolve());
        installedPackagesQuickPick.onDidAccept(() => resolve());
      });

      return;
    }

    // Populate QuickPick items
    installedPackagesQuickPick.placeholder = "Select the package to uninstall.";
    installedPackagesQuickPick.items = installedPackages
      .map((pkg) => ({
        label: pkg.name,
        description: pkg.version,
      }))
      // Sort alphabetically by name then in descending order by version
      .sort((a, b) => {
        const nameCompare = a.label.localeCompare(b.label);
        return nameCompare !== 0
          ? nameCompare
          : -1 * a.description!.localeCompare(b.description!);
      });

    // Handle package selection
    selectedPackageRef = await new Promise<CfsPackageReference | undefined>(
      (resolve) => {
        installedPackagesQuickPick.onDidAccept(() => {
          resolve({
            name: installedPackagesQuickPick.selectedItems[0].label,
            version: installedPackagesQuickPick.selectedItems[0].description!,
          });
        });
        installedPackagesQuickPick.onDidHide(() => {
          resolve(undefined);
        });
      },
    );
    if (!selectedPackageRef) {
      return; // User cancelled
    }
  } catch (err) {
    console.error(err);
    vscode.window.showErrorMessage(`CFS: Failed to find installed packages.`);
    return;
  } finally {
    installedPackagesQuickPick.dispose();
  }

  // Handle package uninstallation
  try {
    // Show uninstallation progress
    const progressOptions: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: `CFS: Uninstalling package ${selectedPackageRef.name}/${selectedPackageRef.version}...`,
      cancellable: false,
    };

    await vscode.window.withProgress(progressOptions, async () => {
      await pkgManager.uninstall(selectedPackageRef.name);
      vscode.window.showInformationMessage(
        `CFS: Package "${selectedPackageRef.name}/${selectedPackageRef.version}" uninstalled successfully.`,
      );
    });
  } catch (err) {
    console.error(err);
    // Conan errors can include an uppercase "ERROR:" prefix; normalize it for UI readability.
    const uninstallErrorMessage =
      err instanceof Error
        ? err.message.replace(/(^|\s)ERROR:\s*/gi, "$1Error: ").trim()
        : "";
    // Ensure the detail sentence is properly terminated before appending to the base message.
    const uninstallErrorWithPeriod = uninstallErrorMessage
      ? /[.!?]$/.test(uninstallErrorMessage)
        ? ` ${uninstallErrorMessage}`
        : ` ${uninstallErrorMessage}.`
      : "";
    vscode.window.showErrorMessage(
      `CFS: Failed to uninstall package.${uninstallErrorWithPeriod}`,
    );
  }
}

interface CachedPackageItem extends vscode.QuickPickItem {
  pkg: CfsPackageReference;
}

async function deletePackage(pkgManager?: CfsPackageManagerProvider) {
  //Registering the command even if package manager is not defined as Vs Code complains about the command not being registered
  if (!pkgManager) {
    vscode.window.showErrorMessage(
      "CFS: Package Manager commands cannot be run because the package manager failed to initialize.",
    );
    return;
  }

  // Instantiate Quick Pick with type parameter
  const cachedPackagesQuickPick =
    vscode.window.createQuickPick<CachedPackageItem>();

  // Initialize QuickPick UI - delay canSelectMany until items are ready
  cachedPackagesQuickPick.title = "CFS: Delete Package from Cache";
  cachedPackagesQuickPick.placeholder = "Fetching cached packages...";
  cachedPackagesQuickPick.busy = true;
  cachedPackagesQuickPick.ignoreFocusOut = true;
  cachedPackagesQuickPick.show();

  // Fetch cached and installed packages
  let selectedPackageRefs: CfsPackageReference[] = [];

  try {
    // listCache now returns isInstalled status, so no need to fetch installed list separately
    const cachedPackages = await pkgManager.listCache();

    // Filter to only show deletable (uninstalled) packages
    const deletablePackages = cachedPackages
      .filter((pkg) => !pkg.isInstalled)
      .map((pkg): CachedPackageItem => {
        return {
          label: pkg.reference.name,
          description: pkg.reference.version,
          pkg: pkg.reference,
        };
      })
      .sort((a: CachedPackageItem, b: CachedPackageItem) => {
        const nameCompare = a.label.localeCompare(b.label);
        return nameCompare !== 0
          ? nameCompare
          : -1 * a.description!.localeCompare(b.description!);
      });

    cachedPackagesQuickPick.busy = false;
    cachedPackagesQuickPick.ignoreFocusOut = false;

    if (deletablePackages.length === 0) {
      cachedPackagesQuickPick.placeholder = "";
      cachedPackagesQuickPick.items = [
        {
          label: "No packages available for deletion",
          pkg: { name: "", version: "" },
        } as CachedPackageItem,
      ];
      await new Promise<void>((resolve) => {
        cachedPackagesQuickPick.onDidHide(() => resolve());
        cachedPackagesQuickPick.onDidAccept(() => resolve());
      });

      return;
    }

    // Enable multi-select only when items are ready
    cachedPackagesQuickPick.canSelectMany = true;
    cachedPackagesQuickPick.placeholder =
      "Select packages to delete (only uninstalled packages are shown)";
    cachedPackagesQuickPick.items = deletablePackages;

    // Handle package selection
    selectedPackageRefs = await new Promise<CfsPackageReference[]>(
      (resolve) => {
        cachedPackagesQuickPick.onDidAccept(() => {
          const selectedItems =
            cachedPackagesQuickPick.selectedItems as readonly CachedPackageItem[];
          const selected = selectedItems
            .filter((item): item is CachedPackageItem => "pkg" in item)
            .map((item) => item.pkg);

          resolve(selected);
        });
        cachedPackagesQuickPick.onDidHide(() => {
          resolve([]);
        });
      },
    );

    if (selectedPackageRefs.length === 0) {
      return; // User cancelled or selected only installed packages
    }
  } catch (err) {
    console.error(err);
    let errorMessage = "CFS: Failed to find cached packages.";
    if (err instanceof Error && err.message) {
      errorMessage += ` ${err.message}`;
    }
    vscode.window.showErrorMessage(errorMessage);
    return;
  } finally {
    cachedPackagesQuickPick.dispose();
  }

  // Handle package deletion
  try {
    // Show deletion progress
    const progressOptions: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Notification,
      title: "CFS: Deleting package(s) ",
      cancellable: false,
    };

    const allDeletedPackages: CfsPackageReference[] = [];

    await vscode.window.withProgress(progressOptions, async (progress) => {
      const totalPackages = selectedPackageRefs.length;
      // Delete each selected package
      for (let i = 0; i < totalPackages; i++) {
        const pkgRef = selectedPackageRefs[i];
        const pattern = `${pkgRef.name}/${pkgRef.version}`;

        progress.report({
          message: `(${i + 1}/${totalPackages}) ${pattern}`,
        });

        const deletedPackages = await pkgManager.delete(pattern);
        allDeletedPackages.push(...deletedPackages);
      }
    });

    if (allDeletedPackages.length === 0) {
      vscode.window.showWarningMessage(
        "CFS: No packages were deleted. The selected packages may have already been removed.",
      );
    } else {
      const deletedPackagesList = allDeletedPackages
        .map((ref) => `${ref.name}/${ref.version}`)
        .join(", ");

      vscode.window.showInformationMessage(
        `CFS: Successfully deleted ${allDeletedPackages.length} package(s), ${deletedPackagesList}`,
      );
    }
  } catch (err) {
    console.error(err);
    let errorMessage = "CFS: Failed to delete package(s).";
    if (err instanceof Error && err.message) {
      errorMessage += ` ${err.message}`;
    }
    vscode.window.showErrorMessage(errorMessage);
  }
}

async function manageRemotes(pkgManager?: CfsPackageManagerProvider) {
  if (!pkgManager) {
    void vscode.window.showErrorMessage(
      "CFS: Package Manager commands cannot be run because the package manager failed to initialize.",
    );
    return;
  }

  // Show UX
  const manageRemotesQuickPick = vscode.window.createQuickPick();
  manageRemotesQuickPick.title = "CFS: Manage Package Remotes";
  manageRemotesQuickPick.placeholder = "Finding remotes...";
  manageRemotesQuickPick.ignoreFocusOut = true;
  manageRemotesQuickPick.busy = true;
  manageRemotesQuickPick.show();

  let remotes: CfsPackageRemote[] = [];

  // Display the list of remotes with action buttons
  try {
    remotes = await pkgManager.listRemotes();
    if (remotes.length === 0) {
      manageRemotesQuickPick.placeholder = "";
      manageRemotesQuickPick.busy = false;
      manageRemotesQuickPick.items = [{ label: "No remotes found" }];
      // Wait for user to dismiss (or select the dummy item) before closing the quick pick
      await new Promise<void>((resolve) => {
        manageRemotesQuickPick.onDidHide(() => resolve());
        manageRemotesQuickPick.onDidAccept(() => resolve());
      });

      manageRemotesQuickPick.dispose();
      return;
    }

    const mapCustomRemote = (
      remote: CfsPackageRemote,
    ): vscode.QuickPickItem => ({
      ...mapRemote(remote),
      buttons: [
        // Custom remotes can be removed
        {
          iconPath: new vscode.ThemeIcon("trash"),
          tooltip: "Remove",
        },
        // Custom remotes can have their auth set
        {
          iconPath: new vscode.ThemeIcon("account"),
          tooltip: "Set Auth",
        },
      ],
    });

    const displayRemotes: vscode.QuickPickItem[] = [
      { kind: vscode.QuickPickItemKind.Separator, label: "default" },
      ...remotes.filter((remote) => !remote.custom).map(mapRemote),
      { kind: vscode.QuickPickItemKind.Separator, label: "custom" },
      ...remotes.filter((remote) => remote.custom).map(mapCustomRemote),
      {
        alwaysShow: true,
        label: "$(add) Add Custom Remote",
      },
    ];
    // prompt the user if there are any myAnalog remotes and they are not logged in
    void promptMyAnalogLogin(remotes);

    manageRemotesQuickPick.placeholder = "Highlight a remote to view actions";
    manageRemotesQuickPick.items = displayRemotes;
    manageRemotesQuickPick.ignoreFocusOut = false;
    manageRemotesQuickPick.busy = false;
  } catch (err) {
    let errorMessage = "CFS: Failed to retrieve remotes.";
    if (err instanceof Error && err.message) {
      errorMessage += ` ${err.message}`;
    }
    console.error(err);
    vscode.window.showErrorMessage(errorMessage);
    manageRemotesQuickPick.dispose();
    return;
  }

  // Let the user pick an action
  try {
    const selected = await new Promise<[string, string?] | undefined>(
      (resolve) => {
        manageRemotesQuickPick.onDidAccept(() => {
          if (
            manageRemotesQuickPick.selectedItems[0].label ===
            "$(add) Add Custom Remote"
          ) {
            resolve(["add"]);
          }
        });
        manageRemotesQuickPick.onDidTriggerItemButton((e) => {
          if (e.button.tooltip) {
            switch (e.button.tooltip) {
              case "Remove":
                resolve(["remove", e.item.label]);
                break;
              case "Set Auth":
                resolve(["auth", e.item.label]);
                break;
              default:
                throw new Error(
                  `Unknown button action "${e.button.tooltip}" triggered.`,
                );
            }
          }
        });
        manageRemotesQuickPick.onDidHide(() => {
          resolve(undefined);
        });
      },
    );

    manageRemotesQuickPick.dispose();

    if (!selected) {
      return; // User cancelled
    }
    const [action, remoteName] = selected;
    if (action === "add") {
      await addRemote(pkgManager);
      return;
    }
    if (remoteName) {
      // Handle button actions
      const remote = remotes.find((r) => r.name === remoteName);
      if (!remote) {
        return;
      }
      switch (action) {
        case "remove":
          await removeRemoteAction(pkgManager, remote);
          break;
        case "auth":
          const authSelection = await promptAuthMethod(remote.name);
          if (!authSelection) {
            return; // User cancelled
          }
          await authRemoteAction(pkgManager, remote, authSelection);
          break;
        default:
          throw new Error(`Unknown action "${action}" selected.`);
      }
    }
  } catch (err) {
    console.error(err);
    void vscode.window.showErrorMessage(
      `CFS: Failed to manage remote. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function promptMyAnalogLogin(remotes: CfsPackageRemote[]): Promise<void> {
  // check if any are myAnalog remotes
  const myAnalogRemotes = remotes
    .filter(
      (r) => r.auth?.credentialProvider === PACKAGE_MANAGER_CREDENTIAL_PROVIDER,
    )
    .map((r) => r.name);
  if (myAnalogRemotes.length === 0) {
    return;
  }
  // check if logged in to myAnalog session
  const isLoggedIn = await vscode.commands.executeCommand(
    CLOUD_CATALOG_AUTH.STATUS,
  );
  if (!isLoggedIn) {
    // If not logged in, show a prompt with a login button
    const selection = await vscode.window.showInformationMessage(
      `Login with your myAnalog account to enable ` +
        `remote${myAnalogRemotes.length === 1 ? "" : "s"}: ` +
        `${myAnalogRemotes.slice(0, -1).join(", ")}` +
        `${myAnalogRemotes.length > 1 ? " and " + myAnalogRemotes.slice(-1) : myAnalogRemotes[0]}.`,
      "Login",
    );

    if (selection === "Login") {
      await vscode.commands.executeCommand(CLOUD_CATALOG_AUTH.LOGIN);
    }
  }
}

async function addRemote(pkgManager?: CfsPackageManagerProvider) {
  if (!pkgManager) {
    vscode.window.showErrorMessage(
      "CFS: Package Manager commands cannot be run because the package manager failed to initialize.",
    );
    return;
  }

  try {
    // Prompt for remote name
    const remoteName = await vscode.window.showInputBox({
      title: "CFS: Add Custom Package Remote",
      prompt: "Enter remote name",
      placeHolder: "e.g., my-remote",
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Remote name is required";
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          return "Remote name can only contain letters, numbers, underscores, and hyphens";
        }
        return null;
      },
    });

    if (!remoteName) {
      return; // User cancelled
    }

    // Prompt for remote URL
    const remoteUrl = await vscode.window.showInputBox({
      title: "CFS: Add Custom Package Remote",
      prompt: "Enter remote URL",
      placeHolder: "e.g., https://my-server.com/packages",
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Remote URL is required";
        }
        try {
          new URL(value);
          return null;
        } catch {
          return "Please enter a valid URL";
        }
      },
    });

    if (!remoteUrl) {
      return; // User cancelled
    }

    // Prompt user for authentication method
    const authSelection = await promptAuthMethod(remoteName);
    if (!authSelection) {
      return; // User cancelled
    }

    // Show progress while adding remote
    const progressOptions: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Window,
      title: `CFS: Adding remote "${remoteName}"...`,
      cancellable: false,
    };

    let remote: CfsPackageRemote;
    await vscode.window.withProgress(progressOptions, async () => {
      await pkgManager.addRemote(remoteName, remoteUrl);
      remote = (await pkgManager.listRemotes()).find(
        (r) => r.name === remoteName,
      )!;
      if (!remote) {
        throw new Error(`Failed to verify addition of remote "${remoteName}".`);
      }
    });

    // Set authentication method for remote (prompts user to perform myAnalog login if needed)
    await authRemoteAction(pkgManager, remote!, authSelection);

    void vscode.window.showInformationMessage(
      `CFS: Successfully added remote "${remoteName}" with URL "${remoteUrl}".`,
    );
  } catch (err) {
    console.error(err);
    void vscode.window.showErrorMessage(
      `CFS: Failed to add remote. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function removeRemote(pkgManager?: CfsPackageManagerProvider) {
  if (!pkgManager) {
    void vscode.window.showErrorMessage(
      "CFS: Package Manager commands cannot be run because the package manager failed to initialize.",
    );
    return;
  }

  // Show UX
  const customRemotesQuickPick = vscode.window.createQuickPick();
  customRemotesQuickPick.title = "CFS: Remove Custom Package Remote";
  customRemotesQuickPick.placeholder = "Finding custom remotes...";
  customRemotesQuickPick.busy = true;
  customRemotesQuickPick.ignoreFocusOut = true;
  customRemotesQuickPick.show();

  // Let the user pick a remote to remove
  const remote = await pickRemote(
    customRemotesQuickPick,
    pkgManager,
    undefined,
    () => false, // Only show custom remotes
    "select the remote to remove",
    "No custom remotes found.",
  );
  if (!remote) {
    return; // User cancelled
  }

  await removeRemoteAction(pkgManager, remote);
}

async function removeRemoteAction(
  pkgManager: CfsPackageManagerProvider,
  remote: CfsPackageRemote,
) {
  try {
    // Show progress while removing remote
    const progressOptions: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Window,
      title: `CFS: Removing remote "${remote.name}"...`,
      cancellable: false,
    };

    await vscode.window.withProgress(progressOptions, async () => {
      await pkgManager.deleteRemote(remote.name);
    });

    void vscode.window.showInformationMessage(
      `CFS: Successfully removed remote "${remote.name}".`,
    );
  } catch (err) {
    console.error(err);
    void vscode.window.showErrorMessage(
      `CFS: Failed to remove remote. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function authRemote(pkgManager?: CfsPackageManagerProvider) {
  if (!pkgManager) {
    void vscode.window.showErrorMessage(
      "CFS: Package Manager commands cannot be run because the package manager failed to initialize.",
    );
    return;
  }

  // Show UX
  const customRemotesQuickPick = vscode.window.createQuickPick();
  customRemotesQuickPick.title =
    "CFS: Set Custom Package Remote Authentication";
  customRemotesQuickPick.placeholder = "Finding remotes...";
  customRemotesQuickPick.busy = true;
  customRemotesQuickPick.ignoreFocusOut = true;
  customRemotesQuickPick.show();

  // Let the user pick a remote to set auth on
  const remote = await pickRemote(
    customRemotesQuickPick,
    pkgManager,
    // Can sign into any custom remote
    undefined,
    // Don't show managed remotes
    () => false,
    "Choose a remote to set up authentication",
    "No custom remotes available",
  );

  if (!remote) {
    return; // User cancelled
  }

  // Choose the auth for the selected remote
  const authSelection = await promptAuthMethod(remote.name);
  if (!authSelection) {
    return; // User cancelled
  }
  await authRemoteAction(pkgManager, remote, authSelection);
}

// Prompt user for authentication method
async function promptAuthMethod(remoteName: string): Promise<
  | {
      authMethod: "No Authentication" | "myAnalog";
    }
  | {
      authMethod: "Username/Password";
      username: string;
      password: string;
    }
  | undefined
> {
  // Offer the user the choice of no auth, myAnalog, or username/password
  const authChoices: {
    label: "No Authentication" | "myAnalog" | "Username/Password";
    description: string;
  }[] = [
    {
      label: "No Authentication",
      description: "Do not use any authentication",
    },
    {
      label: "myAnalog",
      description:
        "Obtain credentials automatically using your myAnalog session",
    },
    {
      label: "Username/Password",
      description: "Specify a username and password",
    },
  ];

  const authMethod = await vscode.window.showQuickPick(authChoices, {
    title: "CFS: Custom Package Remote Authentication",
    placeHolder: `Select authentication method for remote "${remoteName}"`,
    ignoreFocusOut: true,
  });

  if (!authMethod) {
    return; // User cancelled
  }

  if (authMethod.label === "Username/Password") {
    // Prompt for username
    const username = await vscode.window.showInputBox({
      title: "CFS: Custom Package Remote Authentication",
      placeHolder: `<username for remote ${remoteName}>`,
      ignoreFocusOut: true,
      prompt: "Enter username",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Username is required";
        }
        return null;
      },
    });
    if (!username) {
      return; // User cancelled
    }
    // Prompt for password
    const password = await vscode.window.showInputBox({
      title: "CFS: Custom Package Remote Authentication",
      placeHolder: `<password for ${remoteName}>`,
      ignoreFocusOut: true,
      prompt: "Enter password",
      password: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Password is required";
        }
        return null;
      },
    });

    if (!password) {
      return; // User cancelled
    }
    return { authMethod: "Username/Password", username, password };
  }

  return { authMethod: authMethod.label };
}

// Set authentication for the remote based on the selected method
async function authRemoteAction(
  pkgManager: CfsPackageManagerProvider,
  remote: CfsPackageRemote,
  authSelection:
    | { authMethod: "No Authentication" | "myAnalog" }
    | {
        authMethod: "Username/Password";
        username: string;
        password: string;
      },
) {
  // Show progress while setting auth for remote
  const progressOptions: vscode.ProgressOptions = {
    location: vscode.ProgressLocation.Window,
    title: `CFS: Setting authentication for remote "${remote.name}"...`,
    cancellable: false,
  };

  try {
    await vscode.window.withProgress(progressOptions, async () => {
      switch (authSelection.authMethod) {
        case "No Authentication":
          // Clear any existing authentication
          await pkgManager.logout(remote.name);
          break;
        case "Username/Password":
          // Use username and password
          await pkgManager.login(
            remote.name,
            authSelection.username,
            authSelection.password,
          );
          break;
        case "myAnalog":
          // Use myAnalog session
          await pkgManager.setRemoteCredentialProvider(
            remote.name,
            PACKAGE_MANAGER_CREDENTIAL_PROVIDER,
          );
          const updatedRemote = (await pkgManager.listRemotes()).find(
            (r) => r.name === remote.name,
          );
          if (!updatedRemote) {
            throw new Error(
              `Failed to verify setting credential provider for remote "${remote.name}".`,
            );
          }
          void promptMyAnalogLogin([updatedRemote]);
          break;
        default:
          throw new Error(
            `Unknown auth method "${(authSelection as { authMethod: string }).authMethod}" selected.`,
          );
      }
    });

    void vscode.window.showInformationMessage(
      `CFS: Successfully set authentication for remote "${remote.name}".`,
    );
  } catch (err) {
    console.error(err);
    void vscode.window.showErrorMessage(
      `CFS: Failed to set authentication for remote. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// Retrieve and display remotes for selection, with optional filtering
// handles empty list and disposal of the QuickPick
async function pickRemote(
  quickPick: vscode.QuickPick<vscode.QuickPickItem>,
  pkgManager: CfsPackageManagerProvider,
  filterCustom: (remote: CfsPackageRemote) => boolean = (r) => r.custom,
  filterManaged: (remote: CfsPackageRemote) => boolean = (r) => !r.custom,
  placeHolder: string = "Select a remote",
  emptyMessage: string = "No remotes found",
): Promise<CfsPackageRemote | undefined> {
  try {
    // Fetch registered remotes, filter and map for display
    const remotes = await pkgManager.listRemotes();
    const customRemotes = remotes.filter(filterCustom);
    const managedRemotes = remotes.filter(filterManaged);
    const displayRemotes = managedRemotes.map(mapRemote);
    if (customRemotes.length > 0) {
      if (managedRemotes.length > 0) {
        displayRemotes.push({
          kind: vscode.QuickPickItemKind.Separator,
          label: "custom",
        });
      }
      displayRemotes.push(...customRemotes.map(mapRemote));
    }
    quickPick.busy = false;
    quickPick.ignoreFocusOut = false;

    if (displayRemotes.length === 0) {
      quickPick.placeholder = "";
      quickPick.items = [{ label: emptyMessage }];
      // Wait for user to dismiss (or select the dummy item) before closing the quick pick
      await new Promise<void>((resolve) => {
        quickPick.onDidHide(() => resolve());
        quickPick.onDidAccept(() => resolve());
      });

      return;
    }

    // Display remotes and wait for selection
    quickPick.placeholder = placeHolder;
    quickPick.items = displayRemotes;
    const selected = await new Promise<vscode.QuickPickItem | undefined>(
      (resolve) => {
        quickPick.onDidAccept(() => {
          resolve(quickPick.selectedItems[0]);
        });
        quickPick.onDidHide(() => {
          resolve(undefined);
        });
      },
    );

    return selected
      ? remotes.find((r) => r.name === selected.label)
      : undefined;
  } catch (err) {
    let errorMessage = "CFS: Failed to retrieve remotes.";
    if (err instanceof Error && err.message) {
      errorMessage += ` ${err.message}`;
    }
    console.error(err);
    void vscode.window.showErrorMessage(errorMessage);
  } finally {
    quickPick.dispose();
  }

  return undefined;
}

// Mapping function to convert CfsPackageRemote to QuickPickItem displaying
// auth status
const mapRemote = (remote: CfsPackageRemote): vscode.QuickPickItem => ({
  label: remote.name,
  description: `${
    remote.auth
      ? remote.auth.username
        ? `authenticates using a password as user ${remote.auth.username}`
        : `authenticates using your ${remote.auth.credentialProvider} session`
      : "no authentication"
  }`,
  detail: remote.url.href,
});
