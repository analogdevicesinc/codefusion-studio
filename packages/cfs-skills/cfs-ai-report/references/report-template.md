# Report shape and a worked example

Read this when writing the report. The template is a set of required fields, not a
layout to copy literally — prose belongs in `Assessment` and `Next`.

## Required fields

```text
Status: completed | completed_smoke | partial | blocked | failed
Endpoint: static | build | hardware evaluation | hardware inference smoke evaluation
Run: CFS build; template and backend versions; SoC/board/core/package; probe; transport
Inputs: model origin, quantization, hash; dataset hash, sample count, tiling; whether the
        target is in the model's supportedPlatforms
Static: compatibility outcome and what it did and did not verify; estimated latency and
        resources with units; report paths
Hardware: firmware hash; flash and RAM bytes and percent; expected/observed/valid
        inferences; warm-up policy; latency statistics with units; percentiles only if n>=20
Assessment: the bottleneck, with the reasoning chain and MEASURED/CALCULATED/INFERRED
        labels; estimate fidelity; memory findings; confounds; what is unmeasurable and why
Artifacts: manifest.json; runtime.cfsreport; raw CTF; TEF; logs
Next: up to three prioritized experiments, each with expected effect, supporting
        evidence, and the command that verifies it
Scorecard: the closing tables (see below) -- required, and always last
```

Threshold outcome (pass/fail against a budget) stays separate from execution status. If
no threshold was given, say "not specified" rather than inventing one.

## Worked example of one finding

The point of the example is the *shape* of the argument — a labelled chain ending in a
falsifiable action — not these particular numbers. Obtain clock rate, instruction
costs and memory limits from the selected target's evidence; none of the example's
values are defaults for another target.

> **Bottleneck: the four 1×1 pointwise convolutions.**
>
> STATIC EXPECTATION — `ai profile` put the whole inference at 106.296 ms, with each
> pointwise `CONV_2D` at 20.480 ms (CALCULATED from its flat 2 cycles/MAC cost model).
>
> REAL-SILICON OBSERVATION — mean 176.258 ms over 64 valid inferences, stdev 0.095 ms
> (MEASURED). The four pointwise convolutions account for 94.43 ms, 53.6% of the
> inference, while carrying 2,048,000 of 2,657,398 MACs — 77.1% (MEASURED and
> CALCULATED).
>
> DELTA — 1.658× the estimate overall, but only 1.15× on these layers (CALCULATED).
>
> LIKELY CAUSE — these layers are compute-bound and already near the selected core's int8
> MAC floor; the estimator is accurate for them (INFERRED).
>
> SUPPORTING EVIDENCE — 2.31 cycles/MAC at 50 MHz, against a documented MAC cost of 2
> cycles (`info.hardware.OperatorInfos`). The depthwise convolutions, by contrast, run
> at 9.35 cycles/MAC — 4× worse per MAC — and take 30.5% of the time for 10.8% of the
> MACs (MEASURED, CALCULATED).
>
> ENGINEERING CONSEQUENCE — kernel-level optimization of the pointwise path cannot pay
> off; only reducing their MAC count will. The headroom is in the depthwise path and in
> the build configuration. `CONFIG_DEBUG=y` with `CONFIG_SPEED_OPTIMIZATIONS` unset
> flags a possible build confound, not measured debug overhead. Inspect the effective
> optimization choice in `build/zephyr/.config` and test its effect before attributing
> any of the 1.658× gap to it (INFERRED hypothesis, prompted by
> `debug_build_not_speed_optimized`).
>
> RECOMMENDED ACTION — rebuild with `CONFIG_SPEED_OPTIMIZATIONS=y` and re-measure
> before attempting any model change. Follow the evaluation skill's
> [speed-optimization procedure](../../cfs-ai-evaluation/references/speed-optimization.md):
> edit `prj.conf`, rerun with `--workspace` and a new evidence directory, and verify the
> effective `.config`. Hold the tuple, arena, dataset and measurement settings constant.
> A lower measured ratio supports a compiler-optimization contribution; an unchanged
> ratio does not by itself prove the estimator is wrong. Test `--arena-size 28672` in a
> separate experiment: the baseline linked arena is 195,088 B against a measured
> high-water mark of 23,140 B, suggesting 167.9 KiB could be reclaimed. Validate complete
> capture and the new linked RAM before treating that projection as a result.

Note what the example does not do: it does not call the estimate "validated", does not
invert 176.258 ms into a throughput figure, does not describe the 0.095 ms stdev as
run-to-run variability worth acting on, and does not claim anything about accuracy —
which a profiling build cannot produce at all.

## The closing scorecard — required, and always last

The prose above carries the argument; the scorecard is what the reader comes back to a
week later. End **every** report with it. Four tables, in this order, after `Next`.

Rules that keep it honest:

- **Label the category in the table itself**, not in a caption. A column header of
  "Measured" or "Static estimate" is what stops a reader treating an estimate as a
  measurement.
- Round to the precision the bundle supports — 3 decimal places for ms, whole bytes,
  one decimal for percentages. Never add precision the manifest does not have.
- A cell with no evidence behind it reads `unavailable` plus a two-word reason. Never
  blank, never `0`, never an invented figure.
- Omit a whole table only if the bundle cannot support a single row of it, and say so.
- No ratio row anywhere without both of its inputs visible in the same table.
- For comparisons against static estimates, calculate **measured ÷ static** after
  converting both values to the same units. Label the column with that direction.
  If either input is missing or the static estimate is zero, show `unavailable`
  with the reason. Keep the separately labelled **linked ÷ used** arena allocation
  ratio distinct from comparisons against static estimates.

### 1. Headline

| Metric | Static estimate | Measured | Ratio (measured ÷ static) |
| --- | --- | --- | --- |
| Inference latency | 106.296 ms | 176.258 ms (mean, n=64) | 1.658x |
| Tensor arena | 16,000 B | 23,140 B (high-water) | 1.446x |
| Power | not instrumented | unavailable (no sensor) | — |
| Accuracy | 94.52% published | unavailable (structurally impossible) | — |

### 2. Where the time goes

The analytical core of the report. One row per operator group, sorted by measured time
descending. `Verdict` is an INFERRED judgement and must be one of *at MAC floor*,
*headroom*, or *negligible* — nothing vaguer.

| Operator group | Measured | % of inf | MACs | % of MACs | cyc/MAC | vs est | % of abs gap | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pointwise CONV_2D x4 | 94.429 ms | 53.6% | 2,048,000 | 77.1% | 2.31 | 1.15x | 17.9% | at MAC floor |
| Depthwise CONV_2D x4 | 53.833 ms | 30.5% | 288,000 | 10.8% | 9.35 | 4.67x | 60.5% | headroom |
| First CONV_2D | 24.347 ms | 13.8% | 320,000 | 12.0% | 3.80 | 1.90x | 16.5% | headroom |
| Pool / softmax / FC / reshape | 1.582 ms | 0.9% | 1,398 | 0.1% | n/a | n/a | 2.0% | negligible |
| Framework (unattributed) | 2.066 ms | 1.2% | — | — | — | not estimated | 3.0% | negligible |

Note what the `% of abs gap` column buys: the operator with the largest *share of
time* and the one responsible for the largest *share of the estimation error* are
different rows here, and a reader who only sees percentages of inference would target
the wrong one.

### 3. Memory

| Resource | Linked | Measured | Reclaimable | % of part |
| --- | --- | --- | --- | --- |
| Flash | 227,904 B | — | — | 21.7% of 1,048,576 B |
| RAM (total) | 223,589 B | — | 171,948 B | 85.3% of 262,144 B |
| └ tensor arena | 195,088 B | 23,140 B | 167.9 KiB | 8.431x over-linked |
| RAM if right-sized | 57,173 B | — | — | 21.8% (CALCULATED) |

### 4. Next

| # | Experiment | Expected effect | Rests on | Verify with |
| --- | --- | --- | --- | --- |
| 1 | `CONFIG_SPEED_OPTIMIZATIONS=y` via the linked procedure | Tests the compiler-optimization contribution; speedup not yet measured | `debug_build_not_speed_optimized` | same tuple and arena, `--workspace`, new evidence directory; verify `.config` and compare per-layer ratios |
| 2 | Confirm the depthwise kernel dispatched | up to -40.6 ms (-23%) if it reaches 2.31 cyc/MAC | 9.35 vs 2.31 cyc/MAC, same build | `cycles_per_mac` on the four depthwise layers |
| 3 | Narrow channels 64 -> 48 | ~-55 ms (-31%); needs retraining | pointwise at the floor with 77.1% of MACs | re-run, compare `by_operator_us` |
