---
description: Learn how to develop custom plugins for CodeFusion Studio.
author: Analog Devices
date: 2025-04-08
---

# Develop plugins

CFS supports custom plugins, allowing you to extend its capabilities without modifying the base application. Using the CFS plugin API, you can develop plugins tailored to specific project needs—such as upgrading an RTOS, integrating middleware, or applying custom code templates.

For information on how to build your own plugins, refer to the [CFS Plugins repository](https://github.com/analogdevicesinc/cfs-plugins).

The following information is relevant once you have built your custom plugin.

## Plugin discovery

The `CfsPluginManager` is part of the {git-codefusion-studio}`cfs-lib <packages/cfs-lib>` package and is responsible for automatically detecting and parsing plugins at startup. When VS Code launches, the manager performs the following tasks:

- Scans the directories listed in `cfs.plugins.searchDirectories`.
- Validates plugin metadata.
- Registers plugin features for the CFS UI and CLI (cfsutil).

## Plugin activation

After building and testing your plugin, activate it in CFS by placing it into one of the following directories, defined in your VS Code `settings.json`:

- `${userHome}/cfs/plugins`: Recommended for active development.
- `${config:cfs.sdk.path}/Plugins`: Used for the default plugins shipped with CFS.

### Updating your plugin search path

1. Open the `settings.json` file in your CFS workspace.
2. Add the path to your plugin directory under the `cfs.plugins.searchDirectories` setting:

```json
"cfs.plugins.searchDirectories": [
    "${userHome}/cfs/plugins/dist",    // Recommended for active development
    "${config:cfs.sdk.path}/Plugins", // Existing plugin directory
]
```

Alternatively, copy your plugin into the existing plugin directory (`${config:cfs.sdk.path}/Plugins`). This directory is automatically scanned at startup.

Once placed, restart CFS to detect the new plugin and create a workspace.

```{tip}
You can also use the cfsutil command line utility to automate plugin creation from the terminal. For more details, refer to [CFS command line utility](../tools/cfsutil.md).
```
