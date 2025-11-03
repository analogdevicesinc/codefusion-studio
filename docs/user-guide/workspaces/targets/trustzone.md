---
description: Enable TrustZone Support in CodeFusion Studio
author: Analog Devices
date: 2025-10-26
---

# Arm&reg; TrustZone&reg;

Arm® TrustZone&reg; is a hardware-based security technology available on certain Arm processor cores, such as Cortex-M33. In CodeFusion Studio, devices such as the MAX32657 include TrustZone support.

It allows you to create independent **secure** and **non-secure** execution environments:

- **Secure environment** — runs trusted code and protects sensitive assets, such as secure boot, cryptographic libraries, or key storage.
- **Non-secure environment** — runs code that does not require isolation, such as the main application, drivers, and general-purpose user code.

This separation ensures that critical assets and operations are protected, even if the non-secure code is compromised.

In CodeFusion Studio, these execution environments are represented as separate projects in your workspace.

!!! note
    For more background on TrustZone, see the
    [:octicons-link-external-24: Arm TrustZone overview](https://www.arm.com/technologies/trustzone-for-cortex-m).

## Enable TrustZone support in CodeFusion Studio

In CodeFusion Studio, TrustZone support is available when creating a new workspace on supported devices, such as the MAX32657. You can enable it in two ways:

- **TF-M Secure Partition template**: Quick start with a ready-to-use TF-M setup. Best if you want a secure baseline aligned with Zephyr and ADI defaults.  
- **Manual configuration**: More control and flexibility over secure or non-secure project structure. Suitable for advanced users or custom applications.

### Create a TrustZone-enabled project

To create a TrustZone-enabled project, start by following the general steps in [Create a new workspace](../create-new-workspace.md).

1. Select a supported device, such as the MAX32657, then choose a board.
2. In the **Workspace Creation Options** screen, choose one of the following approaches.  

#### TF-M Secure Partition template

Select the **TF-M Secure Partition** template configured with Trusted Firmware-M (TF-M) support. This option automatically sets up a secure partition environment using ADI defaults.

#### Manual configuration

1. Select the **Enable TrustZone** toggle.  
2. Choose one or both of the following project types:  
      - **Secure** (Protected Execution Environment)  
      - **Non-secure** (Standard Execution Environment)  
3. Continue with the remaining steps to finish creating your workspace.

![Manual TrustZone setup](./images/trustzone-manual-setup-dark.png#only-dark)  
![Manual TrustZone setup](./images/trustzone-manual-setup-light.png#only-light)

##### TrustZone support project flags

When you select secure and non-secure environments, CodeFusion Studio clearly marks each project with a flag. If both environments are selected, you will step through two configuration screens, one for each environment.

For example, in the image below you can see:  

- The label **1 of 2 projects**, showing that two projects (secure and non-secure) were created for this core.  
- The **Secure** flag, indicating that this is the secure project.  

![TrustZone project flags in Workspace Creation Wizard](./images/trustzone-project-flags_dark.png#only-dark)
![TrustZone project flags in Workspace Creation Wizard](./images/trustzone-project-flags_light.png#only-light)

These flags also appear in [System Planner](../../tools/config-tool/index.md), helping you distinguish secure and non-secure configurations.

![TrustZone project flags in System Planner](./images/trustzone-system-p-flags_dark.png#only-dark)
![TrustZone project flags in System Planner](./images/trustzone-system-p-flags_light.png#only-light)
