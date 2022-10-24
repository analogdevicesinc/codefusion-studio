---
description: User Settings for CFS
author: Analog Devices
date: 2024-07-18
---

# CFS Settings

## Overview

CodeFusion Studio provides additional settings within VS Code.
Settings are saved at either the User, Workspace, or Folder level depending on the number of projects within a configured workspace, and are used hierarchically: `Folder > Workspace > User`.

- User settings can be modified from the `File > Preferences > Settings` menu.
- Workspace settings can be modified from the `File > Preferences > Settings` menu or by editing the `.vscode/settings.json` in your workspace.
- Folder settings can be modified by editing the `.vscode/settings.json` in your sub directory.
Workspace settings are created when a project is created and will have values related to that project. User settings have the default values below:

| **ID**                                   | Description                                                                                | User Default Value                               |
|------------------------------------------|--------------------------------------------------------------------------------------------|--------------------------------------------------|
| **cfs.cmsis.pack**                       | Absolute path to the CMSIS pack                                                            | null                                             |
| **cfs.cmsis.root**                       | Path to the root CMSIS pack directory                                                      | ${userHome}/AppData/Local/Analog/Packs           |
| **cfs.cmsis.svdFile**                    | Absolute path to the .svd file.                                                            |                                                  |
| **cfs.configureWorkspace**               | Whether this workspace should be configured as an CodeFusion IDE project.                  | No                                               |
| **cfs.debugger.SWD**                     | Select the debugger to use.                                                                | MAX32625PICO                                     |
| **cfs.debugPath**                        | Path to the directory containing the ELF binary to debug                                   | null                                             |
| **cfs.openocd.interface**                | Absolute path to the OpenOCD interface script                                              | null                                             |
| **cfs.openocd.riscvInterface**           | Absolute path to the OpenOCD interface script for RISCV core                               | null                                             |
| **cfs.openocd.path**                     | Path to openocd                                                                            | ${config:cfs.sdk.path}/OpenOCD                   |
| **cfs.openocd.target**                   | Absolute path to the OpenOCD target / board script                                         | null                                             |
| **cfs.openocd.riscvTarget**              | Absolute path to the OpenOCD target / board script for RISCV core                          | null                                             |
| **cfs.programFile**                      | ELF binary to debug                                                                        | null                                             |
| **cfs.riscvProgramFile**                 | ELF binary to debug                                                                        | null                                             |
| **cfs.project.board**                    | Target Board Support Package (BSP)                                                         | EvKit_V1                                         |
| **cfs.project.name**                     | Project name                                                                               | ${workspaceFolderBasename}                       |
| **cfs.project.target**                   | Target processor                                                                           | MAX78000                                         |
| **cfs.sdk.path**                         | Absolute path to your CodeFusion IDE                                                       | null                                             |
| **cfs.toolchain.armAArch32GCC.path**     | Path to the arm-none-eabi GCC toolchain                                                    | ${config:cfs.sdk.path}/Tools/gcc/arm-none-eabi   |
| **cfs.toolchain.riscVGCC.path**          | Path to the RISCV GCC toolchain                                                            | ${config:cfs.sdk.path}/Tools/gcc/riscv-none-elf  |
| **cfs.toolchain.selectedToolchain**      | The toolchain to build the current project with                                            | arm-none-eabi                                    |
| **cfs.openHomePageAtStartup**            | Launch the CFS home page when a CFS project is opened                                      | Yes                                              |
