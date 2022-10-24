---
description: The CFSUtil Command Line Utility
author: Analog Devices
date: 2024-09-13
---

<!-- markdownlint-disable MD024 -->
# CFS command line utility

**CFSUtil** is an executable which provides a lot of the functionality within CodeFusion Studio and can be invoked directly from the command line.

## Accessing CFSUtil

From the [CFS Terminal](../projects/cfs-terminal.md), access CFSUtil with the `cfsutil` command.  
From Windows command prompt, access CFSUtil with `<CFS-Install>/Utils/cfsutil/bin/cfsutil.cmd`.  
From Linux, access CFSUtil with `<CFS-Install>/Utils/cfsutil/bin/cfsutil`.  

!!! note
    This page refers to `cfsutil`, but the commands used are the same regardless of method used.

## Structure

CFSUtil contains a hierarchy of commands and sub-commands, each with their own parameters and help menus.

## Help

Passing `--help` at any level of the hierarchy shows the help information about that component.

!!! example
    `cfsutil --help` provides top level help context.
    `cfsutil elf --help` provides help context for the elf component.
    `cfsutil elf info --help` provides help context for the info generation of the elf component.

## ELF

Provides a series of commands to get information about an ELF file.

### Analyze

`cfsutil elf analyze [file] [-j]`  
Provides high-level information about the ELF file, including the platform, stack/heap sizes and flash/sram sizes.  
Use the `-j` switch to produce output in JSON format.  

### Info

`cfsutil elf info [FILEPATH] [-j] [-h] [-a] [-c] [-s] [-n] [--debug_segments] [--debug_sections] [--debug_cu] [--debug_lt] [--debug_abbrevs] [--debug_syms] [--debug_dies] [--debug_heuristics] [-v]`  
Provides more in depth information about the ELF file.  
The following switches can be used individually or in combination to select the required information.

| Switch   | Information                         |
| -------- | ----------------------------------- |
| `-a`     | Attributes                          |
| `-c`     | Core information about the ELF file |
| `-h`     | Header                              |
| `-s`     | Size                                |

If debug information is available, the following switches are also available.

| Switch               | Information                              |
| -------------------- | ---------------------------------------- |
| `--debug_abbrevs`    | Contents of `.debug_abbrev` section      |
| `--debug_cu`         | `.debug_info` for each compilation unit  |
| `--debug_dies`       | Debugging Information Entry (DIE) tree   |
| `--debug_heuristics` | Heuristic information                    |
| `--debug_lt`         | contents of `.debug_line` section        |
| `--debug_sections`   | List of ELF sections                     |
| `--debug_segments`   | List of ELF segments                     |
| `--debug_syms`       | List of symbols                          |

Additional options are available to control the output.

| Switch  | Effect                   |
| ------- | ------------------------ |
| `-j`    | Output in JSON format    |
| `-n`    | Do not populate database |
| `-v`    | Verbose output           |

### Memory

`cfsutil elf memory [FILEPATH] [-s] [-t] [-y] [-i <value>] [-n <value>] [-j] [-d]`  

Provides information on symbols, sections or segments within the ELF file.  

Available switches:

| Switch | Effect                                     |
| ------ | ------------------------------------------ |
| `-d`   | Print detailed information                 |
| `-i`   | Display from sectment/segment with id      |
| `-s`   | List of segments                           |
| `-j`   | Output in JSON format                      |
| `-n`   | Display from sectment/segment with name    |
| `-t`   | List of sections in each segment           |
| `-y`   | List the symbols contain in each section   |

!!! note
    For `-t` and `-y`, the sections/symbols to display can be restricted to a segment/section using an id (`-i`) or a name (`-n`).  
    For `-y`, the segment/symbols can be restricted to a segment/section using a name (`-n`).

### Symbols

`cfsutil elf symbols [FILEPATH] [SQLQUERY] [-j] [-f]`  

This command allows you to run SQL queries on the symbol table.  
This involes queries on a table called `symbols` with the following fields.

| Name         | Meaning                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `num`        | Entry number                                                            |
| `name`       | Symbol name                                                             |
| `type`       | The type associated with the symbol: None, Object, Function or Filename |
| `address`    | The start address of the symbol                                         |
| `section`    | The section containing the symbol                                       |
| `size`       | The size of the symbol                                                  |
| `bind`       | The binding type of the symbol: Weak, Local or Global                   |
| `visibility` | The visibility of the symbol: Default or Hidden                         |

Any valid SQL construct is supported here, including `WHERE`, `ORDER`, `LIMIT`, `LIKE` and `REGEXP`.
Some examples of queries are as follows.

| Filter                        | Query examples                                                          |
| ----------------------------- | ----------------------------------------------------------------------- |
| Specific colums               | `SELECT name,address FROM symbols`                                      |
| Symbols larger than 100 bytes | `SELECT * FROM symbols WHERE size > 100`                                |
| Largest symbols               | `SELECT * FROM symbols ORDER BY size DESC LIMIT 10`                     |
| Symbols between addresses     | `SELECT * from symbols WHERE address BETWEEN 0x10000000 AND 0x20000000` |

The output can be modified with the following switches.

| Switch | Effect                                       |
| ------ | -------------------------------------------- |
| `-f`   | Print full path (if debug info is available) |
| `-j`   | Output in JSON format                        |

## Engines

Code is generated from config choices by means of a code generation 'engine'. There are a certain number of engines included out of the box, and users can author and register additional engines on the command-line.

The `engines` command enables you to interact with the list of available and registered code conversion engines known to cfsutil.

### List

`cfsutil engines list [-v] [-f text|json]`  

Lists the available export engines.

Use the `-v` switch for additional information on the engines.  
Use the `-f` switch to specify the output format: either `text` (default) or `json`.

### Info

`cfsutil engines info NAME [-f text|json]`  

Provides information about the named engine.  

Use the `-f` switch to specify the output format: either `text` (default) or `json`.

## SoCs

Each SoC supported by CodeFusion Studio is associated with an SoC Data Model.

This data model is a JSON file that contains information on the package, available memory, config settings and register details, and other essential information required to enable the graphical config tools and code generation functionality.

The `socs` command allows you to interact with the SoC data models known to cfsutil.

### List

`cfsutil socs list`

Provide a list of available SoC data models.

### Export

`cfsutil socs export -n <value> [-f json] [--gzip] [-i <value>] [-m] [-o stdio]`

Outputs the SoC data model in JSON format for the specified SoC. The `-n=<name>` switch is required, whilst the rest are optional.

| Switch           | Effect                                                                                |
| ---------------- | ------------------------------------------------------------------------------------- |
| `-n=<name>`      | The name of the SoC.[^1]                                                              |
| `-i=<val>`       | The number of spaces for JSON indentation (use `$\'t' for tabs). Default is 2 spaces. |
| `-m`             | Minify the JSON output.                                                               |
| `--gzip`         | Compress the output with `gzip`                                                       |

!!! note
    It is recommended to pipe the output to a file, especially if compressing the output:  
    `cfsutil socs export -n=max32690-tqfn --gzip > file.gz`

## Generate

`cfsutil generate -i <value> [-e <value>] [-o <value>] [-v] [-p] [-f text|json] [--force] [--list] [--file <value>]`

Generates source code from a `.cfsconfig` file. The `-i <filename>` switch is required, whilst the others are optional. The following switches are available.

| Switch           | Effect                                                      |
| ---------------- | ----------------------------------------------------------- |
| `-i=<file>`      | The `.cfsconfig` file to generate from                      |
| `-o=<directory>` | The output directory for generated code                     |
| `-p`             | Preview. Generate output to the console instead of a file   |
| `-f=<format>`    | The format of the preview output (either `text` or `json`)  |
| `-v`             | Generate verbose output                                     |
| `--force`        | Overwrite existing files                                    |
| `--file=<file>`  | Only generate the specified file                            |
| `--list`         | List the file(s) that will be generated                     |

!!! note
    A list of SoCs can be generated with `cfsutil socs list`.
