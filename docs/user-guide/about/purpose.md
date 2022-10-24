---
description: Why we built CodeFusion Studio
author: Analog Devices
date: 2024-09-12
---

# Purpose

Embedded software engineering is an increasingly complex problem to solve. As technology marches toward multi-core, multi-architecture solutions, time to market and development resources are shrinking. Engineers are expected to deal with this complexity with tools, middleware, and SDKs designed for a single-core, single-architecture world. Those tools are often proprietary, single-vendor solutions that may become obsolete. Code generated from these tools is typically inflexible, with limited usefulness in the real world

## Why CodeFusion Studio

Embedded engineers need open-sourced tools designed for multi-core systems that provide system visibility and offer the flexibility to adapt to their development needs, without having to worry about activation servers, licensing fees, or cobbling together their own makeshift tools.

### Open source

Analog Devices’ CodeFusion Studio adheres to an Open Source First design principle. It provides embedded engineers with robust, extensible tools that they own, designed for long-term use and customization.

- Permissively-licensed tools that can be modified to suit unique needs

- Open-source toolchains and critical software components

- Integration with Zephyr, an open-source operating system

### System visibility

CodeFusion Studio provides better system visibility into complex systems.

- ELF (Executable and Linkable Format) File Explorer enables users to quickly parse and analyze compiled binaries, reducing time spent on debugging and profiling. (image 2)(image 3)(image4)

- Simultaneous multi-core debug allows multiple cores to be debugged in the same workspace and IDE (Integrated Development Environment), often with a single hardware debugger.

- Integrated register viewer eliminates repetitive datasheet referencing with a graphical representation of config registers used in the config tools.

### Flexibility

CodeFusion Studio also provides flexibility by consolidating technical information in a single data source, for easy integration into custom tooling and modern automated workflows.

- SoC (System on Chip) Data Model provides detailed technical information, including the relationships between config choices and registers, memory layouts, and pin multiplexing.

- This JSON-encoded data model is human and machine-readable, allowing engineers to build custom tools.

- Command-Line First ensures critical actions run on the CLI enabling compatibility with modern CI pipelines, and better test, build, and deployment processes.

- Plugin-based code generation separates design decisions, captured in the config tools, from the code generation engine, allowing users to tailor code to their own HALs, APIs, or schedulers. (image 1)

## Goals

CodeFusion Studio aims to bring embedded software into the modern, heterogeneous world. It enables repeatable, testable, and maintainable development pipelines that customers fully own. It creates a window into complex, opaque systems, offering a clearer view of resource allocation and system performance. Above all, it aims to provide the flexibility engineers need to develop solutions that last as long as the hardware it’s built to support.
