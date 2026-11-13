---
description: Set the CodeFusion Studio SDK path
author: Analog Devices
date: 2026-10-23
---

# Set the CodeFusion Studio SDK path

Set the SDK path whether you are installing CodeFusion Studio (CFS) for the first time or upgrading from an earlier version. The SDK path is the directory that the [CodeFusion Studio installer](install-cfs.md) installed the CFS SDK into (for example, `C:\analog\cfs\<version>` on Windows). The `cfs.sdk.path` setting tells the CFS VS Code extension which CFS SDK installation to use.

## Option 1: Set the path using the VS Code UI

1. Open the **Command Palette** (`Ctrl+Shift+P` on Windows/Linux, `⇧⌘P` on macOS).
2. Run **(CFS) Select the CodeFusion Studio path from the discovered installations.**
3. Select the CFS SDK you want to use. Each entry shows the installation path and its version. The SDK version must be compatible with your extension version — see [Compatibility rules](manage-extension-versions.md#compatibility-rules).

    ![Select your CodeFusion Studio path](images/sdk-select-path-dark.png#only-dark)
    ![Select your CodeFusion Studio path](images/sdk-select-path-light.png#only-light)

    !!! note
        Only installations in the default location are discovered. If you installed the CFS SDK in a custom directory, select **Browse...** and then select that directory.

!!! tip
    CodeFusion Studio prompts you if the path is missing, does not point to a valid CFS SDK, or points to an SDK that is not compatible with the extension:

    ![CFS SDK path warning](images/sdk-path-invalid-dark.png#only-dark)
    ![CFS SDK path warning](images/sdk-path-invalid-light.png#only-light)

    Select **Choose SDK path** to open the same list of discovered installations, or select **Download SDK** to open the CodeFusion Studio product page and download the installer. To run the installer, see [Install CodeFusion Studio](install-cfs.md).

## Option 2: Update the path manually

If the Command Palette action does not list the installation you need, or you prefer to set the path yourself, edit the setting directly:

1. Open VS Code Settings from the **Manage** gear icon, or using the keyboard shortcut (`Ctrl+,` on Windows/Linux, `⌘,` on macOS).
    ![VS Code settings](images/access-vs-code-settings-dark.png#only-dark)
    ![VS Code settings](images/access-vs-code-settings-light.png#only-light)
2. Search for `cfs.sdk.path`.
    ![Search for CFS SDK path](images/verify-sdk-settings-dark.png#only-dark)
    ![Search for CFS SDK path](images/verify-sdk-settings-light.png#only-light)
3. Update the path to point to the installation directory of the CFS SDK you want to use. The default CFS SDK installation directories are:
    - Linux: `/home/<username>/analog/cfs/<version>`
    - macOS: `/Users/<username>/analog/cfs/<version>`
    - Windows: `C:\analog\cfs\<version>`

!!! note
    Replace `<version>` with the SDK version installed on your system. If you selected a custom directory during installation, ensure that the setting points to that location.

!!! note "No need to restart VS Code"
    Changing the SDK path restarts the VS Code extension host automatically, which ends any active debug session. If CodeFusion Studio still uses the previous SDK, run **Developer: Restart Extension Host** from the Command Palette, or restart VS Code.

## Next steps

Use the [Package Manager](package-manager/index.md) to install additional components.
