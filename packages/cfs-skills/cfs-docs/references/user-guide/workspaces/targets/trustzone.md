---
description: Enable TrustZone Support in CodeFusion Studio
author: Analog Devices
date: 2026-04-28
---

# Arm&reg; TrustZone&reg;

Arm® TrustZone&reg; is a hardware-based security technology available on certain Arm processor cores, such as Cortex-M33. In CodeFusion Studio, the MAX32657 and MAX32658 devices include TrustZone support.

It allows you to create independent **secure** and **non-secure** execution environments:

- **Secure environment** — runs trusted code and protects sensitive assets, such as secure boot, cryptographic libraries, or key storage.
- **Non-secure environment** — runs code that does not require isolation, such as the main application, drivers, and general-purpose user code.

This separation ensures that critical assets and operations are protected, even if the non-secure code is compromised.

In CodeFusion Studio, these execution environments are represented as separate projects in your workspace.

!!! note
    For more background on TrustZone, refer to the
    [:octicons-link-external-24: Arm TrustZone overview](https://www.arm.com/technologies/trustzone-for-cortex-m).

## Enable TrustZone support in CodeFusion Studio

In CodeFusion Studio, TrustZone support is available when creating a new workspace on MAX32657 and MAX32658 devices using the **TF-M Secure Partition template**. This provides a ready-to-use TF-M setup with a secure baseline aligned with Zephyr and ADI defaults.

### Create a TrustZone-enabled project

To create a TrustZone-enabled project, start by following the general steps in [Create a new workspace](../create-new-workspace.md).

1. Select a MAX32657 or MAX32658 device, then choose a board.
2. In the **Workspace Creation Options** screen, select the **TF-M Secure Partition** template configured with Trusted Firmware-M (TF-M) support. This option automatically sets up a secure partition environment using ADI defaults.

### TrustZone project flags

When you create a TrustZone-enabled workspace using the TF-M template, CodeFusion Studio clearly marks each project with a flag in [System Planner](../../tools/index.md), helping you distinguish secure and non-secure configurations.

![TrustZone project flags in System Planner](./images/trustzone-system-p-flags_dark.png#only-dark)
![TrustZone project flags in System Planner](./images/trustzone-system-p-flags_light.png#only-light)
