---
description: Set up Paths for CodeFusion Studio
author: Analog Devices
date: 2025-04-23
---

# Set up CodeFusion Studio

If you are installing CodeFusion Studio for the first time or upgrading from an earlier version, it's important to check that your SDK and tool paths are set correctly.

## Set CodeFusion Studio SDK path (single installation)

The CodeFusion Studio SDK path should be set automatically during the installation process, but if it is missing you may be prompted to update it:

![SDK Invalid Prompt](images/sdk-path-invalid-dark.png){.only-dark}
![SDK Invalid Prompt](images/sdk-path-invalid-light.png){.only-light}

Click on **Download SDK** to download the SDK if it isn't already installed, or **Choose SDK path** to enter the appropriate path.

You can also manually configure the installation path by searching for `cfs.sdk.path` in VS Code settings. To access settings, press `Ctrl`(Windows/Linux) or `Cmd` (macOS), then press the `,` key — or click the gear icon in the lower-left corner. For more information, see [CFS Settings](../workspaces/cfs-settings.md).

## Set CodeFusion Studio paths (after an upgrade)

If you are upgrading from a previous release, note that existing path settings are not updated automatically.

To update CFS paths to the latest version:

1. Open VS Code settings.
2. Search for all settings starting with `cfs.`
   Replace the older version number with the latest version number. For example, replace `1.0.0` with `1.1.0` in paths such as:
    - `cfs.sdk.path`
    - `cfgtools.cfsutil.path`
3. Restart VS Code for the changes to take effect.
