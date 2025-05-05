---
description: Introduction to the GNU Debugger (GDB) and how to use it with CodeFusion Studio.
author: Analog Devices
date: 2024-07-22
---

# GDB Basics

The GNU Debugger (GDB) allows you to connect to and debug a wide variety of target devices.

It consists of a pair of command-line tools: a GDB server, and a GDB client. These two tools are used together to locally or remotely analyze your program and asssembly code, and single step through the program.

To use GDB, you start a GDB server which physically connects to the target device, and then connect to the server with a GDB client, allowing you to interact with the target device.

## Required Client Version

CFS includes a pre-configured version of GDB, so you don’t need to install it separately. For best results, it is recommended to use GDB 7.12+ or later:

- **GDB 7.12+** – Supports modern debugging features, including inline breakpoints.  
- **GDB 8.x+** – Adds improvements and bug fixes for a better debugging experience.  

!!! Note
    You can check the GDB version by running `show version` in the VS Code debug console.

## Breakpoints

Breakpoints allow you to set a precise place in your code where execution will stop automatically. GDB has  breakpoint command options to set rich conditions to cause a breakpoint. Setting rich conditions allows you to debug very specific errors that only reproduce in given conditions.

### Conditional breakpoints

Conditional breakpoints allow you to break on a specific line of code only if a certain condition is met. For example, you can break on a line of code only if a variable is greater than a certain value.

### Temporary breakpoints

Temporary breakpoints allow you to set a breakpoint that will only fire once and then delete itself.

### Delete existing breakpoint

Recommendation is to delete breakpoints not in use as there are a limited number of hardware breakpoints available.

### Inline breakpoints

Inline breakpoints let you pause execution within a specific expression or statement, such as inside a loop or method chain.

## Watchpoints

Watchpoints are more powerful than breakpoints because they can evaluate a number of condidtions or watch until a specific variable is accessed or changed. This gives you more control to look inside structures or arrays of objects at specific times or debug memory access problems. The drawback is that they are extremely slow as every instruction will be analyzed by the debugger when you set a watchpoint.

## Stack Backtrace

Stack backtrace allows you to rollback the stack frames and see the progression of branches and execution in the code. This helpes diagnose where you were before you ended up at the breakpoint or where you stopped the program execution.

## Info

Use the Info commands to get contextual information about the current state of the program such as arguments passed into the function, the state of the core registers, or the current state of variables, local or global.

## Print

Use the print commands to display variables or manipulate variables. Can display arrays of data in a variety of formats and perform calculations on specific variables or memory addresses. Works on C files.

## Examine

Use the examine commands to show the address of a variable or the contents of memory. They can also display instructions and format information. The examine commands have richer display capabilities than the print commands and work on C files and assembly files.

### Examine source code

The examine source code commands allow you to access the assembly source code of a function.

## Find

The find command allows you to scan a specific address range for a pattern or a known value. It allows you to locate a specific instance, check stack space, or stack memory. Useful for checking the stack overflow or watermark levels to know how much of your stack has been used.

## Multiple image support

GDB normally parses one ELF file at a time, however, using the add-symbol-file command allows you to load multiple ELF files into the same GDB session and dynamically switch between the files. Useful when debugging a system with multiple cores or multiple images, allowing you to step accross boundries to continue debugging.
