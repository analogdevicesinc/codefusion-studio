---
description: Create a workspace from an AI model for deploying and profiling machine learning models on hardware
author: Analog Devices
date: 2026-04-23
# Note: This page is linked from AI Hardware Profiling UI (ModelInstructions.tsx line 198)
---

# Create a workspace from an AI model

The Workspace from AI Model feature streamlines the creation of AI-ready development workspaces pre-configured for deploying and profiling machine learning models on Analog Devices microcontrollers. This workflow is optimized for quickly evaluating model compatibility and performance on target hardware.

## Overview

![Workspace Creation Wizard](./images/new-workspace-from-ai-model-wizard-overview-dark.png#only-dark)
![Workspace Creation Wizard](./images/new-workspace-from-ai-model-wizard-overview-light.png#only-light)

Use this feature when you want to:

- Quickly evaluate an AI model on Analog Devices hardware
- Automatically generate a workspace pre-configured for AI deployment
- Check model compatibility with target processor cores before committing to development
- Profile your model's performance (inference time, memory usage) on actual hardware

This workflow is optimized for ML engineers who want to move from a trained model to hardware evaluation with minimal embedded systems knowledge. The feature automates workspace creation, model integration, and compatibility checking.

For general-purpose development without AI models, use the standard [Create a new workspace](create-new-workspace.md) workflow instead.

## Before you start

Ensure you have the following:

- **AI model file**: A trained model in a supported format (`.tflite` is commonly used for TensorFlow Lite models). For a complete list of supported formats, see [Supported AI model formats](../about/supported-ai-model-formats.md).
- **Sample input data** (optional): Test input data matching your model's input format. Example data files are available in the CodeFusion Studio repository at `cfs-ai/examples/` (for example, `hello_world_f32.bin` for the `hello_world_f32.tflite` model).

## Create a workspace

1. Click the CodeFusion Studio icon ![CodeFusion Studio Icon](../about/images/cfs-icon-dark.png#only-dark) ![CodeFusion Studio Icon](../about/images/cfs-icon-light.png#only-light) in the VS Code activity bar.

2. Click **New Workspace from AI model**.

    ![Workspace Creation Wizard](./images/new-workspace-from-ai-model-wizard-dark.png#only-dark)
    ![Workspace Creation Wizard](./images/new-workspace-from-ai-model-wizard-light.png#only-light)

3. In the **Files** section, configure your model and workspace settings:

    - **Model File** (required): Click **Browse** and select your AI model file (for example, `hello_world_f32.tflite`).
    - **Sample Data** (optional): Click **Browse** to select sample input data for testing. For the hello_world examples, use the corresponding `.bin` file (for example, `hello_world_f32.bin` for `hello_world_f32.tflite`). Example data files are located in the `cfs-ai/examples/` directory of the [:octicons-link-external-24: CodeFusion Studio repository](https://github.com/analogdevicesinc/codefusion-studio).
    - **Workspace Name** (optional): Enter a custom name for your workspace. If left blank, the system generates a name based on your SoC and package selection (for example, `MAX32690-TQFN`).

4. In the **SoCs** section, select your target hardware:

    - Use the search box to filter the list of available System-on-Chip (SoC) options
    - Select the SoC that matches your hardware (for example, **MAX32690**, **MAX78002**, **ADSP-SC5xx**)
    - Compatible SoCs display a **Compatible** badge after model compatibility checking completes

    !!! note
        Only SoCs with AI profiling support appear in this list. The catalog is automatically filtered to show compatible hardware. Compatibility checking runs automatically when you select a model file.

5. After selecting an SoC, select your development board from the **Board** dropdown that appears.

6. In the **Cores** section, select which processor cores should run your AI model:

    - Each core in the SoC is listed with its support status
    - Supported cores show a toggle labeled **Run model on core**
    - Unsupported cores display an **Unsupported** badge and cannot be selected
    - Enable the toggle for each core you want to target (you can select multiple cores)

7. Click **Create Workspace**.

    The system validates your selections, generates the workspace, and automatically opens it in a new VS Code window.

## Field descriptions

| Field | Required | Description |
|-------|----------|-------------|
| Model File | Yes | The AI model to deploy. Supported formats include `.tflite` (TensorFlow Lite), `.pth.tar` (PyTorch), and others. See [Supported AI model formats](../about/supported-ai-model-formats.md). |
| Sample Data | No | Test input data matching your model's input format. Must be a binary file (`.bin`) containing the input tensor data. Example files available in `cfs-ai/examples/` directory (e.g., `hello_world_f32.bin`). |
| Workspace Name | No | Custom name for the workspace directory. If omitted, auto-generates as `{SoC}-{Package}` (e.g., `MAX32690-TQFN`). |
| SoC | Yes | Target microcontroller family. Only SoCs with AI plugin support are shown. Compatible SoCs display a **Compatible** badge after automatic compatibility checking. |
| Board | Yes | Specific development board variant. Available options depend on the selected SoC. |
| Run model on core | No | Toggle for each supported processor core. Enable to target that core for model deployment. |

## Opening the workspace

1. The workspace is generated in your configured workspace location (typically `~/cfs/2.2.1/`)
    - The generated workspace includes a complete AI application that:

        - Loads your model file into memory
        - Runs inferences based on the provided data:
            - If sample data is provided, runs for `(sizeof(dataset)/sizeof(model_input))` iterations
            - If no sample data is provided, runs 10 inferences on random input data
        - Generates profiling information during execution

2. VS Code automatically opens the new workspace
3. A build process starts automatically to compile the AI application
4. The **[AI Hardware Profiling](deploy-and-profile-ai-model.md)** view (`.cfs/ai.cfsaiprof` file) opens

## Next Steps

- [Deploy and profile your AI model](deploy-and-profile-ai-model.md) - Set up hardware connections and run the model on your development board
- [View Compatibility Report](../tools/compat-report.md) - Check detailed compatibility analysis for each processor core
- [View Resource Profiling Report](../tools/profiling-report.md) - Analyze performance metrics and memory usage
