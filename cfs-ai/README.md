# Overview

The cfs-ai directory contains the python backend functionality for the AI code generation support for CodeFusion Studio. 
Access is via the [cfsutil command line interface](../docs/user-guide/cfsutil/index.md)

cfsutil and the UI will invoke the AI Plugin in [cfs-lib](../packages/cfs-lib/src/ai-tools) which takes care of data model and backend lookup and then calls the
appropriate python module to do the processing. 

## Setup
This project is using [uv](https://docs.astral.sh/uv/) to manage its python environment. As such to get started you should install `uv` for you development environment. 
To setup the environment with the correct python version, runtime dependencies and development dependencies you should run the following commands in the repository root.

```bash
uv python install # Will install the correct python version from the .python-version file
uv sync --locked --all-extras --dev # Installs the dependencies
```

## Project Structure
The application is structured as [uv workspaces](https://docs.astral.sh/uv/concepts/projects/workspaces/) with several interdependent packages, with the following layout

| Directory | Purpose                                                                                |
| --------- | -------------------------------------------------------------------------------------- |
| backends  | Backend definition files (JSON) which describe part support and backend configuration. |
| cli       | cfsai.exe wrapper for backwards compatibility.                                         |
| examples  | Basic example of CLI usage.                                                            |
| packages  | The python modules providing the functionality.                                        |
| platforms | Platform specific files, such as libraries.                                            |
| scripts   | Scripts that are useful for development and building.                                  |
| src/cfsai | Stub python files for top level module.                                                |
| tests     | Pytest test cases and associated data.                                                 |

## The Modules
The packages directory consists of the following modules:

| Module                       | Purpose                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| cfsai-backend-izer           | Code generation for the MAX78002 CNN using the 'ai8x-izer' tool. | 
| cfsai-backend-tflm           | Code generation for the tflite-micro library.                    |
| cfsai-compatibility-analyzer | Model compatibility static analysis tool.                        |
| cfsai-model-parser           | Model parser tool used by the static analysis tools.             |
| cfsai-resource-profiler      | Model resource profiler static analysis tool.                    |
| cfsai-tflite                 | Tflite parsing utility used by the tflm generation.              |
| cfsai-types                  | Types and logging used by the other modules.                     |


## Invoking the modules

The front-end logic, such as validation and part support is done via the [cfsutil ai](../docs/user-guide/cfsutil/ai/index.md) command, so this should be used 
where possible. They can be invoked directly using `uv` for development and validation purposes.  

All of the directly invoked tools produce console output in JSON format only. The Resource Profiling report can be written in text format to a file.  

### Code generation modules
The code generation modules `cfsai-backend-izer` and `cfsai-backend-tflm` take a single JSON input file which is a serialized version of the 
[VerifiedBackendConfig](./packages/cfsai-types/src/cfsai_types/config/verified.py) structure which provides all of the model configuration information required. 

!!! note
    Model files have been cached by cfsutil so the paths provided in the JSON file point to the cache. Any remote http URLs must be cached before invoking these tools directly. 


```bash
uv run python -m cfsai_backend_izer --file tests/data/json/izer.max78002.cm4.cnn.json

uv run python -m cfsai_backend_tflm --file tests/data/json/tflm.max78002.cm4.json
```

### Static analysis tools
The static analysis tools `cfsai-compatibility-analyzer` and `cfsai-resource-profiler` take a JSON input file which is a serialized version of the 
[HardwareProfile](./packages/cfsai-types/src/cfsai_types/hardware_profile.py) structure that defines the hardware to be analyzed. 

They also accept the following flags:

| Flag        | Required | Purpose                                                            |
| ----------- | -------- | ------------------------------------------------------------------ |
| --model     | Yes      | Path to the model file.                                            |
| --dataset   | No       | Path to the binary dataset file (Compatibility Analyzer only).      |
| --json-file | No       | Path to the output report in JSON format.                          |
| --text-file | No       | Path to the output report in Text format (Resource Profiler only). |

!!! note
    Model files have been cached by cfsutil so the paths provided in the JSON file point to the cache. Any httpx files must be cached before invoking directly. 

```bash
uv run python -m cfsai_compatibility_analyzer --file tests/data/json/compat.max78002.cm4.json --model examples/hello_world_f32.tflite --json-file compat.max78002.cm4.json

uv run python -m cfsai_resource_profiler --file tests/data/json/profile.max78002.cm4.json --model examples/hello_world_f32.tflite --json-file profile.max78002.cm4.json
```

## Testing and validation
If making any changes to the code, the following commands can be run to perform validation

### Testing
```bash
uv run pytest
```

### Linting
```bash
uv run mypy
uv run ruff check --fix
```

A bash script `scripts/pre_commit_check.sh` has been provided for ease of use. 

## Building the released package
A packaging script, `scripts/package.py` is used to perform the build. 

The normal output is a tar.xz file in the `dist` directory, with the uncompressed tool in `dist/workspace`.

It takes the following flags:

| Flag       | Purpose                                                 |
| ---------- | ------------------------------------------------------- |
| --package  | Name of the package to build: `cfsai`                   |
| --no-tar   | Don't create tar.xz file. Faster for local development. |
| --verbose  | Verbose output.                                         |


```bash
uv run python scripts/package.py --package cfsai
```
