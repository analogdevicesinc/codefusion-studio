# Known issues and caveat flags

Read this only when a phase failed, or when a `caveats[]` flag in `manifest.json`
needs explaining. On a successful run none of it is needed.

`manifest.json` carries `caveats[]`: flags the runner emits **deterministically**,
without interpreting them. Each maps to an entry below.

## Caveat flags

| Flag | What it means |
| --- | --- |
| `accuracy_structurally_impossible` | The profiling template disables console output, so the build emits timing spans and no predictions. Not "accuracy wasn't measured" — it cannot be, from this build. |
| `power_unavailable` | `estimated_power_mw` / `power_mw` are emitted as `0`. That is absence of instrumentation, **not** zero consumption. Report as unavailable. |
| `supported_ops_empty` | The report's `info.hardware` has empty `SupportedOps`, `AccelOps` and `SupportedDataTypes`. A compatibility "pass" on this target therefore verified less than it appears. Say so rather than overclaiming it. |
| `arena_estimator_spread` | The linked arena exceeds the trace-measured high-water mark by more than 2x. See below. |
| `report_info_version_stale` | `compat.json` / `.cfsreport` carry an older `info.version` than the install that produced them. Use the recorded `cfsutil --version` instead; never use `info.version` for a reuse test. |
| `arena_use_input_independent` | `arena_used_bytes` was identical across every layer event, so arena use does not vary with input for this model. |
| `debug_build_not_speed_optimized` | `CONFIG_DEBUG=y` and `CONFIG_SPEED_OPTIMIZATIONS` unset. Part of any measured-vs-estimated gap is debug-build overhead, not silicon. |
| `n_below_20_percentiles_withheld` | Fewer than 20 valid inferences, so `analyze_tef.py` withholds percentiles. Tile the dataset for a real population. |
| `incomplete_spans_present` | The trace contains unpaired begin/end events. Investigate before quoting statistics. |
| `linked_size_unavailable` | The runner could not select or inspect the built ELF. Report linked flash and RAM as unavailable and use `build.size_error` for the recorded reason. |
| `text_run_identity_unverified` | A historical text capture has a complete harness sequence but no verified firmware run marker. Its association with the requested flash is unproven; do not present it as a freshly validated run. |
| `text_runtime_smoke` | Four stock harness invocations completed. This establishes smoke execution, not model accuracy or dataset coverage. |
| `zephelin_ai_profiler_unavailable` | The ordinary TFLM path was selected; no Zephelin payload exists. |
| `accuracy_unavailable` / `user_dataset_not_exercised` | The stock sine inputs and pass/fail labels do not evaluate the user's model against its dataset. |
| `per_layer_timing_unavailable` | Text output has no per-layer spans. Whole-inference cycles exist only if the template emits them. |

## Text capture and reporting

The runner owns a separate capture process group and stops the entire group so a
shell launcher cannot leave its Node child holding the UART. Startup failures stop
before flashing. Forced cleanup remains a failure; do not accept exit `-9` merely
because some output exists. Diagnose the phase log before retrying.

New runs stamp a unique marker into the text harness and require that marker plus
ordered tests 0–3 and `Done` in one invocation. Buffered Zephyr boot banners can
arrive after `Done`; their position alone is not a reliable run boundary. Saved
historical captures can be inspected but carry the unverified-identity caveat.

A complete text run can have no cycle summary when its harness emits none. Its `completed_smoke`
manifest supports a smoke and memory report with `reports.runtime: null` and no
`runtime.cfsreport`. Missing timing is a limitation, not a reason to reflash.
For a packaging failure, repair packaging and rebuild the bundle from the validated
capture, preserving its run record and marker; do not repeat the hardware run.

## Arena sizing: three numbers, one truth

Reproduced on two models (DS-CNN int8 and MicroNet AD int8), always in the same
direction:

| Source | DS-CNN int8 | Relationship to truth |
| --- | --- | --- |
| `ai build` auto-estimate (what links) | 195,088 B | ~8.4x **over** |
| `ai profile` `peak_memory_kb` | 16,000 B | ~1.45x **under** |
| Trace `args.arena_used_bytes` | **23,140 B** | authoritative |

The estimators bracket the truth from opposite sides. **The under-read is the
dangerous one:** overriding `ArenaSize` with `ai profile`'s peak starves
`AllocateTensors()`, and because the profiling template has no console that failure is
**silent** — you get a trace file with no `INFERENCE` spans and no error message.

Safe procedure: build once with the auto-estimate, read `arena_used_bytes` from the
bundle, then re-run with `--arena-size` at ~1.2x the measured value. Never set it from
`ai profile`'s peak alone. Extension keys are `ArenaSize`, `ArenaSection`, `Section`,
`Symbol`, `Dataset`, `DatasetSection`.

## Zephyr, zephelin, and why the pin is not the answer

The AI profiling template emits `CONFIG_ZPL_*` but the Zephyr it pins may not ship
`modules/zephelin`. A `zephelin.yml` alone is a west *manifest fragment*, not the
module. Without the module the build aborts in Kconfig with `attempt to assign ... to
the undefined symbol ZPL` / `ZPL_TRACE` / `ZPL_INFERENCE_PROFILING` /
`ZPL_TFLM_PROFILER`, then `error: Aborting due to Kconfig warnings`.

**The pinned version is only a request.** CFS installs a pinned package as a side
effect of building, so the pin and the installed version drift apart, and the
*installed* one is what CMake resolves. A gate that tests the pin string against
stale package-cache entries produces both false passes and false failures.
`prebuild_gate.py` therefore reads the installed version from `cfsutil pkg list`,
with `cfsutil validate dependencies --format json`
(`[].packages[].installedVersion`, one result per manifest) as a fallback. It
resolves the tree with `cfsutil pkg path zephyr --format json` and tests *that* tree.
This lookup runs only when the workspace pins Zephyr or enables ZPL; non-Zephyr AI
workspaces continue directly to the model and dataset checks.

Read dependency validation per package: `installedVersion` is the version the gate
needs, while status and version constraints explain compatibility. Do not dismiss
a manifest's `valid` result as cosmetic based on another target's history. Derive
firmware and toolchain package names and compatible versions from this workspace's
metadata.

After a build, the authoritative record is `ZEPHYR_BASE` in
`<project>/build/CMakeCache.txt` plus `CONFIG_ZEPHYR_ZEPHELIN_MODULE=y` in
`<project>/build/zephyr/.config`. Both land in `manifest.json` under `build`, so the
resolved tree is evidence, never inference.

`prebuild_gate.py --list-zephyr [--json]` reports whether the installed Zephyr
package carries the module and the requested board.

## Other behaviours worth knowing

- **`--zephyrTraceFile` appends its own `.ctf`.** Pass the `.tef` name: raw capture
  goes to `run.ctf`, converted trace to `run.tef`. Passing `run.ctf` produces
  `run.ctf.ctf` for the raw data and writes TEF JSON into `run.ctf`. Nothing warns.
- **`tasks run --capture --timeout` counts from successful task completion.**
  Standalone `port capture --timeout` counts from capture startup instead. The text
  runner uses `--timeout 0`, keeps capture open through flashing, and manages its
  own bounded inference window after the flash task finishes.
- **`tasks list` prints sanitized names; `.cfs/ai.cfsaiprof` stores labels.** `tasks
  run` accepts only the sanitized form (`flash & run (JLink)` → `flash_run_JLink`).
  The runner converts them; never ask a model to translate.
- **`layer_performance[].operator_type` is `null` in every static report** and
  `total_parameters` is often `null`. The operator name is in `layer_name`. Any join
  keyed on `operator_type` silently yields a table of `n/a`.
- **The workload is bit-for-bit deterministic.** Repeat captures of the same ELF and
  input have been byte-identical across runs. A repeat validates the pipeline; it
  never yields a run-to-run spread. Only tiling the dataset gives a real population.
  Do not present two runs as n=2.
- **The first inference can be the fastest.** On DS-CNN the minimum of a 64-sample
  population was the first inference and matched the old n=1 figure almost exactly, so
  a single-shot number is a cold-path outlier, not the mean.
- **Berkeley vs per-section `size`.** `text/data/bss` totals RAM 223,589 B here while
  `size -A` totals 225,073 B; the ~1.5 KB delta is `.ramfunc` and small kernel areas
  bucketing differently. The bundle records `berkeley`. Pick one and stay with it.
