---
description: Commonly Available Packages
author: Analog Devices
date: 2026-06-19
---

# Commonly available packages

The following packages and components are commonly available in CodeFusion Studio. Some are installed by default as part of the CodeFusion Studio installation, while others must be installed separately through Package Manager.

| Feature             | Package name           | Version      | Status                   | Purpose                                                              |
|---------------------|------------------------|--------------|--------------------------|----------------------------------------------------------------------|
| Data Models         | `cfs_base_data_models` | `2.2.1`      | Installed by default     | System Planner configuration                                         |
| MSDK                | `msdk`                 | `2.2.0`      | Installed by default     | Develop MAX32xxx/MAX7800x projects                                   |
| Plugins             | `cfs_base_plugins`     | `2.2.1`      | Installed by default     | Workspace creation, System Planner, code generation                  |
| Zephyr 4.3.0        | `zephyr`               | `4.3.0`      | Installed by default     | Zephyr 4.3.0 support for MAX32xxx/MAX7800x SoCs                      |
| Zephyr 4.4.0        | `zephyr`               | `4.4.0-b.1`  | Install separately       | Zephyr 4.4.0 support for MAX32657 and MAX32658. See the [MAX32657/MAX32658 Zephyr 4.4.0 tutorial](../../../tutorials/max32657-zephyr/index.md). |
| Zephyr ARM Toolchain | `zephyr_arm_toolchain` | `1.0.1`      | Installed as dependency  | ARM toolchain for Zephyr 4.4.0. Installed automatically when you install `zephyr/4.4.0-b.1`. |

!!! note
    Only packages relevant to your permissions are displayed. If no packages are available or all are already installed, an information message will appear instead.
