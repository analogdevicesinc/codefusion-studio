---
description: Understand the results presented in the Core Dump Analysis panel in CodeFusion Studio.
author: Analog Devices
date: 2026-10-01
---

# Interpret core dump results

!!! example "Sample core dump analysis"
    ![Core Dump View](./images/core-dump-tree-dark.png#only-dark)
    ![Core Dump View](./images/core-dump-tree-light.png#only-light)

When you retrieve and analyze a core dump, CodeFusion Studio populates the **Core Dump Analysis** view with the following sections:

## Crash Cause

This section identifies the reason for the crash, if available.

- **Type:** Categorizes the crash (example: memory fault, bus fault). Displays as `Unknown` if not determinable.  

- **Address:** Memory address where the crash occurred.  
- **Faulting IP:** Instruction pointer (PC) at the time of the crash.  
- **Faulting Location:** File and line number in the source code.  
- **Details:** May include specific Zephyr kernel error codes or messages, if available.  

!!! example "Sample UART Log Output"
    ```text
    [00:00:00.001,000] <err> os: >>> ZEPHYR FATAL ERROR 4: Kernel panic on CPU 0
    [00:00:00.001,000] <err> os: Current thread: 0x20000660 (main)
    [00:00:00.083,000] <err> os: ***** HARD FAULT *****
    [00:00:00.083,000] <err> os:   Fault escalation (see below)
    [00:00:00.083,000] <err> os: ***** MPU FAULT *****
    [00:00:00.083,000] <err> os:   Instruction Access Violation
    [00:00:00.084,000] <err> os: >>> ZEPHYR FATAL ERROR 20: Unknown error on CPU 0
    [00:00:00.084,000] <err> os: Fault during interrupt handling
    [00:00:00.270,000] <err> os: Halting system
    ```

## Tasks Stack

This section shows which thread was running at the time of the crash.

- **Name:** The thread name. For example, `main` refers to the main application thread. `z_thread_entry` is an internal Zephyr function involved in thread execution.
- **Status:** Indicates the current thread status (typically `stopped`).  
- **Thread Address:** Memory address of the thread control block.  

### Stack Usage

Information on how much stack memory was used by the crashed thread.

- **Used:** Stack memory used at time of crash.  
- **Total Allocated:** Stack size assigned to the thread.  
- **Watermark (Peak Usage):** Peak stack usage prior to the crash.  

### Execution Info

Registers captured at the time of crash.

- **PC (Program Counter):** Address of the currently executing instruction.  
- **SP (Stack Pointer):** Points to the top of the current stack.  
- **LR (Link Register):** Contains the return address for function calls.  

### Stack Trace

A backtrace of function calls leading to the crash.

- **Name:** Function where the crash occurred.  
- **Symtab:** Source file and line number.  
- **Line:** Line of code that triggered the crash.  
- **PC / SP:** Program and stack pointers at time of crash.  
- **Reason:** Additional details if the stack could not be fully unwound.  

## Global Heap

This section summarizes system-wide heap memory usage at the time of the crash.

- **Total:** Total heap available.  
- **Used:** Heap in use at time of crash.  
- **Peak:** Highest amount of heap used since boot.  

## Peripheral State

This section shows the peripheral register state at the time of the crash. Examples include general-purpose input/output (GPIO) peripherals such as GPIO0 and direct memory access (DMA) engines. Peripherals with sub-units, such as DMA channels, list those sub-units as nested entries.

- **Name:** The peripheral or sub-unit name.
- **Registers:** Each register displays its name and highlighted value, with an optional description. A warning icon displays for registers flagged as a problem.

CodeFusion Studio automatically expands a peripheral flagged as a problem and also displays an error icon so you can spot it quickly in the tree. A collapsed peripheral can still contain a register with a warning icon, so expand a peripheral to check its registers even if no error is showing.

!!! note
    The **Peripheral State** section shows register data only when a peripheral state script is available to GDB Toolbox. This is available on select platforms. If no script is available, this section shows **No peripheral state info available**, and the rest of the core dump analysis still proceeds.

!!! note "Advanced users"
    For additional information on the values shown in the Core Dump Analysis view, refer to the [GDB Toolbox](../gdb-toolbox/gdb-toolbox-about.md) scripts and the [:octicons-link-external-24: GDB Python API documentation](https://sourceware.org/gdb/current/onlinedocs/gdb.html/index.html#SEC_Contents).
