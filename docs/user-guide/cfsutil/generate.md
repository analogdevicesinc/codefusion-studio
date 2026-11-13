---
description: CFSUtil - Generate
author: Analog Devices
date: 2026-10-09
---

# Generate

The generate command creates source code from configuration files.

## Generate code

`cfsutil generate -i <value> [-v | -q] [-o <value>] [-s <value>...]`

Generates source code from a `.cfsconfig` file. The `-i <filename>` switch is required. Additional switches are optional. The following switches are available:

| Switch           | Effect                                                      |
| ---------------- | ----------------------------------------------------------- |
| `-i=<file>`      | Required. The `.cfsconfig` file to generate from            |
| `-o=<directory>` | The output directory for the generated code                     |
| `-s=<path>`      | Adds a directory to search for plugins. Can be used multiple times |
| `-v`             | Print the path of each generated file. In text mode, also print additional diagnostic output. Mutually exclusive with `-q`. |
| `-q`             | Suppress non-error output, including warnings. Mutually exclusive with `-v`. |

!!! example

    ```sh
     cfsutil generate -i=max32690-wlp.cfsconfig -v
    ```
