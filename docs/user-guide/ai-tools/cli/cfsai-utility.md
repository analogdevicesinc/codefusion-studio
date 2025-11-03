---
description: "Listing supported targets, backends, and extensions in CFSAI"
author: "Analog Devices"
date: "2025-09-29"
---

# List commands

The `cfsai` utility provides commands to inspect supported SoCs, backends, and backend extensions. These are useful for discovering the exact strings to use with build and profiling commands.

## List-targets command

The `cfsai list-targets` command prints a list of supported SoC, core, and accelerator combinations. Use this to check the exact strings to pass with the `--target` option when building a model.

```sh
cfsai list-targets
```

!!! example "Sample output"
    ```sh
    ADSP-21834.FX
    ADSP-21834W.FX
    ADSP-21835.FX
    ADSP-21835W.FX
    ADSP-21836.FX
    ADSP-21836W.FX
    ADSP-21837.FX
    ADSP-21837W.FX
    ADSP-SC834.FX
    ADSP-SC834W.FX
    ADSP-SC835.FX
    ADSP-SC835W.FX
    MAX32657.CM33
    MAX32690.CM4
    MAX78002.CM4
    MAX78002.CM4.CNN
    ```

## List-backends command

The `cfsai list-backends` command prints the supported backends available in your environment.

```sh
cfsai list-backends
```

!!! example "Sample output"
    ```sh
    izer
    tflm
    ```

## List-extensions command

The `cfsai list-extensions` command prints the available extensions for a given backend. You must provide the backend name as an argument. Run `cfsai list-backends` first to see available options.

```sh
cfsai list-extensions <backend>
```

!!! example "Sample output izer backend"
    ```sh
    | Name            | Description                                                                              | Type           | Default  |
    | --------------- | ---------------------------------------------------------------------------------------- | -------------- | -------- |
    | Section         | Optional memory section to map data. Note: ai8xize.py may not directly use this; it      | string | null  | null     |
    |                 | could be intended for post-processing of generated code or if ai8xize.py is extended.    |                |          |
    | Softmax         | Enable softmax layer generation.                                                         | boolean        | False    |
    | Verbose         | Enable verbose output.                                                                   | boolean        | False    |
    | Timer           | Specify timer for measurements the inference time (example: 0-3).                        | integer | null | null     |
    | Prefix          | Set test name prefix.                                                                    | string         |          |
    | AvgPoolRounding | Round average pooling results.                                                           | boolean        | False    |
    | Pipeline        | Enable or disable pipeline. True for --pipeline, False for --no-pipeline, None for       | null | boolean | True     |
    |                 | default.                                                                                 |                |          |
    | Pll             | Enable or disable PLL. True for --pll, False for --no-pll, None for default.             | null | boolean | null     |
    | ClockDivider    | CNN clock divider (default: 1 or 4, depends on clock source).                            | integer | null | 1        |
    | BoardName       | Set board name.                                                                          | string         | EvKit_V1 |
    | CompactData     | use memcpy() to load input data in order to save code space (default)                    | boolean        | True     |
    └─────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┴────────────────┴──────────┘
    ```

## Clean-cache command

The `cfsai clean-cache` command clears cached files that CFSAI has downloaded from remote URLs.  

CFSAI automatically caches remote files (such as model files provided by a URL) so they can be reused consistently and when offline. If the remote file is accessible, the cache will refresh automatically after one hour to keep model files up to date.  

Use `cfsai clean-cache` to:  

- Save local disk space by removing cached files.  
- Force CFSAI to re-download a remote model instead of using the cached copy.  

```sh
cfsai clean-cache
```
