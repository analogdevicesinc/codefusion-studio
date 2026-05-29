---
description: Check model compatibility with a target SoC and core using cfsutil ai compat.
author: Analog Devices
date: 2026-05-18
---

# Compat

The `cfsutil ai compat` command checks whether a machine learning model can run on a supported processor. It validates operator support, memory constraints, and data type compatibility on the selected target. To resolve issues, you may need to replace unsupported operators, apply memory optimizations, or convert unsupported data types. After applying changes, re-run the command to confirm compatibility.

!!! note
    This is an early version of the reporting feature, and it may evolve in future releases. Currently, only TFLM models are supported. CNN accelerator models on MAX78002, which use PyTorch (izer backend), are not supported for reporting.

!!! tip
    The analyzer logic is located in [:octicons-link-external-24: `analyze_compatibility.py`](https://github.com/analogdevicesinc/codefusion-studio/tree/main/cfs-ai/packages){:target="_blank"}. This script can be adapted or extended to suit your own use cases.

```sh
cfsutil ai compat [--format text|json] [-s <value>] [-p <value>] [-c <value>] [-a <value>] [-m <value>] [-d <value>] [--report-file <value>] [-x <value>...] [--ignore-cache]
```

To run the `cfsutil ai compat` command, you must provide:

- The model path with `--model` (or `-m`)
- The target SoC with `--soc` (or `-s`) and core with `--core` (or `-c`)

```sh
cfsutil ai compat --soc <soc> --core <core> --model <path/to/model_file>
```

!!! example
    ```sh
    cfsutil ai compat --soc MAX32690 --core CM4 --model model.tflite
    ```

## Flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--acc` | `-a` | Target accelerator. |
| `--core` | `-c` | Target core. |
| `--dataset` | `-d` | Path or URL to the dataset file to use for compatibility analysis. |
| `--model` | `-m` | Path or URL to the model file. |
| `--package` | `-p` | SoC package. |
| `--soc` | `-s` | Target SoC. |
| `--search-path` | `-x` | Additional search path for templates and data models. Can be repeated. |
| `--ignore-cache` | | Bypass cache and fetch latest remote files. |
| `--format` | | Output format: `text` (default) or `json`. |
| `--report-file` | | Path to output JSON report file. |

!!! example "Check compatibility for a specific SoC package variant"
    ```sh
    cfsutil ai compat --soc MAX32690 --core CM4 --package WLP --model model.tflite
    ```

!!! example "Output in JSON format"
    ```sh
    cfsutil ai compat --soc MAX32690 --core CM4 --model model.tflite --format json
    ```

## Understanding the compatibility report output

The Compatibility Analyzer report checks whether your model fits the target hardware by evaluating three categories:

- Memory constraint issues — flash/RAM overflows.
- Operator compatibility issues — Unsupported operators and suggested alternatives.
- Data type compatibility issues — Unsupported data types.

!!! info "Report formats"
    The examples below show the terminal output. Use the `--report-file` flag to generate machine-readable JSON output for programmatic analysis or integration with other tools.

### Memory constraint issues

Memory constraint issues occur when the model exceeds the flash or RAM limits defined in the hardware profile. These are reported as `CRITICAL` or `WARNING` in the analyzer output. In CFS, they do not block code generation, but they may appear as errors in the report to indicate that the generated model is unlikely to run correctly on hardware.

#### How to read the output

Memory issues are reported in the terminal using the following structure:
`[SEVERITY] ISSUE_IDENTIFIER – MEMORY_SCOPE`

Where:

- **SEVERITY** indicates the impact on deployment (`CRITICAL` or `WARNING`).
- **ISSUE_IDENTIFIER** identifies the type of memory constraint.
- **MEMORY_SCOPE** indicates whether the issue applies to flash, RAM, or both.

#### Memory issue identifiers

| Memory issue | Meaning | Severity |
| ------------ | ------- | -------- |
| `model_storage_memory_overflow – flash_and_ram` | Model exceeds both flash and RAM | CRITICAL |
| `model_storage_flash_overflow – flash` | Exceeds flash, but fits in RAM | WARNING |
| `model_storage_ram_overflow – ram` | Exceeds RAM, but fits in flash | WARNING |
| `ram_memory_overflow – ram` | Peak runtime RAM usage exceeds limit | WARNING |

!!! example "Sample output"

    ```sh
    Memory Constraint Issues (1):
    Memory requirements exceed hardware limitations
    [CRITICAL] model_storage_memory_overflow - flash_and_ram memory
    ```

#### How to fix memory constraint issues

- Apply quantization. Refer to the [:octicons-link-external-24: TensorFlow Lite post-training quantization guide](https://tensorflow.org/lite/performance/post_training_quantization){:target="_blank"} for details.
- Use weight pruning. Refer to the [:octicons-link-external-24: TensorFlow Model Optimization documentation](https://tensorflow.org/model_optimization){:target="_blank"} for details.
- Optimize the model architecture. Redesign the model to use more hardware-efficient layers or data flows (for example, replacing standard convolutions with depthwise separable convolutions).
- Reduce model complexity. Refer to the [:octicons-link-external-24: TensorFlow Model Optimization documentation](https://tensorflow.org/model_optimization){:target="_blank"} for details.
- For runtime-only RAM issues: lower batch size, enable layer fusion, or optimize tensor life.

### Operator compatibility issues

Operator compatibility issues indicate that a model layer uses an operator not supported by the target implementation. Code generation should not proceed until the operator has been replaced.

#### How to read the operator issues output

Operator issues are reported in the terminal using the following structure:
`OPERATOR (ALTERNATIVE_IF_AVAILABLE). Layer(s) <index>`

Where:

- **OPERATOR** is the unsupported operator name.
- **ALTERNATIVE_IF_AVAILABLE** is shown if a hardware-compatible replacement exists.
- **Layer(s)** indicates where the operator appears in the model graph.

#### Operator issue fields

| Field | Description |
| ----- | ----------- |
| Operation | Operator name from the model. For example, `MEAN`, `CONV_2D`, `SOFTMAX`. |
| Suggested alternative | Replacement operator, if one exists. For example, `ELU → RELU`, `ADVANCED_CONV → CONV_2D`. If none exists `no hardware-compatible alternative identified` is displayed. |
| Layer index | Position of the layer or layers in the model graph. |

!!! example "Sample output"

    ```sh
    Operator Compatibility Issues (1):
    Operations not supported by target hardware platform
    MEAN (no hardware-compatible alternative identified). Layer(s) 50, 51.
    ```

#### How to fix operator compatibility issues

- Replace the unsupported operator. The report may include a suggestion to consider.
- If no alternative is provided (for example, the report shows `no hardware-compatible alternative identified`), remove the unsupported operator or redesign the layer and retrain.

### Data type compatibility issues

Data type compatibility issues occur when a model layer uses a data type that is not supported by the target. These issues are flagged during analysis. Code generation should not proceed until an appropriate data type is used.

#### How to read the data type issues output

Data type issues are reported in the terminal using the following structure:
`OPERATOR operation uses DATA_TYPE. Layer(s) <index>`

| Field | Description |
| ----- | ----------- |
| Operator type | Operator name such as `CONV_2D` or `SOFTMAX`, taken directly from the model. |
| Data type | Unsupported type such as `FLOAT32`, `FLOAT16`, or `BF16`. |
| Layer index | Position of the layer or layers where this operator–data type combination occurs. |

!!! example "Sample output"

    ```sh
    Data Type Compatibility Issues (54):
    Model uses data types not supported by target hardware
    CONV_2D operation uses FLOAT32. Layer(s) 0.
    ```

#### How to fix data type compatibility issues

Apply quantization to convert the model to a hardware-supported data type (for example, `INT8` or `UINT8`). Refer to the [:octicons-link-external-24: TensorFlow Lite post-training quantization guide](https://tensorflow.org/lite/performance/post_training_quantization){:target="_blank"} for details.
