---
description: "Supported CFSAI reports (Compatibility Analyzer and Resource Profiling) in CFS"
author: "Analog Devices"
date: "2025-10-16"
---

# Report commands

The `cfsai` utility can generate two types of reports to help you prepare machine learning models for deployment:

- Compatibility Analyzer report (`cfsai compat`) — Validates operator support, memory constraints, and data type compatibility on the selected target.  
- Resource Profiling report (`cfsai profile`) — Estimates memory usage, compute cycles, latency, and optimization opportunities.

These reports do not modify your model or block code generation. Instead, they highlight potential issues and provide data to guide optimizations. You can re-run the tools after making changes to confirm that your model is both compatible and efficient on the target hardware.

!!! note
    This is an early version of the reporting feature, and it may evolve in future releases. Currently, only TFLM models are supported. CNN accelerator models on MAX78002, which use PyTorch, are not supported for reporting.

## Compatibility command

The `cfsai compat` command checks whether a machine learning model can run on a supported processor. To resolve issues, you may need to replace unsupported operators, apply memory optimizations, or convert unsupported data types. After applying changes, re-run the command to confirm compatibility.

!!! tip
    The analyzer logic is located in [:octicons-link-external-24: `analyze_compatibility.py`](https://github.com/analogdevicesinc/codefusion-studio/tree/main/cfs-ai/packages). This script can be adapted or extended to suit your own use cases.

To run the `cfsai compat` command, you must provide:

- The model path with `--model` (or `-m`)  
- The target string with `--target` (or `-t`)  

```sh
cfsai compat --model <path/to/model_file> --target <soc>?([<package>]).<core>?(.<accelerator>)
```

### Optional compat outputs

| Flag          | Description                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| `--json-file` | Path to a file where results are written in JSON format. Useful for parsing. |

!!! example
    ```sh
    cfsai compat  --model m4/resnet_float32.tflite --target MAX32690.CM4 --json-file m4/output.json
    ```

!!! tip
    For details on interpreting the report, see [Compatibility Report](../compat-report.md).

## Profile command

The `cfsai profile` command estimates memory usage, hardware performance, per-layer efficiency, and optimization opportunities for a model on the target device. Unlike the `cfsai compat` command (which flags unsupported features), it focuses on performance characteristics and optimization opportunities. You can apply the suggested optimizations to improve efficiency and better fit the model to your hardware.

!!! tip
    The `cfsai profile` logic is located in [:octicons-link-external-24: `profile_resources.py`](https://github.com/analogdevicesinc/codefusion-studio/tree/main/cfs-ai/packages). This script can be adapted or extended to suit your own use cases.

To run the `cfsai profile` command, you must provide:

- The model path with `--model` (or `-m`)  
- The target string with `--target` (or `-t`)  

```sh
cfsai profile --model <path/to/model_file> --target <soc>?([<package>]).<core>?(.<accelerator>)
```

### Optional profile outputs

| Flag          | Description                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| `--json-file` | Path to a file where results are written in JSON format. Useful for parsing. |
| `--text-file` | Path to a file where results are written in plain text.                      |

!!! example
    ```sh
    cfsai profile  --model m4/customized_resnet_float32.tflite --target MAX32690.CM4 --json-file m4/output.json
    ```

!!! tip
    For details on interpreting the report, see [Resource Profiling Report](../profiling-report.md)
