---
description: Set up Paths for CodeFusion Studio
author: Analog Devices
date: 2025-12-15
---

# Set up CodeFusion Studio

If you are installing CodeFusion Studio for the first time or upgrading from an earlier version, you may receive a notification to check that your CFS SDK path is set correctly.

## If a notification appears

### Missing or invalid path

You may see errors such as:

- `Error verifying the CFS SDK version…`
- `The path to the CFS SDK is missing or not valid…`

These appear when the folder is missing, moved, or incorrect.

### Version incompatibility

If the CFS SDK and CFS VS Code extension are incompatible, you may see:

- `The selected CFS SDK (vX.Y.Z) is not compatible with the extension (vA.B.C).`

This occurs when the SDK and extension versions do not match (for example, when the extension auto-updated but the SDK did not).

### How to fix

To resolve either issue:

- Click **Download SDK** to install the correct SDK version (if it isn't already installed), or
- Click **Choose SDK path** to select a valid or compatible SDK directory.
    - Clicking **Choose SDK path** will search for SDKs in the default installation directories.
        - Linux: `/home/<username>/analog/cfs/<version>`
        - macOS: `/Users/<username>/analog/cfs/<version>`
        - Windows: `C:\analog\cfs\<version>`
    - Select the SDK that matches your CFS extension version.
    - If your SDK is in a non-default directory, browse to find and select it.

!!! tip
    If your SDK and extension versions do not match exactly, ensure the SDK version is compatible with your extension. For details, see [Compatibility rules](set-up-cfs.md#compatibility-rules).

## If no notification appears

If you did not see a notification, your SDK and extension versions are likely already compatible and correctly configured. No further action is required in this case.

If you still want to verify or change the SDK path (for example, if you have multiple SDKs installed or are troubleshooting), you can manually update the SDK path as described below.

### Manually set the SDK path

1. Open VS Code Settings from the **Manage** gear icon, or using the keyboard shortcut (`Ctrl+,`, on Windows/Linux, `⌘,` on macOS).
    ![VS Code settings](images/access-vs-code-settings-dark.png#only-dark)
    ![VS Code settings](images/access-vs-code-settings-light.png#only-light)
2. Search for `cfs.sdk.path`.
    ![Search for CFS SDK path](images/verify-sdk-settings-dark.png#only-dark)
    ![Search for CFS SDK path](images/verify-sdk-settings-light.png#only-light)
3. Update the path to point to the installation directory of your CodeFusion Studio SDK. The default CFS SDK installation directories are:
    - Linux: `/home/<username>/analog/cfs/<version>`
    - macOS: `/Users/<username>/analog/cfs/<version>`
    - Windows: `C:\analog\cfs\<version>`
4. Restart VS Code for the changes to take effect.

!!! note
    Replace `<version>` with the SDK version installed on your system.  
    Ensure the version follows the compatibility rules.

## Compatibility rules

CFS uses the following compatibility rules to determine whether the SDK and CFS VS Code extension are compatible:

- Major versions must match. For example, extension 2.x.x requires SDK 2.x.x.
- The SDK minor version must be the same or higher than the extension's minor version. For example, extension 2.1.x would require SDK 2.1.x or higher, and will not work with SDK 2.0.x or any 1.x.x version.
- Patch versions do not affect compatibility. For example, extension 2.0.1 and SDK 2.0.0 are considered compatible.

### Compatibility summary

| Extension version | Compatible SDK versions                | Not compatible                 |
| ----------------- | -------------------------------------- | ------------------------------ |
| **X.Y.Z**         | **X.Y.\*** and higher (same major X)   | **X.(Y-1).\***, **(X-1).\***, **(X+1).\*** |

!!! info "Check the installed extension version"
    Open the **Extensions** panel in VS Code and select **CodeFusion Studio**. The installed version is shown at the top of the details panel.

!!! tip
    If you want to continue using an older SDK (for example, if the extension auto-updated), you can reinstall the matching extension version. First, disable automatic updates for the CFS extension. Then open the **Extensions** panel, click the gear icon next to the CodeFusion Studio extension, and choose **Install Specific Version…**. You can also install a specific version using **Install from VSIX…**. Refer to [Install extensions](install-extensions.md) for additional information.
