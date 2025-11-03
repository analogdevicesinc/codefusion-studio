---
description: The CFSUtil Command Line Utility
author: Analog Devices
date: 2025-10-30
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
| `-s <path>`      | Specifies additional search paths for SoC data models. Refer to DEVELOPMENT.md in the [:octicons-link-external-24: CodeFusion Studio GitHub repository](https://github.com/analogdevicesinc/codefusion-studio/tree/main/packages/cli) for instructions on generating a `.cfsdatamodels` index file. |
| `-v`             | Generate verbose output                                     |

!!! example
    ```sh
    cfsutil socs list -s /path/to/codefusion-studio-repo/packages/cfs-data-models/socs/.cfsdatamodels -f json
    ```

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
| `-s <path>`      | Specifies additional search paths for SoC data models. Refer to DEVELOPMENT.md in the [:octicons-link-external-24: CodeFusion Studio GitHub repository](https://github.com/analogdevicesinc/codefusion-studio/tree/main/packages/cli) for instructions on generating a `.cfsdatamodels` index file. |

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

Use the following CFS plugin commands to automate workspace, project, and code generation from the terminal. These commands work with plugins installed with CodeFusion Studio or added through the Package Manager, and with plugins built locally from the [:octicons-link-external-24: CFS Plugins repository](https://github.com/analogdevicesinc/cfs-plugins){:target="_blank"}.

### List

```sh
cfsutil cfsplugins list [-s <path>] [--soc <name>] [--board <name>] [--service <service>] [--config-options]
```

Lists all available CFS plugins installed with CodeFusion Studio or added through the Package Manager. You can also specify additional search paths to include locally built plugins. Results can be filtered by SoC, board, or service type.

| Flag           | Description           |
|----------------|-----------------------|
| `-s=<path>`    | (Optional) Additional plugin search path. Can be used multiple times. |
| `--soc=<name>` | Filter results by supported SoC name |
| `--board=<name>` | Filter results by supported board name |
| `--service=<service>` | Filter results by service type. Available services: `workspace`, `project`, `codegen`, `memory`, `peripheral`, `pinConfig`, `clockConfig` |
| `--config-options` | Include configuration options (properties.project) in output |

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

### Create workspace

```sh
cfsutil workspace create -w <path/to/.cfsworkspace> [-s <plugin/search/directory>]
```

Generates a workspace using the structure defined in a `.cfsworkspace` file.

Use a valid `.cfsworkspace` file generated in the CFS UI. Do not reuse the location from the UI-generated file. Update the `Location` field to avoid path conflicts.

!!! warning
    It's recommended to create new workspaces using a sample workspace generated in the CFS UI. The UI always includes the latest plugin and data model versions. If you use `cfsutil` and do not update manually, workspace generation can fail if the plugin or data model versions are not aligned with recent updates. For example, using an old `.cfsworkspace` file that references a plugin version no longer supported can cause generation errors.

```json
{
    "Soc": "MAX32690",
    "Package": "WLP",
    "WorkspacePluginId": "com.analog.multicore.msdk.helloworld",
    "WorkspacePluginVersion": "1.0.1",
    "WorkspaceName": "Apard_ws",
    "Location": "test-folder", //Must differ from the original location if copied from a UI-generated file, to avoid path conflicts
    "Board": "AD-APARD32690-SL",
    "Projects": [],
    "DataModelVersion": "1.2.145",
    "DataModelSchemaVersion": "1.2.0"
}
```

| Flag           | Description           |
|----------------|-----------------------|
| `-w=<path>`    | **Required.** Path and filename of the `.cfsworkspace` file |
| `-s=<path>`    | (Optional) Additional directory paths to search for plugins and data models. Can be used multiple times. |

This example uses plugins that were cloned and built from the [:octicons-link-external-24: CFS Plugins repository](https://github.com/analogdevicesinc/cfs-plugins){:target="_blank"}.

!!! example

    ```sh
    cfsutil workspace create \
    -w .cfsworkspace \
    -s ${userHome}/cfs/plugins
    ```

### Create project

```sh
cfsutil project create -w <path/.cfsworkspace> -p <project-name> [-s <plugin/search/directory>]
```

Generates or regenerates a project defined within an existing `.cfsworkspace` file.

!!! important
    You must run `cfsutil workspace create` before using this command. The workspace and it's `cfs` folder must already exist. This command does not create standalone projects—it only works within a valid workspace.

    The `project create` command is intended to **regenerate** a project inside an existing workspace, typically after a plugin upgrade or workspace update. It **overwrites the project structure** based on the latest plugin templates.

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
      "PluginVersion": "1.1.0",
      "Name": "m4",         /// Use as `-p` flag
      "IsPrimary": true,
      "IsEnabled": true,
      "PlatformConfig": {
        "ProjectName": "CM4",
        "MsdkBoardName": "APARD",
        "Cflags":
          "-fdump-rtl-expand\n-fdump-rtl-dfinish\n-fdump-ipa-cgraph\n-fstack-usage\n-gdwarf-4"
      },
      "FirmwarePlatform": "MSDK"
    }
  ],
  "DataModelVersion": "1.2.145",
  "DataModelSchemaVersion": "1.2.0"
}
```

| Flag           | Description           |
|----------------|-----------------------|
| `-w=<path>`    | **Required.** Path and filename of the `.cfsworkspace` file |
| `-p=<name>`    | **Required.** Name of the project to generate. Must match a **Name** field in the JSON. If the name contains spaces or special characters (for example, `ARM Cortex-M4F`), wrap it in quotes. |
| `-s=<path>`    | (Optional) Additional directory paths to search for plugins and data models. Can be used multiple times.|

!!! example

    ```sh
    cfsutil project create -w .cfsworkspace -p m4
    ```

### Generate

`cfsutil generate -i <value> [-o <value>] [-v] [-s <value>]`

Generates source code from a `.cfsconfig` file. The `-i <filename>` switch is required. Additional switches are optional. The following switches are available:

| Switch           | Effect                                                      |
| ---------------- | ----------------------------------------------------------- |
| `-i=<file>`      | Required. The `.cfsconfig` file to generate from            |
| `-o=<directory>` | The output directory for the generated code                     |
| `-v`             | Generate verbose output                                     |
| `-s=<path>`      | Adds a directory to search for plugins. Can be used multiple times |

!!! example

    ```sh
     cfsutil generate -i=max32690-wlp.cfsconfig -v
    ```

## Package Manager

The CFS Package Manager allows you to retrieve, install, and manage SDKs, plugins, and toolchains directly from a remote server, enabling access to new features and updates independently of full IDE releases. For additional information see [Install CFS components using the Package Manager](../installation/package-manager/index.md).

### Search

`cfsutil pkg search <pattern>`

Retrieve packages available for install.

| Argument    | Description                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------- |
| `<pattern>` | Search pattern in the format `pkg_name/version`. Use * as a wildcard.|

!!! example
    ```sh
    cfsutil pkg search "zephyr*"
    ```
!!! note
    Wrap the pattern in quotes to avoid issues with wildcard expansion.

### Package information

`cfsutil pkg info <package-reference>`

Retrieves metadata for a given package. The package does not need to be installed.

| Argument             | Description                                         |
|----------------------|-----------------------------------------------------|
| `<package-reference>` | Package reference in the format `pkg_name/version`. |

| Flag           | Description               |
|----------------|---------------------------|
| `-f, --format` | Output format (JSON only) |

!!! example

    ```sh
    cfsutil pkg info zephyr/4.2.0 -f=json
    ```

### Install

`cfsutil pkg install <package-reference>`

Install a CFS package, including all its dependencies.

| Argument             | Description                                         |
|----------------------|-----------------------------------------------------|
| `<package-reference>` | Package reference in the format `pkg_name/version`. |

| Flag          | Description                            |
|---------------|----------------------------------------|
| `-l, --local` | Install packages from local cache only |

!!! example
    ```sh
    cfsutil pkg install zephyr/4.2.0
    ```

### List

`cfsutil pkg list [<pattern>]`

List installed packages.

| Argument     | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| `<pattern>`  | Optional pattern to match package names and versions. Supports wildcards `*`. |

| Flag                     | Description                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `-f, --filter=KEY=VALUE` | Optional filter on package metadata. If used multiple times, all conditions must be satisfied.          |

!!! example
    ```sh
    # List all installed packages
    cfsutil pkg list

    # Search for a package that supports MAX32690
    cfsutil pkg list -f soc=MAX32690

    # Search for a package that supports CodeFusion Studio version 2.0.0 and SDK
    cfsutil pkg list -f cfsVersion=^2.0 -f type=sdk
    ```

!!! tip
    The `--filter` option accepts metadata keys shown by the `pkg info` command.

### View dependencies

`cfsutil pkg dependencies <package-reference>`

Retrieves a list of all the dependencies of a given package, including transitive dependencies. The package does not need to be installed.

| Argument              | Description                                         |
| --------------------- | --------------------------------------------------- |
| `<package-reference>` | Package reference in the format `pkg_name/version`.  |

!!! example
    ```sh
    cfsutil pkg dependencies zephyr/4.2.0
    ```

### Uninstall

`cfsutil pkg uninstall <name>`

Uninstalls a package. It remains in the local cache for reuse without re-downloading.

!!! warning
    A package cannot be uninstalled if it is required by another installed package.
    Use the `local-consumers` command to identify dependent packages that must be removed first.

| Argument | Description                    |
| -------- | ------------------------------ |
| `<name>` | Name of the installed package. |

!!! example
    ```sh
    cfsutil pkg uninstall zephyr
    ```

### Delete

`cfsutil pkg delete <pattern>`

Deletes packages from the local cache.

!!! warning
    Deleting a package permanently removes it from the local cache. To use a deleted package again, reinstall it using the `cfsutil pkg install` command.

| Argument      | Description                                                                   |
|---------------|-------------------------------------------------------------------------------|
| `<pattern>`   | A package pattern in the form `<pkg_name>/<version>`. Wildcards (*) allowed.  |

!!! example "Delete all unused packages"
    ```sh
    cfsutil pkg delete "*"
    ```

!!! note
    Wrap the pattern in quotes to avoid issues with wildcard expansion.

### Local consumers

`cfsutil pkg local-consumers <name>`

Retrieves a list of all installed packages that depend on a given package, including transitive consumers.

This command is useful when attempting to uninstall a package, as it helps identify which other packages depend on it.

| Argument | Description                    |
|----------|--------------------------------|
| `<name>` | Name of the installed package. |

!!! example
    ```sh
    cfsutil pkg local-consumers zephyr
    ```

!!! "Sample output"
    ```sh
    zephyr is not required by any other package
    ```

### Add remote

`cfsutil pkg add-remote <remote-name> <url>`

Registers a new package server to retrieve packages.

| Argument        | Description                                                                                                                                           |
|-----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `<remote-name>` | The name used to identify the remote, such as `myserver`. This name is required to use other commands such as `login`, `logout`, and `delete-remote`. |
| `<url>`         | The URL of the package server.                                                                                                                        |

!!! example
    ```sh
    cfsutil pkg add-remote myserver https://my.server.url
    ```

### List remotes

`cfsutil pkg list-remotes`

Lists all remote servers that have been registered for package retrieval.

### Delete remote

`cfsutil pkg delete-remote <remote-name>`

Unregisters a package server so it is no longer considered for package retrieval.

| Argument        | Description                                                                                                          |
|-----------------|----------------------------------------------------------------------------------------------------------------------|
| `<remote-name>` | The name of the remote to delete. The `<remote-name>` should match the name provided using the `add-remote` command. |

!!! example
    ```sh
    cfsutil pkg delete-remote myserver
    ```

## Auth

The `auth` commands allow you to authenticate with the CFS Package Manager in order to retrieve, install, and manage SDKs, plugins, and toolchains.

These commands are the command-line equivalents of the authentication options available in the Command Palette, documented in [Access restricted packages](../installation/package-manager/auth.md).

### Login

`cfsutil auth login [--verbose]`

Login with a myAnalog account. A dialog will prompt you to open an external website where you can log in with your myAnalog credentials.
Once authenticated, VS Code will confirm that you can now proceed to install packages.

| Flag              | Description                  |
| ----------------- | ---------------------------- |
| `-v, --verbose`   | Enable verbose output.       |

!!! example
    ```sh
    cfsutil auth login
    cfsutil auth login --verbose
    ```

### Logout

`cfsutil auth logout`

Logout of the current session.

!!! example
    ```sh
    cfsutil auth logout
    ```

### Status

`cfsutil auth status [--verbose]`

Show authentication status.

| Flag              | Description                  |
| ----------------- | ---------------------------- |
| `-v, --verbose`   | Enable verbose output.       |

!!! example
    ```sh
    cfsutil auth status
    cfsutil auth status --verbose
    ```
