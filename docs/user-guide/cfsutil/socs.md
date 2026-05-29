---
description: CFSUtil - SoCs
author: Analog Devices
date: 2026-05-01
---

# SoCs

Each SoC supported by CodeFusion Studio is associated with an SoC Data Model.

This data model is a JSON file that contains information on the package, available memory, config settings and register details, and other essential information required to enable the graphical config tools and code generation functionality.

The `socs` command allows you to interact with the SoC data models known to cfsutil.

## Export

`cfsutil socs export <SOCNAME> [-p <package>] [-f json] [--gzip] [-i <value>] [-m] [-o <value>] [-s <value>...] [-v <version>]`

Outputs the SoC data model in JSON format for the specified SoC.

| Switch           | Effect                                                                                |
| ---------------- | ------------------------------------------------------------------------------------- |
| `SOCNAME`        | Required. The name of the SoC to export, not including package. |
| `-f <format>`    | Output format (`json` only)  |
| `-i <val>`       | The number of spaces for JSON indentation (use `$'\t'` for tabs). Default is 2 spaces. |
| `-m`             | Minify the JSON output.                                                               |
| `-o <value>`     | Output destination (`stdio` or a file path). Default is `stdio`.                     |
| `-p <package>`   | Package name of the SoC to export. Required if the SoC has more than one package.     |
| `-s <path>`      | Specifies additional search paths for SoC data models. Refer to DEVELOPMENT.md in the [:octicons-link-external-24: CodeFusion Studio GitHub repository](https://github.com/analogdevicesinc/codefusion-studio/tree/main/packages/cli) for instructions on generating a `.cfsdatamodels` index file. |
| `-v <version>`   | Optional data model version (defaults to latest if not specified). |
| `--gzip`         | Compress the output with `gzip`                                                       |

!!! note
    It is recommended to pipe the output to a file, especially if compressing the output:
    `cfsutil socs export max32690 --package TQFN --gzip > file.gz`

!!! warning "Deprecated flag"
    The `-n, --name` flag is deprecated. Use the `SOCNAME` positional argument instead, and the `-p, --package` flag if the SoC has more than one package.

## Info

`cfsutil socs info <SOC> [--format text|json] [-b] [-c] [-d] [-p]`

Display detailed information about a specific SoC from the catalog. The `<SOC>` argument is required; all other switches are optional.

| Switch           | Effect                                   |
|------------------|------------------------------------------|
| `-b, --boards`   | Display supported boards for the SoC.    |
| `-c, --cores`    | Display supported cores for the SoC.     |
| `-d, --docs`     | Display documentation links for the SoC. |
| `-p, --packages` | Display supported packages for the SoC.  |
| `--format`       | Output format: `text` (default) or `json`. |

!!! note
    Aliases: `cfsutil soc info`

!!! example
    ```sh
    cfsutil socs info MAX32660
    ```

!!! example "Show supported boards"
    ```sh
    cfsutil socs info MAX32660 --boards
    ```

!!! example "Show cores and packages"
    ```sh
    cfsutil socs info MAX32660 --cores --packages
    ```

!!! example "Output as JSON"
    ```sh
    cfsutil socs info MAX32660 --docs --format json
    ```

## List

`cfsutil socs list [-f text|json] [-v] [-l] [-s <value>...]`

Provide a list of available SoC data models.

| Switch           | Effect                                                      |
| ---------------- | ----------------------------------------------------------- |
| `-f <format>`    | Output format (either `text` or `json`)  |
| `-l, --legacy`   | Use legacy format for output.                               |
| `-s <path>`      | Specifies additional search paths for SoC data models. Refer to DEVELOPMENT.md in the [:octicons-link-external-24: CodeFusion Studio GitHub repository](https://github.com/analogdevicesinc/codefusion-studio/tree/main/packages/cli) for instructions on generating a `.cfsdatamodels` index file. |
| `-v`             | Generate verbose output                                     |

!!! example
    ```sh
    cfsutil socs list -s /path/to/codefusion-studio-repo/packages/cfs-data-models/socs/.cfsdatamodels -f json
    ```
