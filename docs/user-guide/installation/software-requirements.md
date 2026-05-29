---
description: Software Requirements for CodeFusion Studio
author: Analog Devices
date: 2026-05-23
---

# Software requirements

## Software dependencies

Before installing CodeFusion Studio, install:

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

## Windows support

The AI Tools (including the [Embedded AI Tools](../tools/manage-ai-models.md) panel and the [`cfsutil ai`](../cfsutil/ai/index.md) command-line utility) require the [:octicons-link-external-24: Visual C++ Redistributable for Visual Studio 2015](https://aka.ms/vs/16/release/vc_redist.x64.exe){:target="_blank"} to be installed.

Install this redistributable manually before running the AI Tools.
