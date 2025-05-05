---
description: The CFSUtil Command Line Utility
author: Analog Devices
date: 2025-04-28
---

<!-- markdownlint-disable MD024 -->
<!-- markdownlint-disable MD046 -->

# CFS command line utility

**CFSUtil** is an executable which provides a lot of the functionality within CodeFusion Studio and can be invoked directly from the command line.

## Accessing CFSUtil

From the [CFS Terminal](../workspaces/cfs-terminal.md), access CFSUtil with the `cfsutil` command.  
From Windows command prompt, access CFSUtil with `<CFS-Install>/Utils/cfsutil/bin/cfsutil.cmd`.  
From Linux and macOS, access CFSUtil with `<CFS-Install>/Utils/cfsutil/bin/cfsutil`.  

!!! note
    This page refers to `cfsutil`, but the commands used are the same regardless of method used.

## Structure

CFSUtil contains a hierarchy of commands and sub-commands, each with their own parameters and help menus.

## Help

Passing `--help` at any level of the hierarchy shows the help information about that component.

You can access help at various levels:

- `cfsutil --help` provides top-level help.
- `cfsutil elf --help` provides help for the `elf` component.
- `cfsutil elf info --help` provides help for generating info output.

!!! example

    ```sh
    cfsutil --help
    ```

!!! example

    ```sh
    cfsutil elf --help
    ```

!!! example

    ```sh
    cfsutil elf info --help
    ```

## Device tree

The device tree provides a command to parse device tree files (`*.dts`,`*.dtsi`, or `*.overlay`). The output is in JSON format.

### Parse

`cfsutil dt parse <FILEPATH> [-I <value>...] [-o <value>] [-v]`  

| Switch | Effect                                     |
| ------ | ------------------------------------------ |
| `-I, --includeDirs=<value>...`   | Specifies directories to include when parsing the Devicetree file. Can be used multiple times, e.g., -Idir1 -Idir2 -Idir3                 |
| `-o, --output=<value>`   | Specifies the output file in JSON format.|
| `-v, --verbose`   |   Enables verbose mode for additional details during parsing.     |

!!! example

    ```sh
    cfsutil dt parse myfile.dts -o output.json

    ```

## ELF

Provides a series of commands to get information about an ELF file.

### Analyze

`cfsutil elf analyze <FILEPATH> [-j]`  
Provides high-level information about the ELF file, including the platform, stack/heap sizes and flash/sram sizes.  
Use the `-j` switch to produce output in JSON format.  

### Info

`cfsutil elf info <FILEPATH> [-j] [-h] [-a] [-c] [-s] [-v]`

Provides more in depth information about the ELF file.  
At least one of the following switches are required. They can be used individually or in combination to select the required information.

| Switch   | Information                         |
| -------- | ----------------------------------- |
| `-a`     | Attributes                          |
| `-c`     | Core information about the ELF file |
| `-h`     | Header                              |
| `-s`     | Size                                |

Additional options are available to control the output.

| Switch  | Effect                   |
| ------- | ------------------------ |
| `-j`    | Output in JSON format    |
| `-v`    | Verbose output           |

### Memory

`cfsutil elf memory <FILEPATH> [-s] [-t] [-y] [-i <value>] [-n <value>] [-j] [-d]`  

Provides information on symbols, sections or segments within the ELF file.  

Choose at least one of the available switches:

| Switch | Effect                                     |
| ------ | ------------------------------------------ |
| `-d`   | Print detailed information. Must be used with `-s`, `-t`, or `-y`.  |
| `-i`   | Display from section or segment with id      |
| `-s`   | List of segments                           |
| `-j`   | Output in JSON format. Must be used with `-s`, `-t`, or `-y`.   |
| `-n`   | Display from section or segment with name    |
| `-t`   | List of sections in each segment           |
| `-y`   | List the symbols contain in each section   |

!!! note
    For `-t` and `-y`, the sections/symbols to display can be restricted to a segment/section using an id (`-i`) or a name (`-n`).  
    For `-y`, the segment/symbols can be restricted to a segment/section using a name (`-n`).

### Symbols

`cfsutil elf symbols <FILEPATH> <SQLQUERY> [-j] [-f]`  

This command allows you to run SQL queries on the symbol table.  
This involves queries on a table called `symbols` with the following fields.

| Name         | Meaning                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `name`       | Symbol name                                                             |
| `type`       | The type associated with the symbol: None, Object, Function or Filename |
| `address`    | The start address of the symbol                                         |
| `section`    | The section containing the symbol                                       |
| `size`       | The size of the symbol                                                  |
| `bind`       | The binding type of the symbol: Weak, Local or Global                   |
| `visibility` | The visibility of the symbol: Default or Hidden                         |
| `path`       | File path                               |

Any valid SQL construct is supported, including `WHERE`, `ORDER`, `LIMIT`, `LIKE` and `REGEXP`.
Some examples of queries are as follows:

| Filter                        | Query examples                                                          |
| ----------------------------- | ----------------------------------------------------------------------- |
| Specific columns               | `SELECT name,address FROM symbols`                                      |
| Symbols larger than 100 bytes | `SELECT * FROM symbols WHERE size > 100`                                |
| Largest symbols               | `SELECT * FROM symbols ORDER BY size DESC LIMIT 10`                     |
| Symbols between addresses     | `SELECT * from symbols WHERE address BETWEEN 0x10000000 AND 0x20000000` |

The output can be modified with the following switches.

| Switch | Effect                                       |
| ------ | -------------------------------------------- |
| `-f`   | Print full path (if debug info is available) |
| `-j`   | Output in JSON format                        |

## SoCs

Each SoC supported by CodeFusion Studio is associated with an SoC Data Model.

This data model is a JSON file that contains information on the package, available memory, config settings and register details, and other essential information required to enable the graphical config tools and code generation functionality.

The `socs` command allows you to interact with the SoC data models known to cfsutil.

### List

`cfsutil socs list [-f text|json] [-v]`

Provide a list of available SoC data models.

| Switch           | Effect                                                      |
| ---------------- | ----------------------------------------------------------- |
| `-f=<format>`    | Output format (either `text` or `json`)  |
| `-v`             | Generate verbose output                                     |

### Export

`cfsutil socs export -n <value> [-f json] [--gzip] [-i <value>] [-m] [-o stdio]`

Outputs the SoC data model in JSON format for the specified SoC. The `-n=<name>` switch is required, whilst the rest are optional.

| Switch           | Effect                                                                                |
| ---------------- | ------------------------------------------------------------------------------------- |
| `-n=<name>`      | Required. The name of the SoC to export                                              |
| `-f=<format>`    | Output format (`json` only)  |
| `--gzip`         | Compress the output with `gzip`                                                       |
| `-i=<val>`       | The number of spaces for JSON indentation (use `$\'t' for tabs). Default is 2 spaces. |
| `-m`             | Minify the JSON output.                                                               |
| `-o stdio`       | Print to the screen.                                                               |

!!! note
    It is recommended to pipe the output to a file, especially if compressing the output:  
    `cfsutil socs export -n=max32690-tqfn --gzip > file.gz`

## Oclif plugins

These plugins extend the `cfsutil` command-line interface. They allow users to add new commands to the CLI by installing plugins from npm or Git URLs. These plugins follow the Oclif plugin framework and are managed independently of CFS. They can be used for a variety of purposes, from verifying environment variables to integrating custom tooling into your CLI workflow.

### List plugins

`cfsutil plugins [--json] [--core]`

List installed plugins.

| Flag     | Description           |
|----------|-----------------------|
| `--json` | Format output as JSON |
| `--core` | Show core plugins     |

!!! example
    ```sh
    cfsutil plugins
    ```

### Inspect plugin

`cfsutil plugins inspect <PLUGIN>`

Displays installation properties of a plugin.

| Flag           | Description             |
|----------------|-------------------------|
| `-h, --help`   | Show CLI help          |
| `-v, --verbose`| Show verbose output     |
| `--json`       | Format output as JSON   |

!!! example
    ```sh
    cfsutil plugins inspect myplugin
    ```

### Install plugin

`cfsutil plugins install <PLUGIN>`

Installs a plugin into the CLI from npm or a Git URL. Installation of a user-installed plugin will override a core plugin. If the installed plugin defines a command with the same name as an existing command, the installed plugin version will take priority and override the default.

| Flag           | Description                          |
|----------------|--------------------------------------|
| `-f, --force`  | Run yarn install with force flag     |
| `-h, --help`   | Show CLI help                        |
| `-s, --silent` | Silences yarn output                 |
| `-v, --verbose`| Show verbose yarn output             |
| `--json`       | Format output as JSON                |

!!! note
    Aliases: `cfsutil plugins add`

!!! example
    ```sh
    cfsutil plugins install myplugin
    cfsutil plugins install https://github.com/someuser/someplugin
    ```

### Link plugin

`cfsutil plugins link <PATH>`

Links a plugin into the CLI for development. Installation of a linked plugin will override a user-installed or core plugin. If the linked plugin defines a command with the same name as a user-installed or core plugin, the linked version will take priority and override the existing implementation.

| Flag              | Description                                 |
|-------------------|---------------------------------------------|
| `--[no-]install`  | Install dependencies after linking plugin   |
| `-v, --verbose`   | Show verbose output                         |
| `-h, --help`   | Show CLI help                                  |

!!! example
    ```sh
    cfsutil plugins link ./myplugin
    ```

### Reset plugins

`cfsutil plugins reset [--hard] [--reinstall]`

Removes user-installed and linked plugins.

| Flag          | Description                                           |
|---------------|-------------------------------------------------------|
| `--hard`      | Also delete node_modules and related files            |
| `--reinstall` | Reinstall all plugins after uninstalling             |

### Uninstall plugin

`cfsutil plugins uninstall <PLUGIN>`

Removes a plugin from the CLI.

| Flag           | Description           |
|----------------|-----------------------|
| `-v, --verbose`| Show verbose output   |
| `-h, --help`   | Show CLI help         |

!!! note
    Aliases: `cfsutil plugins remove`, `cfsutil plugins unlink`

!!! example
    ```sh
    cfsutil plugins uninstall myplugin
    ```

### Update plugins

`cfsutil plugins update [-v]`

Update installed plugins.

| Flag           | Description           |
|----------------|-----------------------|
| `-v, --verbose`| Show verbose output   |
| `-h, --help`   | Show CLI help         |

## CFS plugins

Use the following CFS plugin commands to automate workspace, project, and code generation from the terminal. These commands work with both built-in and custom plugins discovered in your configured plugin directories.

!!! note
    The default plugin path is `${userHome}/cfs/plugins` if the `-s` flag is not specified for any of the following commands . This directory is intended for active development of custom plugins. For information on custom plugins, see [Developing plugins](../plugins/develop-plugins.md).

### List

```sh
cfsutil cfsplugins list [-s <path>]
```

Lists all valid `.cfsplugin` files found in the specified search directory.

| Flag           | Description           |
|----------------|-----------------------|
| `-s=<path>`    | (Optional) Additional plugin search path. If omitted, the default is `${userHome}/cfs/plugins` (for active development of custom plugins). Can be used multiple times. |

### Create workspace

```sh
cfsutil workspace create -w <path/to/.cfsworkspace> [-s <plugin/search/directory>]
```

Generates a workspace using the structure defined in a `.cfsworkspace` file.

Use a valid `.cfsworkspace` file generated in the CFS UI. Do not reuse the original location from the UI-generated file—change the **Location** field to avoid path conflicts.

```json
{
    "Soc": "MAX32690",
    "Package": "WLP",
    "WorkspacePluginId": "com.analog.multicore.msdk.helloworld",
    "WorkspacePluginVersion": "1.0.0",
    "WorkspaceName": "Apard_ws",
    "Location": "test-folder", //Must differ from the original location if copied from a UI-generated file, to avoid path conflicts
    "Board": "AD-APARD32690-SL",
    "Projects": [],
    "DataModelVersion": "1.1.44",
    "DataModelSchemaVersion": "1.1.0"
}
```

| Flag           | Description           |
|----------------|-----------------------|
| `-w=<path>`    | **Required.** Path and filename of the `.cfsworkspace` file |
| `-s=<path>`    | (Optional) Additional plugin search path. If omitted, the default is `${userHome}/cfs/plugins`. Can be used multiple times. |

!!! warning
    Projects and workspaces created manually using these commands may not exactly match those generated by the IDE, depending on plugin versions and data model updates.

### Create project

```sh
cfsutil project create -w <path/.cfsworkspace> -p <project-name> [-s <plugin/search/directory>]
```

Generates or regenerates a project defined within an existing `.cfsworkspace` file.

!!! important
    You must run `cfsutil workspace create` before using this command. The workspace and it's `cfs` folder must already exist. This command does not create standalone projects—it only works within a valid workspace.

    The `project create` command is mainly intended to **regenerate** a project inside an existing workspace, typically after a plugin upgrade or workspace update. It **overwrites the project structure** based on the latest plugin templates but **does not modify user code**.

Refer to the example below. The `-p` flag must match the **Name** value of the project you want to generate.

```json
{
  "Soc": "MAX32690",
  "Package": "WLP",
  "WorkspaceName": "Apard_ws", /// Ensure that the workspace already exists
  "Location": "test-folder",
  "Board": "AD-APARD32690-SL",
  "Projects": [
    {
      "CoreId": "CM4",
      "PluginId": "com.analog.project.msdk.plugin",
      "PluginVersion": "1.0.0",
      "Name": "m4",
      "IsPrimary": true,
      "IsEnabled": true,
      "PlatformConfig": {
        "ProjectName": "CM4",
        "MsdkBoardName": "APARD",
        "Cflags": [
          "-fdump-rtl-expand",
          "-fdump-rtl-dfinish",
          "-fdump-ipa-cgraph",
          "-fstack-usage",
          "-gdwarf-4"
        ]
      },
      "FirmwarePlatform": "MSDK"
    }
  ],
  "DataModelVersion": "1.1.44",
  "DataModelSchemaVersion": "1.1.0"
}
```

| Flag           | Description           |
|----------------|-----------------------|
| `-w=<path>`    | **Required.** Path and filename of the `.cfsworkspace` file |
| `-p=<name>`    | **Required.** Required. Name of the project to generate. Must match a **Name** field in the JSON. If the name contains spaces or special characters (for example, `ARM Cortex-M4F`), wrap it in quotes. |
| `-s=<path>`    | (Optional) Additional plugin search path. If omitted, the default is `${userHome}/cfs/plugins`. Can be used multiple times. |

!!! example

    ```sh
    cfsutil project create -w test.cfsworkspace -p m4 -s <CodeFusion Studio Install>/Plugins
    ```

### Generate

`cfsutil generate -i <value> [-o <value>] [-v] [-s <value>]`

Generates source code from a `.cfsconfig` file. The `-i <filename>` switch is required, whilst the others are optional. The following switches are available.

| Switch           | Effect                                                      |
| ---------------- | ----------------------------------------------------------- |
| `-i=<file>`      | Required. The `.cfsconfig` file to generate from            |
| `-o=<directory>` | The output directory for thee generated code                     |
| `-v`             | Generate verbose output                                     |
| `-s=<path>`      | Adds a directory to search for plugins. Can be used multiple times |
