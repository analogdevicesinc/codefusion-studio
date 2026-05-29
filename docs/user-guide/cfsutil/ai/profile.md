---
description: Profile model resource usage on a target SoC and core using cfsutil ai profile.
author: Analog Devices
date: 2026-05-18
---

# Profile

The `cfsutil ai profile` command estimates memory usage, hardware performance, per-layer efficiency, and optimization opportunities for a model on the target device. Unlike `cfsutil ai compat` (which flags unsupported features), it focuses on performance characteristics and optimization opportunities. You can apply the suggested optimizations to improve efficiency and better fit the model to your hardware.

!!! note
    This is an early version of the reporting feature, and it may evolve in future releases. Currently, only TFLM models are supported. CNN accelerator models on MAX78002, which use PyTorch (izer backend), are not supported for reporting.

!!! tip
    The `cfsutil ai profile` logic is located in [:octicons-link-external-24: `profile_resources.py`](https://github.com/analogdevicesinc/codefusion-studio/tree/main/cfs-ai/packages){:target="_blank"}. This script can be adapted or extended to suit your own use cases.

```sh
cfsutil ai profile [--format text|json] [-s <value>] [-p <value>] [-c <value>] [-a <value>] [-m <value>] [--report-file <value>] [--report-format text|json] [-x <value>...] [--ignore-cache]
```

To run the `cfsutil ai profile` command, you must provide:

- The model path with `--model` (or `-m`)
- The target SoC with `--soc` (or `-s`) and core with `--core` (or `-c`)

```sh
cfsutil ai profile --soc <soc> --core <core> --model <path/to/model_file>
```

!!! example
    ```sh
    cfsutil ai profile --soc MAX32690 --core CM4 --model model.tflite
    ```

## Flags

| Flag | Short | Description |
| ---- | ----- | ----------- |
| `--acc` | `-a` | Target accelerator. |
| `--core` | `-c` | Target core. |
| `--model` | `-m` | Path or URL to the model file. |
| `--package` | `-p` | SoC package. |
| `--soc` | `-s` | Target SoC. |
| `--search-path` | `-x` | Additional search path for templates and data models. Can be repeated. |
| `--ignore-cache` | | Bypass cache and fetch latest remote files. |
| `--format` | | Output format: `text` (default) or `json`. |
| `--report-file` | | Path to output report file. |
| `--report-format` | | Report output format: `json` (default) or `text`. |

!!! example "Check for a specific SoC package variant"
    ```sh
    cfsutil ai profile --soc MAX32690 --core CM4 --package WLP --model model.tflite
    ```

!!! example "Output in JSON format"
    ```sh
    cfsutil ai profile --soc MAX32690 --core CM4 --model model.tflite --format json
    ```

## Report output

The Resource Profiling report provides resource and performance estimates for your model on the target hardware. The report progressively drills down from high-level summaries to detailed layer-by-layer analysis across five key categories:

- **Model summary** — Basic details about the model file and its size.
- **Memory analysis** — Peak RAM usage, utilization, and whether it fits in the target hardware (includes optional memory issues and recommendations when problems are detected).
- **Hardware performance** — Overall compute cycles, latency, and acceleration metrics.
- **Per-layer performance** — Detailed cycles, energy, and memory usage for each layer, highlighting bottlenecks.
- **Optimization opportunities** — Suggested strategies such as quantization, pruning, and layer-level alternatives for large or compute-heavy layers.

!!! info "Report formats"
    The examples below show the terminal output. Use `--report-format json` with `--report-file` to generate machine-readable JSON output for programmatic analysis or integration with other tools.

### Model summary

The model summary provides a high-level overview of the analyzed model before detailed profiling.

| Field | Description |
| ----- | ----------- |
| Model name | Filename of the model under test. |
| Model path | Path to the model file on disk. |
| Framework | ML framework type. Currently only `TensorFlow Lite` is supported. |
| Model size | Memory required to store the model. |
| Data type | Numerical precision defined in the model file. |
| Layer count | Total number of layers parsed from the model. |

!!! example "Sample output"
    ```sh
    == MODEL SUMMARY ===
    | Metric               | Value                                    |
    | -------------------- | ---------------------------------------- |
    | Model Name           | resnet.tflite                            |
    | Model Path           | /Users/.../resnet.tflite                 |
    | Framework            | TensorFlow Lite                          |
    | Model Size           | 5787.48 KB                               |
    | Data Type            | float32                                  |
    | Layer Count          | 54                                       |
    ```

### Memory analysis

Memory analysis shows how much RAM the model requires at runtime and compares it to the available RAM defined in the target hardware profile.

| Field | Description |
| ----- | ----------- |
| Peak RAM Required | Maximum RAM usage observed during model execution. |
| RAM Status | Indicates whether RAM usage fits the target hardware constraints. |
| Available RAM | Total RAM available on the target hardware, from the hardware profile. |
| RAM Utilization | Percentage of available RAM consumed by peak usage. Formula: (Peak RAM Required ÷ Available RAM) × 100. |

In the example below, the model requires 576 KB of RAM at runtime, which fits comfortably within the target hardware's 1 MB RAM. This corresponds to 56.2% utilization, so the RAM status is marked as OK.

!!! example "Sample output"
    ```sh
    === MEMORY ANALYSIS ===
    | Memory Metric             | Value                               |
    | ------------------------- | ----------------------------------- |
    | Peak RAM Required         | 576.00 KB (0.56 MB)                 |
    | RAM Status                | OK                                  |
    | Available RAM             | 1024.00 KB (1.00 MB)                |
    | RAM Utilization           | 56.2%                               |
    ```

#### Memory issues

Lists the critical problems identified. This section appears only if the profiler detects over-usage or excessive utilization. For example, model peak RAM exceeds target RAM.

!!! example "Sample output"
    ```sh
    Memory Issues:
        • Peak RAM usage (5880.0 KB) exceeds available RAM (1024.0 KB)
    ```

#### Memory recommendations

Provides recommendations tailored to the model and target hardware. The set of recommendations varies depending on the severity level, model architecture, computational complexity and memory usage patterns.

!!! example "Sample output"
    ```sh
    Memory Recommendations:
        • URGENT: Model requires 4856 KB (474%) more RAM than available
        • Evaluate quantization potential with representative dataset
    ```

### Hardware performance

This section estimates how the model performs on the target hardware. Metrics are aggregated from per-layer analysis and the hardware profile.

| Field | Description |
| ----- | ----------- |
| Total cycles | Total number of compute cycles required for full model execution. |
| Estimated latency | End-to-end inference time in milliseconds, derived from cycles and max CPU clock frequency. |
| Peak memory | Maximum RAM required during inference. |
| Accelerated layers | Number of layers executed using hardware accelerators (such as DSP, NPU). |
| CPU-only layers | Number of layers that must run on the CPU because no hardware acceleration is available. |

For example, in the sample output below, the model runs in about 1.8 seconds (1802.62 ms), requires 576 KB of RAM at peak, and executes 37 layers on accelerators with 17 layers falling back to the CPU.

!!! example "Sample output"
    ```sh
    === HARDWARE PERFORMANCE ===
    | Metric               | Value                               |
    | -------------------- | ------------------------------------|
    | Total Cycles         | 180,261,962                         |
    | Estimated Latency    | 1802.62 ms                          |
    | Peak Memory          | 576.00 KB                           |
    | Accelerated Layers   | 37                                  |
    | CPU-Only Layers      | 17                                  |
    ```

### Per-layer performance

This section provides a detailed breakdown of compute and memory requirements for each model layer. It helps identify which specific layers are the performance bottlenecks.

| Field | Description |
| ----- | ----------- |
| Layer | Index of the layer in the model (e.g. `0`, `1`, `2`). Matches the parser output. |
| Operator | Operator type used in this layer (e.g. `CONV_2D`, `ADD`, `SOFTMAX`). |
| Cycles | Total compute cycles required to execute the layer. |
| Latency | Estimated runtime of the layer in milliseconds. |
| Energy | Estimated energy consumption of the layer in microjoules (µJ). |
| Power | Average power draw while executing the layer in milliwatts (mW). Currently disabled and shows `-`. |
| MACs | Number of multiply-accumulate operations performed by the layer. |
| Memory | Memory footprint of the layer in KB (if available). |
| Accel | Whether the layer is executed on hardware acceleration (`Yes`) or CPU only (`No`). |

For example, in the sample output below, layers 2 and 5 (`CONV_2D`) have significantly higher cycles and latency than the other layers, making them the primary performance bottlenecks.

!!! example "Sample output"
    ```sh
    === PER-LAYER PERFORMANCE ===
    | Layer    | Operator        |     Cycles | Latency (ms) | Energy (uJ) |  Power (mW) |       MACs |  Memory (KB) | Accel  |
    | -------- | --------------- | ---------- | ------------ | ----------- | ----------- | ---------- | ------------ | ------ |
    | 0        | CONV_2D         |    442,368 |       4.4237 |      110.59 |           - |    442,368 |         1.75 |  Yes   |
    | (CONV_2… |                 |            |              |             |             |            |              |        |
    | 1        | CONV_2D         |  7,077,888 |      70.7789 |     1769.47 |           - |  7,077,888 |        27.19 |  Yes   |
    | (CONV_2… |                 |            |              |             |             |            |              |        |
    | 2        | CONV_2D         | 21,233,664 |     212.3366 |     5308.42 |           - | 21,233,664 |        81.19 |  Yes   |
    | (CONV_2… |                 |            |              |             |             |            |              |        |
    | 3        | CONV_2D         |    786,432 |       7.8643 |      196.61 |           - |    786,432 |         3.19 |  Yes   |
    | (CONV_2… |                 |            |              |             |             |            |              |        |
    | 4 (ADD)  | ADD             |     49,152 |       0.4915 |       12.29 |           - |     49,152 |            - |   No   |
    | 5        | CONV_2D         | 21,233,664 |     212.3366 |     5308.42 |           - | 21,233,664 |        81.19 |  Yes   |
    | (CONV_2… |                 |            |              |             |             |            |              |        |
    ```

### Optimization opportunities

The Optimization Opportunities section provides baseline metrics about your model's resource requirements. These summary values help you understand the overall optimization potential before diving into layer-specific recommendations.

| Field | Description |
| ----- | ----------- |
| Total parameter memory | Size of all model parameters (weights) in KB, as parsed from the model. |
| Total MACs | Multiply–accumulate operations required to run the model. Higher values indicate more compute demand. |

These baseline metrics serve as reference points for measuring optimization impact. The actual optimization suggestions appear in the layerwise sections that follow.

!!! example "Sample output"
    ```sh
    === OPTIMIZATION OPPORTUNITIES ===
    | Metric                 | Value       |
    | ---------------------- | ----------- |
    | Total Parameter Memory | 5787.48 KB  |
    | Total MACs             | 180,261,962 |
    ```

#### Layerwise memory optimization opportunities

This section highlights individual layers with high parameter memory (weights), which are the most likely to benefit from targeted optimizations.

| Field | Description |
| ----- | ----------- |
| Layer index | Index of the layer in the model (e.g. `34`). |
| Operation type | Operator type, usually `CONV_2D`, comes from the model. |
| Parameter memory | Estimated parameter memory footprint of the layer (in KB), if applicable. |
| MACs | Number of multiply–accumulate operations for this layer. |
| Kernel info | Kernel tensor shape information for the layer (e.g. `[128, 3, 3, 128]`), if available. |
| Suggestion | Context-aware optimization hint (such as depthwise separable convolution, low-rank factorization). |

The report lists only layers that exceed certain thresholds, such as large `CONV_2D` layers with floating-point weights. For these layers, suggestions are generated dynamically. For example, a convolution layer with 576 KB of parameters might receive a recommendation to use depthwise separable convolution or low-rank factorization to reduce memory usage on constrained hardware.

!!! example "Sample output"
    ```sh
    |          |                 |     Param Mem |            |              |                      |
    | Layer    | Op Type         |          (KB) |       MACs | Kernel Info  | Suggestion           |
    | -------- | --------------- | ------------- | ---------- | ------------ | ---------------------|
    | 34       | CONV_2D         |        576.50 |    147,456 | [[128, 3, 3, | Consider depthwise   |
    |          |                 |               |            | 128], [128]] | separable            |
    |          |                 |               |            |              | convolution or       |
    |          |                 |               |            |              | low-rank             |
    |          |                 |               |            |              | factorization        |
    | 37       | CONV_2D         |        576.50 |    147,456 | [[128, 3, 3, | Consider depthwise   |
    |          |                 |               |            | 128], [128]] | separable            |
    |          |                 |               |            |              | convolution or       |
    |          |                 |               |            |              | low-rank             |
    |          |                 |               |            |              | factorization        |
    ```

#### Layerwise MAC optimization opportunities

This section highlights layers with very high multiply–accumulate operations (MACs), which often dominate the overall compute cost. The report lists only layers that exceed certain thresholds and provides targeted suggestions for reducing total cycles, latency, and energy usage. For example, large `CONV_2D` layers may be flagged with a recommendation to use depthwise convolution as a more efficient alternative.

!!! example "Sample output"
    ```sh
    |          |                 |     Param Mem |            |              |                      |
    | Layer    | Op Type         |          (KB) |       MACs | Kernel Info  | Suggestion           |
    | -------- | --------------- | ------------- | ---------- | ------------ | -------------------- |
    | 2        | CONV_2D         |         81.19 | 21,233,664 | [[48, 3, 3,  | Replace with         |
    |          |                 |               |            | 48], [48]]   | depthwise            |
    |          |                 |               |            |              | convolution to       |
    |          |                 |               |            |              | reduce MACs          |
    | 5        | CONV_2D         |         81.19 | 21,233,664 | [[48, 3, 3,  | Replace with         |
    |          |                 |               |            | 48], [48]]   | depthwise            |
    |          |                 |               |            |              | convolution to       |
    |          |                 |               |            |              | reduce MACs          |
    ```

## Next steps

Apply the recommended optimizations (such as quantization, pruning, or layer restructuring), then re-run `cfsutil ai profile` to verify improved efficiency and hardware compatibility.
