# Overview

CodeFusion Studio (CFS) is a modern embedded software development ecosystem that integrates with Microsoft Visual Studio Code.  
Designed for Analog Devices’ embedded processors and microcontrollers, it provides a unified environment that combines system configuration, AI integration, code generation, and advanced debugging within a single workspace.

## Key Features

### Workspace Creation Wizard

Create single- or multi-core projects in seconds with guided setup, example templates, and Arm® TrustZone®-ready configurations.

![Workspace Creation wizard](./gifs/ide-workspace.gif)

### System Planner

Visually configure every aspect of your system — from memory and peripheral allocation to pin and clock behavior — and generate ready-to-build source code in one step.

![System Planner](./gifs/ide-system-planner.gif)

### Embedded AI Tools

Build and optimize AI models directly inside your embedded workflow.  
Use the Embedded AI Tools in System Planner to import models, assign cores, validate compatibility, and generate deployment-ready source code.

![Embedded AI Tools](./gifs/ide-ai-tools.gif)

### Advanced Debugging

- Extended debugging ecosystem for multi-core systems with breakpoints, disassembly, cross-core support, and RTOS thread awareness.  
- Core Dump Analysis Tool — inspect captured dumps to identify crash causes.  
- GDB Toolbox — automate inspection and debugging with custom GDB or Python-based scripts.  

### SDK & Toolchain Management

- Download SDKs, toolchains, and plugins as needed with the integrated Package Manager to keep your environment up to date.  
- Toolchains that support building for Arm® Cortex-M, RISC-V, SHARC-FX, and other architectures available in supported ADI products.

### Secure & Extensible

- Integrates with Analog Devices’ Trusted Edge Security Architecture (TESA), providing flexible root-of-trust services and compliance with mbedTLS, wolfSSL, and PSA Crypto API standards.  
- Extensible plugin architecture separates configuration and design capture from code generation, allowing you to choose RTOS, middleware, and firmware platforms.

## Requirements

- Visual Studio Code 1.100 or later  
- CodeFusion Studio SDK 2.0.0 or later — download the [CFS SDK](https://developer.analog.com/docs/codefusion-studio/latest/user-guide/installation/install-cfs/).  
- Supported platforms:  
  - Windows 11 (64-bit)  
  - macOS 15 and macOS 26 (ARM64)
  - Ubuntu 22.04 and 24.04 (64-bit)

## Product Details

- Permissive open-source license.  
- Integrated support for Zephyr RTOS 4.2.  
- Native support for ADI’s MAX Software Development Kit (MSDK).  
- Support for the ADSP-2183x / SC83x SHARC-FX family (Windows only).  
- Beta support for Zephelin profiling, providing real-time insight into runtime behavior and AI inference performance on supported processors.
- Compiler and debugger support for Zephyr (Arm Cortex-M), MSDK (Arm Cortex-M and RISC-V), and SHARC-FX (ADSP-2183x / SC83x), including heterogeneous multicore debugging where applicable.  
- Modern UI with a CI-friendly command-line interface.  
- ELF visualization tools for analyzing compiled applications and memory layouts, including an ELF File Explorer with SQL queries for symbol selection and a graphical memory map.  
- Continuous roadmap of new features to streamline embedded development and give engineers greater control over complex system design.

## Documentation

See the [User Documentation](https://developer.analog.com/docs/codefusion-studio/latest) for installation instructions, tutorials, and detailed guides for CodeFusion Studio.
