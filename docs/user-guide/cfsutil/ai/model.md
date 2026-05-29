---
description: Add, list, update, and remove AI models within a workspace using cfsutil ai model commands.
author: Analog Devices
date: 2026-04-20
---
<!-- markdownlint-disable MD024 -->

# Model management

The `cfsutil ai model` commands let you manage AI models within a workspace. Use these commands to add new models, list configured models, update model properties, and remove models from a workspace.

## Add command

Adds a model to a workspace. The command adds a new entry to the `AIModels` array in the `.cfsconfig` file. For example, adding a TFLM model targeting `CM4` produces an entry like:

```json
{
  "Name": "hello_world_f32",
  "Files": {
    "Model": "path/to/hello_world_f32.tflite"
  },
  "Target": {
    "Core": "CM4"
  },
  "Backend": {
    "Name": "tflm",
    "Extensions": {}
  },
  "Enabled": true
}
```

The model name is derived from the filename.

!!! note
    A model with the same name cannot be added twice. The name is taken from the model filename (without extension).

```sh
cfsutil ai model add --core <value> -m <value> [--format text|json] [-w <value>] [--config <value>] [--dataset <value>] [-a <value>] [--network-config <value>] [-e <value>...] [--ignore-cache]
```

### Required flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--model` | `-m` | Path or URL to the model file. |
| `--config` or `--workspace` | | One must be provided. `--config` takes precedence over `--workspace` if both are given. |
| `--core` | | Target core (for example, `CM4`, `CM33`). |

!!! example
    ```sh
    cfsutil ai model add --config .cfs/max32690.cfsconfig --core CM4 --model path/to/model.tflite
    ```

!!! example "Sample output"
    ```sh
    Model added successfully.
    ```

!!! note "C/C++ build compatibility"
    For TFLM models, `cfsutil ai build` generates C++ source and header files (`.cpp`, `.hpp`). If your project uses a non-AI template with `main.c`, you may see compiler warnings when integrating the generated files. Replace `main.c` with `main.cpp` or use a C++ wrapper.

### Optional flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--acc` | `-a` | Target accelerator (for example, `CNN`). |
| `--extension` | `-e` | Backend-specific fields as `key=value` pairs. Can be repeated. For example, for `tflm`: `-e Symbol=my_model -e Section=.data`; for `izer`: `-e Softmax=true -e ClockDivider=4`. Use [`cfsutil ai backends list --name <backend>`](./backends.md#list-a-specific-backend) to see available extension fields for a given backend. |
| `--dataset` | | Path or URL to a sample dataset for quantization calibration (for example, a folder of representative input images). |
| `--ignore-cache` | | Bypass the cache and fetch the latest remote files. |
| `--network-config` | | Path or URL to the Izer network configuration YAML. Required for `izer` backends. |
| `--format` | | Output format: `text` (default) or `json`. |

!!! note
    For reference on how to train PyTorch models compatible with MAX78002, see the open-source [:octicons-link-external-24: ai8x-synthesis repository](https://github.com/analogdevicesinc/ai8x-synthesis){:target="_blank"}.

!!! example "Add a TFLM model with custom symbol and memory section"
    ```sh
    cfsutil ai model add \
        --config .cfs/max32690.cfsconfig \
        --core CM4 \
        --model path/to/hello_world_f32.tflite \
        -e Symbol=hello_world_model \
        -e Section=.data
    ```

!!! example "Add an izer model for MAX78002 with network config"
    `--acc CNN` selects the izer backend, which activates `--network-config`. Both `--model` and `--network-config` accept local paths or URLs.

    ```sh
    cfsutil ai model add \
        --config .cfs/max78002.cfsconfig \
        --core CM4 \
        --acc CNN \
        --model path/to/model.pth.tar \
        --network-config path/to/network.yaml \
        -e Softmax=true
    ```

    !!! warning
        If `--acc CNN` is omitted, the model is treated as a `tflm` model and `--network-config` is silently ignored.

## List command

Lists the AI models configured in a workspace. Use `--core` to filter by a specific core, or `--verbose` to show full model details.

```sh
cfsutil ai model list [--format text|json] [-w <value>] [--config <value>] [-c <value>] [--verbose]
```

### Required flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--config` or `--workspace` | | One must be provided. `--config` takes precedence over `--workspace` if both are given. |

### Optional flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--core` | `-c` | Filter models by target core. |
| `--format` | | Output format: `text` (default) or `json`. |
| `--verbose` | | Show filename, backend, and extension details for each model. |

!!! example
    ```sh
    cfsutil ai model list --config .cfs/max32690-tqfn.cfsconfig
    cfsutil ai model list --config .cfs/max32690-tqfn.cfsconfig --core CM4 --verbose
    ```

!!! example "Sample output (verbose)"
    ```sh
    CM4:
      Hello World Float 32
        Backend: tflm
        Files:
          Model: ./m4/hello_world_f32.tflite
        Extensions:
          Symbol: hello_world_model_f32
          Section: .data
        Enabled: true
    ```

## Remove command

Removes a model from a workspace by name. The command deletes the corresponding entry from the `AIModels` array in the `.cfsconfig` file.

```sh
cfsutil ai model remove --name <value> [--format text|json] [-w <value>] [--config <value>]
```

### Required flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--name` | | Name of the model to remove. Use quotes if the name contains spaces, for example `--name "Hello World Float 32"`. |
| `--config` or `--workspace` | | One must be provided. `--config` takes precedence over `--workspace` if both are given. |

### Optional flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--format` | | Output format: `text` (default) or `json`. |

!!! example
    ```sh
    cfsutil ai model remove --name hello_world_f32 --config .cfs/max32690-tqfn.cfsconfig
    ```

## Update command

Updates properties of an existing model in a workspace. Use `--set key=value` to specify the fields to change. The `--set` flag can be repeated to update multiple fields in one command.

```sh
cfsutil ai model update --name <value> --set <value>... [--format text|json] [-w <value>] [--config <value>] [-c <value>] [--ignore-cache]
```

### Required flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--name` | | Name of the model to update. Use quotes if the name contains spaces, for example `--name "Hello World Float 32"`. |
| `--set` | | Field to update as `key=value`. Can be repeated. |
| `--config` or `--workspace` | | One must be provided. `--config` takes precedence over `--workspace` if both are given. |

### Optional flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--core` | `-c` | Target core. |
| `--ignore-cache` | | Bypass the cache and fetch the latest remote files. |
| `--format` | | Output format: `text` (default) or `json`. |

### Updatable fields

#### Core fields

| Key | Description |
| --- | ----------- |
| `enabled` | Enable or disable the model (`true` or `false`). |
| `model` | Replace the model file path or URL. |
| `name` | Rename the model. Must not conflict with an existing model name. |

!!! example "Update core fields"
    ```sh
    cfsutil ai model update --config .cfs/max32690-tqfn.cfsconfig --name hello_world_f32 --set name=hello_world_renamed
    cfsutil ai model update --config .cfs/max32690-tqfn.cfsconfig --name hello_world_f32 --set model=path/to/new_model.tflite
    cfsutil ai model update --config .cfs/max32690-tqfn.cfsconfig --name hello_world_f32 --set enabled=false
    ```

#### tflm extension fields

| Key | Description |
| --- | ----------- |
| `ArenaSection` | Memory section for the arena. |
| `ArenaSize` | Arena size for the model. |
| `Dataset` | Dataset file. |
| `DatasetSection` | Memory section for the dataset. |
| `Section` | Memory section for model data. |
| `Symbol` | Symbol name for model data. |

!!! example "Update tflm extension fields"

    ```sh
    cfsutil ai model update --config .cfs/max32690-tqfn.cfsconfig --name hello_world_f32 --set Symbol=hello_world_model --set Section=.data
    ```

#### izer extension fields

| Key | Description |
| --- | ----------- |
| `AvgPoolRounding` | Round average pooling results. |
| `ClockDivider` | CNN clock divider. |
| `Fifo` | Use FIFO. |
| `InputShape` | Input shape. |
| `Prefix` | Test name prefix. |
| `NetworkConfig` | Izer network configuration path or URL. |
| `Softmax` | Enable softmax layer generation. |
| `Timer` | Inference timer. |

!!! example "Update izer extension fields"
    ```sh
    cfsutil ai model update --config .cfs/max78002-csbga.cfsconfig --name cats-dogs --set Softmax=true --set ClockDivider=4
    ```

!!! tip
    Use [`cfsutil ai backends list --name <backend>`](./backends.md#list-a-specific-backend) to see all available extension fields for a given backend.
