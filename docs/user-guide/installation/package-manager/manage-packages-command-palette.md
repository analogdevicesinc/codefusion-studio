---
description: Use the Command Palette to install, view, or remove packages in CodeFusion Studio.
author: Analog Devices
date: 2025-10-30
---

# Manage packages from VS Code Command Palette

You can use VS Code Command Palette to install, view, and remove packages in CodeFusion Studio as they become available.

To access Package Manager from the Command Palette:

- Click the gear icon in the lower-left corner of VS Code, then choose **Command Palette**. Alternatively, use the keyboard shortcut (`Ctrl+Shift+P` / `Cmd+Shift+P`)  
- Type `package`

![Command Palette showing CFS Install Package and CFS Uninstall Package](./images/access-command-pallete-package-dark.png#only-dark)
![Command Palette showing CFS Install Package and CFS Uninstall Package](./images/access-command-pallete-package-light.png#only-light)

## Install a package

1. In the **Command Palette**, type `CFS Install Package`.
2. Select a package from the list. A progress window will appear.
   After installation completes, a confirmation message will be shown.

The following packages are commonly available to install. Additional packages may be added over time.

| Feature     | Package name           | Purpose                                     |
| ----------- | ---------------------- | ------------------------------------------- |
| Zephyr      | `zephyr`               | Develop Zephyr projects                     |
| MSDK        | `msdk`                 | Develop MAX32xxx/MAX7800x projects          |
| Plugins     | `cfs_base_plugins`     | Workspace creation, System Planner, codegen |
| Data Models | `cfs_base_data_models` | System Planner configuration                |
| Toolchain    | `xtensa_sharcfx_toolchain`   | Toolchain for building and debugging SHARC-FX projects |

!!! note
    Only packages relevant to your system are displayed. If no packages are available or all are already installed, an information message will appear instead.

## Uninstall a package

1. To uninstall a package, open the **Command Palette** and run `CFS Uninstall Package`.
2. Select a package from the list of installed packages. A progress window will appear during uninstallation, followed by a confirmation message.
