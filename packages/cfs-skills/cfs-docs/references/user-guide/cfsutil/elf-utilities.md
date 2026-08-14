---
description: CFSUtil - ELF
author: Analog Devices
date: 2026-03-23
---

# ELF

Provides a series of commands to get information about an ELF file.

## Analyze

`cfsutil elf analyze <FILEPATH> [--format text|json]`

Provides high-level information about the ELF file, including the platform, stack/heap sizes and flash/sram sizes.
Use the `--format json` flag to produce output in JSON format.

## Info

`cfsutil elf info <FILEPATH> [--format text|json] [-h] [-a] [-c] [-s] [-v]`

Provides more in depth information about the ELF file.
At least one of the following switches are required. They can be used individually or in combination to select the required information.

| Switch   | Information                         |
| -------- | ----------------------------------- |
| `-a`     | Attributes                          |
| `-c`     | Core information about the ELF file |
| `-h`     | Header                              |
| `-s`     | Size                                |

Additional options are available to control the output.

| Switch    | Effect                   |
| --------- | ------------------------ |
| `--format` | Output format: `text` (default) or `json` |
| `-v`      | Verbose output           |

## Memory

`cfsutil elf memory <FILEPATH> [-s] [-t] [-y] [-i <value>] [-n <value>] [--format text|json] [-d]`

Provides information on symbols, sections or segments within the ELF file.

Choose at least one of the available switches:

| Switch | Effect                                     |
| ------ | ------------------------------------------ |
| `-d`   | Print detailed information. Must be used with `-s`, `-t`, or `-y`.  |
| `-i`   | Display from section or segment with id      |
| `--format` | Output format: `text` (default) or `json`. Must be used with `-s`, `-t`, or `-y`. |
| `-n`   | Display from section or segment with name    |
| `-s`   | List of segments                           |
| `-t`   | List of sections in each segment           |
| `-y`   | List the symbols contain in each section   |

!!! note
    For `-t` and `-y`, the sections/symbols to display can be restricted to a segment/section using an id (`-i`) or a name (`-n`).
    For `-y`, the segment/symbols can be restricted to a segment/section using a name (`-n`).
    This command can generate a large amount of output. Consider sending the output to a file for viewing.

## Symbols

`cfsutil elf symbols <FILEPATH> <SQLQUERY> [--format text|json] [-f]`

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
| Symbols between addresses     | `SELECT * FROM symbols WHERE address BETWEEN 0x10000000 AND 0x20000000` |

The output can be modified with the following switches.

| Switch | Effect                                       |
| ------ | -------------------------------------------- |
| `-f`   | Print full path (if debug info is available) |
| `--format` | Output format: `text` (default) or `json` |
