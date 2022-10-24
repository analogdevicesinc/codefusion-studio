---
description: Configuration Tool for CodeFusion Studio
author: Analog Devices
date: 2024-08-22
---

# Config Tool

CodeFusion Studio (CFS) provides a combined configuration tool to allow easy configuration of pin and clock settings.
The Configuration Tool uses CFSCONFIG files which are generated using the New Project wizard.
Clicking on the appropriate `.cfsconfig` file in your project will open the Config Tool.

!!! tip
    See [Create a new project](../../projects/create-new-project.md) or enter **create project** in the command palette to open the wizard.

## Tool tabs

The Config Tool comprises of the following tabs.

### Pin Mux

Configures the pin multiplexing. See [Pin Config](./pin-config.md) for details.

### Function Config

Configures the function of enabled pins. See [Pin Config](./pin-config.md) for details.

### Clock Confing

Configures the various clocks and divers. See [Clock Config](./clock-config.md) for details.

### Registers

Displays all registers and corresponding values. The search bar provides filters for modified or unmodified registers and allows filtering based on partial register names.

Click on the register name to view the register details.

!!! note
    Registers with an asterisk (*) indicate a value other than the default.

## Generate Code

Generates the source files required to configure the pins in the application.

!!! warning
    Any pin conflicts must be resolved in PinMUX before code can be generated.

1. Save the configuration file.
2. Select the export module in which the generated code will be run.
3. Click Generate code. This generates files containing the configuration code.
    * The files created depend on the firmware platform used.
    * For Zephyr and MSDK projects, the code is built and run automatically if saved using the recommended filenames.
4. Save the generated files in the application with appropriate names.
