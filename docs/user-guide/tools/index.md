---
description: Configuration & Analysis Tools for CodeFusion Studio
author: Analog Devices
date: 2025-04-28
---

# Tools

The following tools are available in CodeFusion Studio:

The [System Planner Configuration Tools dashboard](./config-tool/index.md) includes the following tools:

* [Peripheral Allocation](./config-tool/peripheral-allocation.md) – Assigns peripherals and signals to specific cores.
* [Pin Config](./config-tool/pin-config.md) – Configures pin multiplexing.
* [Clock Config](./config-tool/clock-config.md) – Controls clocks and related signals.
* [Memory Allocation](./config-tool/memory-allocation.md) – Manages memory partitions and assigns RAM or Flash to cores.
* [Registers](./config-tool/registers.md) – Displays register values used by the configuration code and allows filtering based on modified or default values.
* [Generate Code](./config-tool/generate-code.md) – Generates the necessary source files for application configuration.

In addition to the System Planner Configuration Tools dashboard, CodeFusion Studio provides other utilities to support system development. These include:

* The [CFS Command Line Utility](./cfsutil.md) – Provides command-line control over configuration tools and enables ELF file parsing.
* The [ELF File Explorer](./elf-file-explorer.md) – Enables graphical analysis of ELF files.
* The [Device Tree View](./device-tree-view.md) – Allows reviewing of hardware components in Zephyr.

```{toctree}
:hidden:
:glob:

*/index
*
```
