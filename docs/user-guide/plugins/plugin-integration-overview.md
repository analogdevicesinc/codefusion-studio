---
description: How plugins are used in CodeFusion Studio.
author: Analog Devices
date: 2025-03-28
---

# Plugin integration overview

CodeFusion Studio (CFS) supports a flexible, extensible plugin system that enhances platform functionality without modifying the base application. Plugins capture user-defined settings at various stages of development and generate configuration and source files based on customizable templates, tailored to internal HALs, middleware, and coding standards.

## Plugin types

CFS supports three types of plugins:

1. **Workspace plugins** – Provide single and multi-core templates that come pre-populated with ADI recommended configurations.
2. **Project plugins** – Define how individual projects are structured and configured.
3. **Code generation plugins** – Generate source code based on user selections in the graphical configuration tools, such as pin mux, memory allocation, etc.

### Workspace plugins

Workspace plugins define a complete, single or multi-core workspace with preconfigured source files, tool settings, and templates. They are shown in the Workspace Creation wizard when you choose the **Select a workspace template** option.

### Project plugins

Project plugins define how a single-core project is structured and configured. They describe the files and templates required to set up the project environment, and provide configuration options for the user to select before project creation. They are shown in the Workspace Creation wizard when you choose the **Manually configure the workspace** option.

### Code generation plugins

Code generation plugins (which are frequently bundled within project plugins) define templates used to produce source code based on configuration settings from the System Planner in CFS.

## Plugin integration with the CFS UI

CFS plugins are surfaced at key stages in the development workflow:

### Workspace creation

- When you **Select a workspace template**, you are choosing a workspace plugin.
- When you opt to **Manually configure the workspace** you are choosing project plugins for each core.

### System Planner

Plugins define the configuration options available in the System Planner. These options are specified in two key sections of the plugin’s `.cfsplugin` file: `supportedSocs` and `properties`.

**supportedSocs:** Declares which SoCs and boards the plugin supports. This data is managed by the [Catalog Manager](../workspaces/catalog-manager.md) and sourced from local JSON files in `${config:cfs.sdk.path}/Utils/cfsutil/dist/socs`. It provides the baseline hardware configuration used by the System Planner.

```json
"supportedSocs": [
  {
    "name": "MAX32655",
    "dataModel": "max32655-ctbga.json",
    "board": "EvKit_V1",
    "package": "ctbga"
  }
]
```

**Properties:** Built on top of the selected SoC hardware configuration, this section defines additional user-configurable fields that appear in the System Planner—for example, UART baud rate. These settings influence code generation but do not affect runtime behavior.

```json
{
  "properties": {
    "project": [],
    "peripheral": {
      "UART0": {
        "supportedControls": [
          {
            "Id": "PARITY"
          }
        ],
        "addedControls": [
          {
            "Id": "CHOSEN",
            "Description": "Chosen. Multiple values can be separated by commas.",
            "Type": "identifier"
          },
          {
            "Id": "BAUD",
            "Description": "Baud Rate",
            "Hint": "115200",
            "Type": "integer"
          }
        ],
        "modifiedControls": []
      }
    }
  }
}

```

### Code generation

On the **Generate Code** page in the System Planner, CFS uses the `codegen` section of the selected code generation plugin to generate source files based on the current configuration.
