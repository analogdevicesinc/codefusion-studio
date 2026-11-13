---
description: Generate a workspace from an AI model using cfsutil ai workspace create.
author: Analog Devices
date: 2026-10-10
---

# Workspace

The `cfsutil ai workspace create` command generates a CodeFusion Studio workspace based on an AI model file. It creates a complete project structure with the specified SoC, board, and core configuration, automatically integrates the model, and performs an initial build.

```sh
cfsutil ai workspace create -o <value> --name <value> --soc <value> --board <value> --core <value> --model <value> [--search-path <value>...] [--dataset <value>] [--skip-compat] [--set <key=value>...]
```

## Create a workspace from a model

To create a workspace, you must provide:

- The output directory path with `--output` (or `-o`) — workspace will be created inside this directory
- The workspace name with `--name`
- The target hardware configuration:
    - SoC with `--soc`
    - Board with `--board`
    - Core with `--core`
- The model file path or URL with `--model` (or `-m`)

```sh
cfsutil ai workspace create \
    --output <output_directory> \
    --name <workspace_name> \
    --soc <soc> \
    --board <board> \
    --core <core> \
    --model <path/to/model_file>
```

!!! example
    ```sh
    cfsutil ai workspace create \
        -o c:/tmp \
        --name myNewWorkspace \
        --soc MAX32690 \
        --board EvKit_V1 \
        --core CM4 \
        --model c:/models/model.tflite
    ```

## What happens during workspace creation

When you run `cfsutil ai workspace create`, the following actions occur automatically:

1. **Compatibility check** — The command runs [`cfsutil ai compat`](./compat.md) to verify the model is compatible with the target hardware.
2. **Workspace generation** — Creates a new workspace at the specified location using the appropriate template for the target SoC and board.
3. **Model integration** — Adds the model to the workspace configuration using [`cfsutil ai model update`](./model.md#update-command).
4. **Initial build** — Compiles the model into C/C++ source code using [`cfsutil ai build`](./build.md).

The resulting workspace is ready to open in the CodeFusion Studio IDE or build from the command line.

## Flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--board` | `-b` | (required) Board name. |
| `--core` | `-c` | (required) Target core. |
| `--dataset` | `-d` | Path or URL to the sample dataset for the model. |
| `--format` | | Output format: `text` (default) or `json`. JSON output uses the [JSON output envelope](../index.md#json-output-envelope). |
| `--model` | `-m` | (required) Path or URL to the model file. |
| `--name` | `-n` | (required) Name for the new workspace. |
| `--output` | `-o` | (required) Output path for the new workspace (excluding workspace name). |
| `--set` | | Model field to set in the new workspace, as `key=value`. Can be used multiple times. See [Set model fields](#set-model-fields). |
| `--search-path` | `-x` | Additional search path for plugins and data models. Can be used multiple times. |
| `--skip-compat` | | Skip the model compatibility check. |
| `--soc` | `-s` | (required) SoC name. |

!!! tip
    Run [`cfsutil socs list`](../socs.md) to see the complete list of supported SoCs, boards, and cores in your environment.

## Skip compatibility check

By default, the command runs a compatibility check before generating the workspace. To skip this step and create the workspace without validation, use the `--skip-compat` flag.

```sh
cfsutil ai workspace create \
    -o c:/tmp \
    --name myNewWorkspace \
    --soc MAX32690 \
    --board EvKit_V1 \
    --core CM4 \
    --model c:/models/model.tflite \
    --skip-compat
```

!!! warning
    Skipping the compatibility check may result in build errors or runtime failures if the model is not compatible with the target hardware. Use this option only when you are certain the model will work on the target.

## Using a sample dataset

Provide a sample dataset file (path or URL) to include test data with your model. The dataset is used during the build process and can be helpful for validating model inference.

```sh
cfsutil ai workspace create \
    -o c:/tmp \
    --name myNewWorkspace \
    --soc MAX32690 \
    --board EvKit_V1 \
    --core CM4 \
    --model c:/models/model.tflite \
    --dataset c:/datasets/sample_data.bin
```

!!! tip
    Example dataset files (`.bin`) are located in the `cfs-ai/examples/` directory of the [:octicons-link-external-24: CodeFusion Studio repository](https://github.com/analogdevicesinc/codefusion-studio){:target="_blank"}.

## Set model fields

Use `--set key=value` to set model fields in the new workspace, such as turning a model off or changing backend configuration values. Repeat the flag to set multiple fields.

```sh
cfsutil ai workspace create \
    -o c:/tmp \
    --name myNewWorkspace \
    --soc MAX32690 \
    --board EvKit_V1 \
    --core CM4 \
    --model c:/models/model.tflite \
    --set enabled=false
```

For a MAX32690 workspace that uses the `tflm` backend, you can set the `Section`, `ArenaSize`, `ArenaSection`, and `DatasetSection` fields:

```sh
cfsutil ai workspace create \
    -o c:/tmp \
    --name myNewWorkspace \
    --soc MAX32690 \
    --board EvKit_V1 \
    --core CM4 \
    --model c:/models/model.tflite \
    --set Section=.data \
    --set ArenaSize=4096 \
    --set ArenaSection=.bss \
    --set DatasetSection=.data
```

!!! note
    The `name`, `symbol`, `model`, and `dataset` keys aren't supported with `--set` during workspace creation. Use the `--model` and `--dataset` flags to set the model file and sample dataset. Use [`cfsutil ai model update`](./model.md#update-command) after the workspace is created to rename the model or change its symbol.

## Custom search paths

Use the `--search-path` (or `-x`) flag to specify additional directories containing plugins or data models. This flag can be specified multiple times.

```sh
cfsutil ai workspace create \
    -o c:/tmp \
    --name myNewWorkspace \
    --soc MAX32690 \
    --board EvKit_V1 \
    --core CM4 \
    --model c:/models/model.tflite \
    --search-path /path/to/custom/plugins \
    --search-path /path/to/custom/data-models
```

!!! tip
    Plugin directories must contain valid CFS plugins; data model directories must include a generated data model index file. For information on developing CFS plugins, see the [:octicons-link-external-24: CFS Plugins repository](https://github.com/analogdevicesinc/cfs-plugins/blob/main/DEVELOPMENT.md){:target="_blank"}. For information on generating a data model index file, see the [:octicons-link-external-24: CodeFusion Studio GitHub repository](https://github.com/analogdevicesinc/codefusion-studio/blob/main/packages/cli/DEVELOPMENT.md){:target="_blank"}.

## Remote model files

The `--model` and `--dataset` flags accept both local file paths and remote URLs. Remote files are cached for offline reuse and refreshed after one hour if the URL is available. Use [`cfsutil ai clean-cache`](./clean-cache.md) to clear the cache and force a re-download.

!!! note "Remote URLs"
    Use raw download URLs, not repository page URLs. For example, use `https://raw.githubusercontent.com/org/repo/branch/file.tflite`, not `https://github.com/org/repo/blob/branch/file.tflite`.

!!! note "Paths and URLs are stored as provided"
    The `--model` and `--dataset` values are stored in the `.cfsconfig` file as provided, not resolved to absolute paths. The command performs an initial build from the new workspace root, so use an absolute path or URL. Relative paths are first validated from the directory where you run the command and then resolved from the new workspace root.

!!! example "Using remote models from the CFS repository"
    ```sh
    cfsutil ai workspace create \
        -o c:/tmp \
        --name myNewWorkspace \
        --soc MAX32690 \
        --board EvKit_V1 \
        --core CM4 \
        --model https://raw.githubusercontent.com/analogdevicesinc/codefusion-studio/main/cfs-ai/examples/hello_world_f32.tflite \
        --dataset https://raw.githubusercontent.com/analogdevicesinc/codefusion-studio/main/cfs-ai/examples/hello_world_f32.bin
    ```
