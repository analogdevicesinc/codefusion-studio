---
description: "Understanding the Resource Profiling report"
author: "Analog Devices"
date: "2025-09-29"
---

# Resource Profiling report

The Resource Profiling report provides resource and performance estimates for your model on the target hardware. It is organized into five categories:

- Model summary — Basic details about the model file and its size.
- Memory analysis — Peak RAM usage, utilization, and whether it fits in the target hardware. Includes optional memory issues and recommendations.
- Hardware metrics — Overall compute, latency, power, and acceleration metrics.
- Layer performance — Detailed cycles, energy, and memory usage for each layer, highlighting bottlenecks.
- Optimization opportunities — Suggested strategies such as quantization, pruning, and layer-level alternatives for large or compute-heavy layers.

!!! tip
    You can generate this report with the [`cfsai compat`](../ai-tools/cli/cfsai-report.md) command, or from the System Planner UI in [Embedded AI Tools](../tools/config-tool/manage-ai-models.md).

## Model summary

The model summary provides a high-level overview of the analyzed model before detailed profiling.

| Field       | Description                                                    |
|-------------|----------------------------------------------------------------|
| Model name  | Filename of the model under test.                              |
| Model path  | Full path to the model file on disk.                           |
| Framework   | ML framework type. Currently always `TensorFlow Lite`.         |
| Model size  | On-disk model size in KB, derived from parameter memory usage. |
| Data type   | Numerical precision defined in the model file.                 |
| Layer count | Total number of layers parsed from the model.                  |

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

## Memory analysis

The memory analysis shows how much RAM the model requires at runtime and compares it to the available RAM defined in the target hardware profile.

| Field             | Description                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------------|
| Peak RAM Required | Maximum RAM usage observed during model execution.                                                      |
| RAM Status        | Indicates whether RAM usage fits the target hardware constraints.                                       |
| Available RAM     | Total RAM available on the target hardware, from the hardware profile.                                  |
| RAM Utilization   | Percentage of available RAM consumed by peak usage. Formula: (Peak RAM Required ÷ Available RAM) × 100. |

In the example below, the model requires 576 KB of RAM at runtime, which fits comfortably within the target hardware’s 1 MB RAM. This corresponds to 56.2% utilization, so the RAM status is marked as OK.

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

### Memory issues

Lists the critical problems identified. This section appears only if the profiler detects over-usage or excessive utilization. For example, model peak RAM exceeds target RAM.

!!! example "Sample output"
    ```sh
    Memory Issues:
        • Peak RAM usage (5880.0 KB) exceeds available RAM (1024.0 KB)
    ```

### Memory recommendations

Provides recommendations tailored to the model and target hardware. The set of recommendations varies depending on the severity level, model architecture, computational complexity and memory usage patterns.

!!! example "Sample output"
    ```sh
    Memory Recommendations:
        • URGENT: Model requires 4856 KB (474%) more RAM than available
        • Evaluate quantization potential with representative dataset
    ```

## Hardware performance

This section estimates how the model performs on the target hardware. Metrics are aggregated from per-layer analysis and the hardware profile.

| Field              | Description                                                                                  |
|--------------------|----------------------------------------------------------------------------------------------|
| Total cycles       | Total number of compute cycles required for full model execution.                            |
| Estimated latency  | End-to-end inference time in milliseconds, derived from cycles and max CPU clock frequency.  |
| Estimated power    | Power consumption estimate, based on energy per MAC operation from the hardware profile.     |
| Peak memory        | Maximum RAM required during inference.                                                       |
| Accelerated layers | Number of layers executed using hardware accelerators (such as DSP, NPU).                    |
| CPU-only layers    | Number of layers that must run on the CPU because no hardware acceleration is available.     |

For example, in the sample output below, the model runs in about 1.8 seconds (1802.62 ms), requires 576 KB of RAM at peak, and executes 37 layers on accelerators with 17 layers falling back to the CPU.

!!! example "Sample output"
    ```sh
    === HARDWARE PERFORMANCE ===
    | Metric               | Value                               |
    | -------------------- | ------------------------------------|
    | Total Cycles         | 180,261,962                         |
    | Estimated Latency    | 1802.62 ms                          |
    | Estimated Power      | 25.00 mW (0.0250 W)                 |
    | Peak Memory          | 576.00 KB                           |
    | Accelerated Layers   | 37                                  |
    | CPU-Only Layers      | 17                                  |
    ```

## Per-layer performance

This section provides a detailed breakdown of compute and memory requirements for each model layer. It helps identify which specific layers are the performance bottlenecks.

| Field    | Description                                                                        |
| -------- | ---------------------------------------------------------------------------------- |
| Layer    | Index of the layer in the model (e.g. `0`, `1`, `2`). Matches the parser output.   |
| Operator | Operator type used in this layer (e.g. `CONV_2D`, `ADD`, `SOFTMAX`).               |
| Cycles   | Total compute cycles required to execute the layer.                                |
| Latency  | Estimated runtime of the layer in milliseconds.                                    |
| Energy   | Estimated energy consumption of the layer in microjoules (µJ).                     |
| Power    | Average power draw while executing the layer.                                      |
| MACs     | Number of Multiply-Accumulate operations performed by the layer.                   |
| Memory   | Memory footprint of the layer in KB (if available).                                |
| Accel    | Whether the layer is executed on hardware acceleration (`Yes`) or CPU only (`No`). |

For example, in the sample output below, layer 2 (`CONV_2D`) has far higher cycles and latency than the others, making it the main performance bottleneck.

!!! example "Sample output"
    ```sh
    === PER-LAYER PERFORMANCE ===
    | Layer    | Operator        |     Cycles | Latency (ms) | Energy (uJ) |  Power (mW) |       MACs |  Memory (KB) | Accel  |
    | -------- | --------------- | ---------- | ------------ | ----------- | ----------- | ---------- | ------------ | ------ |
    | 0        | CONV_2D         |    442,368 |       4.4237 |      110.59 |       25.00 |    442,368 |         1.75 |  Yes   |
    | (CONV_2… |                 |            |              |             |             |            |              |        |
    | 1        | CONV_2D         |  7,077,888 |      70.7789 |     1769.47 |       25.00 |  7,077,888 |        27.19 |  Yes   |
    | (CONV_2… |                 |            |              |             |             |            |              |        |
    | 2        | CONV_2D         | 21,233,664 |     212.3366 |     5308.42 |       25.00 | 21,233,664 |        81.19 |  Yes   |
    | (CONV_2… |                 |            |              |             |             |            |              |        |
    | 3        | CONV_2D         |    786,432 |       7.8643 |      196.61 |       25.00 |    786,432 |         3.19 |  Yes   |
    | (CONV_2… |                 |            |              |             |             |            |              |        |
    | 4 (ADD)  | ADD             |     49,152 |       0.4915 |       12.29 |       25.00 |     49,152 |            - |   No   |
    | 5        | CONV_2D         | 21,233,664 |     212.3366 |     5308.42 |       25.00 | 21,233,664 |        81.19 |  Yes   |
    | (CONV_2… |                 |            |              |             |             |            |              |        |
    ```

## Optimization opportunities

This Optimization Opportunities section is a summary table that pulls together the “big picture” numbers and ties them to specific optimization strategies.

| Field                  | Description                                                                                                                                  |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| Total parameter memory | Size of all model parameters (weights) in KB, as parsed from the model.                                                                      |
| Total MACs             | Multiply–accumulate operations required to run the model. Higher values indicate more compute demand.                                        |
| Suggestions            | Optimization strategies tailored to the model and target hardware (including quantization, pruning, MAC-specific, or architecture-specific). |

For example, the table below shows only the first two baseline metrics. These values serve as reference numbers. When your output also includes optimization suggestions (such as quantization or pruning), those are the actionable insights to prioritize.

!!! example "Sample output"
    ```sh
    === OPTIMIZATION OPPORTUNITIES ===
    | Metric                    | Value                          |
    | ------------------------- | ------------------------------ |
    | Total Parameter Memory    | 5787.48 KB                     |
    | Total MACs                | 180,261,962                    |
    | Quantization Suggestion   | Apply INT8 quantization:       |
    |                           | 5787.48 KB → 1446.87 KB (~75%  |
    |                           | reduction). Use                |
    |                           | tf.lite.Optimize.DEFAULT       |
    |                           | during conversion.             |
    | Pruning Suggestion        | Apply structured pruning:      |
    |                           | 5787.48 KB model can achieve   |
    |                           | 50-90% size reduction. Start   |
    |                           | with magnitude-based pruning.  |
    ```

### Layerwise memory optimization opportunities

This section highlights individual layers with high parameter memory (weights), which are the most likely to benefit from targeted optimizations.

| Field            | Description                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Layer index      | Index of the layer in the model (e.g. `34`).                                                    |
| Operation type   | Operator type, usually `CONV_2D`, comes from the model.                                         |
| Parameter memory | Estimated parameter memory footprint of the layer (in KB), if applicable.                       |
| MACs             | Number of multiply–accumulate operations for this layer.                                        |
| Kernel info      | Kernel tensor shape information for the layer (e.g. `[128, 3, 3, 128]`), if available.          |
| Suggestion       | Context-aware optimization hint (such as depthwise separable convolution, low-rank factorization). |

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
    | 38       | CONV_2D         |        576.50 |    147,456 | [[128, 3, 3, | Consider depthwise   |
    |          |                 |               |            | 128], [128]] | separable            |
    |          |                 |               |            |              | convolution or       |
    |          |                 |               |            |              | low-rank             |
    |          |                 |               |            |              | factorization        |
    | 41       | CONV_2D         |        576.50 |    147,456 | [[128, 3, 3, | Consider depthwise   |
    |          |                 |               |            | 128], [128]] | separable            |
    |          |                 |               |            |              | convolution or       |
    |          |                 |               |            |              | low-rank             |
    |          |                 |               |            |              | factorization        |
    | 42       | CONV_2D         |        576.50 |    147,456 | [[128, 3, 3, | Consider depthwise   |
    |          |                 |               |            | 128], [128]] | separable            |
    |          |                 |               |            |              | convolution or       |
    |          |                 |               |            |              | low-rank             |
    |          |                 |               |            |              | factorization        |
    ```

### Layerwise MAC optimization opportunities

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
    | 6        | CONV_2D         |         81.19 | 21,233,664 | [[48, 3, 3,  | Replace with         |
    |          |                 |               |            | 48], [48]]   | depthwise            |
    |          |                 |               |            |              | convolution to       |
    |          |                 |               |            |              | reduce MACs          |
    | 9        | CONV_2D         |         81.19 | 21,233,664 | [[48, 3, 3,  | Replace with         |
    |          |                 |               |            | 48], [48]]   | depthwise            |
    |          |                 |               |            |              | convolution to       |
    |          |                 |               |            |              | reduce MACs          |
    | 10       | CONV_2D         |         81.19 | 21,233,664 | [[48, 3, 3,  | Replace with         |
    |          |                 |               |            | 48], [48]]   | depthwise            |
    |          |                 |               |            |              | convolution to       |
    |          |                 |               |            |              | reduce MACs          |
    ```

## Next steps

Apply quantization, pruning, or restructure heavy layers (as advised in the report), then re-run the model to confirm improved efficiency and compatibility with your hardware.
