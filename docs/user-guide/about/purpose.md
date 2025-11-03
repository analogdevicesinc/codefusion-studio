---
description: Why we built CodeFusion Studio
author: Analog Devices
date: 2025-10-21
---

# Purpose

Embedded software engineering is becoming an increasingly complex challenge. As the industry shifts toward heterogeneous multi-core systems and AI-enabled workloads, engineers must configure and debug multiple processing architectures while maintaining efficiency. At the same time, shrinking development resources and tighter time-to-market pressures exacerbate these challenges.

Engineers are expected to deal with this complexity with tools, middleware, and SDKs designed for a single-core, single-architecture world. Those tools are often proprietary, single-vendor solutions that may become obsolete. Code generated from these tools is typically inflexible, with limited usefulness in the real world.

## Why CodeFusion Studio

The award-winning CodeFusion Studio (CFS) is a modern embedded software development ecosystem that integrates with [Visual Studio Code](https://code.visualstudio.com), designed to simplify multi-core, multi-architecture embedded development.

Designed for Analog Devices microcontrollers and digital signal processors, CFS provides a unified development environment that eliminates the complexity of working across multiple toolchains, SDKs, and build systems. It combines graphical system design, code generation, and debugging within a single development and debugging environment.

### Open source

CFS provides these capabilities without the restrictions of activation servers, licensing fees, or vendor lock-in.

It adheres to an Open Source First design principle and provides embedded engineers with robust, extensible tools that they own, designed for long-term use and customization.

- Apache-licensed tooling for full ownership of the software development pipeline

- Permissively-licensed tools for customization

- Open-source toolchains and critical software components

- Integration with Zephyr, an open-source operating system

### System visibility

CFS provides better system visibility into complex systems.

- **System Planner dashboard**: Use the intuitive graphical interface to allocate memory partitions, peripherals, clocks, and pins per core, reducing conflicts in multi-core SoCs.

- **Embedded AI Tools**: Import and configure AI models, assign them to cores, and run compatibility or profiling checks directly in the System Planner.

- **Heterogenous multi-core debugging**:  Debug multiple cores in a single unified environment, eliminating the need for multiple IDEs. One IDE, one debug session, one hardware debugger.

- **Debugging Tools**:  Use the Core Dump Analysis Tool to inspect captured dumps and identify crash causes, and the GDB Toolbox to automate inspection and debugging with JSON-based GDB or Python scripts.

- **Zephelin profiler**: Capture runtime and AI inference-level performance data on supported processors and visualize traces in the Zephelin Trace Viewer for deeper insight into system behavior.

- **ELF File Explorer**: Quickly parse and analyze compiled binaries, minimizing time spent on debugging and memory profiling.

- **Integrated register viewer**: Eliminates the need for repetitive datasheet lookups by providing a graphical representation of configuration registers used in the system configuration.

### Flexibility

CFS also provides flexibility by consolidating technical information in a single data source, for easy integration into custom tooling and modern automated workflows.

- **Package Manager**: Download SDKs, toolchains, plugins, and SoC data models on demand to keep your development environment modular and up to date.

- **Command-Line First**: Ensures critical actions run from the command line, enabling compatibility with modern CI/CD pipelines and automated build, test, and deployment processes. Both `cfsutil` and `cfsai` provide broad feature parity with graphical workflows.

- **Graphical Resource Allocation**: Provides the flexibility to allocate and configure memory and peripherals across cores using the System Planner Configuration Tools dashboard, managing SoC resource constraints in one place.

- **SoC (System on Chip) Data Model**: Provides detailed technical information, including the relationships between config choices and registers, memory layouts, and pin multiplexing. SoC data models are distributed through the [Package Manager](../installation/package-manager/index.md), ensuring engineers always have access to the latest hardware data.

- **Plugin-Based Project Creation**: A flexible, plugin-driven system that supports multiple RTOS and firmware platforms. Developers can add custom plugins to generate configuration and project files tailored to specific development standards.

- **Open Interfaces for Code Generation**: Plugins capture GUI-defined settings at various stages of the development process, generating project and configuration files that fit internal HALs, middleware, and coding standards.

## Goals

CFS aims to bring embedded software into the modern, heterogeneous world. It enables repeatable, testable, and maintainable development pipelines that customers fully own — whether they are building traditional firmware or AI-capable embedded systems. It creates visibility into complex multi-core designs, offering a clearer view of resource allocation, performance, and system behavior. Above all, it provides engineers with the long-term flexibility and adaptability needed to develop solutions that last as long as the hardware they support.
