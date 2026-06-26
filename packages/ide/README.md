# Overview

CodeFusion Studio (CFS) is a modern embedded software development ecosystem that integrates with Microsoft Visual Studio Code.
Designed for Analog Devices’ embedded processors and microcontrollers, it provides a unified environment for system configuration, AI integration, code generation, and advanced debugging - accessible through both an intuitive IDE and a command-line workflow.

## Key Features

### Embedded AI Workflows

Complete model-to-deployment workflow for AI on embedded hardware. Create AI-ready workspaces directly from model files with automatic compatibility checking and guided hardware configuration. Import models, validate compatibility with ADI processors, profile runtime performance, and generate optimized inference-ready code.

![Embedded AI Tools](./gifs/ide-ai-tools.gif)

### CLI-First Development

Build, flash, and configure workspaces entirely from the command line with `cfsutil`. Set up projects without opening the IDE, run complete AI model workflows, manage SDKs and packages, and execute build tasks. Perfect for CI/CD pipelines, automation scripts, and terminal-based workflows.

### Workspace Creation Wizard

Create single- or multi-core projects in seconds with guided setup, example templates, and Arm® TrustZone®-ready configurations. New templates are added regularly and are filtered based on your selected hardware.

![Workspace Creation wizard](./gifs/ide-workspace.gif)

### System Planner

Visually configure every aspect of your system — from memory and peripheral allocation to pin and clock behavior — and generate ready-to-build source code in one step.

![System Planner](./gifs/ide-system-planner.gif)

### Advanced Debugging

- Extended debugging ecosystem for multi-core systems with breakpoints, disassembly, cross-core support, and RTOS thread awareness.
- Memory Viewer — inspect device memory during live and retrospective debug sessions with configurable display options and multi-core session tracking.
- Core Dump Analysis Tool — inspect captured dumps to identify crash causes.
- GDB Toolbox — automate inspection and debugging with custom GDB or Python-based scripts.

### AI Debug Assistant (Preview)

Debug smarter with an AI assistant that connects directly to your live debug sessions. Set breakpoints, inspect registers and memory, analyze hard faults, and investigate multi-core issues using natural language. Powered by the Model Context Protocol (MCP), it works with GitHub Copilot, Claude Code, and other MCP-compatible AI clients.

![AI Debug Assistant](./gifs/ide-ai-debug-assistant.gif)

### SDK & Toolchain Management

- Download SDKs, toolchains, and plugins as needed with the integrated Package Manager to keep your environment up to date.
- Toolchains that support building for Arm® Cortex-M, RISC-V, SHARC-FX, and other architectures available in supported ADI products.

### Secure & Extensible

- Integrates with Analog Devices’ Trusted Edge Security Architecture (TESA), providing flexible root-of-trust services and compliance with mbedTLS, wolfSSL, and PSA Crypto API standards.
- Extensible plugin architecture separates configuration and design capture from code generation, allowing you to choose RTOS, middleware, and firmware platforms.

## Requirements

- Visual Studio Code 1.100 or later
- CodeFusion Studio SDK 2.2.1 or later — download the [CFS SDK](https://developer.analog.com/docs/codefusion-studio/latest/user-guide/installation/install-cfs/).
- Supported platforms:
  - Windows 11 (64-bit)
  - macOS 15 and macOS 26 (ARM64)
  - Ubuntu 22.04 and 24.04 (64-bit)

## Product Details

- Permissive open-source license.
- Integrated support for Zephyr RTOS 4.3.
- Native support for ADI’s MAX Software Development Kit (MSDK).
- Support for the ADSP-2183x / SC83x SHARC-FX family (Windows only).
- Beta support for Zephelin profiling including trace capture panel, automatic .ctf/.tef format generation, and integrated trace viewer for real-time runtime behavior and AI inference performance analysis on supported processors.
- Compiler and debugger support for Zephyr (Arm Cortex-M), MSDK (Arm Cortex-M and RISC-V), and SHARC-FX (ADSP-2183x / SC83x), including heterogeneous multicore debugging where applicable.
- Modern UI with a CI-friendly command-line interface.
- ELF visualization tools for analyzing compiled applications and memory layouts, including an ELF File Explorer with SQL queries for symbol selection and a graphical memory map.
- Continuous roadmap of new features to streamline embedded development and give engineers greater control over complex system design.

## Documentation

See the [User Documentation](https://developer.analog.com/docs/codefusion-studio/latest) for installation instructions, tutorials, and detailed guides for CodeFusion Studio.
