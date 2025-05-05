---
description: Why we built CodeFusion Studio
author: Analog Devices
date: 2025-04-23
---

# Purpose

Embedded software engineering is becoming an increasingly complex challenge. As the industry shifts toward heterogeneous multi-core systems, engineers must configure and debug multiple processing architectures while maintaining efficiency. At the same time, shrinking development resources and tighter time-to-market pressures exacerbate these challenges.

Engineers are expected to deal with this complexity with tools, middleware, and SDKs designed for a single-core, single-architecture world. Those tools are often proprietary, single-vendor solutions that may become obsolete. Code generated from these tools is typically inflexible, with limited usefulness in the real world.

## Why CodeFusion Studio

The award-winning CodeFusion Studio (CFS) is an embedded software development platform built on Microsoft’s open-source [Visual Studio Code](https://code.visualstudio.com), designed to simplify multi-core, multi-architecture embedded development.

CFS solves the challenges of modern embedded engineering with an open-source toolset built for multi-core systems. It enables heterogeneous multi-core application development, system-wide resource management, debugging, and optimization — all without the restrictions of activation servers, licensing fees, or vendor lock-in.

### Open source

CFS adheres to an Open Source First design principle. It provides embedded engineers with robust, extensible tools that they own, designed for long-term use and customization.

- Apache-licensed tooling for full ownership of the software development pipeline

- Permissively-licensed tools for customization

- Open-source toolchains and critical software components

- Integration with Zephyr, an open-source operating system

### System visibility

CFS provides better system visibility into complex systems.

- **System Planner dashboard**: Use the intuitive graphical interface to allocate memory partitions, peripherals, clocks, and pins per core, reducing conflicts in multi-core SoCs.

- **ELF File Explorer**: Quickly parse, analyze, and debug compiled binaries, minimizing time spent on debugging and performance profiling.

- **Heterogenous multi-core debugging**:  Debug multiple cores in a single unified environment, eliminating the need for multiple IDEs. One IDE, one debug session, one hardware debugger.

- **Integrated register viewer**: Eliminates the need for repetitive datasheet lookups by providing a graphical representation of configuration registers used in the system configuration.

### Flexibility

CFS also provides flexibility by consolidating technical information in a single data source, for easy integration into custom tooling and modern automated workflows.

- **SoC (System on Chip) Data Model**: Provides detailed technical information, including the relationships between config choices and registers, memory layouts, and pin multiplexing. The SoC data model syncs with the [Catalog Manager](../workspaces/catalog-manager.md), ensuring engineers always have access to the latest hardware data without needing manual updates.

- **Command-Line First**: Ensures critical actions run on the CLI, enabling compatibility with modern CI pipelines, and improving test, build, and deployment processes.

- **Graphical Resource Allocation**: Provides the flexibility to allocate and configure memory and peripherals across cores using the System Planner Configuration Tools dashboard, managing SoC resource constraints in one place.

- **Plugin-Based Project Creation**: A flexible, plugin-driven system that supports multiple RTOS and firmware platforms. Developers can add custom plugins to generate configuration and project files tailored to specific development standards.

- **Open Interfaces for Code Generation**: Plugins capture GUI-defined settings at various stages of the development process, generating project and configuration files that fit internal HALs, middleware, and coding standards.

## Goals

CFS aims to bring embedded software into the modern, heterogeneous world. It enables repeatable, testable, and maintainable development pipelines that customers fully own. It creates a window into complex, opaque systems, offering a clearer view of resource allocation and system performance. Above all, it aims to provide engineers with the long-term flexibility and adaptability needed to develop solutions that last as long as the hardware they support.
