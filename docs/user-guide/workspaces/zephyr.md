---
description: Additional considerations for using the Zephyr RTOS in CodeFusion Studio.
author: Analog Devices
date: 2024-09-20
---

# Zephyr RTOS projects

## Modify west commands

CodeFusion Studio generates a default `west build` command for your current project (ex.: `west build -b apard32690/max32690/m4`).

While the default west build command covers most common build cases, there are situations where you need to pass additional parameters to west.

Examples of common cases where you want to alter the west build command include:

- Setting one-off KConfig parameters that you only want to use for one build:
    `-DCONFIG_FAULT_DUMP=1`
- Associating an optional config overlay file with your build:
    `-DOVERLAY_CONFIG=my-overlay.conf`
- Specifying a 'shield' to use with your development board:
    `-DSHIELD=shield_name`

There are two main ways you can customize the west build command in CodeFusion Studio:

1. [Modify the task](tasks.md#modify-build-tasks) associated with the 'build' action.
2. Manually enter a west command using [The CFS Terminal](cfs-terminal.md).

### Example one

To perform a west build with additional `OVERLAY_CONFIG` parameters, tell the build system to include this config file in the build operation by passing the parameters on the CFS terminal as follows:

```bash
west build -p auto -b apard32690/max32690/m4 -- -DOVERLAY_CONFIG=my-overlay.conf
```

### Example two

To debug an application and receive more details when hitting a fault handler, do a one-off build with the `CONFIG_FAULT_DUMP` KConfig flag set:

```bash
west build -p auto -b apard32690/max32690/m4 -- -DCONFIG_FAULT_DUMP=1
```

!!! note
    The double dash `--` in the `west` command line will pass any following arguments directly to **CMake**.

## Add compiler arguments

To pass specific compiler switches to the build system, use **zephyr_cc_option** in **CMakeLists.txt**:

``` kconfig
  zephyr_cc_option(-fstack-usage)
```
