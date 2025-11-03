---
description: Enable core dump support before using the Core Dump Analysis Tool
author: Analog Devices
date: 2025-08-15
---

# Enable Core Dump support

Core dump support can be enabled during workspace creation in CodeFusion Studio.

## Workspace setup

When creating a new workspace, you have two options:

- Choose a Zephyr-based workspace template
- Manually configure the workspace

### Zephyr-based workspace template

If you choose a Zephyr-based workspace template, core dump support is enabled by default. These templates provide:

- A reserved flash partition for storing core dumps  
- Pre-configured Zephyr settings in `prj.conf` to enable dump generation and storage  

No additional configuration is required.

### Manually configure the workspace

If you choose to manually configure the workspace:

- Select the **Zephyr Project Plugin** when configuring the core.
- In the Platform Options section, select the **Enable Core Dump** checkbox.

![Enable Core Dump](./images/enable-core-dump-dark.png#only-dark)
![Enable Core Dump](./images/enable-core-dump-light.png#only-light)

This applies the necessary Zephyr configuration to enable core dump functionality in your project.
