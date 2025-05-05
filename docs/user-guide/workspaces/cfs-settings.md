---
description: User Settings for CFS
author: Analog Devices
date: 2025-03-19
---

# CFS Settings

## Overview

CodeFusion Studio provides additional settings within VS Code that allow you to configure your development environment, set up toolchains, customize debugging options, and more.

Settings are saved at either the User, Workspace, or Folder level and are applied hierarchically: `Folder > Workspace > User`.

- User settings can be modified from the `File > Preferences > Settings` (on macOS, use `Code > Settings > Settings`) menu.
- Workspace settings can be modified from the `File > Preferences > Settings` menu or by editing the `.vscode/settings.json` in your workspace.
- Folder settings can be modified by editing the `.vscode/settings.json` in your sub directory.

When you create a new workspace, a corresponding set of workspace settings are automatically generated and will have values related to that workspace.

## Viewing CFS settings

To view a complete list of available CFS settings in the CodeFusion Studio extension, complete the following steps:

1. Open the **Extensions** tab (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS) in the VS Code activity bar.
2. Select the **CodeFusion Studio** extension from the list of installed extensions.
3. In the **CodeFusion Studio** extension page, navigate to **Features > Settings** to view all available CFS settings.
