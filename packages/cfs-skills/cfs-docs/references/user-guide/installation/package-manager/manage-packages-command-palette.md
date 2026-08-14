---
description: Use the Command Palette to install, view, remove, or delete packages from the cache in CodeFusion Studio.
author: Analog Devices
date: 2026-05-28
---

# Manage packages from VS Code Command Palette

You can use VS Code Command Palette to install, view, and remove packages in CodeFusion Studio as they become available.

To access Package Manager from the Command Palette:

1. Click the gear icon in the lower-left corner of VS Code, then choose **Command Palette**. Alternatively, use the keyboard shortcut (`Ctrl+Shift+P` / `Cmd+Shift+P`).
    ![VS Code settings](../images/access-vs-code-command-palette-dark.png#only-dark)
    ![VS Code settings](../images/access-vs-code-command-palette-light.png#only-light)

2. Type `package`.

    ![Command Palette showing CFS Install Package and CFS Uninstall Package](./images/access-command-pallete-package-dark.png#only-dark)
    ![Command Palette showing CFS Install Package and CFS Uninstall Package](./images/access-command-pallete-package-light.png#only-light)

## Install a package

1. In the **Command Palette**, type `(CFS) Install Package` and press Enter.
    ![Command Palette showing CFS Install Package and CFS Uninstall Package](./images/access-command-pallete-package-dark.png#only-dark)
    ![Command Palette showing CFS Install Package and CFS Uninstall Package](./images/access-command-pallete-package-light.png#only-light)
2. A list of available packages appears.
3. Select the package you need.
4. A progress window shows the installation status. When finished, a confirmation message appears.

!!! note
    Some packages may require license acceptance before installation. If prompted, review the license agreement and any referenced URLs, then select **Accept** (or **Accept All**) to proceed.

## Uninstall a package

1. To uninstall a package, open the **Command Palette** and run `(CFS) Uninstall Package`.
2. Select a package from the list of installed packages. A progress window will appear during uninstallation, followed by a confirmation message.

## Delete a package from cache

When a package is uninstalled, it remains in the local cache so it can be reinstalled without re-downloading. Use this command to remove those cached packages and free up local storage.

1. Open the **Command Palette** and run `(CFS) Delete Package from Cache`.
2. A list of previously installed packages that now reside in the cache appears. Select one or more packages to delete. Click **OK**.
3. A progress window shows the deletion status. When finished, a confirmation message appears.

!!! tip
    For information on installing packages from the local cache, see [Install from local cache](../../cfsutil/package-manager.md#install-from-local-cache).
