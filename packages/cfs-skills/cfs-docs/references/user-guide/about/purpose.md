---
description: Why we built CodeFusion Studio
author: Analog Devices
date: 2026-05-23
---

# Purpose

Embedded software engineering is becoming increasingly complex. As the industry shifts toward heterogeneous multi-core systems and AI-enabled workloads, engineers must configure and debug multiple processing architectures while maintaining efficiency. At the same time, shrinking development resources and tighter time-to-market pressures exacerbate these challenges.

Engineers are expected to manage this complexity with tools, middleware, and SDKs designed for a single-core, single-architecture world. Those tools are often proprietary, single-vendor solutions that may become obsolete. Code generated from these tools is typically inflexible, with limited usefulness in the real world.

## Why CodeFusion Studio

The award-winning CodeFusion Studio (CFS) is a modern embedded software development ecosystem that integrates with [Visual Studio Code](https://code.visualstudio.com), designed to simplify multi-core, multi-architecture embedded development.

Designed for Analog Devices microcontrollers and digital signal processors, CFS provides a unified development environment that eliminates the complexity of working across multiple toolchains, SDKs, and build systems. It combines graphical system design, AI model integration, code generation, and advanced debugging - accessible both through an intuitive IDE interface and a command-line workflow.

### Open source

Analog Devices’ CodeFusion Studio adheres to an open-source-first design principle. It provides embedded engineers with robust, extensible tools that they own, designed for long-term use, customization, and integration into existing workflows.

- Apache-licensed tooling and open-source toolchains that you own, modify, and integrate into your own workflows

- Built-in support for Zephyr, an open-source real-time operating system

### AI for embedded development

CFS integrates AI across the development lifecycle — from model deployment to real-time debugging.

- **AI Debug Assistant**: Investigate faults, inspect hardware state, and coordinate across multiple cores during live debug sessions using natural language, with support for GitHub Copilot and other AI clients via the Model Context Protocol (MCP).

- **Embedded AI Workflows**: Create AI-ready workspaces directly from model files, import and configure models, assign them to target cores, and run compatibility and profiling checks using the GUI or `cfsutil` command-line tool. Generate deployment-ready source code with complete automation support.

- **Zephelin profiler**: Capture runtime and AI inference-level performance data on supported processors with enhanced trace capture panel, automatic .ctf/.tef format generation, and integrated trace viewer for deeper insight into system behavior.

### Security

CFS integrates Analog Devices' Trusted Edge Security Architecture (TESA), providing foundational security services for supported processors.

- **Root-of-trust services**: Secure Boot, Secure Channel, Lifecycle Management, Secure Storage, and Attestation through the Unified Security Software (USS) framework.

- **Cryptographic flexibility**: Choose from industry-standard libraries including mbedTLS, wolfSSL, and PSA Crypto API, with hardware acceleration on supported devices.

- **Arm® TrustZone® support**: Configure secure and non-secure environments through templates in the Workspace Creation Wizard, with Trusted Firmware-M (TF-M) integration for PSA Certified guidelines.

### System visibility

CFS provides deep system visibility across complex, multi-core systems.

- **System Planner dashboard**: Use the intuitive graphical interface to allocate memory partitions, peripherals, clocks, and pins per core, reducing conflicts in multi-core SoCs.

- **Heterogeneous multi-core debugging**: Debug multiple cores in a single unified environment, eliminating the need for multiple IDEs. One IDE, one debug session, one hardware debugger.

- **Debugging tools**: Built-in tools for memory inspection, core dump analysis, GDB scripting automation, ELF binary analysis, and graphical register inspection — all integrated directly in the IDE.

### Flexibility

CFS provides flexibility by consolidating technical information into a single, structured data source, for easy integration into custom tooling and modern automated workflows.

- **Package Manager**: Download SDKs, toolchains, plugins, and SoC data models on demand to keep your development environment modular and up to date.

- **Command-Line First**: Ensures critical actions run from the command line, enabling compatibility with modern CI/CD pipelines, agentic AI automation, and automated workflows. `cfsutil` provides broad feature parity with graphical workflows.

- **Plugin-Based Project Creation**: A flexible, plugin-driven system that supports multiple RTOS and firmware platforms. Developers can add custom plugins to generate configuration and project files tailored to specific development standards.

## Goals

CFS aims to bring embedded software into the modern, heterogeneous world. It enables repeatable, testable, and maintainable development pipelines that customers fully own — whether they are building traditional firmware or AI-capable embedded systems. It creates visibility into complex multi-core designs, offering a clearer view of resource allocation, performance, and system behavior. Above all, it provides engineers with the long-term flexibility and adaptability needed to develop solutions that last as long as the hardware they support.

## Next steps

- [Features](features.md) — explore all CodeFusion Studio features in detail
- [Installation](../installation/index.md) — get started with CodeFusion Studio
