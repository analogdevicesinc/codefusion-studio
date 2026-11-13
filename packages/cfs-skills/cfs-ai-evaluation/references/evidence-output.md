# Evidence output format

The runner prints one compact JSON record on stdout (full version at
`<evidence>/run_record.json`), narrates its phases on stderr, and writes the bundle:

```text
<evidence>/
  static_verdict.json  the early, non-blocking estimate written seconds in (§3a)
  manifest.json        execution, inputs, build, runtime, correlation, caveats, timing
  runtime.cfsreport    type: "runtime-profile" -- present when complete numeric timing
                       exists; opens in the CFS report viewer
  compat.json          cfsutil ai compat
  resource.cfsreport   cfsutil ai profile
  run.ctf / run.tef    raw and decoded trace, preserved
  analysis.json  gate.json  elf_size.json  size.txt  build_timing_check.json  logs/
  # non-Zephelin fallback instead of run.ctf/run.tef/analysis.json:
  text_capture/<run-id>/<capture>.txt  text_analysis.json
```

On `"status": "completed"`, report mode **A** as the four tables below, then finish.
On `"status": "completed_smoke"`, use the same Run, Inputs, Results and Artifacts
layout, label the runtime evidence as a smoke run, render missing accuracy and
per-layer fields as unavailable, and quote the notice from §3b verbatim.
Every value is read straight from `manifest.json`. **Keep the row names and their
order identical between runs** — these tables get compared across evaluations, and a
renamed or reordered row destroys that. Use `unavailable` with a reason rather than
dropping a row.

## Run

| Field | Source |
| --- | --- |
| Status | `execution.status`, and the endpoint reached |
| CFS | recorded `cfsutil --version` |
| Target | SoC / board / core / package, plus the silkscreen revision the user reported |
| Template | `execution.template` id and version |
| Probe / transport | probe, and `execution.capture` interface, port and format |
| Zephyr | `gate.resolved_zephyr` and whether zephelin was present |

## Inputs

| Field | Source |
| --- | --- |
| Model | catalog name and quantization, or the filename for a supplied model |
| Model hash | `inputs.model.sha256` and byte size |
| Dataset | hash, byte size, sample count, and the tiling factor if tiled |
| Tagged for target | `inputs.target_is_tagged` — say plainly what it means |
| Static reports | fresh, or reused from a named prior bundle |

## Results

Use one table, with the category named on every row. The three categories
below are *not* interchangeable and a reader must never have to guess which one a
number belongs to. The fourth category, **derived values**, is deliberately absent: do
not add a measured-vs-estimated ratio row, a throughput figure or a reclaimable-RAM
row. Those are comparisons, and they belong to `cfs-ai-report`.

| Category | Metric | Source |
| --- | --- | --- |
| Static estimate | compatibility outcome | `static.compat` issues, and `static.compat_tables_populated` — if false, say the pass verified less than it appears |
| Static estimate | latency, peak memory, MACs | `static.profile` |
| Measured | inferences expected / observed / valid | `runtime`, plus warm-up policy |
| Measured | mean, min, max, stdev | `runtime.latency_us`, in ms |
| Measured | p50 / p90 / p99 | `runtime.latency_us` — **only if n >= 20**, else state they were withheld |
| Measured | arena high-water mark | `runtime.arena_used_bytes` |
| Linked | flash, RAM | bytes, total and percent from `build` |
| Linked | tensor arena | `build.arena_linked_bytes` against the measured mark |

## Artifacts

| Artifact | Use |
| --- | --- |
| `manifest.json` | the bundle's index; the only input `cfs-ai-report` needs |
| `elf_size.json` | Structured CFSUtil ELF-size response, selected ELF identity and any unavailable reason. |
| `runtime.cfsreport` | Use `reports.runtime` only when non-null. Opens in the CFS report viewer when complete numeric timing exists; otherwise it is intentionally omitted. |
| `run.tef` | Chrome-trace timeline; loads directly in Perfetto |
| `run.ctf` | raw capture, preserved and hashed |
| `text_capture/<run-id>/*.txt` | text smoke output, preserved and hashed; used instead of CTF/TEF for text runs |

Then state, in prose and only once: anything in `caveats[]` that changes what the
numbers mean, and that **accuracy was not measured and cannot be** from this build
(§7). Finally, make the offer in §7.

**Do not, on a successful run:** read `logs/`, re-open `compat.json` or
`resource.cfsreport`, re-run `analyze_tef.py`, summarise the trace, compute a ratio
the manifest already carries, or add an assessment. Successful deterministic execution
is not a reason to start reasoning. Name a caveat in one clause where it changes what
a number means — that is reporting, not interpretation — but do not diagnose its cause
or work out its consequences.

`manifest.json` already holds the per-layer correlation, cycles/MAC, operator rollup
and caveat flags — `cfs-ai-report` consumes them in mode B.

Four categories stay distinct and must not be merged: **static estimates**, **linked
firmware allocations**, **measured instrumented timings**, **derived values**. Tensor
arena usage is not total RAM. Never invert a single inference time into a throughput
figure — the stock workload is startup-only.
