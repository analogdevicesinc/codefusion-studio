---
name: cfs-workspace-bootstrap
description: Check CodeFusion Studio SDK/environment readiness or create, validate, or build a firmware workspace when the user asks the agent to perform the end-to-end outcome for a SoC or board. Resolve the target, template, development packages, and toolchain; preserve existing projects; report blockers and resolved versions; and never flash hardware. For product guidance or how-to questions, use cfs-docs. For cfsutil syntax or CLI information without a workspace outcome, use cfs-cli.
---

# Workspace Bootstrap & SDK/Environment Ready

Use the installed `cfsutil` commands to take the user only as far as requested:

- **Readiness:** resolve the target and template, then assess dependencies when their manifest is available.
- **Workspace:** create a new workspace or assess an existing one, then validate its dependencies and configuration.
- **First build:** complete the workspace checks and run its normal build task.

Do not replace an existing directory, recreate an existing workspace, flash a board, modify authentication, or repair unrelated build failures. Install or change packages only when the user has authorized it.

## Locate CFSUtil

Resolve one executable before running the workflow and use it in place of `cfsutil` in every command below.

- Use `cfsutil` from `PATH` when available.
- Otherwise, list installed versions under `~/analog/cfs/` on macOS/Linux or `C:\analog\cfs\` on Windows, then apply this selection gate:
  1. Honor a version the user already selected. If the user explicitly requested the latest installed version, select the highest version.
  2. If no installation remains, report that CFS is unavailable and stop with installation as the next action.
  3. If exactly one installation remains, select it automatically.
  4. If several installations remain, identify the latest installed version, present every candidate's version and path, ask which one to use, and stop until the user selects one.
- Treat the latest version as context, not an implicit selection, unless the user requested it. Never select an installation from list order.
- Only after one executable has been selected, resolve its concrete path at `Utils/cfsutil/bin/cfsutil` or `Utils\cfsutil\bin\cfsutil.cmd`, run it with `--version`, and use that same executable throughout. Never use a wildcard or literal version placeholder, and do not modify `PATH`.

If neither `cfsutil` on `PATH` nor an installed CFS executable can be found, report that CFS is unavailable and stop with installation as the next action.

## Resolve the target

Reuse values the user supplied. Report an unavailable command as a blocker instead of inventing a substitute.

1. Run `cfsutil socs info <SOC> --format json` to resolve boards, silicon packages and cores.
2. Run `cfsutil cfsplugins list --soc <SOC> --board <BOARD> --service workspace` to find compatible workspace templates. When the user supplies plugin search paths, append one `--search-path <PATH>` (or `-s <PATH>`) for each path. `--plugin-search-paths` is not a valid `cfsutil` flag. Try `--format json` first. If stdout is empty or is not a JSON response, rerun without that flag and use the current text output.
3. Select automatically only when one value matches. If several boards, packages or templates remain, present the choices and ask the user to select.
   Never infer a target from list order.

Workspace creation requires a compatible workspace plugin and SoC data model. Do not require SDKs, toolchains, or a dependency manifest before creation. Do not inspect plugin installation directories to predict the generated workspace dependencies.

## Create or assess the workspace

For a new workspace, require an output parent and a portable directory name. Refuse to overwrite an existing destination. Run the existing one-step command:

```sh
cfsutil workspace create \
  --soc <SOC> --board <BOARD> --package <PACKAGE> \
  --template-id <TEMPLATE_ID> --template-version <TEMPLATE_VERSION> \
  --output <PARENT> --name <NAME>
```

When the user supplies plugin search paths, append the same repeatable `--search-path <PATH>` (or `-s <PATH>`) arguments to `workspace create`. Do not pass a custom plugin path to discovery without also passing it to creation. Preserve a partially generated workspace if creation fails. For an existing workspace, skip creation and operate on its absolute path.

Immediately after successful creation, or for an existing workspace, run both checks:

```sh
cfsutil validate dependencies --workspace <WORKSPACE> --format json
cfsutil validate config --workspace <WORKSPACE> --format json
```

The CLI discovers the generated dependency manifests: the shared `<WORKSPACE>/.cfs/.cfsdependencies` and the `.cfs/.cfsdependencies` of each project folder directly inside the workspace. With `--format json` it returns an array with one result per manifest; check every result. Keep the command findings intact. Missing or incompatible development packages and configuration errors block environment readiness and the first build; they do not invalidate successful workspace creation. Preserve the generated workspace and report it as created but not ready.

If the user authorized package installation, install from each generated dependency manifest that reported missing packages by passing its path as the positional argument:

```sh
cfsutil pkg install <MANIFEST_PATH>
```

When the user also authorized license acceptance, append the exact, case-sensitive `--acceptLicense` flag. `pkg install` does not accept `--workspace`; never substitute `--accept-license` or `--accept-licenses` for `--acceptLicense`.

```sh
cfsutil pkg install <MANIFEST_PATH> --acceptLicense
```

Then rerun both checks. If workspace creation fails because the selected plugin or data model is unavailable, report creation as blocked.

## Verify the first build

Only build when requested. List the workspace tasks and use the normal task name reported by CFS:

```sh
cfsutil tasks list --workspace <WORKSPACE>
cfsutil tasks run <BUILD_TASK> --workspace <WORKSPACE> --project <PROJECT>
```

Try `--format json`; if it returns no JSON response, rerun the list command without that flag. If several projects exist, ask which project to verify. If several build-like tasks remain for that project, ask which task to run. Run only a build task; never run flash, debug, capture, erase, program or reset tasks. Treat a successful command as the build result; report generated ELF artifacts when they can be identified without deleting or changing existing outputs.

## Report

Return a concise result containing:

- requested endpoint and completion status;
- CFS version, SoC, board, silicon package, template ID/version and project;
- dependency and configuration findings;
- workspace, configuration and build artifact paths that were produced;
- one concrete next action.

Report the highest state reached: resolved, created, ready or built. If the requested next state cannot be reached, report its blocker without discarding an earlier successful state. Do not describe the environment as ready when dependency or configuration checks did not run or pass.
