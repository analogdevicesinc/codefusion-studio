---
description: Commonly Available Packages
author: Analog Devices
date: 2026-11-03
---

# Commonly available packages

The following packages and components are commonly available in CodeFusion Studio. Some are installed by default as part of the CodeFusion Studio installation, while others must be installed separately.

You can install packages with the [**Package Manager**](manage-packages-ide.md), the [**Command Palette**](manage-packages-command-palette.md), or the [command line](manage-packages-cfsutil.md).

!!! tip
    The packages listed here are the ones available for this release of CodeFusion Studio. **Package Manager**, the **Command Palette**, and `cfsutil` also list packages for earlier releases. If you're unsure which packages to install, follow your workspace's `.cfs/.cfsdependencies` manifest, which lists the packages the workspace requires. Use the **Required** filter in the [**Package Manager** UI](manage-packages-ide.md#filters) to find them, or run [`cfsutil validate dependencies`](../../cfsutil/validate.md#validate-dependencies) to check which are missing.

## All projects

| Package name           | Version | Installation         | Purpose                                                              |
|------------------------|---------|----------------------|----------------------------------------------------------------------|
| `cfs_base_data_models` | `2.4.0` | Installed by default | SoC data models for System Planner configuration                     |
| `cfs_base_plugins`     | `2.4.0` | Installed by default | Base plugins for workspace creation, System Planner, code generation |

## MSDK projects

| Package name          | Version  | Use for              | Installation       | Purpose                                                                          |
|-----------------------|----------|----------------------|--------------------|----------------------------------------------------------------------------------|
| `msdk`                | `2.4.0`  | MSDK projects        | Install separately | Develop MAX32xxx/MAX7800x projects                                               |
| `gnu_arm_toolchain`   | `14.3.1` | MSDK ARM projects    | Install separately | GNU ARM bare-metal toolchain. Previously installed by the CFS installer.        |
| `gnu_riscv_toolchain` | `14.2.3` | MSDK RISC-V projects | Install separately | xPack GNU RISC-V Embedded toolchain. Previously installed by the CFS installer. |

## SHARC-FX projects

| Package name               | Version  | Use for                      | Installation       | Purpose                                                                                                                                                                         |
|----------------------------|----------|------------------------------|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `xtensa_sharcfx_toolchain` | `15.5.2` | SHARC-FX projects            | Install separately | Xtensa toolchain for the SHARC-FX cores (Windows and Linux). Required by all SHARC-FX project templates. Requires a myAnalog login. See [Access restricted packages](auth.md).                      |
| `cortex-m_sharcfx_sdk`     | `1.0.0`  | SHARC-FX Cortex-M33 projects | Install separately | SDK for the Cortex-M33 core on SHARC-FX processors (Windows and Linux). Previously installed by the CFS installer. Installs `gnu_arm_toolchain` automatically as a dependency. |

## Zephyr projects

| Package name           | Version     | Use for                                  | Installation            | Purpose                                                                                                                                                                                                                                                  |
|------------------------|-------------|------------------------------------------|-------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `zephyr`               | `4.4.2`     | Zephyr projects                          | Install separately      | Zephyr 4.4.2 support for MAX32xxx/MAX7800x SoCs. For MAX32657 and MAX32658, use `zephyr` `4.4.0-b.1`.                                                                                                                                                    |
| `zephyr`               | `4.4.0-b.1` | Zephyr projects on MAX32657 and MAX32658 | Install separately      | Zephyr 4.4.0 support for MAX32657 and MAX32658. See the [MAX32657/MAX32658 Zephyr 4.4.0 tutorial](../../../tutorials/max32657-zephyr/index.md).                                                                                                          |
| `zephyr_arm_toolchain` | `1.0.3`     | Zephyr projects                          | Installed as dependency | ARM toolchain for Zephyr. Installed automatically when you install a `zephyr` 4.4.x package.                                                                                                                                                            |
| `gperf`                | `3.1.0`     | Zephyr userspace projects                | Install separately      | Perfect hash function generator required to build Zephyr applications that enable userspace (`CONFIG_USERSPACE=y`). When you create a workspace from the **Zephyr Single Core Hello World User** template, CFS detects that `gperf` is required and prompts you to install it. |

!!! note
    Only packages relevant to your permissions are displayed. If no packages are available or all are already installed, an information message will appear instead.
