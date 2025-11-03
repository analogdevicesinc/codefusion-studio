---
description: "Interpreting the Compatibility report"
author: "Analog Devices"
date: "2025-09-29"
---

# Compatibility Analyzer report

The Compatibility Analyzer report checks whether your model fits the target hardware by evaluating three categories:

- Memory constraint issues — Flash/RAM overflows.
- Operator compatibility issues — Unsupported operators and suggested alternatives.
- Data type compatibility issues — Unsupported data types.

!!! tip
    You can generate this report with the [`cfsai profile`](../ai-tools/cli/cfsai-report.md) command, or from the System Planner UI in [Embedded AI Tools](../tools/config-tool/manage-ai-models.md).

## Memory constraint issues

Memory constraint issues occur when the model exceeds the Flash or RAM limits defined in the hardware profile. These are reported as `CRITICAL` or `WARNING` in the analyzer output. In CFS, they do not block code generation, but they may appear as errors in the report to indicate that the generated model is unlikely to run correctly on hardware.

| Memory issue                                    | Meaning                              | Severity |
| ----------------------------------------------- | ------------------------------------ | -------- |
| `model_storage_memory_overflow – flash and ram` | Model exceeds both Flash & RAM       | CRITICAL |
| `model_storage_flash_overflow – flash`          | Exceeds Flash, but fits in RAM       | WARNING  |
| `model_storage_ram_overflow – ram`              | Exceeds RAM, but fits in Flash       | WARNING  |
| `ram_memory_overflow – ram`                     | Peak runtime RAM usage exceeds limit | WARNING  |

!!! example "Sample output"

    ```sh
    Memory Constraint Issues (1):
    Memory requirements exceed hardware limitations
    [CRITICAL] model_storage_memory_overflow - flash and ram memory
    ```

### How to fix memory constraint issues

- Apply quantization. Refer to the [:octicons-link-external-24: TensorFlow Lite post-training quantization guide](https://tensorflow.org/lite/performance/post_training_quantization) for details.
- Use weight pruning. Refer to the [:octicons-link-external-24: TensorFlow Model Optimization documentation](https://tensorflow.org/model_optimization) for details.
- Reduce model complexity. Refer to the [:octicons-link-external-24: TensorFlow Model Optimization documentation](https://tensorflow.org/model_optimization) for details.
- For runtime-only RAM issues: lower batch size, enable layer fusion, or optimize tensor life.

## Operator compatibility issues

Operator compatibility issues indicate that a model layer uses an operator not supported by the target hardware (as defined in the hardware profile). Code generation can still proceed, but the resulting model is unlikely to run correctly until the unsupported operator is replaced or removed.

| Field                 | Description                                                                                         |
|-----------------------|-----------------------------------------------------------------------------------------------------|
| Severity              | `[CRITICAL]` or `[WARNING]`, depending on how severely the unsupported operator impacts deployment. |
| Layer index           | Position of the layer in the model graph. For example, `51`.                                        |
| Operation             | Operator name from the model. For example, `MEAN`, `CONV_2D`, `SOFTMAX`.                            |
| Suggested alternative | Replacement operator, if one is defined. For example, `ELU → RELU`, `ADVANCED_CONV → CONV_2D`.      |

The output lists each issue with its severity, layer index, and the unsupported operator. If a known alternative exists, it is shown; otherwise (`no hardware-compatible alternative identified`) is displayed.

!!! example "Sample output"

    ```sh
    Operator Compatibility Issues (1):
    Operations not supported by target hardware platform
    [CRITICAL] Layer 51: MEAN (no hardware-compatible alternative identified)
    ```

### How to fix operator compatibility issues

- Replace the unsupported operator with the suggested replacement operator shown in the report.
- Retrain or fine-tune the model so it learns to use the supported operator.
- If no alternative is provided, remove or redesign the layer and retrain.

## Data type compatibility issues

Data type compatibility issues occur when a model layer uses a data type that is not supported by the target hardware. These issues are flagged during analysis. Code generation can still proceed, but the model is unlikely to run correctly until the unsupported data type is converted or replaced.

| Field          | Description                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Severity       | `[CRITICAL]` or `[WARNING]`, depending on how severely the unsupported type impacts deployment. |
| Layer index    | Position of the layer in the model. For example, `0`.                                           |
| Operation type | Operator name such as `CONV_2D` or `SOFTMAX`, taken directly from the model.                    |
| Data type      | Unsupported type such as `FLOAT32`, `FLOAT16`, or `BF16`.                                       |

!!! example "Sample output"

    ```sh
    Data Type Compatibility Issues (54):
    Model uses data types not supported by target hardware
    [WARNING] Layer 0: CONV_2D operation uses FLOAT32
    ```

### How to fix data type compatibility issues

- Apply quantization. Refer to the [:octicons-link-external-24: TensorFlow Lite post-training quantization guide](https://tensorflow.org/lite/performance/post_training_quantization) for details. For example, convert the model to use supported data types (for example, INT8 or UINT8).
