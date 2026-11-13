---
description: Install the CodeFusion Studio VS Code extension
author: Analog Devices
date: 2026-09-14
---

# Install the CodeFusion Studio VS Code extension

You can install the CodeFusion Studio extension using one of the following methods.

## Option 1: Install from within VS Code (recommended)

1. Open **Visual Studio Code**.
2. Go to **Extensions** (or press `Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **CodeFusion Studio**.

    ![Extension Installation](images/install-vs-code-extension-dark.png#only-dark)
    ![Extension Installation](images/install-vs-code-extension-light.png#only-light)

4. Select the extension and click **Install**.
5. Restart VS Code or reload the VS Code window: open the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Developer: Reload Window**.

## Option 2: Install from a VSIX file

Use the VSIX file included with CodeFusion Studio to reinstall or update the CodeFusion Studio extension when you cannot install it from the Visual Studio Marketplace.

!!! important
    The Microsoft C/C++, Cortex-Debug, and Zephelin Trace Viewer extensions must already be installed. This procedure cannot install them, so it cannot be used for a first-time installation on a machine without Marketplace access.

1. Open Visual Studio Code.
2. Select the **Extensions** icon from the activity bar.
3. Click **Views and More Actions** (...) and select **Install from VSIX**.
4. Navigate to the `<codefusion-sdk-install>/VSCode` directory. The exact location depends on your installation path. The following are the default locations:
    - Linux: `/home/<username>/analog/cfs/<version>/VSCode`
    - macOS: `/Users/<username>/analog/cfs/<version>/VSCode`
    - Windows: `C:\analog\cfs\<version>\VSCode`
5. Select the `cfs-ide-*.vsix` file to install.
6. Restart VS Code for the changes to take effect.

![Extension Installation](images/extension-installation-dark.png#only-dark)
![Extension Installation](images/extension-installation-light.png#only-light)

## Verify installation

To confirm that the extension installed correctly:

1. In VS Code, open **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Search for **CodeFusion Studio** again.
3. The extension appears in the **Installed** list.
    ![Extension Installed](images/verify-vscode-extension-installed-dark.png#only-dark)
    ![Extension Installed](images/verify-vscode-extension-installed-light.png#only-light)

!!! note
    VS Code updates the extension automatically when a new version becomes available. To control when the extension updates, see [Manage extension updates and versions](manage-extension-versions.md).

## Next steps

To complete installation, [set the SDK path](set-up-cfs.md) so the extension can find your CFS SDK installation.
