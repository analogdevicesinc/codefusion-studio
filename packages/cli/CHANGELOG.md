<!-- markdownlint-disable -->

# Release Notes

## 2.4.0

### ✨ New Features

- **`cfsutil telemetry`:** New commands to manage diagnostic and usage telemetry preferences. Enable or disable data sharing, or check the preference and privacy disclosure with `cfsutil telemetry enable`, `cfsutil telemetry disable`, and `cfsutil telemetry status`. The CLI prompts for consent on the first interactive run and doesn't send telemetry in CI or non-interactive environments.
- **`cfsutil validate config`:** New command that validates a CFS workspace or a standalone `.cfsconfig` file against the schema. Supports `--workspace`, `--input`, `--verbose`, and `--format` flags.
- **`cfsutil validate dependencies`:** New command that checks whether packages declared in a CFS dependency manifest are installed at compatible versions. Alias `cfsutil validate deps`. Supports `--workspace`, `--input`, and `--format` flags. Without `--input`, validates the shared workspace manifest and the `.cfs/.cfsdependencies` manifest of each project folder directly inside the workspace; JSON output is an array with one result per manifest.
- **`cfsutil validate config` — pin and peripheral control checks:** The command now also reports `pin-conflict` for incompatible physical-pin assignments, `control-invalid` for persisted pin-control errors, and `control-invalid-value` when an unconditional peripheral control value violates its type, range, or pattern constraints. These checks fail the command (critical) when a data model is available for the SoC; validation falls back to schema-only checks (warning) when it isn't.
- **`cfsutil pkg install` — `--tar` flag:** Install a package from a local tarball using `--tar`, without downloading it from a package server.
- **`cfsutil pkg path`:** New command that retrieves the absolute filesystem path of an installed package by name.
- **Tasks — `dependsOn` support:** Add a `dependsOn` property to a custom task in `cfs.tasks.json` to run one or more other tasks first when you run the task with `cfsutil tasks run`.
- **`cfsutil tasks run` — `--timeout` flag:** Use `--timeout` with `--capture` to stop a serial port capture session automatically after the specified number of seconds, measured from when the task completes successfully. Omit the flag, or set it to `0`, to capture until you stop it manually.
- **Verbose and quiet output:** `cfsutil` commands are moving to consistent `-v`/`--verbose` and `-q`/`--quiet` behavior. For details of the extra output, see the command page.
- **`cfsutil ai workspace create` — `--set` flag:** Set model fields, such as `enabled`, in the new workspace with `--set key=value`. Repeat the flag to set multiple fields.
- **`cfsutil ai e2e`:** New command that runs the full AI model workflow in one step: compatibility check, optional profiling, workspace creation with build, and flash and serial capture on hardware. By default, the command converts captured TEF traces into CodeFusion Studio reports; use `--no-create-reports` to skip.
- **`cfsutil convert`:** New command that converts a TEF profiling trace into a CodeFusion Studio report (`.cfsreport`).
- **CLI flag collisions — short-flag deprecations:** Several command's short flags have been deprecated in favour of
the long-form variant to support future work: `cfsutil pkg list` (`-f` → `--filter`), `cfsutil elf symbols` (`-f` → `--full`), `cfsutil ai workspace create` (`-f` → `--skip-compat`), `cfsutil socs export` (`-v` → `--version`).
- **`cfspkg://` Git protocol:** `west` can clone a package installed with the Package Manager through a `cfspkg://<name>/<version>` URL in `west.yml`.
- **`cfsutil socs export` — `--gzip` removed:** The `--gzip` flag has been removed. Pipe the command's output to an external compression tool if you need a compressed file.

### ⛔ Breaking Changes

- **JSON output envelope:** `cfsutil` commands are moving to a standard `{ok, command, data, warnings, errors}` envelope for `--format json` output. If you have scripts that parse `--format json` output from these commands, update them to read results from `data`. Some commands also changed the shape of their results; see the command page for details.

### 🐞 Bug fixes, Minor Improvements

- **AI model file extension validation:** `cfsutil ai` commands now validate model file extensions against the formats supported by the selected backend and list the supported extensions when an extension isn't supported.
- **`cfsutil ai model add`, `cfsutil ai model update` — paths and URLs stored as provided:** `cfsutil ai model add` stores its model, dataset, and network config flag values in the `.cfsconfig` file as provided. `cfsutil ai model update` does the same for `model`, `dataset`, and `networkconfig` values passed through `--set`. Enter relative paths relative to the workspace root, and run these commands from the workspace root because `cfsutil ai build` resolves relative paths from there.
- **`cfsutil ai model add`, `cfsutil ai model update` — identifier collision detection:** Both commands now reject a model when the normalized C identifier for its `Name` or optional `Symbol` collides case-insensitively with either identifier from another model in the same workspace.

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 2.3.0

### ✨ New Features

- **CLI API key authentication:** `cfsutil` commands now support API key authentication through the `CFS_API_KEY` environment variable for use in CI/CD and automated workflows. New commands `cfsutil myanalog apikey create`, `list`, and `delete` manage keys.

### ⛔ Breaking Changes

- None

### 🐞 Bug fixes, Minor Improvements

- **Build command output:** Build commands display output in a new format. Underlying build behavior is unchanged.
- **`cfsutil ai` commands — optional `--core` flag:** `cfsutil ai build`, `cfsutil ai compat`, and `cfsutil ai profile` no longer require `--core` when the target SoC has only one AI-capable core. The core is inferred automatically. For SoCs with multiple AI-capable cores, `--core` is still required.
- **`cfsutil workspace configure` — optional `--board` flag:** `cfsutil workspace configure` no longer requires `--board` when `--package` is specified. Provide `--board`, `--package`, or both; at least one is required. If you provide only `--board`, the package is inferred from the board.
- **Embedded AI Tools — model name length limit:** AI model names are limited to 64 characters. The `cfsutil ai model add`, `cfsutil ai model update`, and `cfsutil ai build` commands report an error when a name (including one derived from a model file name) exceeds the limit.

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 2.2.1

### ✨ New Features

- None

### 🐞 Bug fixes, Minor Improvements

- None

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 2.2.0

### ✨ New Features

- **CLI-first workspace workflows:** It is now possible to set up a workspace, build, and flash a project entirely from the command line without opening the IDE. New commands include `cfsutil socs list`, `cfsutil socs info`, `cfsutil workspace configure`, `cfsutil workspace create`, `cfsutil tasks list`, and `cfsutil tasks run`.
- **`cfsutil ai` command group:** The `cfsai` command-line tool has been migrated into `cfsutil` as the `cfsutil ai` command group, enabling end-to-end AI model workflows from the command line. Includes `cfsutil ai build`, `cfsutil ai compat`, `cfsutil ai profile`, `cfsutil ai model` (add, list, update, remove models), and `cfsutil ai backends list` (optionally with `--name`). `cfsai` remains available as a compatibility wrapper.
- **`cfsutil pkg install --acceptLicense`:** For packages that require license acceptance, the new `--acceptLicense` flag allows you to accept the license upfront, enabling installation in scripts and CI pipelines without interactive prompts.

### ⛔ Breaking Changes

- **`cfsutil socs` command format changes:** The default output format of `cfsutil socs list` (text and JSON) and the usage of `cfsutil socs export` have changed to support SoC names containing hyphens (e.g., `adsp-21836`). For `socs export`, pass the SoC name as a positional argument and specify the package with `--package` (for example, `cfsutil socs export adsp-21836 --package <package-name>`). Use the `--legacy` flag for `socs list` or the deprecated `-n, --name` flag for `socs export` while migrating. Both legacy options will be removed in a future release.
- **`--json` flag deprecated:** The `--json` flag has been deprecated across all `cfsutil ai`, `cfsutil elf`, and `cfsutil socs` commands. Use `--format json` instead. The `--json` flag continues to work but displays a deprecation warning and will be removed in a future release.

### 🐞 Bug fixes, Minor Improvements

- None

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 2.1.0

### ✨ New Features

- `cfsutil pkg install` now supports semantic version range expressions, including caret (`^`), tilde (`~`), and comparison operators (`>=`, `<=`, `>`, `<`).

### 🐞 Bug fixes, Minor Improvements

- Package Manager authentication handling has been improved. Authentication is now managed using `cfsutil myanalog` and `cfsutil pkg auth-remote`; the commands `cfsutil pkg login`, `cfsutil pkg logout`, and `cfsutil auth` are deprecated.

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 2.0.2

### ✨ New Features

- None

### 🐞 Bug fixes, Minor Improvements

- None

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 2.0.1

### ✨ New Features

- None

### 🐞 Bug fixes, Minor Improvements

- None

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 2.0.0

### ⛔ Breaking Changes

- None

### ✨ New Features

- **`cfsai` command-line utility:** Access Embedded AI Tools capabilities from the terminal, supporting model builds, compatibility reports, and profiling workflows.

### 🐞 Bug fixes, Minor Improvements

- None

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 1.1.0

### ⛔ Breaking Changes

- None

### ✨ New Features

- None

### 🐞 Bug fixes, Minor Improvements

- None

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 1.0.2

### ⛔ Breaking Changes

- None

### ✨ New Features

- None

### 🐞 Bug fixes, Minor Improvements

- None

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None

## 1.0.0

### ⛔ Breaking Changes

- None

### ✨ New Features

- None

### 🐞 Bug fixes, Minor Improvements

- None

### 🚧 Experimental Features

- None

### 👷 CI Improvements

- None
