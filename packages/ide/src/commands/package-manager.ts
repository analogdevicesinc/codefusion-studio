/**
 *
 * Copyright (c) 2023-2025 Analog Devices, Inc.
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
    vscode.commands.registerCommand(
      PACKAGE_MANAGER_COMMANDS.LOGOUT_REMOTE,
      () => logoutRemote(pkgManager),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(PACKAGE_MANAGER_COMMANDS.LOGIN_REMOTE, () =>
      loginRemote(pkgManager),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      PACKAGE_MANAGER_COMMANDS.MANAGE_REMOTES,
      () => manageRemotes(pkgManager),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("cfs.getSdkPath", (sdkName: string) =>
      getSdkPath(sdkName, pkgManager),
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

  //Instantiate Quick Pick
  const searchResultQuickPick = vscode.window.createQuickPick();
  const packageMap = new Map<string, CfsPackageReference>();

  // Initialize QuickPick UI
  searchResultQuickPick.placeholder = "Searching for packages...";
  searchResultQuickPick.busy = true;
  searchResultQuickPick.show();

  //Search for packages available for installation
  try {
    // Fetch packages
    const [allPackages, installedPackages] = await Promise.all([
      pkgManager.search(`*`),
      pkgManager.list(),
    ]);

    // Filter out already installed packages
    const installedPackageNames = new Set(
      installedPackages.map((pkg) => `${pkg.name}/${pkg.version.trim()}`),
    );
    const filteredPackages = allPackages.filter(
      (pkg) => !installedPackageNames.has(`${pkg.name}/${pkg.version.trim()}`),
    );

    // Handle case where no packages are available for installation
    if (filteredPackages.length === 0) {
      vscode.window.showInformationMessage(
        "CFS: No new packages available for installation.",
      );
      searchResultQuickPick.dispose();
      return;
    }

    // Map packages for QuickPick
    filteredPackages.forEach((pkg) => {
      const key = `${pkg.name}/${pkg.version.trim()}`;
      packageMap.set(key, pkg);
    });

    // Populate QuickPick items
    searchResultQuickPick.placeholder = "Select the package to install.";
    searchResultQuickPick.items = Array.from(packageMap.keys()).map((ref) => ({
      label: ref,
    }));
    searchResultQuickPick.busy = false;
  } catch (err) {
    let errorMessage = "CFS: Package installation failed.";
    if (err instanceof Error && err.message) {
      errorMessage += ` ${err.message}`;
    }
    console.error(err);
    vscode.window.showErrorMessage(errorMessage);
    searchResultQuickPick.dispose();
  }

  // Handle package selection
  try {
    //Defining on selected listener
    searchResultQuickPick.onDidAccept(async () => {
      const selectedItem = searchResultQuickPick.selectedItems[0];

      const selectedPackageRef = packageMap.get(selectedItem.label);

      //We know this won't be undefined, adding the check for the linter
      if (!selectedPackageRef) {
        vscode.window.showErrorMessage(
          "CFS: Package not found for installation.",
        );
        searchResultQuickPick.dispose();
        return;
      }

      // Update QuickPick UI for installation
      searchResultQuickPick.placeholder = `Installing package ${selectedPackageRef.name}/${selectedPackageRef.version}...`;
      searchResultQuickPick.busy = true;
      searchResultQuickPick.enabled = false;
      searchResultQuickPick.items = [];

      // Show installation progress
      const progressOptions: vscode.ProgressOptions = {
        location: vscode.ProgressLocation.Window,
        title: `Installing package ${selectedPackageRef.name}/${selectedPackageRef.version}...`,
        cancellable: false,
      };

      await vscode.window.withProgress(progressOptions, async () => {
        const installedPackageRefs =
          await pkgManager.install(selectedPackageRef);

        //Checking if any packages are installed.
        if (installedPackageRefs.length > 0) {
          const installedPackageRefsStr = installedPackageRefs
            .map((ref) => `${ref.name}`)
            .join(", ");

          vscode.window.showInformationMessage(
            `CFS: Successfully installed ${installedPackageRefsStr}.`,
          );
        } else {
          vscode.window.showErrorMessage(
            `CFS: Failed to install package ${selectedPackageRef.name}/${selectedPackageRef.version}.`,
          );
        }
      });
      searchResultQuickPick.dispose();
    });
  } catch (err) {
    console.error(err);
    vscode.window.showErrorMessage("CFS: Failed to install package.");
    searchResultQuickPick.dispose();
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
  installedPackagesQuickPick.placeholder = "Fetching installed packages...";
  installedPackagesQuickPick.busy = true;
  installedPackagesQuickPick.show();

  try {
    // Fetch installed packages
    const installedPackages = await pkgManager.list();

    if (installedPackages.length === 0) {
      vscode.window.showInformationMessage("CFS: No installed packages found.");
      installedPackagesQuickPick.dispose();
      return;
    }

    // Map installed packages for QuickPick
    const packageMap = new Map<string, CfsPackageReference>();
    installedPackages.forEach((pkg) => {
      const key = `${pkg.name}/${pkg.version.trim()}`;
      packageMap.set(key, pkg);
    });

    // Populate QuickPick items
    installedPackagesQuickPick.placeholder = "Select the package to uninstall.";
    installedPackagesQuickPick.items = Array.from(packageMap.keys()).map(
      (ref) => ({
        label: ref,
      }),
    );
    installedPackagesQuickPick.busy = false;

    // Handle package selection
    installedPackagesQuickPick.onDidAccept(async () => {
      const selectedItem = installedPackagesQuickPick.selectedItems[0];

      const selectedPackageRef = packageMap.get(selectedItem.label);

      //We know this won't be undefined, adding the check for the linter
      if (!selectedPackageRef) {
        vscode.window.showWarningMessage(
          "CFS: Package not selected for uninstallation",
        );
        return;
      }

      // Update QuickPick UI for uninstallation
      installedPackagesQuickPick.placeholder = `Uninstalling package ${selectedPackageRef.name}/${selectedPackageRef.version}...`;
      installedPackagesQuickPick.busy = true;
      installedPackagesQuickPick.enabled = false;
      installedPackagesQuickPick.items = [];

      // Show uninstallation progress
      const progressOptions: vscode.ProgressOptions = {
        location: vscode.ProgressLocation.Window,
        title: `Uninstalling package ${selectedPackageRef.name}/${selectedPackageRef.version}...`,
        cancellable: false,
      };

      await vscode.window.withProgress(progressOptions, async () => {
        await pkgManager.uninstall(selectedPackageRef.name);
        vscode.window.showInformationMessage(
          `CFS: Package "${selectedPackageRef.name}/${selectedPackageRef.version}" uninstalled successfully.`,
        );
      });
      installedPackagesQuickPick.dispose();
    });
  } catch (err) {
    console.error(err);
    vscode.window.showErrorMessage(`CFS: Failed to uninstall package.`);
    installedPackagesQuickPick.busy = false;
    installedPackagesQuickPick.dispose();
  }
}

async function getSdkPath(
  sdkName: string,
  pkgManager?: CfsPackageManagerProvider,
) {
  if (!pkgManager) {
    vscode.window.showErrorMessage(
      "CFS: Package Manager commands cannot be run because the package manager failed to initialize.",
    );
    return;
  }
  try {
    const sdkPath = await pkgManager.getPath(sdkName);
    return sdkPath;
  } catch (err) {
    vscode.window.showErrorMessage(
      `CFS: Encountered error while searching for SDK ${sdkName}. ${err}`,
    );
    return undefined;
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

    const mapRemoteButtons = (
      remote: CfsPackageRemote,
    ): vscode.QuickPickItem => ({
      ...mapRemote(remote),
      // Conditionally show buttons based on remote properties
      buttons: [
        // Custom remotes can be removed
        ...(remote.custom
          ? [
              {
                iconPath: new vscode.ThemeIcon("remove"),
                tooltip: "Remove",
              },
            ]
          : []),
        // Custom remotes can be logged out of (if already logged in)
        ...(remote.custom && remote.auth
          ? [
              {
                iconPath: new vscode.ThemeIcon("sign-out"),
                tooltip: "Logout",
              },
            ]
          : []),
        // Custom remotes can be logged in to (if not already logged in)
        ...(remote.custom && !remote.auth
          ? [
              {
                iconPath: new vscode.ThemeIcon("sign-in"),
                tooltip: "Login",
              },
            ]
          : []),
      ],
    });

    const displayRemotes = remotes
      .filter((remote) => !remote.custom)
      .map(mapRemoteButtons);
    const customRemotes = remotes.filter((remote) => remote.custom);
    displayRemotes.push({
      kind: vscode.QuickPickItemKind.Separator,
      label: "custom",
    });
    displayRemotes.push(...customRemotes.map(mapRemoteButtons));
    displayRemotes.push({
      alwaysShow: true,
      label: "$(add) Add Custom Remote",
    });

    // prompt the user if there are any myAnalog remotes and they are not logged in
    void promptMyAnalogLogin(remotes);

    manageRemotesQuickPick.placeholder = "Highlight a remote to view actions.";
    manageRemotesQuickPick.items = displayRemotes;
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
              case "Logout":
                resolve(["logout", e.item.label]);
                break;
              case "Login":
                resolve(["login", e.item.label]);
                break;
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
        case "logout":
          await logoutRemoteAction(pkgManager, remote);
          break;
        case "login":
          await loginRemoteAction(pkgManager, remote, false);
          break;
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

    // Show progress while adding remote
    const progressOptions: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Window,
      title: `Adding remote "${remoteName}"...`,
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

    void vscode.window.showInformationMessage(
      `CFS: Successfully added remote "${remoteName}" with URL "${remoteUrl}".`,
    );

    // Prompt the user to choose authentication method and perform login if needed
    await loginRemoteAction(pkgManager, remote!, true);
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
      title: `Removing remote "${remote.name}"...`,
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

async function logoutRemote(pkgManager?: CfsPackageManagerProvider) {
  if (!pkgManager) {
    void vscode.window.showErrorMessage(
      "CFS: Package Manager commands cannot be run because the package manager failed to initialize.",
    );
    return;
  }

  // Show UX
  const loggedInRemotesQuickPick = vscode.window.createQuickPick();
  loggedInRemotesQuickPick.title = "CFS: Logout Custom Package Remote";
  loggedInRemotesQuickPick.placeholder = "Finding remotes for logout...";
  loggedInRemotesQuickPick.busy = true;
  loggedInRemotesQuickPick.show();

  // Let the user pick a remote to logout of
  const remote = await pickRemote(
    loggedInRemotesQuickPick,
    pkgManager,
    // Can sign out of a custom remote with any auth
    (r) => r.custom && r.auth !== undefined,
    // Don't show managed remotes
    () => false,
    "Select the remote to logout",
    "No remotes available for logout.",
  );

  if (!remote) {
    return; // User cancelled
  }

  // Logout of the selected remote
  await logoutRemoteAction(pkgManager, remote);
}

async function logoutRemoteAction(
  pkgManager: CfsPackageManagerProvider,
  remote: CfsPackageRemote,
) {
  try {
    // Show progress while logging out remote
    const progressOptions: vscode.ProgressOptions = {
      location: vscode.ProgressLocation.Window,
      title: `Logging out of remote "${remote.name}"...`,
      cancellable: false,
    };

    await vscode.window.withProgress(progressOptions, async () => {
      await pkgManager.logout(remote.name);
    });

    void vscode.window.showInformationMessage(
      `CFS: Successfully logged out of remote "${remote.name}".`,
    );
  } catch (err) {
    console.error(err);
    void vscode.window.showErrorMessage(
      `CFS: Failed to log out of remote. ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function loginRemote(pkgManager?: CfsPackageManagerProvider) {
  if (!pkgManager) {
    void vscode.window.showErrorMessage(
      "CFS: Package Manager commands cannot be run because the package manager failed to initialize.",
    );
    return;
  }

  // Show UX
  const loggedInRemotesQuickPick = vscode.window.createQuickPick();
  loggedInRemotesQuickPick.title = "CFS: Login Custom Package Remote";
  loggedInRemotesQuickPick.placeholder = "Finding remotes for login...";
  loggedInRemotesQuickPick.busy = true;
  loggedInRemotesQuickPick.show();

  // Let the user pick a remote to login to
  const remote = await pickRemote(
    loggedInRemotesQuickPick,
    pkgManager,
    // Can sign into any custom remote
    undefined,
    // Don't show managed remotes
    () => false,
    "Select remote to log in to",
    "No remotes available for login.",
  );

  if (!remote) {
    return; // User cancelled
  }

  // Login to the selected remote
  await loginRemoteAction(pkgManager, remote, false);
}

// Prompt user for authentication method and perform login
async function loginRemoteAction(
  pkgManager: CfsPackageManagerProvider,
  remote: CfsPackageRemote,
  includeNoAuth = false,
) {
  // Offer the user the choice of myAnalog or username/password
  const loginChoices = [];
  if (includeNoAuth) {
    // Also offer no authentication option if adding a new remote
    loginChoices.push({
      label: "No Authentication",
      description: "Do not use any authentication",
    });
  }
  if (remote.custom) {
    // Can only control myAnalog SSO setting for custom remotes
    loginChoices.push({
      label: "myAnalog SSO",
      description: "Use your myAnalog single sign-on session",
    });
  }
  // Always offer username/password option
  loginChoices.push({
    label: "Username/Password",
    description: "Login using your username and password",
  });

  const loginMethod = await vscode.window.showQuickPick(loginChoices, {
    title: "CFS: Package Remote Authentication",
    placeHolder: `Select authentication method for remote "${remote.name}"`,
  });

  if (!loginMethod || loginMethod.label === "No Authentication") {
    return; // User cancelled or chose no authentication
  }

  let username: string | undefined;
  let password: string | undefined;

  if (loginMethod.label === "Username/Password") {
    // Prompt for username
    username = await vscode.window.showInputBox({
      title: "CFS: Package Remote Authentication",
      placeHolder: `<username for remote ${remote.name}>`,
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
    password = await vscode.window.showInputBox({
      title: "CFS: Package Remote Authentication",
      placeHolder: `<password for ${remote.name}>`,
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
  }

  // Show progress while logging in remote
  const progressOptions: vscode.ProgressOptions = {
    location: vscode.ProgressLocation.Window,
    title: `Logging in to remote "${remote.name}"...`,
    cancellable: false,
  };
  try {
    await vscode.window.withProgress(progressOptions, async () => {
      switch (loginMethod.label) {
        case "Username/Password":
          // Login with username and password
          await pkgManager.login(remote.name, username!, password!);
          break;
        case "myAnalog SSO":
          // Login with myAnalog SSO
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
          await promptMyAnalogLogin([updatedRemote]);
          break;
      }
    });

    void vscode.window.showInformationMessage(
      `CFS: Successfully logged in to remote "${remote.name}".`,
    );
  } catch (err) {
    console.error(err);
    void vscode.window.showErrorMessage(
      `CFS: Failed to log in to remote. ${err instanceof Error ? err.message : String(err)}`,
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
        ? "logged in as " + remote.auth.username
        : "using " + remote.auth.credentialProvider + " session"
      : ""
  }`,
  detail: remote.url.href,
});
