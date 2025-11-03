# CFSAI examples

This readme provides some examples of using the **cfsai** command line utility to
analyze AI Neural Network model files and compile them into C/C++ source files for use in embedded applications.

## Supported AI Model formats

**cfsai** supports TensorFlow Lite for Microcontrollers (TFLM) on a variety of microcontrollers.
It also supports models in the PyTorch format for execution on the MAX78002's CNN accelerator.

## Supported Processors

For a list of supported processors and model formats, see the [User Guide](https://developer.analog.com/docs/codefusion-studio/latest/user-guide/ai-tools/supported-ai-model-formats/).

## Compiling models to C/C++ source

At a minimum, the following is required to compile an AI model into C/C++ source files:

```bash
cfsai build --model <path-to-model> --target <soc>?([<package>]).<core>?(.<accelerator>)
```

Where the target field is made up of the SoC (e.g. MAX32690), an optional package, the core (e.g. CM4) and an optional accelerator.

## Building model collateral 

To build `hello_world_f32.tflite` for the Arm Cortex-M4 on the MAX32690, use:

```bash
cfsai build --model hello_world_f32.tflite --target MAX32690.CM4
```

You will then see the following output, indicating what files have been generated:

```bash
Created file: examples/src/adi_tflm/hello_world_f32.cpp (OK)
Created file: examples/src/adi_tflm/hello_world_f32.hpp (OK)
```

## Running a Compatibility Report on a Model

To check if `hello_world_f32.tflite` is compatible with the Arm Cortex-M4 on the MAX32690, use:

```bash
cfsai compat --model hello_world_f32.tflite --target MAX32690.CM4
```

You will then see the following output, indicating that no issues have been identified:

```bash
Initialized analyzer: CompatibilityAnalyzer
Starting compatibility analysis for: hello_world_f32.tflite
Built tensor type mapping with 19 supported types
Initialized: TFLiteParser
Analysis completed in 5.5ms: 3 layers, 0 operator issues, 0 memory violations, 0
type issues,
Compatibility analysis completed successfully
  Model fully compatible with target hardware platform
  No compatibility issues detected - ready for deployment
```

If compatibility issues are identified, more information can be seen by using the `--json-file filename.json` switch. 


## Running a Performance Analysis on a Model

To generate a performance analysis report for the `hello_world_f32.tflite` running on the Arm Cortex-M4 on the MAX32690, use:

```bash
 cfsai profile --model hello_world_f32.tflite --target MAX32690.CM4
```

You will then see the following output containing some summary information and tables describing the performance and highlighting potential areas of improvement:

```bash
TFLite Resource Profiler initialized
Starting analysis of model: hello_world_f32.tflite
Built tensor type mapping with 19 supported types
Initialized: TFLiteParser
Memory analysis: 0.1 KB peak usage, 0.0% utilization, status: OK
Optimization recommendations available through smart memory analysis and layerwise opportunities
Model analysis completed successfully in 0.02s
====================================================================================================================================================================================
                                                                                                                           RESOURCE PROFILING REPORT
====================================================================================================================================================================================

=== MODEL SUMMARY ===
┏━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Metric               ┃ Value                                    ┃
┡━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Model Name           │ hello_world_f32.tflite                   │
│ Model Path           │ C:\path\to\model                         │
│ Framework            │ TensorFlow Lite                          │
│ Model Size           │ 1.25 KB                                  │
│ Data Type            │ float32                                  │
│ Layer Count          │ 3                                        │
└──────────────────────┴──────────────────────────────────────────┘

=== MEMORY ANALYSIS ===
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Memory Metric             ┃ Value                               ┃
┡━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Peak RAM Required         │ 0.12 KB (0.00 MB)                   │
│ RAM Status                │ OK                                  │
│ Available RAM             │ 1024.00 KB (1.00 MB)                │
│ RAM Utilization           │ 0.0%                                │
└───────────────────────────┴─────────────────────────────────────┘

  Memory Recommendations:
    • High memory variance detected (73.8% of average) - consider tensor lifecycle optimization and memory pooling

=== HARDWARE PERFORMANCE ===
┏━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Metric               ┃ Value                               ┃
┡━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Total Cycles         │ 576                                 │
│ Estimated Latency    │ 0.00 ms                             │
│ Estimated Power      │ 900.00 mW (0.9000 W)                │
│ Peak Memory          │ 0.12 KB                             │
│ Accelerated Layers   │ 0                                   │
│ CPU-Only Layers      │ 3                                   │
└──────────────────────┴─────────────────────────────────────┘

=== PER-LAYER PERFORMANCE ===
┏━━━━━━━━━━┳━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━━━━━┳━━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━┓
┃ Layer    ┃ Operator        ┃     Cycles ┃ Latency (ms) ┃ Energy (uJ) ┃  Power (mW) ┃       MACs ┃  Memory (KB) ┃ Accel  ┃
┡━━━━━━━━━━╇━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━━━━━╇━━━━━━━━━━━━━╇━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━┩
│ 0        │ FULLY_CONNECTED │         32 │       0.0003 │        0.24 │      900.00 │         16 │         0.12 │   No   │
│ 1        │ FULLY_CONNECTED │        512 │       0.0043 │        3.84 │      900.00 │        256 │         1.06 │   No   │
│ 2        │ FULLY_CONNECTED │         32 │       0.0003 │        0.24 │      900.00 │         16 │         0.07 │   No   │
└──────────┴─────────────────┴────────────┴──────────────┴─────────────┴─────────────┴────────────┴──────────────┴────────┘

=== OPTIMIZATION OPPORTUNITIES ===
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Metric                    ┃ Value                          ┃
┡━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Total Parameter Memory    │ 1.25 KB                        │
│ Total MACs                │ 288                            │
└───────────────────────────┴────────────────────────────────┘

  Layerwise Memory Optimization Opportunities:
┏━━━━━━━━━━┳━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━┓
┃          ┃                 ┃     Param Mem ┃            ┃              ┃                      ┃
┃ Layer    ┃ Op Type         ┃          (KB) ┃       MACs ┃ Kernel Info  ┃ Suggestion           ┃
┡━━━━━━━━━━╇━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━╇━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━┩
│ 1        │ FULLY_CONNECTED │          1.06 │        256 │ [[16, 16],   │ Quantize weights and │
│          │                 │               │            │ [16]]        │ consider sparsity    │
│ 0        │ FULLY_CONNECTED │          0.12 │         16 │ [[16, 1],    │ Quantize weights and │
│          │                 │               │            │ [16]]        │ consider sparsity    │
│ 2        │ FULLY_CONNECTED │          0.07 │         16 │ [[1, 16],    │ Quantize weights and │
│          │                 │               │            │ [1]]         │ consider sparsity    │
└──────────┴─────────────────┴───────────────┴────────────┴──────────────┴──────────────────────┘

  Layerwise MAC Optimization Opportunities:
┏━━━━━━━━━━┳━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━┓
┃          ┃                 ┃     Param Mem ┃            ┃              ┃                      ┃
┃ Layer    ┃ Op Type         ┃          (KB) ┃       MACs ┃ Kernel Info  ┃ Suggestion           ┃
┡━━━━━━━━━━╇━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━╇━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━┩
│ 1        │ FULLY_CONNECTED │          1.06 │        256 │ [[16, 16],   │ Use sparse matrices  │
│          │                 │               │            │ [16]]        │ or reduce hidden     │
│          │                 │               │            │              │ dimensions           │
│ 0        │ FULLY_CONNECTED │          0.12 │         16 │ [[16, 1],    │ Use sparse matrices  │
│          │                 │               │            │ [16]]        │ or reduce hidden     │
│          │                 │               │            │              │ dimensions           │
│ 2        │ FULLY_CONNECTED │          0.07 │         16 │ [[1, 16],    │ Use sparse matrices  │
│          │                 │               │            │ [1]]         │ or reduce hidden     │
│          │                 │               │            │              │ dimensions           │
└──────────┴─────────────────┴───────────────┴────────────┴──────────────┴──────────────────────┘

  Optimization Notes: None

=== ANALYSIS NOTES ===
   Analysis started for model: hello_world_f32.tflite
   Model parsed successfully
   Model analysis completed successfully

====================================================================================================================================================================================
```

To generate the report to a file instead of the console, use the `--text-file report.txt` switch, or the `--json-file report.json` to produce the report to a file in json format.


