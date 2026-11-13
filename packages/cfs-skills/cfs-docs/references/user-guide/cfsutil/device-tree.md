---
description: CFSUtil - Device Tree
author: Analog Devices
date: 2026-10-09
---

# Device tree

The device tree provides a command to parse device tree files (`*.dts`,`*.dtsi`, or `*.overlay`). The output is in JSON format.

## Parse

`cfsutil dt parse <FILEPATH> [-v | -q] [-I <value>...] [-o <value>]`

| Switch | Effect                                     |
| ------ | ------------------------------------------ |
| `-I, --includeDirs=<value>...`   | Specifies directories to include when parsing the Devicetree file. Can be used multiple times, e.g., -Idir1 -Idir2 -Idir3                 |
| `-o, --output=<value>`   | Specifies the output file in JSON format.|
| `-v, --verbose`   | Print a detailed trace of the parsing steps to standard output along with the parsed result. Use `-o` to write the result to a separate file. Mutually exclusive with `--quiet`. |
| `-q, --quiet`     | Suppress non-error output. Mutually exclusive with `--verbose`. |

!!! example

    ```sh
    cfsutil dt parse myfile.dts -o output.json

    ```
