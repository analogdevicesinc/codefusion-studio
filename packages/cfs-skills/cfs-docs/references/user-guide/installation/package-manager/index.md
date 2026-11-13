---
description: Package Manager in CodeFusion Studio
author: Analog Devices
date: 2026-10-08
---

# Package Manager

The CodeFusion Studio installer copies the VS Code extension VSIX to your system and installs OpenOCD for ADI processors, the base data models package, and the base plugins package by default.

Toolchains, SDKs, and additional plugins are delivered as versioned packages hosted on a remote package server. Use the Package Manager to download and install these packages locally, allowing you to add and update only the components you need.

To get started:

1. Install and remove packages from the [Package Manager UI](manage-packages-ide.md).
2. View the [available packages](available-packages.md) you can install.
3. View the files in [installed packages](view-installed-packages.md).

## More options

If you prefer not to use the Package Manager UI, or need to resolve an issue, the following articles support the package workflow:

- [Manage packages from the Command Palette](manage-packages-command-palette.md)
- [Manage packages from the command line (`cfsutil`)](manage-packages-cfsutil.md)
- [Install required packages](install-required.md)
- [Log in to access restricted packages](auth.md)
- [Troubleshoot package issues](troubleshooting-package-manager.md)
