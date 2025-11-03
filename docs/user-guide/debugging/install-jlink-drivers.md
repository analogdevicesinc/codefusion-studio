---
description: Install drivers for the Segger J-Link
author: Analog Devices
date: 2024-10-29
---

# Install Segger J-Link debugger drivers

Segger's J-Link is a popular JTAG/SWD debugger supported by CodeFusion Studio. The J-Link drivers are not provided directly by CodeFusion Studio so need to be installed manually if using a J-Link.

Download and installation instructions can be found on the Segger website at [:octicons-link-external-24: https://www.segger.com/downloads/jlink/](https://www.segger.com/downloads/jlink/){:target="_blank"}

When installation is complete, open VS Code **Settings** (`Ctrl+,` on Windows/Linux, `⌘,` on macOS), and search for `cfs.jlink.path`. Verify that the **CFS J-Link Path** points to the correct J-Link installation directory.
Typical installation paths include:

- **Windows:** `C:\Program Files\SEGGER\JLink_<version>`  
- **macOS:** `/Applications/SEGGER/JLink_<version>`  
- **Linux:** `/opt/SEGGER/JLink_<version>`

Replace `JLink_<version>` with your installed J-Link version (for example, `JLink_V824` or `JLink_V860`).
