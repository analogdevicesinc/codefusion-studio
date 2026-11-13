---
description: CFSUtil - Convert
author: Analog Devices
date: 2026-10-10
---

# Convert

The `convert` command turns a profiling trace into a CodeFusion Studio report (`.cfsreport`). Use it to create a report from a trace file you already have. The [`cfsutil ai e2e`](./ai/e2e.md) command runs it for you on the traces it captures.

## Convert a trace

```sh
cfsutil convert --input <file> [--input-format <format>] [--output <path>] [--format text|json]
```

| Flag | Description |
| --- | --- |
| `--input` | **Required.** Path to the file to convert. |
| `--input-format` | Format of the input file. Currently `tef` (Trace Event Format). If not set, the format is detected from the file extension. |
| `--output` | Path to the output report file. The directory must already exist. Default: `<input name>_runtime_report.cfsreport`, next to the input file. |
| `-f, --format` | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](index.md#json-output-envelope). |

If the input has an extension other than `.tef`, pass `--input-format` explicitly.

!!! example

    ```sh
    cfsutil convert --input trace.tef --output trace.cfsreport
    ```
