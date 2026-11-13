---
description: The CFSUtil Command Line Utility
author: Analog Devices
date: 2026-10-28
---

# CFS command line utility

**CFSUtil** is an executable which provides command-line access to CodeFusion Studio functionality.

## Accessing CFSUtil

You can access `cfsutil` from the CFS terminal or from a system terminal.

### From the CFS terminal in VS Code (recommended)

Open a new terminal in VS Code (**View > Terminal** or ``Ctrl+` ``), then:

1. In the terminal panel, click the dropdown arrow next to the **+** icon.
2. Select **CFS Terminal** from the list.
3. Run your command, for example:

```sh
   cfsutil --help
```

![Accessing cfsutil ](../installation/package-manager/images/access-cfs-terminal-dark.png#only-dark)
![Accessing cfsutil ](../installation/package-manager/images/access-cfs-terminal-light.png#only-light)

### From a system terminal outside VS Code

If you prefer to run `cfsutil` outside of VS Code, use the following paths:

- **Windows:** `<CFS-Install>/Utils/cfsutil/bin/cfsutil.cmd`
- **Linux and macOS:** `<CFS-Install>/Utils/cfsutil/bin/cfsutil`

!!! note
    This page refers to `cfsutil`, but the commands used are the same regardless of method used.

!!! tip
    `cfs` is an alias for `cfsutil` and works with all commands.

## Structure

CFSUtil contains a hierarchy of commands and sub-commands, each with their own parameters and help menus.

## Help

Passing `--help` at any level of the hierarchy shows the help information about that component.

You can access help at various levels:

- `cfsutil --help` provides top-level help.
- `cfsutil ai --help` provides help for the `ai` command group.
- `cfsutil ai build --help` provides help for the `ai build` command.

!!! example

    ```sh
    cfsutil --help
    ```

!!! example

    ```sh
    cfsutil ai --help
    ```

!!! example

    ```sh
    cfsutil ai build --help
    ```

## Command Categories

CFSUtil provides various command categories for different tasks:

- **[AI](./ai/index.md)** - Compile AI models, analyze compatibility, profile resources, and manage models within a workspace
- **[CFS Plugins](./cfs-plugins.md)** - List and manage CFS plugins
- **[Catalog](./catalog.md)** - Update or restore the SoC catalog
- **[Convert](./convert.md)** - Convert a profiling trace into a CodeFusion Studio report
- **[Device Tree](./device-tree.md)** - Parse and work with device tree files
- **[Docker](./docker.md)** - Pull Docker images
- **[ELF Utilities](./elf-utilities.md)** - Analyze and inspect ELF files
- **[Generate](./generate.md)** - Generate source code from configuration files
- **[myAnalog Authentication](./myanalog-auth.md)** - Authenticate with myAnalog for package access
- **[API Key Authentication](./apikey-auth.md)** - Create and manage API keys for use in automated workflows
- **[Package Manager](./package-manager.md)** - Install and manage SDKs, plugins, and toolchains
- **[Plugins](./oclif-plugins.md)** - Extend CFSUtil with additional CLI plugins
- **[Port](./port.md)** - Information about active serial ports
- **[Project](./project.md)** - Create and manage projects within workspaces
- **[SoCs](./socs.md)** - Manage SoC data models
- **[Tasks](./tasks.md)** - List tasks for a named workspace
- **[Telemetry](./telemetry.md)** - Manage telemetry preferences
- **[Validate](./validate.md)** - Validate CFS configuration files against the schema
- **[Workspace](./workspace.md)** - Create and manage CFS workspaces

## JSON output envelope

Most commands, except `ai e2e`, return their output in a standard envelope when you use `--format json`.

!!! note
    If you wrote scripts against the earlier JSON output of a command that now uses the envelope, read the result from `data`. Some commands wrap a top-level array in a named property, such as `data.models`.

<!-- TODO: remove this note when the remaining commands are migrated to the envelope. -->
!!! note
    The following commands don't use the envelope yet, but are planned to:

    - Device tree: `dt parse`
    - Docker: `docker pull`
    - Generate: `generate`
    - myAnalog: `myanalog apikey create`, `myanalog apikey delete`, `myanalog apikey list`
    - Telemetry: `telemetry enable`, `telemetry disable`, `telemetry status`
    - Validate: `validate config`, `validate dependencies`

A successful command returns:

```json
{
  "ok": true,
  "command": "catalog update",
  "data": { "updated": true },
  "warnings": []
}
```

A failed command returns:

```json
{
  "ok": false,
  "command": "socs info",
  "errors": [
    { "code": "SOC_NOT_FOUND", "message": "SoC 'abc' not found in catalog" }
  ]
}
```

| Field | Description |
|-------|-------------|
| `ok` | `true` when the command succeeded, `false` when it failed. |
| `command` | The canonical command identifier, with spaces between the topic and command name (for example, `socs list`). Aliases resolve to the canonical identifier. |
| `data` | Command-specific result. Present only on success. |
| `warnings` | List of objects with a `message` field. Present only on success. In JSON mode, warnings appear here instead of in the terminal. |
| `errors` | List of objects with a `code` and a `message`. Present only on failure. |

## Verbose and quiet output

Use `-v`/`--verbose` to show additional output, such as diagnostic messages or extra detail for each result. Use `-q`/`--quiet` to suppress non-error output, including warnings. Errors are still shown. Some commands still show some output, or hide error details, with `--quiet`. For details, see the command page. The two flags are mutually exclusive.

`--quiet` works with most commands. The oclif plugin-management commands use their own output flags. `--verbose` is being added to commands individually and currently changes the output for the following command groups:

- AI: `ai build`, `ai e2e`, and `ai model list`
- Device tree
- ELF utilities: `elf info`
- Generate
- myAnalog: `myanalog login` and `myanalog status`
- Ports: `port list`
- SoCs: `socs list`
- Tasks
- Validate: `validate config`
- Workspace: `workspace configure`

## Working with multiple configuration files

Some `cfsutil` commands work with `.cfsconfig` files. When `cfsutil` automatically discovers a configuration in your workspace, it expects only one `.cfsconfig` file in the `.cfs/` directory. Some commands require this file to use the filename expected by your workspace (`<soc>-<package>.cfsconfig`). Others may select the first `.cfsconfig` file found in `.cfs/`. If multiple configuration files are present, selection may be non-deterministic and lead to unexpected results.

To avoid this, ensure that only one `.cfsconfig` file is present in `.cfs/` before running a command.

The `--config` option, if supported by the command (such as the `ai` commands), should be used to select a specific file directly. Otherwise, to switch configurations, copy the one you want into `.cfs/` using the expected active filename:

!!! warning
    The `rm` command permanently deletes all `.cfsconfig` files in the `.cfs/` directory. Ensure you have backups or copies of any configurations you want to keep before running it.

```sh
rm -f .cfs/*.cfsconfig
cp .my_configs/combination_i_want.cfsconfig .cfs/<soc>-<package>.cfsconfig
cfsutil <command>
```

Or store alternates in `.cfs/` under a name that does not end in `.cfsconfig` and copy the one you want to activate to the expected filename:

```sh
cp .cfs/my.cfsconfig.a .cfs/<soc>-<package>.cfsconfig
cfsutil <command>
```

!!! note
    The above examples use Unix-style commands (`rm`, `cp`). These work in the CFS Terminal, macOS, Linux, or Windows environments such as Git Bash or WSL.
