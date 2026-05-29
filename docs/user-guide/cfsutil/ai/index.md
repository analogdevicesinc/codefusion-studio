---
description: cfsutil AI tools and model management
author: Analog Devices
date: 2026-05-18
---

# AI

The `cfsutil ai` commands allow you to compile and analyze AI models for Analog Devices embedded targets directly from the command line. Use these commands to build deployable C/C++ code, check model compatibility, profile resource usage, and manage models within a workspace.

- [`cfsutil ai backends`](./backends.md#backends-command) — List available AI backends and their supported hardware.
- [`cfsutil ai build`](./build.md) — Compile a model into deployable C/C++ source code using a `.cfsconfig` file or command-line flags.
- [`cfsutil ai clean-cache`](./clean-cache.md) — Clear the cache of remotely downloaded files.
- [`cfsutil ai compat`](./compat.md) — Check model compatibility with a target SoC and core.
- [`cfsutil ai model`](./model.md) — Add, list, update, and remove AI models within a workspace.
- [`cfsutil ai profile`](./profile.md) — Profile model resource usage before deployment.
- [`cfsutil ai workspace`](./workspace.md) — Generate a workspace from an AI model file.

!!! note "Windows dependency"
    On Windows, `cfsutil ai` commands require the [:octicons-link-external-24: Visual C++ Redistributable for Visual Studio 2015](https://aka.ms/vs/16/release/vc_redist.x64.exe){:target="_blank"} to be installed. Install this redistributable manually before running `cfsutil ai` commands.

## Help

Pass `--help` at any level to view available options:

```sh
cfsutil ai --help
cfsutil ai backends --help
cfsutil ai build --help
cfsutil ai clean-cache --help
cfsutil ai compat --help
cfsutil ai model --help
cfsutil ai profile --help
cfsutil ai workspace --help
```

## Global options

The following option is available for all `cfsutil ai` commands.

| Flag | Description |
| ---- | ----------- |
| `--json` | Format output as JSON. Affects console output only, not generated files. |

!!! example
    ```sh
    cfsutil ai build --soc MAX32690 --core CM4 --model model.tflite --json
    ```

## Data model search path

The `ai build`, `ai compat`, and `ai profile` commands rely on a `.cfsdatamodels` index file to look up supported SoCs, cores, and accelerators. A default data model is bundled with the installation, but users can override it by generating their own data model index file. See the [:octicons-link-external-24: CodeFusion Studio GitHub repository](https://github.com/analogdevicesinc/codefusion-studio/tree/main/packages/cli/development.md){:target="_blank"} for instructions on generating a data model index file.

Use `--search-path` (`-x`) to provide an additional directory containing data model files. This flag can be specified multiple times.

!!! example
    ```sh
    cfsutil ai build --search-path /path/to/data-models --soc MAX32690 --core CM4 --model model.tflite
    ```
