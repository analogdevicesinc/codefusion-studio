---
description: Install the CodeFusion Studio VS Code extension
author: Analog Devices
date: 2026-01-12
---

# Install the CodeFusion Studio VS Code extension

You can install the CodeFusion Studio extension using one of the following methods. Once the extension is installed, Visual Studio Code will automatically upgrade it when a new version becomes available (unless automatic updates are disabled).

## **Option 1: Install from within VS Code (recommended)**

1. Open **Visual Studio Code**.
2. Go to **Extensions** (or press `Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **"CodeFusion Studio"**.

    ![Extension Installation](images/install-vs-code-extension-dark.png#only-dark)
    ![Extension Installation](images/install-vs-code-extension-light.png#only-light)

4. Select the extension and click **Install**.

## **Option 2: Install from the Marketplace**

You can also install the extension directly from the Visual Studio Code Marketplace:

[:octicons-link-external-24: CodeFusion Studio VS Code Extension](https://marketplace.visualstudio.com/items?itemName=AnalogDevices.cfs-ide){:target="_blank"}

Click **Install** to open Visual Studio Code and complete the installation.

![Install extension](images/install-vs-code-extension.png)

## Verify installation

To confirm that the extension installed correctly:

1. In VS Code, open **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
2. Search for **"CodeFusion Studio"** again.
3. The extension should appear in the **Installed** list.
    ![Extension Installed](images/verify-vscode-extension-installed-dark.png#only-dark)
    ![Extension Installed](images/verify-vscode-extension-installed-light.png#only-light)

## Manually install the VS Code extension

If you are unable to install the extension directly from the Visual Studio Code Marketplace due to firewall restrictions or an offline environment, you can install it manually.

To manually install the extension, locate the CodeFusion Studio VS Code extension VSIX file in the VS Code directory within the CodeFusion Studio installer.

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

## Optional: Disable automatic extension updates

By default, Visual Studio Code will automatically update extensions as new versions become available. Each CFS extension version is specifically paired with a matching SDK version. If the extension updates automatically but the SDK does not, this can lead to unexpected behavior or compatibility issues. To avoid this, you may want to prevent VS Code from automatically updating the CFS extension.

To disable auto-update for this extension only:

1. Open the **Extensions** panel in VS Code.
2. Search for **CodeFusion Studio** and select it to open the details page.
3. Under the extension title, clear the **Auto Update** checkbox.

![Disable automatic extension updates](images/extension-auto-update-dark.png#only-dark "Disable automatic extension updates")
![Disable automatic extension updates](images/extension-auto-update-light.png#only-light "Disable automatic extension updates")

This allows you to keep using the extension version bundled with a specific CFS SDK.

!!! tip
    If the CFS extension updated unexpectedly, disable automatic extension updates and revert to a previous version. To revert to a previous version, open the **Extensions** panel, click the gear icon next to the CodeFusion Studio extension, and choose **Install Specific Version…**. You can also install a specific version using **Install from VSIX…**, as documented above.

### Optional: Review dependent extensions

The CodeFusion Studio extension depends on other VS Code extensions (including Microsoft C/C++, Cortex-Debug, and Zephelin Trace Viewer) to provide debugging and development features.

In most cases, no additional action is required.

- **First install of the CFS extension:** Dependent extensions are installed automatically if missing.
- **Dependencies already installed:** Existing versions are kept unchanged.
- **Upgrading the CFS extension:** Dependent extension versions are not automatically updated.

To view all dependent extensions, open the **Extensions** panel, select **CodeFusion Studio**, and open the **Dependencies** tab.

If you encounter issues, you can update dependent extensions manually from the VS Code Extensions view.

## Next steps

To complete installation, [check that your SDK and tool paths are set correctly](set-up-cfs.md).
