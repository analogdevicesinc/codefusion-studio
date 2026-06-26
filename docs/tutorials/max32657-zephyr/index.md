---
description: Getting started with MAX32657 and MAX32658 on Zephyr 4.4.0 using CodeFusion Studio
author: Analog Devices
date: 2026-06-18
---

# MAX32657/MAX32658 Zephyr 4.4.0

This tutorial gets you up and running with MAX32657 or MAX32658 development on Zephyr 4.4.0 using CodeFusion Studio. You install the required packages, run the Blinky example to verify your board, and then run the low power mode example.

## Prerequisites

Before you begin:

1. Install the `zephyr/4.4.0-b.1` package (`zephyr_arm_toolchain/1.0.1` is installed automatically as a dependency):
    - **Command Palette:** Open the Command Palette and run **(CFS) Install Package**. Find `zephyr/4.4.0-b.1` in the list and install it. See [Install packages using the Command Palette](../../user-guide/installation/package-manager/manage-packages-command-palette.md).
    - **Command line:** Run the following from the CFS Terminal. See [Install packages using cfsutil](../../user-guide/installation/package-manager/manage-packages-cfsutil.md).

        ```sh
        cfsutil pkg install zephyr/4.4.0-b.1
        ```

2. Install J-Link drivers **V8.94 or later** and configure your CFS J-Link (`cfs.jlink.path`) path to point to the J-Link installation directory — see [Install J-Link drivers](../../user-guide/debugging/debug-drivers/install-jlink-drivers.md).

3. Connect your EV Kit — see [Connect hardware](../../user-guide/debugging/connect-hardware.md#max32657-max32657evkit).

## Tutorials

Run the tutorials in order — low power mode builds on the setup from Blinky.

- [Blinky](blinky.md) — Flash an LED and verify your board.
- [Low power mode](low-power-mode.md) — Step the device through its supported low power states.
