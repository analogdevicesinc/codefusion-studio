---
description: Software Requirements for CodeFusion Studio
author: Analog Devices
date: 2024-09-26
---

# Software requirements

## Software dependencies

Tools VS Code extensions depend on:

- [Microsoft's Visual Studio Code](https://code.visualstudio.com/) version 1.89.0 or later.

## Host OS support

 CodeFusion Studio and extensions are supported on the following host operating systems:

- Windows 10 or 11 (64-bit)
- macOS (ARM64)
- Ubuntu 22.04 and later (64-bit)

## Linux support

The CodeFusion Studio installer requires the following packages in order to run:

```bash
sudo apt install libfontconfig1 libdbus-1-3 libxcb-icccm4 libxcb-image0 \
                 libxcb-keysyms1 libxcb-render-util0 libxcb-shape0 \
                 libxcb-xinerama0 libxkbcommon-x11-0 libgl1
```

```{note}
These packages are included in default Ubuntu installations, but may need to be added to headless installations.
```
