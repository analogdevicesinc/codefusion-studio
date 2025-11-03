---
description: Configuration Tool for CodeFusion Studio
author: Analog Devices
date: 2025-08-29
---

# System Planner Configuration Tools

CodeFusion Studio (CFS) provides a dashboard for the System Planner Configuration Tools to allow easy configuration of pin multiplexing, clock settings, and System-on-Chip (SoC) resources.

![System Planner Configuration Tools dashboard](../../about/images/system-planner-dashboard-dark.png#only-dark)
![System Planner Configuration Tools dashboard](../../about/images/system-planner-dashboard-light.png#only-light)

To open the System Planner Configuration Tools dashboard:

- Click the appropriate `.cfsconfig` file in your workspace, or:
- Go to **Config Tools > Open Config File** on the CFS Home page to open the Config Tool.

!!! tip
    For information on creating a new workspace, see [Create a new workspace](../../workspaces/create-new-workspace.md) or enter **cfs.createWorkspace** in the command palette.

## Dashboard

The System Planner Configuration Tools dashboard consists of the following tabs:

### Peripheral Allocation

Assign peripherals to cores and configure their functionality. See [Peripheral Allocation](peripheral-allocation.md) for details.

### Pin Config

Configures pin multiplexing and function settings. See [Pin Config](./pin-config.md) for details.

### Clock Config

Configures the various clocks and divers. See [Clock Config](./clock-config.md) for details.

### Memory Allocation

Manage memory allocation and partitioning for different cores. See [Memory Allocation](memory-allocation.md) for details.

### Registers

View and manage register values used by the configuration code. Filter to view modified or default values. See [Registers](registers.md) for details.

### Embedded AI Tools

Import and configure supported AI models for specific cores. See [Embedded AI Tools](manage-ai-models.md) for details on assigning models and applying engine-specific options before code generation.

### Profiling

Supports capturing runtime and inference-level traces from the target and preparing captured CTF traces for visualization. See [Profiling](./profiling.md) for details.

### Generate Code

After setting all configurations, such as pin multiplexing, clock settings, and memory allocation, you can generate the necessary source files for your application. See [Generate Code](generate-code.md) for details.

### Workspace Projects table

The Workspace Projects table provides an overview of the cores in the workspace and their assigned resources.

Use this table to track resource allocation across cores and ensure proper configuration before code generation. Click the chevron (**>**) in a relevant cell to open the corresponding page, where you can modify assignments or resolve any detected issues.

!!! warning
    If the system detects configuration issues (such as pin conflicts), an error appears in the affected cell. Use the chevron (**>**) to open the corresponding page and address the issue.

| **Column** | **Description** |
|------------|---------------|
| Core | Lists available processor cores. |
| Code Generation Plugin | Displays the associated plugin used for code generation. |
| Allocated Peripherals | Displays the number of peripherals assigned to each core. |
| Assigned Pins | Displays the number of assigned pins. |
| Memory Partitions | Displays the number of allocated memory partitions. |
