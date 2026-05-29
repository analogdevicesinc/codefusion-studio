---
description: User Settings for CFS
author: Analog Devices
date: 2026-05-26
---

# CFS Settings

## Overview

CodeFusion Studio provides additional settings within VS Code that allow you to configure your development environment, set up toolchains, customize debugging options, and more.

These settings determine how CodeFusion Studio locates SDKs, compilers, and debuggers during build and flash operations.

Use these settings when you need to:

- Change or override the toolchain used for a specific SoC or target  
- Adjust build or debug options (for example, set the J-Link path, choose a debugger, or specify the ELF file to load)  
- Enable or disable specific CodeFusion Studio features

## Accessing CFS settings

Settings are saved at either the User, Workspace, or Folder level and are applied hierarchically: `Folder > Workspace > User`.

- User settings can be modified from Settings by selecting **File > Preferences > Settings** (on macOS: **Code > Settings > Settings**). You can also open Settings from the Command Palette (`Ctrl+Shift+P` / `⇧⌘P`) by searching for **Preferences: Open Settings (UI)**, or by using the keyboard shortcut (`Ctrl+,` on Windows/Linux; `⌘,` on macOS).
- Workspace settings can be modified from Settings or by editing the `.vscode/settings.json` in your workspace.
- Folder settings can be modified by editing the `.vscode/settings.json` in your subdirectory.

When you create a new workspace, a corresponding set of workspace settings are automatically generated and will have values related to that workspace.

## Viewing CFS settings

To view a complete list of available CFS settings in the CodeFusion Studio extension, complete the following steps:

1. Open the **Extensions** tab (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS) in the VS Code activity bar.
2. Select the **CodeFusion Studio** extension from the list of installed extensions.
3. In the **CodeFusion Studio** extension page, navigate to **Features > Settings** to view all available CFS settings.
