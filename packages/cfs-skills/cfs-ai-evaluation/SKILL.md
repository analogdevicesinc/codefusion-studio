---
name: cfs-ai-evaluation
description: Run a deterministic AI model evaluation on Analog Devices hardware with CodeFusion Studio 2.4.0 or later, and return a structured evidence bundle. Use for evaluating a model from ADI Model Zoo or a supplied file on a real board, covering compatibility, resource estimates, workspace creation, build, flash and inference, with Zephelin traces when the current target supports them. Produces evidence, not analysis; invoke cfs-ai-report afterwards only when the user asks for an engineering report, interpretation, bottlenecks or optimization advice. Do not use for general AI questions, LLM evaluation, training, workspace-only onboarding or CFS versions below 2.4.0.
---

# CFS AI Model Evaluation

Execute one reproducible evaluation for one model, core, backend and physical board,
then emit a structured evidence bundle and stop.

This skill **establishes facts**. It does not interpret them. Every decision in the
normal path is derived from CFS's own output or from a `.cfs/*` metadata file, so a
successful run needs almost no reasoning: validate inputs once, resolve the plan once,
run one command, hand the user the early estimate as soon as it lands, then report the
measured outcome when the run completes.

| Path | Use |
| --- | --- |
| `scripts/run_evaluation.py` | **The whole workflow.** One invocation, one JSON record. |
| `scripts/build_bundle.py` | Evidence directory → bundle. Runs standalone on an older evidence directory. |
| `scripts/prebuild_gate.py` | Called by the runner. Standalone for a Zephyr inventory (`--list-zephyr`). |
| `scripts/analyze_tef.py` | Called by the runner. Standalone to re-analyse a trace with `--warmup N`. |
| `scripts/analyze_text.py` | Called by the runner for an ordinary, non-Zephelin TFLM workspace. Extracts smoke-level runtime facts from UART text. |
| `scripts/check_build_timing.py` | Called by the runner. Standalone to audit a build's wall time. |
| `references/evidence-output.md` | Read after completion for the stable result tables and artifact layout. |
| `references/known-issues.md` | Read **only** when a phase fails or a caveat needs explaining. |
| `references/e2e-route.md` | Read **only** to repeat a proven tuple with `ai e2e`. |
| `references/vscode-and-usb.md` | Read **only** for the VS Code UI or native-USB routes. |
| `references/speed-optimization.md` | Read when testing a speed-optimized Zephyr build against a baseline. |

## 1. Select the requested output

Infer the mode from the request:

- **A — evidence only** (default): evaluate, measure, capture, or get data.
- **B — engineering report**: analyse, report, explain, compare, or recommend.

Mode B runs `cfs-ai-report` after evaluation. Mode A returns measured facts and
offers analysis once (§7). For an ambiguous unattended request, use A.

## 2. Setup and required inputs

`cfsutil` is usually not on `PATH`:

```sh
export PATH="$HOME/analog/cfs/<CFS_VERSION>/Utils/cfsutil/bin:$PATH"   # macOS/Linux
$env:PATH = "C:\analog\cfs\<CFS_VERSION>\Utils\cfsutil\bin;$env:PATH"  # Windows
```

The runner finds `cfsutil` itself via `$CFSUTIL`, `PATH`, then `~/analog/cfs/*/Utils`.
Requires 2.4.0 or later; it records the build string. Never fall back to 2.3.

**For `cfsutil` flag syntax, consult the `cfs-cli` skill.** It is the maintained
reference for every topic and flag. Do not run `--help` sweeps on a normal path —
flags are fixed for a given build, so rediscovering them costs a round-trip per
command and establishes nothing.

Keep preflight bounded: locate the installed runner and CFS executable, resolve the
requested inputs and hardware identity, then invoke the runner. It owns catalog
selection, package resolution, compatibility, generation and pre-build gates. Do not
repeat those commands, recursively search installations or repositories, inspect
historical debugger fixes, or diagnose a phase before it fails. Consult only the
specific CLI reference needed for an unresolved input.

If the request is to analyse saved results, go directly to the named manifest and
`cfs-ai-report`. A fresh evaluation request requires a fresh evidence directory;
never substitute a previous successful bundle for a new run.

Resolve before running: model and sample data; SoC and board; probe; serial port;
evidence destination. Everything else — package, project folder, template, flash task
name, capture format, expected inference count, capture window — is derived by the
runner. Do not pre-compute them.

### Discover AI-enabled targets and their workflow

When the user has not selected a target, query the installed capabilities once:

```sh
python3 scripts/run_evaluation.py --list-ai-targets
```

This reads `socs list --verbose` and its `AICores` metadata. Never maintain a list of
supported chip names in this skill. For the selected SoC, the runner queries
`socs info --boards --packages --cores` once, validates the board/package, and checks
the core's `aiCompatible` flag. If exactly one core is AI-enabled, `--core` is
optional. Explicit core choices must match an AI-enabled catalog entry.

AI capability, model compatibility and an executable profiling workflow are separate
checks. The current plugin catalog determines eligible templates for the selected
SoC/board/package/core; the generated project's `AIModels`, backend and build metadata
determine execution. Do not infer a profiler, accelerator, transport, clock, memory
size or toolchain from a chip name or a Model Zoo tag. If no compatible runtime route
exists, preserve static evidence and report the missing capability; do not substitute
another target or claim hardware success. The runner currently handles Zephelin traces
and the stock TFLM text harness; a different harness needs its own validated evidence
contract before it can be reported as a completed hardware evaluation.

Resolve an ambiguous target core from the requested workflow:

- If the selected workflow/workspace plugin fixes the model's core, use that choice
  and state it to the user. Check the generated project's `CoreId` and `AIModels`
  assignment; do not infer the target from a folder name or project order.
- If multiple eligible cores remain and the workflow does not fix the choice, ask
  the user which core should run the model. Reuse an explicit choice already given.
- If only one eligible core remains, use it and tell the user which core was selected.

Pass an explicitly resolved core as `--core`. If a user's requested core conflicts with the
workflow/plugin, explain the incompatibility and resolve it before execution; do not
silently substitute another core. For a multi-project workflow, verify in advance
that the execution route selects the project assigned to that core and model. See
`references/e2e-route.md` for E2E's current project-selection limitation.

For hardware evaluation, connect and power the physical board **before starting**.
Confirm that the selected probe and serial port belong to that board, and close any
serial monitor holding the port. If no board is connected, offer `--stop-after static`
or `--stop-after build`; do not start a flash/capture run and discover this after building.

### Picking a Model Zoo model

**There is no `cfsutil ai zoo` subcommand.** The zoo is a git-hosted catalog
(`model_index.json`), and the runner reads it directly. To see what is available:

```sh
python3 scripts/run_evaluation.py --list-zoo-models
```

That prints every model with its quantizations and tagged platforms, and needs no
other argument. Use the `MODEL` string verbatim as `--zoo-model`. Do not browse
GitHub, curl the catalog by hand, or read the runner's source to find these — and do
not guess a `cfsutil` subcommand for it.

A target **absent** from a model's tagged platforms is still worth evaluating:
`ai compat` and `ai profile` run a real check against that SoC's own model, and the
run records `target_is_tagged: false`. Report the tag as recorded; never present an
off-tag pairing as unsupported, nor silently as supported.

## 3. Run it

```sh
python3 scripts/run_evaluation.py \
  --soc "$SOC" --board "$BOARD" --core "$CORE" \
  --zoo-model "DS-CNN Small" --zoo-quant int8 \
  --evidence "$EVIDENCE" \
  --workspace-parent "$OUT_PARENT" --name model_eval \
  --probe "$PROBE" --port "$PORT" \
  --tile 64
```

Use `--model <path|url> --dataset <path|url>` instead of `--zoo-*` for a supplied
model. Useful options:

- `--tile N` — guarantee the dataset drives at least N inferences. Model Zoo sample
  binaries are frequently a *single* sample, which makes mean/min/max, percentiles and
  warm-up separation impossible. Without tiling you get n=1.
- `--arena-size BYTES` — override the auto-estimated tensor arena.
- `--elf PATH` — select the built firmware ELF when a project produces multiple
  candidates and generated CFS project settings do not identify one.
- `--stop-after static|build|capture` — honour a requested stopping point.
- `--workspace DIR` — reuse an existing workspace, skipping creation and letting
  CMake's incremental build skip recompilation. Valid **only** if its model hash,
  target, backend, template and `cfsutil` version all still match the request;
  otherwise the evidence is invalid.
- `--reuse-from DIR` — copy static reports from a prior evidence directory when the
  model and dataset hashes, target and `cfsutil` version match and both reports exist.
- `--runtime-mode auto|zephelin|text` — `auto` is the default. It preserves the
  Zephelin route when a compatible aiprof template is present in the current plugin
  catalog. Otherwise it selects the ordinary `com.analog.zephyr.workspace.tflm`
  AI-enabled template directly. `zephelin` requires the full profiler path; `text`
  selects the smoke path directly.
- `--capture-margin X` — multiplier on the static estimate (default 2.5).
- `--list-zoo-models` — print the catalog and exit (§2).
- `--list-ai-targets` — list installed SoCs and their catalog-declared AI cores (§2).
- `--quiet` — suppress the stderr narration. Use only for an unattended run; a user
  watching a multi-minute build wants the narration.

Additional options:

- `--package ID` — explicit silicon package. By default the runner resolves the
  requested board's package from `socs info`; ambiguous boards require this flag.
  The runner rejects a package that disagrees with the board or workspace.
- `--catalog URL` — alternate Model Zoo catalog base URL (containing `model_index.json`).
- `--zephyr-board NAME` — Zephyr board directory for the pre-build gate when automatic
  discovery cannot identify it; this does not change the CFS `--board` target.
- `--settle-seconds N` — capture-window allowance for startup/settling (default 8 seconds).
- `--warmup N` — exclude the first N inferences from latency statistics (default 0).
- `--no-caffeinate` — disable macOS sleep prevention; keep the host awake yourself.
- `--pin-package NAME=VERSION` — repin a workspace dependency before the gate;
  repeat for each package. Keep Zephyr and its toolchain compatible (see §5).
- `--install-pinned` — install the versions supplied with `--pin-package`.
  Installing packages requires permission; a manifest pin alone does not change
  the installed version used by the build.

For a controlled speed-optimization experiment, follow
`references/speed-optimization.md`: edit the existing workspace's `prj.conf`, rerun
with `--workspace`, and verify the effective build configuration.

**Do not pipe the runner through `tail`, `head` or `grep`.** It narrates each phase on
stderr and prints the JSON record on stdout; truncating either stream throws away the
progress the user is waiting on, and can hide the phase that failed. Redirect, never
pipe.

Launch **one** runner using the agent's native background execution/session facility.
Keep its session ID, preserve its exit code, and use that facility's wait/resume call
until it completes. Do not assume a shell `timeout` utility is installed, wrap the
command in a shell that masks its exit code, or launch a second evaluation because
a tool call yielded before completion.

While it runs, read `static_verdict.json` once it appears and relay its `brief`
as an estimated, non-blocking progress update. If the run ends first, read its
`failed_phase`. Use bounded native waits and the runner's own narration for later
updates; no extra watcher process, repeated directory searches, or duplicate runner.
For unattended execution, a single blocking call is sufficient.

### 3a. The early estimate — brief, and never a gate

`ai compat` and `ai profile` provide advisory estimates. Relay only the
`static_status` and `brief`, explicitly labelled estimated, plus a sentence that
execution continues. Do not turn them into a table, interpret a bottleneck, or ask
whether to continue. `NOT_OK` lists model issues and is still advisory; a command
that exits nonzero fails the static phase and enters §5.

An explicit hardware evaluation request authorizes build, flash and capture on the
selected board. **Say once that flashing replaces the board's firmware, resolve
*which* physical board, then proceed** — do not re-request authorization already
given. A debugger type or port name alone does not disambiguate multiple attached
boards; match the probe serial to the port. Use the catalog's board identifier and
record the physical board's silkscreen revision separately.

Preserve existing workspaces and original inputs. Use a unique workspace name. Keep
original inputs outside the output parent — template creation replaces assets
recursively. Do not install missing packages or upload artifacts without permission.

### 3b. Ordinary TFLM fallback when Zephelin is unavailable

The `.tflm` template is sufficient for a limited end-to-end execution. In `auto`
mode, the runner inventories the current plugin catalog first. It prefers a compatible
aiprof template and uses Zephelin when one is available. When none is available, it
creates the ordinary AI-enabled TFLM workspace directly, replaces the enabled model,
regenerates sources, builds, captures UART text while flashing, and checks for
the unique firmware run marker, ordered `Test 0` through `Test 3`, then `Done` in
one harness invocation. It stamps only a run marker into the stock harness; inputs
and inference logic are unchanged. The marker changes the image on each run, so
workspace reuse still recompiles the small harness source. Capture starts before
flash, waits for UART readiness, and stops as soon as the complete current run arrives.
Its inference timeout starts after flashing; old output cannot satisfy completion.

Treat the current catalog and dependencies as authoritative. A missing profiler
template or Zephelin dependency is a runtime-selection result, not an evaluation
failure or evidence of a regression. Do not use prior-session history to reclassify
it, and do not recommend filing an issue from this condition alone. The completed
text route has status `completed_smoke`.

The template's four hardcoded sine inputs remain unchanged. Do not apply the supplied
dataset, do not interpret the demo's `passed` or `failed` labels for a replacement
model, and do not describe this as an accuracy evaluation. Whole-inference CPU cycles
are reported only on targets whose template emits them. Arena use and successful
inference calls are still valid smoke evidence.

The individual `cfsutil` commands still emit their normal host command telemetry for
workspace creation, model update, generation, AI build, task execution and port
capture. The run record states that distinction. There is no Zephelin profiler
payload, so host telemetry cannot contain profiler accuracy, per-layer timing or
evidence that the user's dataset ran.

Whenever this path is used, show this sentence verbatim:

> Zephelin AI profiler is not available for this workspace, hence AI inference report lacks accuracy data, per-layer timing and user data set is not exercised

## 4. Report the saved result

Read `run_record.json` and `manifest.json` once. For a successful evaluation, use
[the evidence output format](references/evidence-output.md); load it only now.
Both `completed` and `completed_smoke` qualify when capture is complete.
A text smoke result may contain no timing and no `runtime.cfsreport`; report the
available smoke and memory facts, and mark unsupported fields unavailable.
Then follow §7. Do not inspect successful phase logs or repeat analysis.

## 5. The investigation path

Enter it **only** when the record says `failed` or `blocked`. The record names
`failed_phase`, carries that phase's `returncode` and log path, and usually a
`remedy`. Read `references/known-issues.md` then, not before. Earlier phases do not
need re-running — their evidence is already on disk.

| `failed_phase` | What it means |
| --- | --- |
| `resolve` | Bad model/dataset path or URL, or an unknown Model Zoo selection. |
| `static` | `ai compat` or `ai profile` **exited non-zero**. Stop; report the issues. A zero exit whose report merely lists issues is a `NOT_OK` early estimate, not this (§3a). |
| `workspace` | Neither the selected current template nor a generated project folder was usable. Absence of an aiprof template alone is handled by the text route and does not enter this table. |
| `prebuild_gate` | A compatibility gate failed or the gate could not produce a valid result. Nothing was built or flashed. See below. |
| `build` | Firmware build failed. Only now may you run `cfsutil validate dependencies` to annotate it — it returns one result per manifest; read per-package `status`, not each result's `valid`. |
| `flash_capture` | Probe, port or board state. Resolve which board before reflashing. |
| `text_run_marker` | Unsupported text harness layout; no build or flash was attempted. Inspect the selected template. |
| `analyze_text` | Missing current run marker or incomplete ordered four-test sequence. Inspect raw text; do not combine boots or treat the sine demo's pass/fail labels as model accuracy. |
| `build_bundle` | Packaging failed. Correct the packaging issue and rebuild the bundle from saved, validated evidence; do not reflash. |
| `analyze_tef` | No complete inference spans. Most often a too-small arena: the profiling build has no console, so a failed `AllocateTensors()` is **silent**. Re-run with a larger `--arena-size`. |

Two gate conditions and their handling:

Only exit code `0` with `status: pass` permits a build. `status: fail` is reserved
for the compatibility conditions below and may enter their documented fallback or
explicit correction path. A nonzero execution error, `status: error`, missing status, or
malformed JSON blocks before build and is persisted in `gate.json` and
`run_record.json`.

- **Dataset too small for the statistics you intend to report.** Re-run with `--tile N`.
- **The resolved Zephyr lacks `modules/zephelin`** while an aiprof template emits
  `CONFIG_ZPL_*`. In default `auto` mode this selects the ordinary text workflow and
  is not a failure. With explicit `--runtime-mode zephelin`, the gate blocks before
  build. Select a documented Zephelin-bearing version that supports the board, then
  re-run with `--pin-package zephyr=VERSION --install-pinned`. The gate inspects the
  newly installed tree before permitting the build.

Permit **one** targeted retry after diagnosing and correcting a transient failure.
Do not rerun an unchanged failing command. Capture startup failures do not flash;
a forced capture shutdown is a failure even if some text arrived. Preserve partial
artifacts; never flash a stale image after a failure. On resume,
re-check input, configuration, tool and image identity.

## 6. Measurement integrity

The run total uses monotonic elapsed time; CFS time is the union of CFS command
intervals. `text_capture` includes `flash_run`, so do not sum those phase durations.
The final bundle includes these totals and its own bundling duration.

Every duration measures elapsed time on a developer workstation. A host suspend freezes
in-flight compilers and resumes them together, billing the suspend to the phase — this
has inflated a single build by ~10 minutes. The runner scopes a `caffeinate` sleep
assertion to each long command (one held by an earlier phase does not protect a later
one) and runs `check_build_timing.py` against ninja's own log afterwards.

If it reports `timing_sound: false`, the measurement is **void, not slow**. Say so and
re-measure. Never quote it, and never conclude from it that a phase is a bottleneck. A
healthy build has a median target time in tens of milliseconds, a maximum of a few
seconds, and implied parallelism near the host's core count.

A capture window is derived per tuple as `expected_inferences × estimated_latency_ms ×
margin + settle`, then validated: the runner warns when `observed != expected`. Timing
from a truncated capture must not be reported. A validated margin is only valid for the
exact tuple it came from — re-derive it for any other model, SoC, board or probe.

## 7. Hand-off

Use the saved manifest from this run. Require `execution.status` to be `completed`
or `completed_smoke`, plus `runtime.capture_complete: true` (or equal, positive
expected and observed counts). Static-only, build-only, failed and truncated runs
cannot support the hardware report. Explain missing evidence; do not rerun implicitly.

In mode **B**, invoke `cfs-ai-report` immediately with the manifest and the user's
questions or constraints; analysis is already authorized. In mode **A**, offer it
once with a link to the actual manifest. Acceptance such as "yes" or "continue"
uses that bundle without another build, flash or confirmation. Skip the offer for
unattended runs, an explicit data-only request, or after the user declines.

Scope the offer to the evidence: a timing bundle can support performance analysis;
a `completed_smoke` bundle supports smoke completion, memory use, and limitations.
Missing timing in a text harness is a valid limitation, not a report failure. Never promise
per-layer bottlenecks or measured-versus-estimated latency when timing is absent.

Neither a profiler trace nor the stock sine demo establishes accuracy for the user's
model. Accuracy requires a model-appropriate input/output harness and labelled data.
There is no `cfsutil ai report` command; the report skill reads the saved bundle.
