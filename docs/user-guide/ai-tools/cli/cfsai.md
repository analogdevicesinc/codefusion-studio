---
description: Documenting the CFSAI command-line utility for compiling and deploying AI models to embedded targets.
author: Analog Devices
date: 2025-09-29
---

# Accessing CFSAI with the command line

To access `cfsai`, open a new terminal (**View > Terminal** or `Ctrl+``). Then complete the following steps:

1. In the terminal panel, click the dropdown arrow next to the **+** icon.
2. Select **CFS Terminal** from the list.
3. Run your command, for example:

```sh
   cfsutil cfsai --help
```

![Accessing cfsai ](../images/access-cfs-terminal-dark.png#only-dark)
![Accessing cfsai ](../images/access-cfs-terminal-light.png#only-light)

!!! note
    To run `cfsai` from a system terminal outside VS Code:  
    - **Windows:** `<CFS-Install>/Tools/cfsai/bin/cfsai.exe`  
    - **Linux/macOS:** `<CFS-Install>/Tools/cfsai/bin/cfsai`

## Help

You can pass `--help` at any level to view available options:

- `cfsai --help` provides top-level help.
- `cfsai build --help` shows all options for the `build` command.
- `cfsai compat --help` shows all options for the `compat` command.

```sh
cfsai --help
```

## Top level options

The following options are available for all `cfsai` commands.

| Flag / Option | Description                                                                          |
| ------------- | ------------------------------------------------------------------------------------ |
| `--version`   | Show the current CFSAI version.                                                      |
| `--verbose`   | Enable detailed logging of internal steps (for example, datamodel loading, parsing). |
| `--json`      | Format log messages as JSON. Affects console output only, not generated files.               |

`--verbose` and `--json` must be placed before the subcommand.

!!! example
    ```sh
    cfsai --verbose build --model model.tflite --target MAX32690.CM4
    cfsai --version
    ```

## Data model options

CFSAI relies on a `.cfsdatamodels` index file to look up supported SoCs, cores and accelerators. A default data model is bundled with the installation, but users can override it by generating their own data model index file. See the [:octicons-link-external-24: CodeFusion Studio GitHub repository](https://github.com/analogdevicesinc/codefusion-studio/tree/main/packages/cli/development.md) for instructions on generating a data model index file.

Use either `--datamodel-search-path` to point to a directory containing the `.cfsdatamodels` file, or `--datamodel-file` to specify the JSON file directly.

| Flag                            | Description                                                                          |
|---------------------------------|--------------------------------------------------------------------------------------|
| `--datamodel-search-path`, `-s` | Path to a folder that contains a `.cfsdatamodels` file.                              |
| `--datamodel-file`, `-d`        | Path to a specific data model JSON file. Expects a valid schema-compliant JSON file. |

!!! example "Use a directory as the search path"
    ```sh
    cfsai --datamodel-search-path /path/to/codefusion-studio-repo/packages/cfs-data-models/socs list-targets
    ```

!!! example "Specify the index file directly"
    ```sh
    cfsai --datamodel-file /path/to/codefusion-studio-repo/packages/cfs-data-models/socs/max32690-tqfn.json build --model m4/hello_world_f32.tflite --target "MAX32690[TQFN].CM4"
    ```
