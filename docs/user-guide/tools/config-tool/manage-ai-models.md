---
description: How to use the Embedded AI Tools panel in System Planner
author: Analog Devices
date: "2025-10-22"
---

# Embedded AI Tools

The Embedded AI Tools feature allows you to create model configurations for your project. You can add model files, assign them to cores, define engine-specific settings, and generate deployable C/C++ code. You can also run compatibility and profiling reports to check memory usage, operator support, and performance characteristics.

Use this feature to manage model deployment in multi-core environments, run compatibility and profiling checks, and generate engine-specific code for supported SoCs.

## Before you start

For full compatibility when using this feature, [create a new workspace](../../workspaces/create-new-workspace.md) and select an AI-based template (for example, *Zephyr Single Core TensorFlow AI Model* for MAX32690).
For details on supported processors, see [supported processors and model formats](../../ai-tools/supported-ai-model-formats.md).

## Add a model configuration

1. Click **Add Model**.
  ![Embedded AI Tools tab](./images/embedded-ai-tools-overview-dark.png#only-dark) ![Embedded AI Tools tab](./images/embedded-ai-tools-overview-light.png#only-light)
2. Select a **Target** core. For example, ARM Cortex-M4.
3. Enter a **Model Name**. This name is used to identify the model configuration.
4. Click **Browse** to upload and select a model file, or enter a relative file path or URL.

    !!! note
        For reference on how to train PyTorch models compatible with MAX78002, see the open source [:octicons-link-external-24: ai8x-synthesis repository](https://github.com/analogdevicesinc/ai8x-synthesis).

5. For TFLM models, you can optionally:

    1. Enter a **Memory section for data**. Specify the name of the linker section where model data should be placed (for example, `.data`, `.flash`).

        !!! note
            Match the section specified to the one provided in your linker file, or leave it blank to use the default data section.

    2. Specify a **Symbol for data**. This defines the C variable name used in the generated code for referencing the model.

6. Click **Add** to add the model to the list.

!!! note "Using AI models with non-AI templates"
    If you create a workspace for a [supported processor](../../ai-tools/supported-ai-model-formats.md) and choose a non-AI template (such as *Zephyr Single Core Blinky*), note that the application source file is `main.c`.

    When you add a TensorFlow Lite Micro (TFLM) model using **Add Model**, the generated model files are C++ (`.cpp` and `.hpp`). This can cause compiler warnings or errors if your project uses a C-only source (`main.c`).

    To fix this:

    - Replace `main.c` with `main.cpp` in your project to convert it to C++, or  
    - Add a C++ wrapper source file that exposes a C interface to the model.  

### Field descriptions

| Field                       | Description                                                                                                                 |
|-----------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| **Target**                  | The processing core that will run the model. For example, ARM Cortex-M4.                                                    |
| **Model Name**              | Name used to identify the model configuration.                                                                              |
| **Model File**              | The path or URL of the model file. The path can be absolute or relative to the workspace.                                   |
| **Memory section for data** | (TFLM only). The memory section used to map the model data.                                                                 |
| **Symbol for data**         | (TFLM only). C symbol name used for the model data array. Appears in the generated code.                                    |
| **Compatibility**           | Indicates whether the model can fit and run on the selected target.                                                         |
| **Include toggle**          | Enables or disables file generation for the model. Toggling a model off keeps the configuration but does not generate code. |

!!! note
    Disabling the **Include** toggle does not remove any previously generated files. These will remain in your project unless overwritten by a subsequent generation, or deleted manually.

### Reports: Compatibility and profiling

Indicates whether the model is fully supported on the selected target and provides a link to a profiling report.

- Click **Open Compatibility Report** to view memory constraints, operator issues, and data type compatibility. For details on interpreting the report, see [Compatibility Analyzer Report](../../ai-tools/compat-report.md).
- Click **Open Profiling Report** to view a summary of resource usage and optimization opportunities. For details on interpreting the report, see [Resource Profiling Report](../../ai-tools/profiling-report.md).
!!! important
    These reports are for guidance only and do not prevent code generation.
    Please note that this is an early version of the reporting feature, and it may evolve in future releases. Currently, only TFLM models are supported. CNN accelerator models on MAX78002, which use PyTorch, are not supported by the analysis tools. These options are disabled in the UI when such a model is selected.

## Modify a model configuration

1. Locate the model in the list.
2. Click configure ![Configure](../../tools/config-tool/images/icon-config-dark.png#only-dark) ![Configure](../../tools/config-tool/images/icon-config-light.png#only-light) to open the **Configure Model** sidebar.
3. Apply your changes, then click **Update**.

## Remove a model configuration

When you remove a model configuration, it is deleted from the list and excluded from future code generation. Existing files will not be removed.

To remove a model configuration:

1. Locate the model in the list.
2. Click delete ![Delete](../../tools/config-tool/images/icon-delete-dark.png#only-dark) ![Delete](../../tools/config-tool/images/icon-delete-light.png#only-light).
3. Click **Confirm**.

!!! note
      Deleting a model configuration does not remove any previously generated files. These will remain in your project unless overwritten by a subsequent generation.

## Next steps

Before you generate code, enable the **Include** toggle for each AI model configuration you want to include in the generation.

If the number of AI models per core is restricted (for example, the MAX78002 CNN accelerator supports only one model), the UI automatically deselects excess configurations.

When you are ready, proceed to [Generate Code](../../tools/config-tool/generate-code.md).
