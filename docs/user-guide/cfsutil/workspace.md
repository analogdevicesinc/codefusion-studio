---
description: CFSUtil - Workspace
author: Analog Devices
date: 2026-05-20
---

# Workspace

The workspace commands allow you to configure and create a CFS workspace from the command line.

## Before you begin

Before configuring a workspace, you will need the following information:

- The SoC name and package
- The board identifier
- The core name(s)
- The template ID for each core

Use the following commands to discover these values:

| Command | Purpose |
|---------|---------|
| [`cfsutil socs list`](./socs.md#list) | List all available SoCs and their packages |
| [`cfsutil socs info <SOC> --boards --packages --cores`](./socs.md#info) | Display boards, packages, and cores for a specific SoC |
| [`cfsutil cfsplugins list --soc <SOC>`](./cfs-plugins.md#list) | List available plugins and their template IDs for a specific SoC |

## Configure workspace

```sh
cfsutil workspace configure --soc <value> --board <value> --core <value> --template-id <value> [-w <value>] [--name <value>] [-o <value>] [--package <value>] [--template-version <value>] [-s <value>...] [-v]
```

Generates a workspace configuration file from command-line options. The file can be reviewed and edited before being passed to `cfsutil workspace create -i` to create the workspace.

!!! note
    `--core` and `--template-id` are paired flags. Each `--core` must be immediately followed by `--template-id`. For multi-core projects, repeat the pair for each core.

!!! note
    `--name` and `-o` are optional flags but must be provided either here or edited into the generated file before passing it to `workspace create`. Without them, `workspace create` will fail.

| Flag                            | Description                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `-o, --output=<value>`          | Sets the `Location` field in the generated configuration file, which determines where the workspace will be created. **Recommended**.                                           |
| `-s, --search-path=<value>...`  | Additional search path for plugins and data models. Can be used multiple times.                                |
| `-v, --verbose`                 | Verbose output.                                                                                                |
| `-w, --workspace-file=<value>`  | Name of the generated workspace configuration file. Default: `cfsworkspace.json`.                              |
| `--board=<value>`               | **Required.** Board name.                                                                                      |
| `--core=<value>`                | **Required.** Core name. Repeat for each core, each followed by `--template-id`.                               |
| `--name=<value>`                | Name for the new workspace. **Recommended**.                                                                     |
| `--package=<value>`             | Package name.                                                                                                  |
| `--soc=<value>`                 | **Required.** SoC name.                                                                                        |
| `--template-id=<value>`         | **Required.** Template ID for the preceding `--core`. Must be specified for each `--core`.                     |
| `--template-version=<value>`    | Optional template version for the preceding `--template-id`. Can be specified more than once.                  |

!!! example "Single-core project"
    ```sh
    cfsutil workspace configure \
      --soc MAX32690 \
      --board AD-APARD32690-SL \
      --core CM4 \
      --template-id com.analog.project.msdk.plugin \
      --name myWorkspace \
      -o /path/to/output
    ```

!!! example "Multi-core project"
    ```sh
    cfsutil workspace configure \
      --soc ADSP-SC835 \
      --board ADSPSC835-EV-SOM \
      --core FX --template-id com.analog.project.sharcfx.plugin \
      --core CM33 --template-id com.analog.project.sharcfx.plugin \
      --name myNewWorkspace \
      -o /path/to/output \
      -w myWorkspaceConfig.json
    ```

### Optional: configure a workspace using local plugins and data models

Specify additional directories to search for plugins and data models using `--search-path`. This option can be used with either workspace creation method.

!!! tip
    Plugin directories must contain valid CFS plugins; data model directories must include a generated data model index file. For information on developing CFS plugins, see the [:octicons-link-external-24: CFS Plugins repository](https://github.com/analogdevicesinc/cfs-plugins/blob/main/DEVELOPMENT.md){:target="_blank"}. For information on generating a data model index file, see the [:octicons-link-external-24: CodeFusion Studio GitHub repository](https://github.com/analogdevicesinc/codefusion-studio/blob/main/packages/cli/DEVELOPMENT.md){:target="_blank"}.

| Flag                         | Description                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `-s, --search-path=<path>...` | Additional directories to search for plugins and data models. Can be used multiple times |

!!! example

    ```sh
    cfsutil workspace configure \
      --soc MAX32690 \
      --board AD-APARD32690-SL \
      --core CM4 \
      --template-id com.analog.project.msdk.plugin \
      --name myWorkspace \
      -o /path/to/output \
      -s /path/to/local/plugins \
      -s /path/to/local/data-models
    ```

## Create workspace

```sh
cfsutil workspace create [-s <value>...] [-i <value>] [-o <value>] [--name <value>] [--soc <value>] [--board <value>] [--package <value>] [--template-id <value>] [--template-version <value>]
```

Creates a CFS workspace from an existing `.cfsworkspace` file or with command-line parameters.

!!! note "Usage modes"

    The command supports two mutually exclusive modes:

    - `--input` mode (workspace defined by a `.cfsworkspace` file, with optional `--name` and `--output` overrides)
    - Flag-driven mode (workspace defined using command-line parameters)

    The `--search-path` option can be used with either mode.

You can create a workspace in one of two ways:

- From an existing `.cfsworkspace` file
- By specifying workspace parameters directly as flags

### Create a workspace from an existing `.cfsworkspace` file

```sh
cfsutil workspace create -i <path/to/.cfsworkspace> [--name <value>] [-o <path>] [-s <path>...]
```

Generates a workspace from an existing `.cfsworkspace` file.

!!! important "Using .cfsworkspace files"

    **Compatibility requirements:**

    - `.cfsworkspace` files can be generated from the CFS UI or using `cfsutil workspace configure`.
    - Older `.cfsworkspace` files that reference outdated versions may fail.

    **Parameter restrictions:**

    - When using `--input`, workspace definition parameters come from the `.cfsworkspace` file.
    - The `--name` option may be used alongside `--input` to override the `WorkspaceName` field in the `.cfsworkspace` file, or to fill it in if empty.
    - The `--output` option may be used alongside `--input` to override the `Location` field in the `.cfsworkspace` file, or to fill it in if empty.
    - The `--search-path` option may be used alongside `--input` to specify additional plugin or data model directories. See [Configure a workspace using local plugins and data models](#optional-configure-a-workspace-using-local-plugins-and-data-models).
    - Workspace definition flags such as `--soc`, `--board`, and `--template-id` are not supported with `--input` and will cause errors.

    **Avoiding conflicts:**

    - The generated workspace path is: `<Location>/<WorkspaceName>`.
    - If `<Location>/<WorkspaceName>` already exists, you can either:
        - Use `--name` to specify a different workspace name, or
        - Use `--output` to specify a different location, or
        - Edit the `WorkspaceName` or `Location` fields in the `.cfsworkspace` file
    - This prevents the error: `A folder with this name already exists`.

| Flag                         | Description                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `-i, --input=<path>`         | Path to an existing `.cfsworkspace` file                                                 |
| `--name=<value>`             | Optional. Override the `WorkspaceName` field in the `.cfsworkspace` file, or fill it in if empty |
| `-o, --output=<path>`        | Optional. Override the `Location` field in the `.cfsworkspace` file, or fill it in if empty |
| `-s, --search-path=<path>...`   | Optional. Additional directories to search for plugins and data models. Can be used multiple times |

!!! example "Sample .cfsworkspace file"
    ```json
    {
        "Copyright": "(C) Analog Devices, Inc 2026. Generated by CodeFusion Studio CLI",
        "Timestamp": "2026-04-09T10:38:53.862Z",
        "Soc": "MAX32690",
        "Package": "WLP",
        "Board": "AD-APARD32690-SL",
        "WorkspaceName": "Apard_ws",
        "Location": "C:\\Users\\<username>\\cfs\\2.2.0",
        "WorkspacePluginId": "",
        "WorkspacePluginVersion": "",
        "Projects": [
            {
                "Core": "CM4",
                "Project": "",
                "Path": "",
                "Soc": "MAX32690",
                "Package": "WLP",
                "CoreId": "CM4",
                "Id": "corepart_01jrdgezrce69rsqvja125h3v2",
                "Name": "Arm Cortex-M4F",
                "FirmwarePlatform": "MSDK",
                "IsPrimary": true,
                "IsEnabled": true,
                "PluginId": "com.analog.project.msdk.plugin",
                "PluginVersion": "1.2.0",
                "PlatformConfig": {
                    "ProjectName": "CM4",
                    "MsdkBoardName": "APARD",
                    "Cflags": "-fdump-rtl-expand\n-fdump-rtl-dfinish\n-fdump-ipa-cgraph\n-fstack-usage\n-gdwarf-4\n"
                }
            }
        ],
        "DataModelVersion": "1.3.628",
        "DataModelSchemaVersion": "1.2.0"
    }
    ```

### Create a workspace using command-line flags

Generates a workspace from command-line parameters. The generated workspace path is determined by combining `--output` and `--name`.

| Flag                         | Description                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `-o, --output=<path>`        | **Required**. Output directory for the new workspace (excluding workspace name).          |
| `--board=<value>`            | **Required**. Board name.                                                                 |
| `--name=<value>`             | **Required**. Name of the new workspace.                                                  |
| `--package=<value>`          | Optional. Package name. If not specified, defaults to the board name.                 |
| `--soc=<value>`              | **Required**. SoC name.                                                                   |
| `--template-id=<value>`      | **Required**. Template ID.                                                                |
| `--template-version=<value>` | Optional. Template version. If not specified, uses the latest available version.      |

!!! example
    ```sh
    cfsutil workspace create -o "C:/Users/<username>/cfs/2.2.0" --name myNewWorkspace --soc MAX32690 --board AD-APARD32690-SL --template-id com.analog.multicore.msdk.helloworld
    ```
