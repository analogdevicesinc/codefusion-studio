---
description: CFSUtil - Device Tree
author: Analog Devices
date: 2026-03-23
---

# Device tree

The device tree provides a command to parse device tree files (`*.dts`,`*.dtsi`, or `*.overlay`). The output is in JSON format.

## Parse

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
