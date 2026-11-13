#!/usr/bin/env python3
# Copyright (c) 2026 Analog Devices, Inc.
"""Analyze a Zephelin TEF trace produced by CFS serial capture.

Pairs INFERENCE::* begin/end events by (name, pid, tid, model_id), reports
per-inference latency, per-layer and per-operator breakdown, unattributed
framework time, and any incomplete spans.

Usage:
    python3 analyze_tef.py run.tef [--warmup N] [--json]

Exit codes: 0 analysis produced; 2 no complete inference span found.
"""

import argparse
import json
import statistics
import sys
from collections import defaultdict


def load_events(path):
    with open(path) as fh:
        doc = json.load(fh)
    # TEF is either a bare list or {"traceEvents": [...]}.
    return doc["traceEvents"] if isinstance(doc, dict) else doc


def pair_spans(events):
    """Return (completed, unmatched).

    completed: list of dicts with name/pid/tid/model_id/begin/end/dur, in
    begin order. Uses a per-key stack so repeated spans nest correctly.
    """
    open_stacks = defaultdict(list)
    completed = []
    for ev in events:
        ph = ev.get("ph")
        if ph not in ("B", "E"):
            continue
        args = ev.get("args") or {}
        key = (ev.get("name"), ev.get("pid"), ev.get("tid"), args.get("model_id"))
        if ph == "B":
            open_stacks[key].append(ev)
        else:
            if open_stacks[key]:
                begin = open_stacks[key].pop()
                completed.append(
                    {
                        "name": ev.get("name"),
                        "pid": ev.get("pid"),
                        "tid": ev.get("tid"),
                        "model_id": args.get("model_id"),
                        "begin": begin.get("ts"),
                        "end": ev.get("ts"),
                        "dur": ev.get("ts") - begin.get("ts"),
                    }
                )
            else:
                completed.append({"name": ev.get("name"), "orphan_end": ev.get("ts")})
    unmatched = [
        {"name": k[0], "pid": k[1], "tid": k[2], "model_id": k[3], "begin": e.get("ts")}
        for k, stack in open_stacks.items()
        for e in stack
    ]
    orphans = [c for c in completed if "orphan_end" in c]
    return [c for c in completed if "orphan_end" not in c], unmatched + orphans


def operator_of(layer_name):
    """MODEL::DEPTHWISE_CONV_2D_0_4 -> DEPTHWISE_CONV_2D"""
    tail = layer_name.split("::", 1)[-1]
    parts = tail.rsplit("_", 2)
    return parts[0] if len(parts) == 3 else tail


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tef")
    ap.add_argument(
        "--warmup",
        type=int,
        default=0,
        help="exclude the first N inferences from statistics (observed count is "
        "always reported before exclusion)",
    )
    ap.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = ap.parse_args()

    events = load_events(args.tef)
    spans, bad = pair_spans(events)

    inferences = [s for s in spans if s["name"].startswith("INFERENCE::")]
    layers = [s for s in spans if s["name"].startswith("MODEL::")]

    if not inferences:
        print(
            "NO COMPLETE INFERENCE SPAN FOUND. "
            f"{len(events)} events, {len(spans)} complete spans, "
            f"{len(bad)} incomplete. A trace file alone is not evidence of "
            "inference.",
            file=sys.stderr,
        )
        return 2

    # Do not mix models or boots: group by (pid, tid, model_id).
    contexts = sorted({(s["pid"], s["tid"], s["model_id"]) for s in inferences})
    if len(contexts) > 1:
        print(
            f"WARNING: {len(contexts)} distinct (pid,tid,model_id) contexts present. "
            "Reporting each separately; do not pool them.",
            file=sys.stderr,
        )

    out = {"file": args.tef, "total_events": len(events), "contexts": []}

    for ctx in contexts:
        ctx_inf = [s for s in inferences if (s["pid"], s["tid"], s["model_id"]) == ctx]
        observed = len(ctx_inf)
        used = ctx_inf[args.warmup :] if args.warmup else ctx_inf
        durs = [s["dur"] for s in used]

        block = {
            "pid": ctx[0],
            "tid": ctx[1],
            "model_id": ctx[2],
            "observed_inferences": observed,
            "warmups_excluded": args.warmup,
            "valid_inferences": len(durs),
            "units": "microseconds",
        }
        if durs:
            block["latency_us"] = {
                "mean": statistics.fmean(durs),
                "min": min(durs),
                "max": max(durs),
            }
            if len(durs) >= 2:
                block["latency_us"]["stdev"] = statistics.stdev(durs)
            # Percentiles are only meaningful with a real population.
            if len(durs) >= 20:
                q = statistics.quantiles(durs, n=100, method="inclusive")
                block["latency_us"]["p50"] = q[49]
                block["latency_us"]["p90"] = q[89]
                block["latency_us"]["p99"] = q[98]
            else:
                block["percentiles"] = (
                    f"not reported: n={len(durs)} is too small for percentiles"
                )

        # Attribute layer spans to the inference whose window contains them.
        # Pre-filter to this context's own layers once, rather than
        # rescanning the full (possibly multi-context) layer list per
        # inference.
        ctx_layers = [
            lay for lay in layers if (lay["pid"], lay["tid"]) == (ctx[0], ctx[1])
        ]
        per_op = defaultdict(float)
        per_layer = []
        layer_total = 0.0
        for inf in used:
            for lay in ctx_layers:
                if inf["begin"] <= lay["begin"] and lay["end"] <= inf["end"]:
                    per_op[operator_of(lay["name"])] += lay["dur"]
                    layer_total += lay["dur"]
                    per_layer.append({"layer": lay["name"], "dur_us": lay["dur"]})

        span_total = sum(durs)
        block["layer_spans"] = len(per_layer)
        block["layer_total_us"] = layer_total
        block["unattributed_framework_us"] = span_total - layer_total
        block["by_operator_us"] = dict(
            sorted(per_op.items(), key=lambda kv: -kv[1])
        )
        block["per_layer_us"] = per_layer
        out["contexts"].append(block)

    out["incomplete_spans"] = bad

    if args.json:
        json.dump(out, sys.stdout, indent=2)
        print()
        return 0

    # Text report
    for b in out["contexts"]:
        print(
            f"context pid={b['pid']} tid={b['tid']} model_id={b['model_id']}  "
            f"units=us"
        )
        print(
            f"  observed inferences : {b['observed_inferences']}"
            f"   warm-ups excluded: {b['warmups_excluded']}"
            f"   valid: {b['valid_inferences']}"
        )
        lat = b.get("latency_us", {})
        if lat:
            line = "  latency             : " + "  ".join(
                f"{k}={v:.2f}" for k, v in lat.items()
            )
            print(line)
        if "percentiles" in b:
            print(f"  percentiles         : {b['percentiles']}")
        total = sum(
            [b["layer_total_us"], b["unattributed_framework_us"]]
        )
        if b["layer_spans"]:
            print(f"\n  per-layer ({b['layer_spans']} spans):")
            for item in b["per_layer_us"]:
                pct = 100 * item["dur_us"] / total if total else 0
                print(
                    f"    {item['layer']:34s}{item['dur_us']:12.2f} us "
                    f"{item['dur_us']/1000:9.3f} ms {pct:6.1f}%"
                )
            print("\n  by operator:")
            for op, v in b["by_operator_us"].items():
                pct = 100 * v / total if total else 0
                print(f"    {op:26s}{v/1000:9.3f} ms {pct:6.1f}%")
            pct = 100 * b["unattributed_framework_us"] / total if total else 0
            print(
                f"    {'(framework, unattributed)':26s}"
                f"{b['unattributed_framework_us']/1000:9.3f} ms {pct:6.1f}%"
            )
        print()

    if out["incomplete_spans"]:
        print(f"INCOMPLETE SPANS ({len(out['incomplete_spans'])}):")
        for s in out["incomplete_spans"]:
            print(f"  {s}")
    else:
        print("incomplete spans: none")
    return 0


if __name__ == "__main__":
    sys.exit(main())
