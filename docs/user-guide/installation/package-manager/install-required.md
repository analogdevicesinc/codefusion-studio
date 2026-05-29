---
description: Resolve missing packages in CodeFusion Studio using System Planner's automated version resolution workflow or the Package Manager.
author: Analog Devices
date: 2026-05-27
# Note: This page is linked from:
# - System Planner Critical Error screen (packages/ide/src/webviews/config-tools/src/screens/error/version-updater/update-resolution-card/update-resolution-card.tsx)
# - Workspace Creation Wizard empty plugins screen (packages/ide/src/webviews/workspace-creation/src/components/workspace-empty-plugins/WorkspaceEmptyPlugins.tsx)
---

# Install required packages

This page helps you resolve missing or incompatible packages in CodeFusion Studio. You may arrive here from:

- **System Planner** — when opening a `.cfsconfig` file that requires a missing data model or plugin version
- **Workspace Creation Wizard** — when no workspace templates are available for your selected SoC

## How to resolve missing packages

The resolution method depends on where you encountered the error:

- **From System Planner?** Use the [automated version resolution](#system-planner-automated-version-resolution-recommended) workflow (recommended)
- **From Workspace Creation Wizard?** Use [manual package installation](#manual-package-installation-fallback) to install template plugins

    !!! note "Platform compatibility"
        Some workspace templates are only available on specific operating systems. For example, SHARC-FX templates are only supported on Windows. If the Workspace Creation Wizard shows that no workspace templates are available and you believe compatible plugins are already installed, the templates may not be available for your operating system.

## System Planner automated version resolution (recommended)

When you open a `.cfsconfig` file in System Planner but do not have the required data model or plugin version, a **Critical Error** screen appears with automated resolution options.

![System Planner Critical Error screen showing missing data model with resolution options menu](./images/system-planner-missing-component-light.png#only-light)
![System Planner Critical Error screen showing missing data model with resolution options menu](./images/system-planner-missing-component-dark.png#only-dark)

### Resolution steps

1. **Review the error details**  
   The error screen displays:
    - The missing component type (**Missing Data Model** or **Missing Plugin**)
    - The missing component and required version (for example, **System Planner requires MAX32690 TQFN data model version 1.2.100 which is not available**)

2. **Select a resolution option from the menu**  
   Under **Resolution Options**, available options depend on what versions are installed locally and available remotely:

    - **Upgrade to compatible locally-available version X.X.X**  
      A compatible version is already installed. System Planner updates your configuration file to use this version without downloading anything.

    - **Install requested version X.X.X**  
      The exact version you need is available remotely. System Planner downloads and installs it.

    - **Upgrade to latest compatible downloadable version X.X.X**  
      A newer compatible version is available remotely. System Planner downloads and installs the latest compatible version.

3. **(Optional) Configure future version handling**  
   Check or uncheck **Allow all future compatible versions**:

    - **Checked**: Uses a version range (for example, `^1.2.148`) to allow automatic compatibility with future updates
    - **Unchecked**: Uses an exact version (for example, `1.2.148`) to prevent automatic updates

4. **Click Continue**  
   System Planner installs packages if needed and updates your configuration file. Click **Continue to System Planner** to proceed to the System Planner Configuration Tools dashboard.

### Troubleshooting

If the automated resolution fails (no menu options appear, installation errors occur, or buttons are disabled), complete the following:

- Verify you are logged in to myAnalog if accessing restricted packages (see [Log in to access restricted Packages](auth.md))
- Click **Retry Updates** if available
- Use the manual installation methods below to install packages directly

## Manual package installation (fallback)

If the automated resolution prompt doesn't work, or you need to install packages outside of the System Planner error flow, see:

- [Manage Packages (Command Palette)](manage-packages-command-palette.md)  
- [Manage Packages from the command line (`cfsutil`)](manage-packages-cfsutil.md)
- [Log in to access restricted Packages](auth.md)
