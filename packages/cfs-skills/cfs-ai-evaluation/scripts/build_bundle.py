#!/usr/bin/env python3
# Copyright (c) 2026 Analog Devices, Inc.
"""Normalize a CFS AI evaluation evidence directory into a hand-off bundle.

Emits two files next to the evidence:

  runtime.cfsreport   a `type: "runtime-profile"` report conforming to the
                      existing CFS report shape (see packages/ide/src/types/
                      report-view-types.ts), so it validates against the
                      repo's zod schema and opens in the report viewer.
  manifest.json       only the facts no .cfsreport models: probe/transport,
                      build sizes and integrity, static-vs-measured
                      correlation, machine-emitted caveats, per-phase timing.

Design rules:
  * Every input is optional. Anything absent is reported as null plus a
    `missing` entry -- never guessed.
  * Span pairing and build-timing integrity are NOT re-implemented here;
    analyze_tef.py and check_build_timing.py are invoked and their --json
    consumed. This file only aggregates and joins.
  * Memory totals come from the report's own info.hardware (FlashSize /
    RamSize / CoreClock), never from per-SoC constants or a chip-name allowlist.

Usage:
    python3 build_bundle.py --evidence <dir> [--workspace <ws>] [--project <p>]
                            [--out <dir>] [--label <name>]

Exit codes: 0 bundle written; 2 no usable runtime evidence (neither paired
inference spans nor a completed text-runtime smoke run); 3 evidence directory
not found.
"""

import argparse
import csv
import glob
import hashlib
import json
import os
import re
import statistics
import subprocess
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST_VERSION = 1


def pick(ev, *patterns):
    """First existing file matching any glob, so the bundle tolerates the
    naming drift across hand-made evidence directories."""
    for pat in patterns:
        hits = sorted(glob.glob(os.path.join(ev, pat)))
        if hits:
            return hits[0]
    return None


def load_json(path):
    if not path or not os.path.isfile(path):
        return None
    try:
        with open(path) as fh:
            return json.load(fh)
    except (ValueError, OSError):
        return None


def sha256(path):
    if not path or not os.path.isfile(path):
        return None
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def run_json(argv):
    try:
        p = subprocess.run(argv, capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.SubprocessError):
        return None
    try:
        return json.loads(p.stdout)
    except ValueError:
        return None


def parse_size(path):
    """Berkeley `size` output -> text/data/bss. Keep one convention; the
    per-section `size -A` total differs by ~1.5 KB (.ramfunc and small kernel
    areas bucket differently) and mixing them across runs is misleading."""
    if not path or not os.path.isfile(path):
        return {}
    for line in open(path):
        m = re.match(r"\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([0-9a-fA-F]+)\s+(\S+)", line)
        if m:
            text, data, bss = int(m.group(1)), int(m.group(2)), int(m.group(3))
            return {"text": text, "data": data, "bss": bss,
                    "flash_bytes": text + data, "ram_bytes": data + bss,
                    "elf": m.group(6)}
    return {}


def parse_elf_size(path):
    """Read normalized CFSUtil ELF-size evidence."""
    data = load_json(path)
    if not isinstance(data, dict) or data.get("status") != "pass":
        return {}
    metrics = data.get("metrics")
    if not isinstance(metrics, dict):
        return {}
    keys = ("text", "data", "bss", "flash_bytes", "ram_bytes")
    if any(isinstance(metrics.get(key), bool) or
           not isinstance(metrics.get(key), (int, float)) or metrics[key] < 0 or
           int(metrics[key]) != metrics[key]
           for key in keys):
        return {}
    return {key: int(metrics[key]) for key in keys}


def parse_hashes(path):
    """`shasum -a 256` lines -> {basename: digest}."""
    out = {}
    if path and os.path.isfile(path):
        for line in open(path):
            m = re.match(r"([0-9a-f]{64})\s+(\S+)", line.strip())
            if m:
                out[os.path.basename(m.group(2))] = m.group(1)
    return out


def parse_timing(ev):
    # run_evaluation.py records per-phase timing in its run record; prefer that
    # over a hand-made timing.csv.
    rr = load_json(pick(ev, "run_record.json"))
    if rr and rr.get("phases"):
        phases = {p["phase"]: p.get("seconds", 0) for p in rr["phases"]}
        return {"phases": phases,
                "total_seconds": rr.get("total_seconds"),
                "cfs_seconds": rr.get("cfs_seconds"),
                "overlapping_phases": {p["phase"]: p["includes_phases"]
                                       for p in rr["phases"] if p.get("includes_phases")},
                "source": "run_record.json"}
    j = load_json(pick(ev, "timing.json"))
    if j:
        return j
    path = pick(ev, "timing.csv")
    if not path:
        return None
    phases = {}
    with open(path) as fh:
        for row in csv.DictReader(fh):
            if row.get("step") in (None, "step"):
                continue
            try:
                phases[f"{row['step']} {row['label']}"] = float(row["seconds"])
            except (KeyError, TypeError, ValueError):
                continue
    return {"phases": phases, "total_seconds": round(sum(phases.values()), 3)} if phases else None


def workspace_facts(ws):
    """soc/board/package/template/model come from .cfs metadata, never inferred."""
    out = {}
    if not ws:
        return out
    cfsws = load_json(os.path.join(ws, ".cfs", ".cfsworkspace")) or {}
    low = {str(k)[:1].lower() + str(k)[1:]: v for k, v in cfsws.items()}
    for src, dst in (("soc", "soc"), ("board", "board"), ("package", "package"),
                     ("workspaceName", "workspace_name"), ("modelFile", "model_file"),
                     ("sampleData", "sample_data")):
        if low.get(src) is not None:
            out[dst] = low[src]
    if low.get("workspacePluginId"):
        out["template"] = {"id": low.get("workspacePluginId"),
                           "version": low.get("workspacePluginVersion")}
    aiprof = load_json(os.path.join(ws, ".cfs", "ai.cfsaiprof")) or {}
    if aiprof:
        out["debuggers"] = aiprof.get("Debuggers")
        out["capture"] = aiprof.get("Output")
        out["selected_port"] = aiprof.get("SelectedPort")
        out["selected_debugger"] = aiprof.get("SelectedDebugger")
        for k in ("Soc", "Package", "BoardName"):
            out.setdefault(k.lower().replace("boardname", "board"), aiprof.get(k))
    deps = load_json(os.path.join(ws, ".cfs", ".cfsdependencies")) or {}
    out["pinned_packages"] = {p.get("name"): p.get("version")
                              for p in deps.get("packages", [])} or None
    return out


def build_facts(ws, project):
    """ZEPHYR_BASE and the zephelin module are recorded as evidence rather than
    inferred from the dependency pin -- the pin is only a request."""
    out = {}
    if not (ws and project):
        return out
    bd = os.path.join(ws, project, "build")
    cache = os.path.join(bd, "CMakeCache.txt")
    if os.path.isfile(cache):
        for line in open(cache):
            if line.startswith("ZEPHYR_BASE"):
                out["zephyr_base"] = line.split("=", 1)[1].strip()
                break
    cfg = os.path.join(bd, "zephyr", ".config")
    if os.path.isfile(cfg):
        text = open(cfg).read()
        out["zephelin_module_present"] = "CONFIG_ZEPHYR_ZEPHELIN_MODULE=y" in text
        out["zpl_symbols"] = sorted(
            m.group(1) for m in re.finditer(r"^(CONFIG_ZPL\w*)=y", text, re.M))
        out["debug_build"] = "CONFIG_DEBUG=y" in text
        out["speed_optimizations"] = "CONFIG_SPEED_OPTIMIZATIONS=y" in text
        out["console_disabled"] = all(
            f"# {s} is not set" in text for s in ("CONFIG_PRINTK", "CONFIG_STDOUT_CONSOLE"))
    return out


def tef_extras(tef):
    """arena_used_bytes and per-op identity live in the trace args. analyze_tef
    does the span pairing; this is a light additive pass for the fields it does
    not surface."""
    out = {"arena_used_bytes": None, "arena_tail_usage": None, "ops": {}}
    data = load_json(tef)
    if data is None:
        return out
    events = data if isinstance(data, list) else data.get("traceEvents", [])
    arenas, tails = set(), set()
    for e in events:
        a = e.get("args") or {}
        if "arena_used_bytes" in a:
            arenas.add(a["arena_used_bytes"])
        if "arena_tail_usage" in a:
            tails.add(a["arena_tail_usage"])
        name = e.get("name")
        if name and a.get("tag") is not None and name not in out["ops"]:
            out["ops"][name] = {"tag": a.get("tag"), "subgraph_idx": a.get("subgraph_idx"),
                                "op_idx": a.get("op_idx"), "runtime": a.get("runtime")}
    if arenas:
        out["arena_used_bytes"] = max(arenas)
        out["arena_flat"] = len(arenas) == 1
    if tails:
        out["arena_tail_usage"] = max(tails)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--evidence", required=True)
    ap.add_argument("--workspace")
    ap.add_argument("--project")
    ap.add_argument("--out")
    ap.add_argument("--label")
    ap.add_argument("--warmup", type=int, default=0)
    args = ap.parse_args()

    ev = os.path.abspath(os.path.expanduser(args.evidence))
    if not os.path.isdir(ev):
        print(f"evidence directory not found: {ev}", file=sys.stderr)
        return 3
    out_dir = os.path.abspath(os.path.expanduser(args.out)) if args.out else ev
    os.makedirs(out_dir, exist_ok=True)
    missing = []

    # ---- inputs ---------------------------------------------------------
    compat_path = pick(ev, "compat.cfsreport", "compat.json")
    profile_path = pick(ev, "profile.cfsreport", "resource.cfsreport", "*.cfsreport")
    tef_path = pick(ev, "run.tef", "*.tef")
    ctf_path = pick(ev, "run.ctf", "*.ctf")

    compat = load_json(compat_path)
    profile = load_json(profile_path)
    if compat is None:
        missing.append("compat report")
    if profile is None:
        missing.append("static profile report")

    # analyze_tef owns span pairing; never duplicated here.
    analysis = load_json(pick(ev, "analysis.json"))
    text_analysis = load_json(pick(ev, "text_analysis.json"))
    if analysis is None and tef_path:
        argv = [sys.executable, os.path.join(HERE, "analyze_tef.py"), tef_path, "--json"]
        if args.warmup:
            argv += ["--warmup", str(args.warmup)]
        analysis = run_json(argv)
    if analysis is None and text_analysis is None:
        missing.append("trace analysis")

    timing_check = load_json(pick(ev, "build_timing_check.json"))
    if timing_check is None and args.workspace and args.project:
        timing_check = run_json([sys.executable, os.path.join(HERE, "check_build_timing.py"),
                                 os.path.join(args.workspace, args.project, "build"), "--json"])

    size_path = pick(ev, "elf_size.json")
    size_evidence = load_json(size_path) or {}
    size = parse_elf_size(size_path) if size_path else parse_size(pick(ev, "size.txt"))
    if size_path and not size and size_evidence.get("status") == "pass":
        size_evidence["status"] = "unavailable"
        size_evidence["error"] = "elf_size.json contains invalid metrics"
    in_hashes = parse_hashes(pick(ev, "input_hashes.txt"))
    # run_record.json is the runner's own authoritative account of what went in.
    # Without this the manifest reports model_hashes: null even when the hashes
    # were computed, which silently defeats every --reuse-from identity check.
    run_rec = load_json(pick(ev, "run_record.json")) or {}
    rr_in = run_rec.get("inputs") or {}
    for key in ("model", "dataset", "dataset_tiled"):
        d = rr_in.get(key) or {}
        if d.get("sha256") and d.get("path"):
            in_hashes.setdefault(os.path.basename(d["path"]), d["sha256"])
    fw_hashes = parse_hashes(pick(ev, "firmware_hashes.txt", "image_hashes.txt"))
    ws_facts = workspace_facts(args.workspace)
    b_facts = build_facts(args.workspace, args.project)
    run_build = run_rec.get("build") or {}
    elf_facts = {
        "elf_path": run_build.get("elf_path") or size_evidence.get("elf"),
        "elf_source": run_build.get("elf_source") or size_evidence.get("elf_source"),
        "elf_sha256": run_build.get("elf_sha256") or size_evidence.get("elf_sha256"),
    }
    b_facts.update({key: value for key, value in elf_facts.items() if value is not None})
    firmware_hash_name = os.path.basename(
        size_evidence.get("elf") or size.get("elf") or "zephyr.elf")
    extras = tef_extras(tef_path)
    timing = parse_timing(ev)

    hw = ((profile or {}).get("info") or {}).get("hardware") or {}
    core_clock_hz = (hw.get("CoreClock") or 0) * 1_000_000
    ram_total = (hw.get("RamSize") or 0) * 1024
    flash_total = (hw.get("FlashSize") or 0) * 1024

    runtime_mode = ((run_rec.get("execution") or {}).get("runtime_mode")
                    or ("text" if text_analysis and not analysis else "zephelin"))
    if runtime_mode == "text":
        # Recheck the raw final invocation, including its identity when available.
        # Older parsers could combine incomplete boots into a false success.
        from analyze_text import analyze as analyze_text
        text_analysis = analyze_text(
            (text_analysis or {}).get("source_files") or [],
            (run_rec.get("runtime_plan") or {}).get("run_id"))
        analysis = None
    contexts = (analysis or {}).get("contexts") or []
    if contexts:
        ctx = contexts[0]
    elif text_analysis and text_analysis.get("status") == "completed_smoke":
        cycle_stats = text_analysis.get("cycles") or {}
        cycle_to_us = (1_000_000.0 / core_clock_hz) if core_clock_hz else None
        latency_us = ({key: value * cycle_to_us for key, value in cycle_stats.items()}
                      if cycle_to_us and cycle_stats else {})
        ctx = {
            "observed_inferences": text_analysis.get("observed_inferences"),
            "valid_inferences": text_analysis.get("observed_inferences"),
            "warmups_excluded": 0,
            "latency_us": latency_us,
            "per_layer_us": [],
            "by_operator_us": None,
            "unattributed_framework_us": None,
        }
        extras["arena_used_bytes"] = text_analysis.get("arena_used_bytes")
    else:
        print("no paired inference spans or completed text runtime; nothing to normalize",
              file=sys.stderr)
        return 2
    lat = ctx.get("latency_us") or {}
    mean_us = lat.get("mean")
    timing_available = isinstance(mean_us, (int, float)) and mean_us > 0

    # ---- per-layer aggregation + static/measured correlation ------------
    per_layer_us = {}
    for e in ctx.get("per_layer_us") or []:
        per_layer_us.setdefault(e["layer"], []).append(e["dur_us"])

    static_layers = (profile or {}).get("layer_performance") or []
    mean_inf_ms = (mean_us / 1000.0) if timing_available else None
    runtime_layers, correlation = [], []
    for idx, sl in enumerate(static_layers):
        # operator_type is null in every static report; layer_name carries it.
        op = sl.get("layer_name") or sl.get("operator_type") or "UNKNOWN"
        key = f"MODEL::{op}_0_{idx}"
        durs = per_layer_us.get(key)
        if not durs:
            continue
        meas_ms = statistics.mean(durs) / 1000.0
        meta = extras["ops"].get(key, {})
        total_ms = sum(durs) / 1000.0
        runtime_layers.append({
            "layer_idx": idx,
            "layer_name": op,
            "operator_type": meta.get("tag") or op,
            "subgraph_idx": meta.get("subgraph_idx") or 0,
            "invocations": len(durs),
            "avg_latency_ms": round(meas_ms, 6),
            "min_latency_ms": round(min(durs) / 1000.0, 6),
            "max_latency_ms": round(max(durs) / 1000.0, 6),
            "total_latency_ms": round(total_ms, 6),
            "latency_percent": round(100.0 * meas_ms / mean_inf_ms, 4)
            if mean_inf_ms else 0,
            "cycles": int(meas_ms / 1000.0 * core_clock_hz) if core_clock_hz else 0,
            "is_accelerated": False,
            "memory_kb": sl.get("memory_kb") or 0,
            "arena_used_bytes": extras["arena_used_bytes"] or 0,
        })
        macs = sl.get("macs") or 0
        est_ms = sl.get("latency_ms")
        correlation.append({
            "layer": f"{op}_0_{idx}",
            "measured_ms": round(meas_ms, 6),
            "estimated_ms": est_ms,
            "ratio": round(meas_ms / est_ms, 4) if est_ms else None,
            "macs": macs,
            "cycles_per_mac": round(meas_ms / 1000.0 * core_clock_hz / macs, 4)
            if (macs and core_clock_hz) else None,
            "pct_of_inference": round(100.0 * meas_ms / mean_inf_ms, 3) if mean_inf_ms else None,
        })

    est_latency = ((profile or {}).get("hardware_metrics") or {}).get("estimated_latency_ms")

    # ---- runtime.cfsreport (existing runtime-profile shape) -------------
    ram_bytes = size.get("ram_bytes")
    arena_used = extras["arena_used_bytes"]
    report_timing_complete = timing_available and all(
        isinstance(lat.get(key), (int, float)) for key in ("min", "max", "stdev"))
    runtime_report = {
        "type": "runtime-profile",
        "info": {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "version": ((profile or {}).get("info") or {}).get("version", ""),
            "hardware": hw or {},
        },
        "model_summary": {
            "model_name": ((profile or {}).get("model_summary") or {}).get("model_name", ""),
            "model_path": ((profile or {}).get("model_summary") or {}).get("model_path", ""),
            "model_hash": ((profile or {}).get("model_summary") or {}).get("model_hash"),
            "framework": "TFLite Micro",
            "layer_count": len(runtime_layers),
        },
        "inference_summary": {
            "iterations": ctx.get("valid_inferences") or 0,
            "total_latency_ms": round(mean_us * (ctx.get("valid_inferences") or 0)
                                      / 1000.0, 4),
            "avg_latency_ms": round(mean_us / 1000.0, 6),
            "min_latency_ms": round(lat["min"] / 1000.0, 6),
            "max_latency_ms": round(lat["max"] / 1000.0, 6),
            "std_latency_ms": round(lat["stdev"] / 1000.0, 6),
            "throughput_ips": round(1000.0 / mean_inf_ms, 4),
        },
        "hardware_metrics": {
            "total_cycles": int(mean_inf_ms / 1000.0 * core_clock_hz)
            if core_clock_hz else 0,
            "estimated_latency_ms": round(mean_inf_ms, 6),
            "peak_memory_kb": round((arena_used or 0) / 1024.0, 4),
            "peak_memory_mb": round((arena_used or 0) / (1024.0 * 1024.0), 6),
            "available_ram_kb": round(ram_total / 1024.0, 4) if ram_total else 0,
            "accelerated_layers": 0,
            "cpu_only_layers": len(runtime_layers),
        },
        "memory_analysis": {
            "model_peak_ram_kb": round((arena_used or 0) / 1024.0, 4),
            "available_ram_kb": round(ram_total / 1024.0, 4) if ram_total else 0,
            "ram_utilization_percent": round(100.0 * ram_bytes / ram_total, 3)
            if (ram_bytes and ram_total) else 0,
            "ram_status": "unavailable" if not (ram_bytes and ram_total)
            else ("CRITICAL" if ram_bytes / ram_total > 0.9
                  else "WARNING" if ram_bytes / ram_total > 0.7 else "OK"),
        },
        "layer_performance": runtime_layers,
    } if report_timing_complete else None

    if not timing_available:
        missing.append("runtime timing")
    elif not report_timing_complete:
        missing.append("complete runtime report timing")

    # ---- caveats: flagged deterministically, interpreted by the report ---
    caveats = []
    if not size:
        missing.append("linked firmware size")
        caveats.append("linked_size_unavailable")
    if runtime_mode == "text":
        caveats.extend([
            "zephelin_ai_profiler_unavailable",
            "accuracy_unavailable",
            "per_layer_timing_unavailable",
            "user_dataset_not_exercised",
            "text_runtime_smoke",
        ])
        if not text_analysis.get("run_identity_verified"):
            caveats.append("text_run_identity_unverified")
    if runtime_mode != "text" and (b_facts.get("console_disabled") or
                                   (b_facts.get("zpl_symbols") or [])):
        caveats.append("accuracy_structurally_impossible")
    if ((profile or {}).get("hardware_metrics") or {}).get("estimated_power_mw") == 0:
        caveats.append("power_unavailable")
    if hw and not hw.get("SupportedOps"):
        caveats.append("supported_ops_empty")
    arena_linked = None
    gate = load_json(pick(ev, "gate.json"))
    expected_inferences = None
    if gate:
        arena_linked = (gate.get("model") or {}).get("arena_size")
        expected_inferences = (gate.get("model") or {}).get("inferences")
    expected_inferences = ((run_rec.get("runtime_plan") or {}).get("expected_inferences")
                           or expected_inferences)
    if runtime_mode == "text":
        expected_inferences = 4
    if arena_linked is None:
        wsl = pick(ev, "ws_create.log", "ai_build.log")
        if wsl and os.path.isfile(wsl):
            m = re.search(r"Estimated to be (\d+) bytes", open(wsl).read())
            if m:
                arena_linked = int(m.group(1))
    if arena_linked and arena_used and arena_linked / arena_used > 2:
        caveats.append("arena_estimator_spread")
    rv = ((profile or {}).get("info") or {}).get("version")
    if rv:
        caveats.append("report_info_version_stale")
    if extras.get("arena_flat"):
        caveats.append("arena_use_input_independent")
    if b_facts.get("debug_build") and not b_facts.get("speed_optimizations"):
        caveats.append("debug_build_not_speed_optimized")
    if (ctx.get("valid_inferences") or 0) < 20:
        caveats.append("n_below_20_percentiles_withheld")
    if (analysis or {}).get("incomplete_spans"):
        caveats.append("incomplete_spans_present")

    manifest = {
        "manifest_version": MANIFEST_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "label": args.label or os.path.basename(ev),
        "execution": {
            "status": ("completed_smoke" if runtime_mode == "text"
                       else "completed" if runtime_layers else "partial"),
            "runtime_mode": runtime_mode,
            "evidence_dir": ev,
            "workspace": args.workspace,
            "project": args.project,
            "soc": ws_facts.get("soc"), "board": ws_facts.get("board"),
            "package": ws_facts.get("package"), "template": ws_facts.get("template"),
            # From the run record: a report's "Run" line needs the CFS build string,
            # and --reuse-from needs core + version to test identity. Neither is
            # recoverable from the workspace alone.
            "core": (run_rec.get("execution") or {}).get("core"),
            "cfsutil_version": (run_rec.get("execution") or {}).get("cfsutil_version"),
            "probe": (run_rec.get("execution") or {}).get("probe"),
            "endpoint": run_rec.get("endpoint"),
            "capture": ws_facts.get("capture"), "debuggers": ws_facts.get("debuggers"),
            "selected_port": ws_facts.get("selected_port"),
            "pinned_packages": ws_facts.get("pinned_packages"),
        },
        "inputs": {
            "model_hashes": in_hashes or None,
            "model_file": ws_facts.get("model_file"),
            "sample_data": ws_facts.get("sample_data"),
            # Carried through from the run record so a report never has to open a
            # second file to learn the model's origin or whether this target is
            # one the model was actually published for.
            "model": rr_in.get("model"),
            "dataset": rr_in.get("dataset"),
            "dataset_tiled": rr_in.get("dataset_tiled"),
            "catalog": rr_in.get("catalog"),
            "target_is_tagged": (rr_in.get("catalog") or {}).get("target_is_tagged"),
            "sample_count": ((rr_in.get("dataset_tiled") or {}).get("samples")
                             or (run_rec.get("runtime_plan") or {}).get("expected_inferences")),
            "static_source": ((run_rec.get("static") or {}).get("source")
                              if isinstance(run_rec.get("static"), dict) else None),
        },
        "static": {
            "compat": {"source": compat_path,
                       "code": (compat or {}).get("code"),
                       "memory_issues": (compat or {}).get("memory_issues"),
                       "operator_issues": (compat or {}).get("operator_issues"),
                       "unsupported_types": (compat or {}).get("unsupported_types")},
            "profile": {"source": profile_path,
                        "estimated_latency_ms": est_latency,
                        "peak_memory_kb": ((profile or {}).get("hardware_metrics") or {}).get("peak_memory_kb"),
                        "total_macs": ((profile or {}).get("optimization_opportunities") or {}).get("total_macs"),
                        "estimated_power_mw": ((profile or {}).get("hardware_metrics") or {}).get("estimated_power_mw")},
        },
        "build": dict(b_facts, **{
            "text": size.get("text"), "data": size.get("data"), "bss": size.get("bss"),
            "flash_bytes": size.get("flash_bytes"), "flash_total": flash_total or None,
            "ram_bytes": ram_bytes, "ram_total": ram_total or None,
            "ram_pct": round(100.0 * ram_bytes / ram_total, 3) if (ram_bytes and ram_total) else None,
            "arena_linked_bytes": arena_linked,
            "elf_sha256_recorded": (elf_facts.get("elf_sha256") or
                                     fw_hashes.get(firmware_hash_name)),
            "ninja": timing_check,
            "size_status": size_evidence.get("status") or ("pass" if size else "unavailable"),
            "size_error": size_evidence.get("error"),
            "size_source": (size_evidence.get("source") or
                            ("legacy size.txt" if size else None)),
            "size_convention": (size_evidence.get("convention") or
                                ("berkeley (text/data/bss)" if size else None)),
        }),
        "runtime": {
            "expected_inferences": expected_inferences,
            "observed_inferences": ctx.get("observed_inferences"),
            "capture_complete": bool(expected_inferences and
                                      ctx.get("observed_inferences") == expected_inferences),
            "valid_inferences": ctx.get("valid_inferences"),
            "warmups_excluded": ctx.get("warmups_excluded"),
            "latency_us": lat or None,
            "by_operator_us": ctx.get("by_operator_us"),
            "unattributed_framework_us": ctx.get("unattributed_framework_us"),
            "incomplete_spans": (analysis or {}).get("incomplete_spans"),
            "arena_used_bytes": arena_used,
            "arena_tail_usage": extras.get("arena_tail_usage"),
            "accuracy_measured": False if runtime_mode == "text" else None,
            "per_layer_timing_available": runtime_mode != "text",
            "user_dataset_exercised": (False if runtime_mode == "text" else
                                       (run_rec.get("runtime_plan") or {}).get(
                                           "user_dataset_exercised")),
            "cycles": (text_analysis or {}).get("cycles"),
            "text_capture": ({
                "run_id": text_analysis.get("run_id"),
                "run_identity_verified": text_analysis.get("run_identity_verified"),
                "files": (text_analysis or {}).get("source_files"),
                "hashes": {path: sha256(path) for path in
                           ((text_analysis or {}).get("source_files") or [])},
            } if runtime_mode == "text" else None),
            "trace": {"ctf": ctf_path, "ctf_sha256": sha256(ctf_path),
                      "tef": tef_path, "tef_sha256": sha256(tef_path)},
        },
        "correlation": {
            "measured_mean_ms": round(mean_inf_ms, 6) if mean_inf_ms is not None else None,
            "estimated_ms": est_latency,
            "measured_vs_estimated_ratio": round(mean_inf_ms / est_latency, 4)
            if (mean_inf_ms is not None and est_latency) else None,
            "arena_linked_over_used": round(arena_linked / arena_used, 3)
            if (arena_linked and arena_used) else None,
            "reclaimable_ram_bytes": (arena_linked - arena_used)
            if (arena_linked and arena_used) else None,
            "per_layer": correlation,
        },
        "caveats": caveats,
        "notice": run_rec.get("notice") or (text_analysis or {}).get("notice"),
        "telemetry": run_rec.get("telemetry"),
        "reports": {"compat": compat_path, "profile": profile_path,
                    "runtime": (os.path.join(out_dir, "runtime.cfsreport")
                                if runtime_report else None)},
        "timing": timing,
        "missing": missing,
    }

    rt_path = os.path.join(out_dir, "runtime.cfsreport")
    if runtime_report:
        with open(rt_path, "w") as fh:
            json.dump(runtime_report, fh, indent=2)
    elif os.path.isfile(rt_path):
        os.unlink(rt_path)
    mf_path = os.path.join(out_dir, "manifest.json")
    with open(mf_path, "w") as fh:
        json.dump(manifest, fh, indent=2)

    print(f"runtime report : {rt_path if runtime_report else 'unavailable (timing incomplete)'}")
    print(f"manifest       : {mf_path}")
    print(f"inferences     : {ctx.get('valid_inferences')} valid "
          f"of {ctx.get('observed_inferences')} observed")
    if not timing_available:
        print("mean latency   : unavailable (no cycle summary or usable core clock)")
    else:
        print(f"mean latency   : {mean_inf_ms:.3f} ms"
              + (f"  ({mean_inf_ms / est_latency:.3f}x estimate)"
                 if est_latency and mean_inf_ms else ""))
    if runtime_mode == "text":
        print(f"notice         : {manifest['notice']}")
    if caveats:
        print(f"caveats        : {', '.join(caveats)}")
    if missing:
        print(f"missing        : {', '.join(missing)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
