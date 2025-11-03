---
description: Introduction to the GDB Toolbox and how to use it with CodeFusion Studio.
author: Analog Devices
date: 2025-09-17
---

# About the GDB Toolbox

The GDB Toolbox provides access to both default and user-defined JSON-based scripts that help inspect program state during a halted debug session. These scripts run GDB commands and capture their output, making it easy to automate debugging tasks. You can create and manage custom scripts using templates or by copying and extending default scripts to enhance functionality.

The Toolbox works with MSDK, SHARC-FX, and Zephyr projects, and supports both single-core and multi-core debug sessions.

!!!Tip
    For information on other debugging tools such as breakpoints, watch, and call stack, see [Debug an application](../../debug-an-application.md).

## GDB Toolbox scripts

When you create a CFS workspace, the `gdb_toolbox` folder is automatically added to the `.cfs` directory within the workspace.

![GDB Toolbox](./images/gdb_toolbox_folder_light.png#only-light) ![GDB Toolbox](./images/gdb_toolbox_folder_dark.png#only-dark)

 This folder contains the scripts used by the GDB Toolbox and includes the Configs and GDB subdirectories.

### Configs directory

The `configs` directory contains the default GDB Toolbox JSON scripts that define which GDB commands to run.

The following default scripts are added to your workspace when it's created and cover common tasks such as dumping memory, analyzing stack usage, or detecting system faults:

| Script name                       | Description                                                                                                                                               | Supported cores | Supported firmware platform[^1] |
|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------|---------------------------------|
| **Analyze Crash** | Analyzes a crash and generates a JSON report of faulting threads. | Core agnostic | Zephyr |
| **Analyze Faults**                | Analyzes system faults and exceptions such as hard faults or bus errors. Reads and decodes fault status registers, and prints a fault summary.            | ARM             | MSDK, Zephyr                    |
| **Analyze Global Heap**           | Analyzes heap usage and prints a JSON report showing total heap size (total), currently used memory (used), and the peak memory usage (max).              | Core agnostic   | Zephyr                          |
| **Analyze Stack**                 | Performs a detailed analysis of stack usage. Traverses stack frames, prints local variables and arguments, and calculates used and remaining stack space. | Core agnostic   | MSDK                            |
| **Analyze Stack High-water Mark** | Analyzes the maximum stack depth reached during runtime using a known fill pattern. Requires the stack painter to be run beforehand.                      | Core agnostic   | MSDK                            |
| **Dump Memory**                   | Dumps the current memory state to a log file.                                                                                                             | Core agnostic   | MSDK, Zephyr, SHARC-FX          |
| **Dump Registers**                | Dumps the current register state to a log file.                                                                                                           | Core agnostic   | MSDK, Zephyr, SHARC-FX          |
| **Interrupt Status**              | Analyzes IRQ and system handlers by reading the NVIC state to identify enabled, active, and pending interrupts, and their associated handlers.            | ARM             | MSDK                            |
| **Paint Stack**                   | Fills the stack with a known pattern (`0xDEADBEEF`) to enable runtime analysis of maximum stack usage. Must be run before the High-water Mark script.     | Core agnostic   | MSDK                            |
| **Thread Analyzer**               | Analyzes all active threads and extracts each thread’s stack usage, register state, and call trace.                                                       | Core agnostic   | Zephyr                          |

[^1]:Only compatible scripts are shown during a debug session. This context-awareness ensures you only run scripts that are supported by the active project.

### GDB directory

The `gdb` directory stores optional GDB scripts that are referenced by the JSON scripts.

GDB scripts (`.gdb` files) are plain text files that contain either raw GDB commands or Python code using the GDB Python API. Most scripts in this directory use native GDB commands, but advanced scripts such as **Thread Analyzer** leverage Python for intelligent analysis. These scripts are referenced in Toolbox JSON configs.

For example, the **Thread Analyzer** Toolbox script includes a `source` field that points to a `thread-analyzer.gdb` GDB script in the `gdb` directory:

```json
{
  "name": "Analyze Threads",
  "description": "Analyzes threads in the target application.",
  "commands": [
    {
      "command": "source {defaultScriptsDirectory}/thread-analyzer.gdb",
      "actions": [{}]
    }
  ]
}

```

For an introduction to GDB scripting, refer to the [:octicons-link-external-24: GDB manual – Command Files](https://sourceware.org/gdb/current/onlinedocs/gdb/Command-Files.html ){:target="_blank"} and [:octicons-link-external-24: User-defined Commands](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Define.html#Define){:target="_blank"}.

For advanced scripting using Python, refer to the [:octicons-link-external-24: GDB Python API documentation](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Python-API.html){:target="_blank"}.
