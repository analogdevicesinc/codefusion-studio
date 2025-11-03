---
description: GDB command types in CodeFusion Studio.
author: Analog Devices
date: 2025-06-16
---

# GDB command types

The following GDB command types are available when you use the GNU Debugger (GDB) during a debug session in CodeFusion Studio.

For practical command examples and syntax, see [GDB Commands](gdb-commands.md).

## Breakpoints

Breakpoints allow you to set a precise location in your code where execution will stop automatically. GDB provides options to add conditions to breakpoints, allowing you to target specific errors that occur only under certain circumstances.

### Conditional breakpoints

Conditional breakpoints allow you to break on a specific line of code only if a certain condition is met. For example, you can break on a line of code only if a variable is greater than a certain value.

### Temporary breakpoints

Temporary breakpoints allow you to set a breakpoint that triggers once and then deletes itself.

### Delete existing breakpoint

The recommendation is to delete breakpoints not in use as there are a limited number of hardware breakpoints available.

### Inline breakpoints

Inline breakpoints allow you to pause execution within a specific expression or statement, such as inside a loop or method chain.

## Watchpoints

Watchpoints are more powerful than breakpoints because they can evaluate multiple conditions or monitor when a specific variable is accessed or changed. This gives you greater control to inspect structures or arrays at specific times or debug memory access issues. The drawback is that they are much slower, since the debugger analyzes every instruction when a watchpoint is set.

## Stack backtrace

Stack backtrace allows you to rollback the stack frames to see how execution and branching progressed through the code. This helps you diagnose where you were before hitting a breakpoint or stopping program execution.

## Info

The `info` commands retrieve contextual information about the program’s current state, such as function arguments, core register values, and local or global variables.

## Print

The `print` commands display or manipulate variables. They can show arrays in various formats, perform calculations on specific variables or memory addresses, and work with C files.

## Examine

The `examine` commands show the address of a variable or the contents of memory. They can also display instructions and format information. `Examine` commands offer richer display capabilities than `print` commands and work with both C and assembly files.

### Examine source code

The `examine source code` command allows you to access the assembly source code of a function.

## Find

The `find` command allows you to scan a specific address range for a pattern or known value. You can use it to locate a specific instance, inspect stack space, or examine stack memory. It’s useful for checking stack overflow or watermark levels to see how much of the stack has been used.

## Multiple image support

GDB normally parses one ELF file at a time. However, the `add-symbol-file` command allows you to load multiple ELF files in the same GDB session and dynamically switch between them. Use this command when debugging a system with multiple cores or images, allowing you to step across boundaries and continue debugging.
