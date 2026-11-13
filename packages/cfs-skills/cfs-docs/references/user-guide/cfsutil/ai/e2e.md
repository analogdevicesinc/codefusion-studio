---
description: Run the full AI model workflow from compatibility check to flash and capture using cfsutil ai e2e.
author: Analog Devices
date: 2026-11-09
---

# End-to-end workflow

The `cfsutil ai e2e` command runs the full workflow for deploying and testing an AI model on a target board in a single command: compatibility check, workspace creation, build, flash, and serial capture.

```sh
cfsutil ai e2e --soc <value> --board <value> --model <value> --debugger <value> --port <value> [-v | -q] [--core <value>] [--dataset <value>] [-o <value>] [--name <value>] [--skip-compat] [--run-profiler] [-x <value>...] [--timeout <value>] [--no-create-reports]
```

## What happens during the workflow

Before running any workflow step, `cfsutil ai e2e` verifies that `--soc` matches a known SoC and that `--port` matches a currently detected serial port. The command fails immediately if either check doesn't pass.

When you run `cfsutil ai e2e`, the following steps run in sequence:

1. **Compatibility check** — Runs [`cfsutil ai compat`](./compat.md) against the target SoC and core (passing `--dataset` through when provided), unless `--skip-compat` is set. If the model isn't compatible, `cfsutil ai e2e` stops here; rerun with `--skip-compat` to bypass the check.
2. **Profiling (optional)** — Runs [`cfsutil ai profile`](./profile.md) and writes a `.cfsreport` file at `<output>/<name>.cfsreport` when `--run-profiler` is set.
3. **Workspace creation** — Runs [`cfsutil ai workspace create`](./workspace.md) to generate a workspace with the model integrated and an initial build performed.
4. **Flash and capture** — Looks up the flash-and-run task for the specified `--debugger` in the hardware profiling data of the new workspace. It then runs [`cfsutil tasks run`](../tasks.md#run-a-task) with `--capture` and `--port` to flash the built firmware and capture serial output. The command fails if the workspace has no task for the requested debugger.
5. **Report creation** — Runs [`cfsutil convert`](../convert.md) on each TEF trace file produced by the capture to create CodeFusion Studio reports. This step is skipped when you set `--no-create-reports` or when the workspace outputs text traces. If the capture produced no TEF traces, the command warns that no reports were created.

## Create a workspace and test on hardware

To run the full workflow, you must provide:

- The target hardware configuration: SoC with `--soc`, board with `--board`, and (optionally) core with `--core`
- The model file path or URL with `--model` (or `-m`)
- The debugger to use with `--debugger` (or `-d`): `JLink` or `CMSIS-DAP`
- The serial port to capture from with `--port`

```sh
cfsutil ai e2e \
    --soc <soc> \
    --board <board> \
    --model <path/to/model_file> \
    --debugger <debugger> \
    --port <port>
```

!!! example
    ```sh
    cfsutil ai e2e --soc MAX32690 --board EvKit_V1 --model model.tflite --debugger JLink --port /dev/ttyUSB0
    ```

If `--port` doesn't match an available serial port, the command lists the ports it detected. Run [`cfsutil port list`](../port.md) to check available ports beforehand.

## Flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--board` | | (required) Board name. |
| `--core` | `-c` | Target core. Inferred automatically when exactly one core in the SoC supports AI. |
| `--create-reports` | | Convert the captured TEF traces into CodeFusion Studio reports. Enabled by default. Use `--no-create-reports` to skip. Supported only by workspaces that output CTF traces. |
| `--dataset` | | Path or URL to the sample dataset for the model. |
| `--debugger` | `-d` | (required) Debugger to use for flash and run after build: `JLink` or `CMSIS-DAP`. |
| `--format` | `-f` | Output format. Only `text` is supported; `--format json` fails with an error. Default is `text`. |
| `--model` | `-m` | (required) Path or URL to the model file. |
| `--name` | | Name for the new workspace. Defaults to `ws.<soc>.<core>.<timestamp>`. |
| `--output` | `-o` | Output path for the new workspace, excluding the workspace name. Default is the current directory. |
| `--port` | | (required) Serial port name (for example, `COM3` or `/dev/ttyUSB0`). |
| `--quiet` | `-q` | Suppress non-error output, including warnings, from every step of the workflow. Errors are still shown. Mutually exclusive with `--verbose`. |
| `--run-profiler` | | Run static profiling analysis and write a `.cfsreport` file. |
| `--search-path` | `-x` | Additional search path for templates and data models. Can be used multiple times. |
| `--skip-compat` | | Skip the model compatibility check. |
| `--soc` | `-s` | (required) SoC name. |
| `--timeout` | | Stop the serial capture automatically after the specified number of seconds, measured from when the flash-and-run task completes. Default is 20 seconds. Set it to `0` to capture until you stop it manually. |
| `--verbose` | `-v` | Enable verbose mode. Mutually exclusive with `--quiet`. |

!!! tip
    Run [`cfsutil socs list`](../socs.md#list) to list available SoCs. Then run `cfsutil socs info <SOC> --boards --cores` to list the boards and cores for a target SoC.

!!! warning
    Skipping the compatibility check with `--skip-compat` may result in build errors or runtime failures if the model is not compatible with the target hardware.
