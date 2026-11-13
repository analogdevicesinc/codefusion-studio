---
description: CFSUtil - Port
author: Analog Devices
date: 2026-10-09
---

# Port

The CLI can list active serial ports and, optionally, list detailed information such as Vendor ID about each port. The port information can be used to determine the correct port ID to use with the `--port` switch in the `tasks run` command.

## List ports

```sh
cfsutil port list [-v | -q] [--format text|json]
```

Lists the active serial ports on the host PC.

| Flag | Description |
| --- | --- |
| `-v, --verbose` | Display detailed information about each serial port. Mutually exclusive with `--quiet`. |
| `-q, --quiet` | Suppress non-error output, including warnings. Mutually exclusive with `--verbose`. |
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

!!! example

    ```sh
    cfsutil port list -v
    ```
