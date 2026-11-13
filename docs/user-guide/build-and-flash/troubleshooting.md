---
description: Project Management Troubleshooting
author: Analog Devices
date: 2026-09-25
---

# Troubleshooting

## Build flags

- Having build flags set in environment variables may cause unpredictable build behavior.  
If you are seeing flags that appear to be set incorrectly in your projects then check that there are no environment variables set which may be overriding them.  
Examples of such variables are **AS**, **ASFLAGS**, **CC**, **CFLAGS**, **CXX**, **CXXFLAGS**, **CPPFLAGS**, **LD**, **LDLIBS**, **LDFLAGS**.  

!!! note
    A list of environment variables can be produced by running `set` on Windows, or `env` on Linux or Mac.  

## Flashing fails

- Use a USB cable that supports data transfer to connect the board or debug probe to your computer. Charge-only cables might power the hardware but cannot be used for flashing.
- Verify that the board and debug probe are connected correctly. See [Connect hardware](../debugging/connect-hardware.md) or refer to the data sheet for the board.
- Check that the board and debug probe have power by checking their LED indicators.
