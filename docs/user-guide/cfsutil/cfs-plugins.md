---
description: CFSUtil - CFS Plugins
author: Analog Devices
date: 2026-03-23
---

# CFS plugins

The CFS plugins command allows you to list CFS plugins. These commands work with plugins installed with CodeFusion Studio or added through the Package Manager, and with plugins built locally from the [:octicons-link-external-24: CFS Plugins repository](https://github.com/analogdevicesinc/cfs-plugins){:target="_blank"}.

## List

```sh
cfsutil cfsplugins list [-s <path>] [--soc <name>] [--board <name>] [--service <service>] [--config-options]
```

Lists all available CFS plugins installed with CodeFusion Studio or added through the Package Manager. You can also specify additional search paths to include locally built plugins. Results can be filtered by SoC, board, or service type.

| Flag           | Description           |
|----------------|-----------------------|
| `-s=<path>`    | (Optional) Additional plugin search path. Can be used multiple times. |
| `--soc=<name>` | Filter results by supported SoC name |
| `--board=<name>` | Filter results by supported board name |
| `--config-options` | Include configuration options (properties.project) in output |
| `--service=<service>` | Filter results by service type. Available services: `workspace`, `project`, `codegen`, `memory`, `peripheral`, `pinConfig`, `clockConfig` |

!!! example
    ```sh
    # List all plugins
    cfsutil cfsplugins list

    # Filter by SoC
    cfsutil cfsplugins list --soc max32690

    # Filter by board
    cfsutil cfsplugins list --board EvKit_V1

    # Filter by service
    cfsutil cfsplugins list --service workspace

    # Combine multiple filters
    cfsutil cfsplugins list --soc max32690 --board EvKit_V1 --service project

    # Show configuration options
    cfsutil cfsplugins list --config-options
    ```
