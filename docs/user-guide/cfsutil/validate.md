---
description: CFSUtil - Validate
author: Analog Devices
date: 2026-10-09
---

# Validate

The validate commands check CFS configuration files against the schema and report any errors or warnings.

## Validate config

```sh
cfsutil validate config [-w <value>] [-i <value>] [-v | -q] [--format text|json]
```

Validates a CFS workspace or a standalone `.cfsconfig` file against the schema.

!!! note
    `--workspace` and `--input` are mutually exclusive. If neither flag is provided, the current working directory is used as the workspace.

| Flag | Description |
| ------ | ------------- |
| `--format=text\|json` | Output format. `text` (default) prints human-readable results. `json` returns a structured object — see [JSON output](#json-output). |
| `-i, --input=<path>` | Path to a standalone `.cfsconfig` file to validate. |
| `-v, --verbose` | Display additional detail for each diagnostic, where available: the value found and, for enum-style violations, the list of allowed values. Mutually exclusive with `--quiet`. |
| `-q, --quiet` | Suppress non-error output, including warnings. Mutually exclusive with `--verbose`. |
| `-w, --workspace=<path>` | Path to the CFS workspace directory. Defaults to the current directory. |

### Pin and peripheral control checks

In addition to schema validation, `cfsutil validate config` checks a `.cfsconfig` file against the SoC data model when one is available for the target SoC. Use `-s <path>` or `--search-path <path>` to add a data model search path; you can repeat the flag for multiple paths.

- **`pin-conflict`:** Reported when two or more incompatible signals are assigned to the same physical pin.
- **`control-invalid`:** Reported when a pin contains a persisted control error.
- **`control-invalid-value`:** Reported when a persisted value for an unconditional peripheral control doesn't satisfy its type, range, or pattern constraints. Controls with a `Condition`, values with no matching control definition, and peripherals with no controls are skipped.

These diagnostics are `critical` severity and fail the command. If the data model can't be resolved for the target SoC, the command emits a warning and falls back to schema-only validation.

### Text output

- **Pass:** `'<path>' is valid.`
- **Fail:** `Error: Command failed with N errors:` followed by a numbered list of diagnostics. The command exits with a non-zero code.
- Warnings and informational diagnostics are printed grouped by file, regardless of overall validity.

### JSON output

Pass `--format json` to get machine-readable results. The command returns a structured object and still exits with a non-zero code when any file fails validation.

```json
{
  "valid": true,
  "results": [
    {
      "path": "<absolute path>",
      "kind": "cfsconfig",
      "valid": true,
      "diagnostics": []
    }
  ]
}
```

| Field | Description |
| ------- | ------------- |
| `valid` | `true` if all validated files passed; `false` if any file has an error-severity diagnostic. |
| `results` | Array of per-file results. |
| `results[].path` | Absolute path to the validated file. |
| `results[].kind` | File type: `cfsconfig` or `cfsworkspace`. Note: `.cfsworkspace` files are accepted but schema checking is not yet implemented — the result is always `valid: true` with an informational diagnostic. |
| `results[].valid` | `true` if this file has no error-severity diagnostics. |
| `results[].diagnostics` | Array of diagnostic objects for this file. |

!!! example "Validate the workspace in the current directory"
    ```sh
    cfsutil validate config
    ```

!!! example "Validate a specific workspace"
    ```sh
    cfsutil validate config --workspace ./my-workspace
    ```

!!! example "Validate a standalone .cfsconfig file"
    ```sh
    cfsutil validate config --input ./my.cfsconfig
    ```

!!! example "Validate with verbose output"
    ```sh
    cfsutil validate config -w ./my-workspace -v
    ```

!!! example "Validate and return JSON output"
    ```sh
    cfsutil validate config --format json
    ```

## Validate dependencies

```sh
cfsutil validate dependencies [-w <value>] [-i <value>] [--format text|json]
```

Validates that every package declared in CFS dependency manifests is installed at a compatible version. The public alias `cfsutil validate deps` behaves identically.

!!! note
    `--workspace` and `--input` are mutually exclusive. If neither flag is provided, the command searches the current directory and its ancestors for the nearest CFS workspace and validates the shared `.cfs/.cfsdependencies` manifest for that workspace, plus the `.cfs/.cfsdependencies` manifest of each project folder directly inside the workspace. Each manifest is validated and reported separately.

| Flag | Description |
| ------ | ------------- |
| `--format=text\|json` | Output format. `text` (default) prints human-readable results. `json` returns an array of structured results, one per manifest — see [Dependency JSON output](#dependency-json-output). |
| `-i, --input=<path>` | Path to a standalone `.cfsdependencies` manifest to validate. |
| `-w, --workspace=<path>` | Path to the CFS workspace directory. Defaults to the current directory. |

### Dependency text output

- **All requirements satisfied:** `All packages declared in '<manifest>' are installed.` followed by the status of each package.
- **Unmet requirements:** `Unmet package dependencies in '<manifest>':` followed by the status of each package. The command exits with a non-zero code.
- Each package line reports its name, requested version, installed version when available, and status: `installed`, `missing`, `version-mismatch`, or `unsupported`.

### Dependency JSON output

Pass `--format json` to get machine-readable results. The command returns an array with one result per validated manifest and still exits with a non-zero code when any declared package is unmet.

```json
[
  {
    "manifestPath": "<absolute path>",
    "valid": true,
    "packages": [
      {
        "name": "example_pkg",
        "requiredVersion": "^1.0.0",
        "installedVersion": "1.2.0",
        "status": "installed"
      }
    ]
  }
]
```

| Field | Description |
| ------- | ------------- |
| `manifestPath` | Absolute path to the validated manifest. |
| `valid` | `true` if every declared package is installed; `false` if any package is missing, mismatched, or unsupported. |
| `packages` | Array of per-package results, in manifest declaration order. |
| `packages[].name` | Package name. |
| `packages[].requiredVersion` | Version or version range declared in the manifest. |
| `packages[].installedVersion` | Installed version, present only for `installed` and `version-mismatch` results. Always absent for `missing` and `unsupported` results, even if a same-name package happens to be installed locally. |
| `packages[].status` | One of `installed`, `missing`, `version-mismatch`, `unsupported`. |
| `packages[].reasonCode` | Machine-readable reason code, present only when `status` is `unsupported`. |

!!! example "Validate the manifests for the current workspace"
    ```sh
    cfsutil validate dependencies
    ```

!!! example "Validate a specific workspace"
    ```sh
    cfsutil validate dependencies --workspace ./my-workspace
    ```

!!! example "Validate a standalone manifest file"
    ```sh
    cfsutil validate dependencies --input ./workspace/.cfs/.cfsdependencies
    ```

!!! example "Validate using the deps alias"
    ```sh
    cfsutil validate deps
    ```

!!! example "Validate and return JSON output"
    ```sh
    cfsutil validate dependencies --format json
    ```
