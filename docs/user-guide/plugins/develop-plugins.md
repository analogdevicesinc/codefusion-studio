---
description: Learn how to develop custom plugins for CodeFusion Studio.
author: Analog Devices
date: 2025-10-30
---

# Develop plugins

CFS supports custom plugins, allowing you to extend its capabilities without modifying the base application. Using the CFS plugin API, you can develop plugins tailored to specific project needs—such as upgrading an RTOS, integrating middleware, or applying custom code templates.

For information on how to build your own plugins, refer to the [:octicons-link-external-24: CFS Plugins repository](https://github.com/analogdevicesinc/cfs-plugins){:target="_blank"}.

The following information is relevant once you have built your custom plugin.

## Plugin discovery

The `CfsPluginManager` is part of the [cfs-lib](https://github.com/analogdevicesinc/codefusion-studio/tree/main/packages/cfs-lib) package and is responsible for automatically detecting and parsing plugins at startup. When VS Code launches, the manager performs the following tasks:

- Scans the directories listed in `cfs.plugins.searchDirectories`.
- Validates plugin metadata.
- Registers plugin features for the CFS UI and CLI (cfsutil).

## Plugin activation

After building and testing your plugin, make it available in CFS by adding the path to the plugin `dist` directory to your VS Code `settings.json` file.

### Updating your plugin search path

1. Open the `settings.json` file in your CFS workspace.
2. Add the path to your plugin's output directory under the `cfs.plugins.searchDirectories` setting:

```json
"cfs.plugins.searchDirectories": [
    "/path/to/your/plugins/dist",    // Must point directly to the plugin's dist folder
]
```

Once placed, restart CFS to detect the new plugin and create a workspace.
