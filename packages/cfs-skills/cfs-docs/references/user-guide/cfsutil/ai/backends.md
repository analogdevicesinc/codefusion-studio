---
description: List available AI backends using cfsutil ai backends.
author: Analog Devices
date: 2026-04-20
---

# Backends

The `cfsutil ai backends` commands let you inspect available AI backends.

## Backends command

The `cfsutil ai backends list` command lists the AI backends available in your environment, or displays detailed information about a specific backend including its supported hardware and extension fields.

```sh
cfsutil ai backends list [--format text|json] [-n <value>]
```

!!! example "Sample output"
    ```sh
    tflm:  Generation for Tflite-micro run-time
    izer:  ai8x-izer generation for MAX78002 CNN
    ```

### List a specific backend

Use `--name` (`-n`) to display detailed information about a specific backend, including supported hardware targets and available extension fields.

```sh
cfsutil ai backends list --name <backend>
```

!!! example
    ```sh
    cfsutil ai backends list --name tflm
    cfsutil ai backends list --name izer
    ```

!!! example "Output in JSON format"
    ```sh
    cfsutil ai backends list --format json
    ```

!!! example "Sample output — izer backend"
    ```sh
    izer: ai8x-izer generation for MAX78002 CNN
        Model Formats: pytorch
        Advanced Tool Support: false
    Supported hardware:
        SoC: max78002, Core: CM4, Acc: CNN, Firmware: msdk
    Extension fields:
        Softmax: Enable softmax layer generation
          Type: boolean, Default: true.
        Timer: Inference timer
          Type: enum, Default: 0.
        Prefix: Test name prefix
          Type: string, Default: undefined.
        AvgPoolRounding: Round average pooling results
          Type: boolean, Default: true.
        ClockDivider: CNN Clock divider
          Type: enum, Default: 1.
        InputShape: Input shape
          Type: string, Default: undefined.
        Fifo: Use FIFO
          Type: boolean, Default: true.
        NetworkConfig: Network Configuration File
          Type: File, Default: undefined.
    ```

!!! note "Listing supported targets"
    To see the full list of supported SoCs and cores, use [`cfsutil socs list`](../socs.md).
