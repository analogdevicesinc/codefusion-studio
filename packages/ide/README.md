# Overview

CodeFusion Studio (CFS) is an embedded software development platform based on Microsoft's Visual Studio Code (VS Code). It provides best-in-class development tooling for ADI's embedded processors and MCUs, and includes intuitive tools for newcomers while enabling advanced features for expert embedded developers.

## Prerequisites

The Visual Studio Code extension requires CodeFusion Studio to be present. Download and install the [CFS SDK and VS Code extension](https://developer.analog.com/docs/codefusion-studio/latest/user-guide/installation/install-cfs/). This installs the required toolchains, SDK components, and command line tools of CodeFusion Studio.

## Features

- A new Workspace Creation wizard for quickly creating per-core projects as well as example applications to jumpstart your development.

    ![Workspace Creation wizard](./gifs/ide-workspace.gif)

- Toolchains that support building for Arm Cortex-M, RISC-V, and other architectures available in supported ADI products.
- System Planner with tools for allocating peripherals and memory per core, assigning signals to pins, configuring pin and clock behavior, viewing registers, and generating source code to include in your project.

    ![System Planner](./gifs/ide-system-planner.gif)

- Essential debugging tools including heterogeneous multi-core debugging, breakpoints, disassembly, cross-core debugging, and RTOS thread awareness.
- An extensible plugin architecture that separates config choice capture from code generation, giving developers the freedom to choose RTOS, middleware, and firmware platforms.

## Product Details

- Permissive open-source license
- Integrated support for Zephyr RTOS (Zephyr 4.1)
- Native support for ADI's MAX Software Development Kit (MSDK)
- Modern UI with a CI-friendly command-line utility
- Integration with ADI’s Trusted Edge Security Architecture (TESA), providing flexible root-of-trust services, and compliance with mbedTLS, wolfSSL, and PSA Crypto API standards.  
- ELF file visualization tools for analyzing compiled applications and binary structures with powerful visualization tools, including an ELF File Explorer with SQL queries for symbol selection and a graphical memory map.
- Roadmap of new features to streamline embedded development and give engineers greater control in solving difficult design challenges

## Documentation

See the [User documentation](https://developer.analog.com/docs/codefusion-studio/latest) for the user guide and other resources for CodeFusion Studio.
