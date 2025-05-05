---
description: Features included with CodeFusion Studio
author: Analog Devices
date: 2025-04-23
---

# Features

Explore all the features CodeFusion Studio has to offer.

## System Planner Configuration Tools dashboard

The [System Planner Configuration Tools dashboard](../tools/config-tool/index.md) centralizes the configuration of cores, memory partitions, peripherals, clocks, and pins. This dashboard simplifies hardware resource management in multi-core SoCs and facilitates the generation of source code to integrate directly into your projects.

![System Planner dashboard](./images/system-planner-dashboard-dark.png#only-dark)
![System Planner dashboard](./images/system-planner-dashboard-light.png#only-light)

## Multi-core software development

Manage all your projects with the [workspace creation wizard](../workspaces/create-new-workspace.md). Create multiple, distinct projects for each core and use the provided tools to streamline development at the system and individual core level.

![Workspace Creation Wizard](./images/workspace-creation-light.png#only-light)
![Workspace Creation Wizard](./images/workspace-creation-dark.png#only-dark)

## Heterogeneous multi-core debugging

CodeFusion Studio provides an advanced multi-core debugging environment, allowing developers to debug multiple cores within a single IDE, single debug session, and single hardware debugger. It supports:

- Breakpoints, disassembly, heterogeneous debug, and RTOS thread awareness.
- Multi-architecture debugging, with tools and libraries supporting development across ARM, RISC-V, and other architectures.

![Multi-core debugging](./images/multi-core-debugging-light.png#only-light)
![Multi-core debugging](./images/multi-core-debugging-dark.png#only-dark)

## Platform agnostic architecture

CodeFusion Studio separates configuration from code generation using an extensible plugin-based architecture. This enables flexibility when selecting RTOS, middleware, and project structures, allowing you to adapt your development workflow without being locked into a specific platform.

- Configuration choices are captured through the GUI and stored in a structured JSON file, ensuring consistency across projects.
- Code generation is executed by command-line plugins, enabling automation and repeatable builds.
- Multiple plugins are available per core (Zephyr, MSDK, etc.), with each exposing custom configuration options specific to the selected environment.

![Platform Agnostic Architecture](./images/platform-agnostic-architecture-dark.png#only-dark)
![Platform Agnostic Architecture](./images/platform-agnostic-architecture-light.png#only-light)

## Graphical resource allocation

Manage SOC resource constraints in one place using dedicated graphical interfaces. These interfaces expose the plugin architecture, enabling context-aware settings specific to the selected core and firmware platform

[Peripheral Allocation](../tools/config-tool/peripheral-allocation.md) provides a graphical interface to assign and optimize peripheral distribution across cores.

![Peripheral Allocation](./images/peripheral-allocation-dark.png#only-dark)
![Peripheral Allocation](./images/peripheral-allocation-light.png#only-light)

[Memory Allocation](../tools/config-tool/memory-allocation.md) allows graphical allocation and configuration of memory resources across available cores.

![Memory Allocation](./images/memory-allocation-dark.png#only-dark)
![Memory Allocation](./images/memory-allocation-light.png#only-light)

## Plugin-based GUI

A flexible, plugin-driven, graphical interface supports multiple RTOS and firmware platforms. Settings defined in the GUI get captured by plugins to generate customized workspaces, projects, and configuration files that align with your development standards, middleware, and coding guidelines. Each plugin exposes adjustable configuration options in the GUI.

![Plugin Config Settings](./images/plugin-config-settings-dark.png#only-dark)
![Plugin Config Settings](./images/plugin-config-settings-light.png#only-light)

## ELF file explorer

[ELF File Explorer](../tools/elf-file-explorer.md) provides a graphical interface to help understand and analyze the contents of ELF files.

- Analyze flash and memory usage in your ELF image:

![symbols](./images/elf-flash-and-memory-usage-light.png#only-light)
![symbols](./images/elf-flash-and-memory-usage-dark.png#only-dark)

- Run SQL queries for symbols within in the ELF file:

![symbols](./images/symbols-light.gif#only-light)
![symbols](./images/symbols-dark.gif#only-dark)

- Browse through segments, sections, and symbols with the interactive memory map:

![Memory layout](./images/memorylayout-light.gif#only-light)
![Memory layout](./images/memorylayout-dark.gif#only-dark)
