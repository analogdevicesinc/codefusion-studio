---
description: "Peripheral Allocation for CodeFusion Studio"
author: "Analog Devices"
date: "2025-09-15"
---

# Peripheral Allocation

The Peripheral Allocation feature allows you to assign SoC peripherals to projects. This ensures efficient resource utilization, prevents conflicts, and enhances overall hardware performance.

## Peripheral Allocation overview

![Peripheral Allocation overview](./images/peripheral-allocation-overview-dark.png#only-dark) ![Peripheral Allocation overview](./images/peripheral-allocation-overview-light.png#only-light)

1. **Filter options**: Filter peripherals by allocation status (all, allocated, or available).
2. **Peripheral list**: Displays available peripherals. Use this panel to allocate peripherals to a project.
3. **Core Projects section**: Shows each project with its assigned peripherals, signals, and pins. Use the **Expand All** and **Collapse All** arrows to control the view.

    !!! note
        Each project corresponds to a core in the device—for example, ARM Cortex-M4 or RISC-V.

4. **Configure peripheral**: Click **Configure** next to a peripheral in the Peripheral List or Core Projects section to open the Peripheral Settings Sidebar.
5. **Peripheral Settings Sidebar**: Configure settings such as pin assignments, parameters, and plugin options.

## Peripheral assignment types

There are two types of assignments:

- **Peripheral assignments**: An entire peripheral (such as UART0 or I²C2) is assigned to a single project. That project has full responsibility for initializing the peripheral, handling its interrupts, and managing its resources.
- **Pin assignments**: Some peripherals, such as GPIO, allow assignment at the pin level. Even though the pins belong to the same peripheral, they can be assigned and managed independently by multiple projects.  

## Allocate a peripheral to a project

![Peripheral Allocation - Peripheral List](./images/peripheral-allocation-list-dark.png#only-dark) ![Peripheral Allocation - Peripheral List](./images/peripheral-allocation-list-light.png#only-light)

1. In the Peripheral List, click **Allocate** (**+**) to allocate a peripheral to a project.
2. If there is more than one project, select the project from the list to complete the allocation.

![Peripheral Allocation - Peripheral List](./images/peripheral-allocation-list-allocate-dark.png#only-dark) ![Peripheral Allocation - Peripheral List](./images/peripheral-allocation-list-allocate-light.png#only-light)

!!! note
    For GPIO peripherals, individual pins are assigned instead of the entire peripheral.

### Limitations

- After a peripheral is allocated to a project, it must be removed before it can be allocated to another project. See [Remove a Peripheral](#remove-a-peripheral).
- Certain peripherals can only be allocated to specific projects due to hardware constraints.
- If a peripheral is shared across multiple projects (such as GPIO0), the primary project is responsible for system-wide initialization, including configuring clock sources and frequencies.

## Enter peripheral settings

When you allocate a peripheral, the Peripheral Settings sidebar opens. In this sidebar, you can complete the following actions:

### Add details

Use the **Description** field to capture optional notes about the role of the peripheral in the project, for example: *“UART0 – Used for debug console output”.*

### Assign pins

You can manage basic pin settings directly from the Peripheral Allocation page. This reduces navigation, while the full set of configuration options remains available in the dedicated **Pin Config** tab. If you need advanced settings or encounter issues, open **Pin Config** to complete the configuration. For more details, see [Pin Config](pin-config.md).

!!! note
    Signals that require pin assignment or are in conflict display an error ![Error](images/icon-conflict-dark.png#only-dark) ![Error](images/icon-conflict-light.png#only-light).  

To assign pins:

1. In the **Pin Assignments** section, review the available signals.
2. Toggle the pin to **on** ![Toggle](images/icon-toggle-dark.png#only-dark) ![Toggle](images/icon-toggle-light.png#only-light) to assign it. This enables the signal in generated code and updates the pin map in the **Pin Config** page.
3. If multiple pins are available, select one from the dropdown, then toggle it to **on**.
4. If a conflict appears when a pin is enabled, click the **Manage** chevron (**>**) to open the **Pin Config** tab.  
      1. To resolve the conflict, disable one of the functions assigned to that pin.  
      2. After resolving the issue, return to the **Peripheral Allocation** page to review configuration.  

### Set configuration parameters

The **Configuration** section in the Peripheral Settings Sidebar allows you to set parameters for any assigned peripheral that supports configuration. Configuration fields are defined in the SoC’s data model and can be extended or overridden by the code generation plugin.

Use the **Reset to Default** option to restore all settings to their default values.

### Specify code generation plugin options

The **Code Generation Plugin** section allows you to pass additional configuration to the code generation plugin for the selected peripheral. The available options depend on the firmware platform.

Examples of plugin options for Zephyr include:

- **Chosen**: Specifies the intended role or function of the peripheral in your application, for example: `console`, `debug`, `modem`. Multiple values can be entered as a comma-separated list.

- **Frequency**: Defines the clock frequency to use during code generation for applicable peripherals.

Fields marked with an asterisk indicate that a non-default value has been selected.

## Configure a peripheral

1. Locate the peripheral in the Core Projects section or in the Peripheral List.
2. Click **Configure** ![Configure](./images/icon-config-dark.png#only-dark) ![Configure](./images/icon-config-light.png#only-light) to open the Peripheral Settings Sidebar.

!!! note
    For GPIO peripherals, you can configure either the entire GPIO peripheral (for example, GPIO1) or individual pins (for example, P1.8).  
    Peripheral-level configuration and per-pin configuration are independent: configuring the peripheral does not override or duplicate individual pin settings.

## Remove a Peripheral

When you remove a peripheral, its configuration is permanently discarded. If you add the peripheral again later, you must reconfigure it from scratch.

To remove a peripheral:

1. Locate the peripheral in the Core Projects section or in the Peripheral List.
2. Click **Remove** ![Remove](./images/icon-delete-dark.png#only-dark) ![Remove](./images/icon-delete-light.png#only-light). Removed peripherals and pins return to the Peripheral List and can be reallocated to any supported project.

!!! note
    For GPIO peripherals:  

    - You can only remove **individual pins**.
    - To remove the entire peripheral (for example, GPIO1), click **Configure** ![Configure](./images/icon-config-dark.png#only-dark) ![Configure](./images/icon-config-light.png#only-light) to open the Peripheral Settings Sidebar, then click **Remove** ![Remove](./images/icon-delete-dark.png#only-dark) ![Remove](./images/icon-delete-light.png#only-light).

## Review peripheral assignment

You can review peripheral assignments in the Core Projects section. Only peripherals with assigned signals appear here.

Each listed peripheral includes the following:

- **Signals**: All signals assigned to a peripheral. For example, RX and TX for UART0.  
- **Assigned Pins**: The physical package pin where the signals are mapped. For example, `P0.14 (14)` indicates GPIO pin P0.14 on package pin 14.

![Review peripheral assignment](./images/peripheral-allocation-dark.png#only-dark) ![Review peripheral assignment](./images/peripheral-allocation-light.png#only-light)
