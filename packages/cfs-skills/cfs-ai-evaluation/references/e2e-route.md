# The `ai e2e` single-command route

Read this only when the SoC/board/core/template/model tuple has **already
completed once on this machine**, **no matching prior workspace remains on
disk** (see §3, "Run it", in SKILL.md — if one does, use the runner's `--workspace` option; E2E
always allocates a fresh output directory and forces a cold build even for a
proven tuple), and you want a single-command repeat. For a first run on any
new tuple, use `scripts/run_evaluation.py` from SKILL.md §3: E2E has no stop-before-flash
option and discards compatibility, static profiling, workspace creation and
source generation when the build fails.

E2E also cannot select a template, set a custom trace filename, or capture
native USB.

It also cannot run the ordinary non-Zephelin TFLM fallback. The monolithic command
always delegates workspace selection to `ai workspace create` and later requires
`.cfs/ai.cfsaiprof`. When Zephelin is unavailable, use `scripts/run_evaluation.py`
with its default `--runtime-mode auto` (or explicit `--runtime-mode text`). The
runner uses `workspace create --template-id com.analog.zephyr.workspace.tflm`, model
update, generation, AI source build, firmware build, a separate UART text capture,
and the flash task to reproduce the useful E2E phases without claiming profiler
evidence.

```sh
cfsutil ai e2e \
  --soc "$SOC" --board "$BOARD" --core "$CORE" \
  --model "$MODEL" --dataset "$DATASET" \
  --output "$OUTPUT_PARENT" --name "$WORKSPACE_NAME" \
  --debugger "$DEBUGGER" --port "$PORT" \
  --run-profiler --timeout "$CAPTURE_SECONDS"
```

Run it from the evidence directory so the default trace files are retained
there.

## Behavior

- `DEBUGGER` is `JLink` or `CMSIS-DAP`.
- Omit `--dataset` when intentionally using synthetic inputs.
- Set `--core` to the user's chosen model core or the core fixed by the selected
  workflow/plugin. If multiple eligible cores remain without a predefined choice,
  ask the user before invoking E2E. The CLI can infer the core when exactly one
  core in the SoC supports AI; it requires `--core` when several support AI.
- `--timeout` defaults to 20 seconds.
- E2E has no JSON output: `--format json` fails with an error before any step
  runs, so always invoke it in text mode. Do not pass `--quiet` when you need the
  capture and report paths, because it hides that output too.

E2E validates `--soc` and `--port` up front and fails immediately if either is
unknown. It then runs, in order: compatibility checking; optional **static**
resource profiling; AI workspace creation / model integration / runtime-source
generation; then the generated flash/run task with its build dependency and
serial capture.

`--run-profiler` requests and generates a static profile estimate — it does not configure
runtime instrumentation.

The execution project must be the one assigned to the selected core and model by
the workspace plugin. Check the generated `.cfs/*.cfsconfig` project's `CoreId`
and `AIModels` assignment. A workflow may fix this choice; otherwise the user's
core selection determines it. Folder ordering is not a core-selection rule.

**Current E2E limitation:** after workspace creation, E2E uses the first existing
project path resolved from the `.cfsconfig` `Projects` array, in configuration order
(`PlatformConfig.ProjectName`, falling back to `ProjectId`). If no paths resolve,
it falls back to the workspace root. This selection does not itself check the core
or model assignment. E2E logs `Found project: <name>` and passes it to `tasks run`,
using the debugger task from `.cfs/ai.cfsaiprof`; it fails if that debugger has no task.

Use E2E only for a proven workflow where this automatic selection matches the
intended model project. E2E has no project override or pause before flashing, so do
not launch it to discover which project it selects. If that mapping is uncertain or
wrong, use explicit CLI steps with `tasks run --project <resolved-model-project>`
(see `cfs-cli`). The evaluation runner also selects a project automatically; switching
to it alone does not resolve this ambiguity.

Retain command output, the static report at `<output>/<name>.cfsreport`, and
the actual emitted trace paths. Compatibility evidence may live in the captured
log rather than a separate report file.

Afterwards apply SKILL.md §6 ("Measurement integrity") to the retained evidence.
Normalize it with `scripts/build_bundle.py --evidence "$EVIDENCE" --workspace
"$WORKSPACE" --project "$PROJECT"`, using the actual generated paths. Check
`manifest.json` for missing fields and capture completeness, then report the available
facts using §4 ("The fast path") and the §7 hand-off. E2E does not produce the runner's
`run_record.json`; never invent it or fill missing evidence with estimates. Use §5
("The investigation path") when evidence is incomplete. Do not rerun creation,
build or flashing merely to populate a report.

## Compatibility failure and the one authorized override

If E2E exits because the compatibility check reports model/target issues,
preserve its output and explain the reported issues and likely consequences.
Offer the user a choice between changing the model/target/input and continuing
with the same tuple despite the compatibility result.

Do not add `--skip-compat` without that explicit choice. If the user chooses to
continue, rerun the exact E2E command once with only `--skip-compat` added,
retain both attempt logs, and record the accepted compatibility override in the
result.

The override waives only the compatibility gate; static profiling, build, flash
and runtime evidence must still pass. Do not use it when the failure was caused
by invalid inputs, missing dependencies, an unavailable tool or an unknown
error.
