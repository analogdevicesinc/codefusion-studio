---
description: Project Management Troubleshooting
author: Analog Devices
date: 2024-09-23
---

# Troubleshooting

## Build flags

- Having build flags set in environment variables may cause unpredictable build behavior.
If you are seeing flags that appear to be set incorrectly in your projects then check that there are no environment variables set which may be overriding them.
Examples of such variables are **AS**, **ASFLAGS**, **CC**, **CFLAGS**, **CXX**, **CXXFLAGS**, **CPPFLAGS**, **LD**, **LDLIBS**, **LDFLAGS**.

```{note}
A list of environment variables can be produced by running `set` on Windows, or `env` on Linux or Mac.
```
