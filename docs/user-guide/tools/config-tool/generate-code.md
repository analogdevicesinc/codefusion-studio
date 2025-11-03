---
description: Generate Code in CFS
author: Analog Devices
date: 2025-04-28
---

# Generate Code

The code generation feature allows you to generate configuration code for your project. This includes generating the necessary source files to configure memory allocation, peripheral settings, pin mappings, clock configurations, and other essential system settings.

![Code generation feature](images/generate-code-dark.png#only-dark)
![Code generation feature](images/generate-code-light.png#only-light)

## Prerequisites

Before generating code:

- Ensure you have resolved any configuration errors, such as pin multiplexing conflicts or clock misconfigurations.
- Review the the **Generate AI Models** option to confirm that the AI model files configured for the core will be generated.
- Be aware that generated files will overwrite any existing versions. Back up any manually modified files if needed.

## Generating code files

1. Select the cores you want to generate code for.
1. Click **Generate**.
1. If you have unsaved changes, you will be prompted to save the CFS configuration file (`.cfsconfig`) before generating code.
1. The generated files are saved to your project or workspace according to the selected plugin's configuration.

## Working with generated code

The generated code files are added to your project automatically, and are detected and built without requiring configuration changes. You also do not need to invoke the generated functions manually, as the start-up code handles this for you.

!!! note
    If your project includes AI model files, regenerating code does not delete any previously generated model files.
    If you no longer want to include an existing model, delete the files manually. The `src/adi_tflm` directory is generated for all TFLM-supported processors, while `src/adi_cnn` is generated only for MAX78002 (for CNN/PyTorch models). You can safely delete these directories before regenerating to ensure a clean output.
