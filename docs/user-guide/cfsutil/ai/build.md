---
description: Compile an AI model into C/C++ source code using cfsutil ai build.
author: Analog Devices
date: 2026-07-31
---

# Build

The `cfsutil ai build` command compiles an AI model for an embedded target. It generates C or C++ source and headers, depending on the target, that allow the model to be used from within an embedded application.

```sh
cfsutil ai build [--format text|json] [--config <value>] [-s <value>] [-p <value>] [-c <value>] [-a <value>] [-m <value>] [--dataset <value>] [--cwd <value>] [-o <value>] [--network-config <value>] [-b <value>] [-e <value>...] [-x <value>...] [--ignore-cache]
```

## Before you start

You can run `cfsutil ai build` with command-line flags alone — no workspace is required. If you are integrating AI into an existing project, [creating a workspace](../../workspaces/create-new-workspace.md) with an AI-based template (for example, *Zephyr Single Core TensorFlow AI Model* for MAX32690) generates a `.cfsconfig` file that you can pass to `cfsutil ai build --config` to compile all defined models in one command.

!!! note "C/C++ build compatibility"
    If the build produces C++ source and header files (`.cpp`, `.hpp`), and your project is based on a non-AI template that uses a `main.c` source file, you may see compiler warnings when integrating the generated files. Use an AI-based template (for example, *Zephyr Single Core TensorFlow AI Model*), or replace `main.c` with `main.cpp` or a C++ wrapper.

For details on supported processors, see [supported processors and model formats](../../about/supported-ai-model-formats.md).

## Build options

- Build with a `.cfsconfig` file. The configuration file can define one or more models along with the target SoC, core, and firmware platform.
- Build a single model using required flags. Provide the model path with `--model` and the target with `--soc`, and optionally `--core`, `--package`, and `--acc`. For CNN accelerator builds, see [CNN accelerator (Izer backend)](#cnn-accelerator-izer-backend).

!!! note
    When `--config` is provided, `--model`, `--soc`, and `--core` are ignored. Pass these flags only when building without a `.cfsconfig` file.

### Build with a `.cfsconfig` file

Use a `.cfsconfig` file to build one or more models in a single command. The `.cfsconfig` file defines models, target SoC, core, and firmware platform.

```sh
cfsutil ai build --config <path/to/project.cfsconfig>
```

!!! example
    ```sh
    cfsutil ai build --config .cfs/max78002-csbga.cfsconfig
    ```

!!! example "Sample output"
    ```sh
    Created file "m4/src/adi_tflm/hello_world_f32.cpp"
    Created file "m4/src/adi_tflm/hello_world_f32.hpp"
    Created model "hello_world_f32"
    Created file "m4/src/adi_tflm/adi_tflm.hpp"
    ```

### Build using flags

Supply the model path with `--model` (`-m`) and the target using `--soc` (`-s`), and optionally `--core` (`-c`), `--package` (`-p`), and `--acc` (`-a`). Only one model is compiled per command using this method.

| Flag | Short | Description | Example |
| ---- | ----- | ----------- | ------- |
| `--acc` | `-a` | Hardware AI accelerator (optional). For CNN builds, see [CNN accelerator (Izer backend)](#cnn-accelerator-izer-backend). | `CNN` |
| `--core` | `-c` | Target processor core (optional when only one AI-capable core exists for the SoC — inferred automatically). | `CM4`, `FX`, `CM33` |
| `--model` | `-m` | Path or URL to the model file | `model.tflite`, `https://example.com/model.tflite` |
| `--package` | `-p` | Package variant of the SoC (optional) | `WLP`, `TQFN` |
| `--soc` | `-s` | Target SoC | `MAX78002`, `MAX32690`, `ADSP-SC835` |

```sh
cfsutil ai build --model <path/to/model> --soc <soc>
```

!!! tip
    If the SoC has exactly one AI-capable core, `--core` is inferred automatically. If the SoC has multiple cores but only one supports AI, it is still inferred — but a warning is shown confirming which core was selected. If multiple AI-capable cores are available, you must specify `--core`. Run [`cfsutil socs info <soc> --cores`](../socs.md) to see available cores for a given SoC.

!!! example
    ```sh
    # Single core, single AI core — inferred silently
    cfsutil ai build --model model.tflite --soc MAX32657

    # Multiple cores, one AI core — inferred with a warning
    cfsutil ai build --model model.tflite --soc MAX32690

    # Multiple AI cores — --core required
    cfsutil ai build --model model.tflite --soc ADSP-SC835 --core FX
    ```

!!! tip
    Run [`cfsutil socs list`](../socs.md) to see the complete list of supported SoCs and cores in your environment.

The `--model` flag accepts both local file paths and remote URLs. Remote files are cached for offline reuse and refreshed after one hour if the URL is available.
Use [`cfsutil ai clean-cache`](./clean-cache.md) to clear the cache and force a re-download.

Model names must not exceed 64 characters. When building from `--config`, this applies to each enabled model name in the `.cfsconfig` file. When building directly from `--model`, the name is derived from the model file name — if the derived name is too long, rename the model file to a shorter name.

!!! note "Remote URLs"
    Use raw download URLs, not repository page URLs. For example, use `https://raw.githubusercontent.com/org/repo/branch/file.tflite`, not `https://github.com/org/repo/blob/branch/file.tflite`.

### Additional flags

| Flag | Short | Description |
| ------ | ------- | ------------- |
| `--backend` | `-b` | Name of the backend to use. Inferred from `--soc`, `--core`, and `--acc` when not specified. Specify explicitly to override the inferred value. |
| `--extension` | `-e` | Backend-specific fields as `key=value` pairs. Can be repeated. Requires a backend — either inferred from `--soc`, `--core`, and `--acc`, or specified with `--backend`. |
| `--output-path` | `-o` | Output directory for generated files, relative to `--cwd`. |
| `--search-path` | `-x` | Additional search path for templates and data models. Can be repeated. |
| `--cwd` | | Change the working directory. Used as the base path for relative file paths. |
| `--dataset` | | Path or URL to the sample dataset for the model. |
| `--ignore-cache` | | Bypass the cache and fetch the latest remote files. |
| `--network-config` | | Path or URL to the Izer network configuration YAML. Required when using the `izer` backend. |

### Common options

#### Run the build from a different working directory

Use `--cwd` to set the base directory for resolving relative model file paths defined inside the `.cfsconfig`. The `--config` path itself must be absolute or relative to your shell's current directory.

```sh
cfsutil ai build --config /path/to/project/.cfs/max78002-csbga.cfsconfig --cwd /path/to/project
```

#### Write output to a custom folder

```sh
cfsutil ai build --config .cfs/max78002-csbga.cfsconfig --output-path ./custom_folder
```

### CNN accelerator (Izer backend)

#### Set Izer network config

Provide a network configuration YAML file (path or URL) when targeting the MAX78002 CNN accelerator.

```sh
cfsutil ai build \
    --soc MAX78002 --core CM4 --acc CNN \
    --model path/to/model.pth.tar \
    --network-config path/to/config.yaml
```

!!! example
    ```sh
    cfsutil ai build --soc MAX78002 --core CM4 --acc CNN --model https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/develop/trained/ai85-catsdogs-qat8-q.pth.tar --network-config https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/develop/networks/cats-dogs-hwc-no-fifo.yaml
    ```

!!! example "Sample output"
    ```sh
    Created file "src/adi_cnn/cnn.h"
    Created file "src/adi_cnn/weights.h"
    Created file "src/adi_cnn/sampledata.h"
    Created file "src/adi_cnn/softmax.c"
    Created file "src/adi_cnn/cnn.c"
    Created file "src/adi_cnn/sampleoutput.h"
    ```

!!! note
    For reference on how to train PyTorch models compatible with MAX78002, see the open-source [:octicons-link-external-24: ai8x-synthesis repository](https://github.com/analogdevicesinc/ai8x-synthesis){:target="_blank"}.

#### Provide backend-specific extensions

Pass custom flags defined by the backend to modify generation behavior.

```sh
cfsutil ai build \
    --soc MAX78002 --core CM4 --acc CNN \
    --model path/to/model.pth.tar \
    --network-config path/to/config.yaml \
    --backend izer \
    -e Softmax=True
```

!!! example
    ```sh
    cfsutil ai build --soc MAX78002 --core CM4 --acc CNN --model https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/develop/trained/ai85-catsdogs-qat8-q.pth.tar --network-config https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/develop/networks/cats-dogs-hwc-no-fifo.yaml --backend izer -e Softmax=True
    ```

!!! tip
    Use [`cfsutil ai backends list --name <backend>`](./backends.md#list-a-specific-backend) to see available extension fields for a given backend.

If using a custom network configuration file, pass the model's input shape using the `--extension` option.

```sh
cfsutil ai build \
    --soc MAX78002 --core CM4 --acc CNN \
    --model path/to/model.pth.tar \
    --network-config path/to/config.yaml \
    --backend izer \
    -e InputShape=1,32,32
```

!!! tip
    The `-e` / `--extension` flag can be repeated to pass multiple key-value pairs. For example: `-e InputShape=1,32,32 -e Softmax=True`.

!!! note "Authentication"
    If a build needs to pull a backend's compiler image from ADI, authenticate
    first with `cfsutil myanalog login`, or set the `CFS_API_KEY` environment
    variable. See [API key authentication](../apikey-auth.md).

### JSON output

Output machine-readable logs. Useful for CI pipelines or script parsing.
The output is a JSON array, with one object per event.

```sh
cfsutil ai build --config .cfs/max32690-tqfn.cfsconfig --format json
```

!!! example "Sample JSON output"

    ```json
    [
      {
        "level": "WARNING",
        "msg": "No arena size provided. Estimated to be 2888 bytes",
        "event": null
      },
      {
        "level": "INFO",
        "msg": "Created file \"m4/src/adi_tflm/hello_world_model_f32.cpp\"",
        "event": {
          "status": "OK",
          "type": "FILE",
          "value": "m4/src/adi_tflm/hello_world_model_f32.cpp"
        }
      },
      {
        "level": "INFO",
        "msg": "Created file \"m4/src/adi_tflm/hello_world_model_f32.hpp\"",
        "event": {
          "status": "OK",
          "type": "FILE",
          "value": "m4/src/adi_tflm/hello_world_model_f32.hpp"
        }
      },
      {
        "level": "INFO",
        "msg": "Created model \"hello_world_model_f32\"",
        "event": {
          "status": "OK",
          "type": "MODEL",
          "value": "hello_world_model_f32"
        }
      },
      {
        "level": "INFO",
        "msg": "Created file \"m4/src/adi_tflm/adi_tflm.hpp\"",
        "event": {
          "status": "OK",
          "type": "FILE",
          "value": "m4/src/adi_tflm/adi_tflm.hpp"
        }
      }
    ]
    ```
