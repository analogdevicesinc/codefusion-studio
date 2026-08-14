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
