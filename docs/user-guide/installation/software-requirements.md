---
description: Software Requirements for CodeFusion Studio
author: Analog Devices
date: 2024-09-26
---

# Software requirements

## Software dependencies

The CodeFusion Studio VS Code extension depends on:

- [**Microsoft Visual Studio Code**](https://code.visualstudio.com/) version **1.100** or later (recommended).

!!! note
    Older versions of VS Code (such as 1.98 and earlier) are not supported due to known layout issues in the **System Planner > Pin Config** canvas.

## Host OS support

CodeFusion Studio and its extension are supported on the following host operating systems:

- Windows 11 (64-bit)  
- macOS 15 and macOS 26 (ARM64)
- Ubuntu 22.04 and 24.04 (64-bit)

*Earlier or newer OS versions may work but are not officially supported.*

## Linux support

The CodeFusion Studio installer requires the following packages in order to run.

``` bash
sudo apt install libfontconfig1 libdbus-1-3 libxcb-icccm4 libxcb-image0 libxcb-keysyms1 libxcb-render-util0 libxcb-shape0 libxcb-xinerama0 libxkbcommon-x11-0 libgl1
```

!!! note
    These packages are included in default Ubuntu installations, but may need to be added to headless installations.
