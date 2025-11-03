---
description: Documenting the CFSAI command-line utility for compiling and deploying AI models to embedded targets.
author: Analog Devices
date: 2025-10-22
---

# CFSAI build command

The `cfsai build` command compiles an AI model for an embedded target. It generates C or C++ source and headers, depending on the target, that allow the model to be used from within an embedded application.

## Before you start

For full compatibility when using this feature, [create a new workspace](../../workspaces/create-new-workspace.md) and select an AI-based template (for example, *Zephyr Single Core TensorFlow AI Model* for MAX32690). You can then run `cfsai build` to compile the defined models, or rebuild them with new parameters.

For details on supported processors, see [supported processors and model formats](../../ai-tools/supported-ai-model-formats.md).

## Build options

- Build with a `.cfsconfig` file. The configuration file can define one or more models along with the target SoC, core, and firmware platform.
- Build a single model using required flags. Provide the model path with `--model` and the target with `--target`.

!!! note
    When you use a `.cfsconfig` file with the `--config` flag, its settings take precedence and override any conflicting command-line options. The terminal output confirms this by displaying a message such as: `Using .cfs/max78002-csbga.cfsconfig instead`.

### Build with a `.cfsconfig` file

Use a `.cfsconfig` file to build one or more models in a single command. The `.cfsconfig` file defines models, target SoC, core, and firmware platform.

```sh
cfsai build --config <path/to/project.cfsconfig>
```

!!! example
    ```sh
    cfsai build -c .cfs/max78002-csbga.cfsconfig
    ```

!!! example "Sample output"
    ```sh
    Created file: m4/src/adi_tflm/HelloWorldF32.cpp (OK)
    Created file: m4/src/adi_tflm/HelloWorldF32.hpp (OK)
    ```

!!! tip "Generate a `.cfsconfig` file before you get started"
    To generate a `.cfsconfig` file, [create a workspace](../../workspaces/create-new-workspace.md) using an AI-enabled template in CodeFusion Studio. The generated file appears in the `.cfs/` folder of your workspace. Use CodeFusion Studio to configure the project and AI models. Look for the `AIModels` section in the file to see how models are defined.

### Build using flags

Supply the model path with `--model` (or `-m`) and the target string with `--target` (or `-t`). The target format is `<soc>?([<package>]).<core>?(.<accelerator>)`. Only one model is compiled per command using this method.

| Component                | Description                                           | Example                              |
| ------------------------ | ----------------------------------------------------- | ------------------------------------ |
| `soc`                    | System-on-Chip name                                   | `MAX78002`, `MAX32690`, `ADSP-SC835` |
| `package` (optional)     | Package variant of the SoC                            | `WLP`, `TQFN`                        |
| `core`                   | Processor core                                        | `CM4`, `FX`, `CM33`                  |
| `accelerator` (optional) | Hardware AI accelerator                               | `CNN`                                |

```sh
cfsai build --model <path/to/model_file> --target <soc>?([<package>]).<core>?(.<accelerator>)

```

!!! note "C/C++ build compatibility"
    The `cfsai` build command generates C++ source and header files (`.cpp`, `.hpp`) for TensorFlow Lite Micro (TFLM) models. If your project is based on a non-AI template that uses a `main.c` source file, you may see compiler warnings when integrating the generated files. Use an AI-based template (for example, *Zephyr Single Core TensorFlow AI Model*), or replace `main.c` with `main.cpp` or a C++ wrapper.

!!! example
    ```sh
    cfsai build --model model.tflite --target MAX78002.CM4.CNN
    cfsai build --model model.tflite --target MAX78002.CM4
    cfsai build --model model.tflite --target MAX32690[WLP].CM4
    cfsai build --model model.tflite --target ADSP-SC835.FX
    ```
!!! note "macOS zsh syntax"
    On macOS, zsh interprets square brackets as pattern tokens.
    Enclose the target in quotes to avoid a shell error:
    ```sh
    cfsai build --model model.tflite --target "MAX32690[WLP].CM4"
    ```

!!! tip
    Run [`cfsai list-targets`](cfsai-utility.md#list-targets-command) to see the complete list of supported combinations in your environment.

The `--model` flag accepts both local file paths and remote URLs. Remote files are cached for offline reuse and refreshed after one hour if the URL is available.
Use [`cfsai clean-cache`](cfsai-utility.md#clean-cache-command) to clear the cache and force a re-download.

### Additional flags

These flags let you control build output, select a firmware platform, or provide Izer-specific configuration.

| Flag                    | Description                                                                                                                                              |
|-------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `--cwd`                 | Change working directory path. This is used as the base directory for relative file paths and project checks.                                            |
| `--extension`, `-e`     | Provide backend-specific fields as `key=value` pairs.                                                                                                    |
| `--firmware-platform`   | Select the firmware platform when a device supports multiple platforms. Typical values include `msdk`, `xos`, `zephyr`, and `cces`.                      |
| `--izer-network-config` | Set the path or URL to the `izer` network configuration YAML file. Required when targeting the MAX78002 CNN accelerator.                                        |
| `--no-path-checks`      | Disable checks related to project paths. Useful for CI pipelines or testing builds.                                                                     |
| `--only-core`           | Generate output for the specified core only. The core name must match the `CoreId` field defined in the `.cfsconfig` file. This value is case-sensitive. |
| `--output-path`, `-o`   | Set the path to the directory where output files will be written. The default directory is the current working directory.                                        |

### Common options

#### Run the build from a different working directory

Use a custom working directory as the base path for relative files.  

```sh
cfsai build --config .cfs/max78002-csbga.cfsconfig --cwd path/to/project-root
```

#### Write output to a custom folder

Place generated files in a directory other than the default.

```sh
cfsai build --config .cfs/max78002-csbga.cfsconfig --output-path ./custom_folder
```

#### Build output for only one core (must be defined in `.cfsconfig`)

Limit output to the specified core (must match a CoreId in `.cfsconfig`).

```sh
cfsai build --config .cfs/max78002-csbga.cfsconfig --only-core CM4
```

#### Disable path checks

Skip validation of project paths. Useful when building outside of a workspace.

```sh
cfsai build --config .cfs/max78002-csbga.cfsconfig --no-path-checks
```

### Platform selection

#### Set a supported firmware platform

Choose the firmware platform when a device supports multiple platforms.

```sh
cfsai build --model path/to/model.tflite --target max32690.cm4 --firmware-platform msdk 
```

### CNN accelerator (Izer backend)

#### Set Izer network config

Provide a network configuration YAML file (path or URL) when targeting the MAX78002 CNN accelerator.

```sh
cfsai build \
    --target max78002.cm4.cnn \
    --model path/to/model.pth.tar \
    --izer-network-config path/to/config.yaml 
    # Alternatively, use --izer-network-config https://example.com/network.yaml
```

!!! note
    For reference on how to train PyTorch models compatible with MAX78002, see the open-source [:octicons-link-external-24: ai8x-synthesis repository](https://github.com/analogdevicesinc/ai8x-synthesis).

#### Provide backend-specific extensions

Pass custom flags defined by the backend to modify generation behavior.

```sh
cfsai build \
    --target MAX78002.CM4.CNN \
    --model path/to/model.pth.tar \
    --backend izer \
    -e Softmax=True
```

!!! note
    The `--backend izer` flag must be specified if passing extensions.

!!! tip
    Use `cfsai list-backends`, and `cfsai list-extensions <backend>` to discover supported backends and extension fields.

If using your own custom network configuration file, pass the model’s input shape using the `--extension` option.

```sh

cfsai build \
    --target MAX78002.CM4.CNN \
    --model path/to/model.pth.tar \
    --izer-network-config path/to/config.yaml \
    --backend izer \
    -e InputShape=1,32,32
```

!!! tip
    The -e or --extension flag can be repeated to pass multiple key–value pairs. For example: `-e InputShape=1,32,32 -e Softmax=True`.

### Global output options

#### Enable verbose logging

Print additional details while running a command. Helpful for debugging or understanding exactly what the tool is doing.

```sh
cfsai --verbose build --model model.tflite --target MAX32690.CM4
```

!!! example "Sample output"

    ```sh
    🔍    Refreshing datamodel manager cache                                        
    🔍    Found system package manager index                                                  
    🔍    Found a system datamodel index 
    🔍    Getting datamodel for MAX78002                         
    🔍    Reading datamodel                                                          
    🔍    Successfully validated configuration                                 
    Created file "tensforlfow/src/adi_tflm/hello_world_f32.cpp"                        
    Created file "tensforlfow/src/adi_tflm/hello_world_f32.hpp" 
    ```

#### Emit JSON logs and results

Output machine-readable logs. Useful for CI pipelines or script parsing.  
The output is in JSON Lines format (one JSON object per line), not a single JSON array.

```sh
cfsai --json build --config .cfs/max78002-csbga.cfsconfig
```

!!! example "Sample JSON output"

    ```json
        {"level":"INFO","msg":"Created file \"tensforlfow/src/adi_tflm/hello_world_f32.cpp\"","file_created_event":{"status":"OK","path":"tensforlfow/src/adi_tflm/hello_world_f32.cpp"}}
        {"level":"INFO","msg":"Created file \"tensforlfow/src/adi_tflm/hello_world_f32.hpp\"","file_created_event":{"status":"OK","path":"tensforlfow/src/adi_tflm/hello_world_f32.hpp"}}
    ```
