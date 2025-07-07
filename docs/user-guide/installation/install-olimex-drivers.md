---
description: Install drivers for the ARM-USB-OCD-H
author: Analog Devices
date: 2024-09-02
---

# Install Olimex USB ARM JTAG Drivers for RISC-V Debugging

The Olimex ARM-USB-OCD-H debugger is required to debug the RISC-V core on supported MAX32xxx and MAX78xxx devices. The Olimex drivers are not provided directly by CodeFusion Studio so need to be installed manually if RISC-V debugging is required.

Download and installation instructions can be found in chapter 3 of the [Olimex ARM-USB-OCD-h User Manual](https://www.olimex.com/Products/ARM/JTAG/_resources/ARM-USB-OCD_and_OCD_H_manual.pdf).

## Linux configuration

On Linux the user may need to be added to the **dialout** group in order to use the Olimex Debugger.

```bash
sudo usermod -aG dialout <username>
```
