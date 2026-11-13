#!/usr/bin/env python3
# Copyright (c) 2026 Analog Devices, Inc.
"""Deterministic CFS AI evaluation: one invocation, one evidence bundle.

Runs the whole workflow -- resolve, static analysis, workspace, pre-build gate,
firmware build, flash, capture, trace analysis, normalization -- as a single
process, and prints one compact JSON run record. Nothing here needs an LLM in
the loop: every decision is derived from CFS's own output or from a .cfs/*
metadata file.

Error attribution survives the batching: each phase records its own status,
duration, command line and log path, and the run stops at the first failure.
The record names the failed phase and its remedy, so a caller never has to
re-run earlier phases to find out what broke.

Usage (minimum):
    python3 run_evaluation.py --soc "$SOC" --board "$BOARD" --core "$CORE" \
        --model <path|url> --dataset <path|url> --evidence <dir> \
        --workspace-parent <dir> --name <ws-name> --probe JLink --port <tty>

Model Zoo instead of explicit paths:
    --zoo-model "DS-CNN Small" --zoo-quant int8

List what the Model Zoo offers (needs no other argument):
    python3 run_evaluation.py --list-zoo-models

Useful options:
    --tile N              ensure the dataset drives at least N inferences
    --arena-size BYTES    override the auto-estimated tensor arena
    --elf PATH            select the built firmware when discovery is ambiguous
    --stop-after PHASE    static | build | capture
    --reuse-from DIR      copy matching static reports instead of recomputing
    --capture-margin X    multiplier on the static latency estimate (default 2.5)
    --quiet               suppress the stderr progress narration

Output: phase-by-phase narration on stderr, one JSON record on stdout. Redirect
stdout to keep the record (`> record.json`); do not pipe through `tail`, which
throws away the narration a waiting operator is reading.

Exit codes: 0 all requested phases succeeded; 1 a phase failed (see the record's
`failed_phase`); 2 bad arguments.
"""

import argparse
import glob
import hashlib
import json
import os
import platform
import re
import shutil
import signal
import subprocess
import sys
import time
import urllib.request
import uuid
from datetime import datetime, timezone

from analyze_text import analyze as analyze_text

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CATALOG = ("https://raw.githubusercontent.com/analogdevicesinc/"
                   "adi-model-zoo/refs/heads/main")
TEXT_TEMPLATE_ID = "com.analog.zephyr.workspace.tflm"
TEXT_RUNTIME_NOTICE = (
    "Zephelin AI profiler is not available for this workspace, hence AI inference "
    "report lacks accuracy data, per-layer timing and user data set is not exercised"
)

# Narration goes to stderr so stdout stays exactly one JSON record: a caller can
# still do `run_evaluation.py ... > record.json` and watch progress on the tty.
QUIET = False


def say(msg=""):
    if not QUIET:
        sys.stderr.write(msg + "\n")
        sys.stderr.flush()


def step(name, status, seconds):
    """One line per phase, so a multi-minute run is followable."""
    dots = "." * max(3, 26 - len(name))
    say(f"  {name} {dots} {status:<4} {seconds:6.2f}s")


def note(msg):
    """A milestone fact worth seeing without opening the bundle."""
    say(f"    -> {msg}")


def format_metric(value, format_spec="", unit=""):
    """Format an optional manifest metric without treating missing data as zero."""
    if value is None:
        return "unavailable"
    return f"{format(value, format_spec)}{unit}"


# --------------------------------------------------------------------------
# plumbing
# --------------------------------------------------------------------------

def cfsutil_bin():
    env = os.environ.get("CFSUTIL")
    if env and os.path.isfile(env):
        return env
    found = shutil.which("cfsutil")
    if found:
        return found
    for cand in sorted(glob.glob(os.path.expanduser(
            "~/analog/cfs/*/Utils/cfsutil/bin/cfsutil")), reverse=True):
        if os.path.isfile(cand):
            return cand
    return None


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def fetch(url, dest):
    with urllib.request.urlopen(url, timeout=120) as r, open(dest, "wb") as fh:
        shutil.copyfileobj(r, fh)
    return dest


def sanitize_task_label(label):
    """Mirror CFS's own sanitizeTaskLabel: `tasks run` accepts only the
    sanitized name, while .cfs/ai.cfsaiprof stores the human label.
    "flash & run (JLink)" -> "flash_run_JLink"."""
    return re.sub(r"[^A-Za-z0-9]+", "_", label).strip("_")


class Runner:
    def __init__(self, evidence, wrap_caffeinate=True):
        self.ev = evidence
        self.logs = os.path.join(evidence, "logs")
        os.makedirs(self.logs, exist_ok=True)
        self.phases = []
        self.started = time.monotonic()
        self.cfs_intervals = []
        self.caffeinate = (wrap_caffeinate and platform.system() == "Darwin"
                           and shutil.which("caffeinate"))

    def run(self, name, argv, long=False, check=True, timeout=3600,
            error_status="failed"):
        """Execute one phase. `long` wraps it in a sleep assertion scoped to
        exactly this command -- a caffeinate held by an earlier phase does not
        protect a later one, and a host suspend mid-build or mid-capture
        silently corrupts the measurement."""
        is_cfs = os.path.basename(argv[0]).lower() in ("cfsutil", "cfsutil.cmd", "cfsutil.exe")
        if long and self.caffeinate:
            argv = ["caffeinate", "-dimsu"] + argv
        log = os.path.join(self.logs, f"{name}.log")
        t0 = time.monotonic()
        try:
            p = subprocess.run(argv, capture_output=True, text=True,
                               errors="replace", timeout=timeout)
            rc, out, err = p.returncode, p.stdout, p.stderr
        except subprocess.TimeoutExpired:
            rc, out, err = 124, "", f"timed out after {timeout}s"
        except OSError as exc:
            rc, out, err = 127, "", str(exc)
        ended = time.monotonic()
        dt = ended - t0
        if is_cfs:
            self.cfs_intervals.append((t0, ended))
        with open(log, "w") as fh:
            fh.write(f"$ {' '.join(argv)}\n\n{out}\n{err}")
        status = "ok" if rc == 0 else error_status
        rec = {"phase": name, "status": status,
               "returncode": rc, "seconds": round(dt, 3),
               "command": " ".join(argv), "log": log}
        self.phases.append(rec)
        step(name, "ok" if rc == 0 else status, dt)
        if rc != 0:
            note(f"rc={rc}; log: {log}")
        if check and rc != 0:
            rec["stderr_tail"] = (err or out)[-1200:]
        return rc, out, err

    def mark(self, name, status, seconds=0.0, **extra):
        rec = {"phase": name, "status": status, "seconds": round(seconds, 3)}
        rec.update(extra)
        self.phases.append(rec)
        step(name, "ok" if status == "ok" else status.upper()[:4], seconds)
        if extra.get("error"):
            note(str(extra["error"]))
        elif extra.get("note"):
            note(str(extra["note"]))
        return rec


def save_record(runner, record):
    """Snapshot elapsed time and the union of CFS command intervals."""
    record["phases"] = runner.phases
    record["total_seconds"] = round(time.monotonic() - runner.started, 3)
    duration, end = 0.0, runner.started
    for start, stop in sorted(runner.cfs_intervals):
        duration += max(0.0, stop - max(start, end))
        end = max(end, stop)
    record["cfs_seconds"] = round(duration, 3)
    path = os.path.join(runner.ev, "run_record.json")
    record["run_record"] = path
    with open(path, "w") as fh:
        json.dump(record, fh, indent=2)
    return path


def finish(runner, record, failed=None, code=0):
    record["failed_phase"] = failed
    path = save_record(runner, record)
    # Bundling itself is timed too. Refresh only this run's generated manifest,
    # after the subprocess completes, without rerunning normalization.
    bundle = record.get("bundle")
    if bundle:
        from build_bundle import parse_timing
        with open(bundle["manifest"]) as fh:
            manifest = json.load(fh)
        manifest["timing"] = parse_timing(runner.ev)
        with open(bundle["manifest"], "w") as fh:
            json.dump(manifest, fh, indent=2)
    say()
    say(f"  {record.get('status', '?').upper()}  "
        f"{record.get('total_seconds', 0):.1f}s total, "
        f"{record.get('cfs_seconds', 0):.1f}s in cfsutil")
    if failed:
        say(f"  failed phase: {failed}")
    say(f"  record: {path}")
    say()
    print(json.dumps(compact(record), indent=2))
    return code


def compact(record):
    """What goes to stdout. The full record is on disk; a caller only needs the
    outcome, the numbers, and -- on failure -- which phase broke and why.
    Verbose catalog metadata and full command lines stay out of context."""
    out = {k: v for k, v in record.items()
           if k not in ("inputs", "phases", "gate", "static")}
    inp = record.get("inputs") or {}
    out["inputs"] = {
        k: {kk: vv for kk, vv in (inp.get(k) or {}).items() if kk != "path"}
        for k in ("model", "dataset", "dataset_tiled") if inp.get(k)
    }
    cat = inp.get("catalog")
    if cat:
        out["inputs"]["catalog"] = {k: cat.get(k) for k in
                                   ("model", "quantization", "version", "lastUpdated",
                                    "supported_platforms", "target_is_tagged")}
    if record.get("static"):
        out["static"] = record["static"]
    g = record.get("gate") or {}
    if g:
        out["gate"] = {k: v for k, v in g.items() if v not in (None, [], {})}
    out["phases"] = [{k: v for k, v in p.items() if k not in ("command", "log")}
                     for p in record.get("phases", [])]
    return out


# --------------------------------------------------------------------------
# phases
# --------------------------------------------------------------------------

def list_zoo_models(catalog):
    """Print the ADI Model Zoo catalog. There is no `cfsutil ai zoo` subcommand,
    so without this the only way to learn the valid --zoo-model strings is to
    read this script or hand-fetch model_index.json."""
    import tempfile
    base = catalog.rstrip("/")
    with tempfile.TemporaryDirectory() as td:
        idx = os.path.join(td, "model_index.json")
        fetch(f"{base}/model_index.json", idx)
        cat = json.load(open(idx))
    rows = []
    for m in cat.get("models", []):
        plats = m.get("supportedPlatforms") or []
        quants = sorted({q for pl in plats for q in (pl.get("modelPaths") or {})})
        rows.append((str(m.get("displayName") or m.get("name") or "?"),
                     ", ".join(quants) or "-",
                     ", ".join(str(pl.get("soc")) for pl in plats) or "-"))
    rows.sort()
    w0 = max([len(r[0]) for r in rows] + [len("MODEL")])
    w1 = max([len(r[1]) for r in rows] + [len("QUANTIZATIONS")])
    print(f"ADI Model Zoo catalog {cat.get('version')} "
          f"(updated {cat.get('lastUpdated')})\n{base}\n")
    print(f"{'MODEL'.ljust(w0)}  {'QUANTIZATIONS'.ljust(w1)}  TAGGED PLATFORMS")
    print(f"{'-' * w0}  {'-' * w1}  {'-' * 16}")
    for a, b, c in rows:
        print(f"{a.ljust(w0)}  {b.ljust(w1)}  {c}")
    print('\nUse --zoo-model "<MODEL>" --zoo-quant <quant>. A target absent from '
          "TAGGED PLATFORMS is\nstill worth evaluating: `ai compat` and `ai profile` "
          "check it for real against the\ntarget's own model, and the run records "
          "target_is_tagged=false.")
    return 0


def resolve_zoo(args, inputs_dir, record):
    """Resolve a Model Zoo selection to concrete local artifacts. The catalog
    is the authority for which platforms a model is tagged for; a model tagged
    elsewhere is still worth evaluating, but the tag is recorded."""
    base = args.catalog.rstrip("/")
    idx = os.path.join(inputs_dir, "model_index.json")
    fetch(f"{base}/model_index.json", idx)
    cat = json.load(open(idx))
    want = args.zoo_model.strip().lower()
    entry = next((m for m in cat.get("models", [])
                  if want in (str(m.get("displayName", "")).lower(),
                              str(m.get("name", "")).lower())), None)
    if entry is None:
        names = [m.get("displayName") for m in cat.get("models", [])]
        raise SystemExit(f"model '{args.zoo_model}' not in catalog; available: {names}")
    plats = entry.get("supportedPlatforms") or []
    plat = next((p for p in plats if str(p.get("soc", "")).upper() == args.soc.upper()), None)
    tagged = plat is not None
    if plat is None:
        plat = plats[0]
    q = args.zoo_quant
    mrel = (plat.get("modelPaths") or {}).get(q)
    drel = (plat.get("sample_binary") or {}).get(q)
    if not mrel:
        raise SystemExit(f"quantization '{q}' not available; have "
                         f"{sorted((plat.get('modelPaths') or {}))}")
    model = fetch(f"{base}/{mrel}", os.path.join(inputs_dir, os.path.basename(mrel)))
    dataset = (fetch(f"{base}/{drel}", os.path.join(inputs_dir, os.path.basename(drel)))
               if drel else None)
    record["inputs"]["catalog"] = {
        "base": base, "version": cat.get("version"), "lastUpdated": cat.get("lastUpdated"),
        "model": entry.get("displayName"), "quantization": q,
        "supported_platforms": [p.get("soc") for p in plats],
        "target_is_tagged": tagged,
        "networkInputs": entry.get("networkInputs"),
        "networkOutputs": entry.get("networkOutputs"),
        "published_accuracy": entry.get("accuracy"),
    }
    record["inputs"]["catalog"]["_artifacts_from"] = plat.get("soc")
    record["inputs"]["catalog"]["_has_sample"] = bool(drel)
    return model, dataset


def write_input_hashes(ev, record):
    """Human-readable hashes alongside the record, and the file build_bundle.py
    reads to populate manifest.inputs.model_hashes. Rewritten after tiling so
    the tiled dataset is covered too."""
    with open(os.path.join(ev, "input_hashes.txt"), "w") as fh:
        for key in ("model", "dataset", "dataset_tiled"):
            d = record["inputs"].get(key)
            if d:
                fh.write(f"{d['sha256']}  {d['path']}\n")


def localize(spec, inputs_dir):
    """A URL is downloaded so it can be hashed; hashing local copies is the
    cheapest way to make a run reproducible and a later report reuse provable."""
    if spec is None:
        return None
    if re.match(r"^https?://", spec):
        return fetch(spec, os.path.join(inputs_dir, os.path.basename(spec.split("?")[0])))
    p = os.path.abspath(os.path.expanduser(spec))
    if not os.path.isfile(p):
        raise SystemExit(f"not a file: {p}")
    return p


def catalog_json(cu, argv):
    """Read current catalog capabilities, accepting enveloped and bare output."""
    result = subprocess.run(
        [cu, *argv, "--format", "json"],
        capture_output=True, text=True, errors="replace", timeout=60)
    if result.returncode:
        raise ValueError(f"Catalog query failed: {result.stderr.strip() or result.stdout.strip()}")
    catalog = json.loads(result.stdout)
    if not isinstance(catalog, dict):
        raise ValueError("Catalog query returned an unexpected JSON shape")
    if catalog.get("ok") is False:
        raise ValueError(f"Catalog query failed: {catalog.get('errors')}")
    data = catalog.get("data", catalog)
    if not isinstance(data, dict):
        raise ValueError("Catalog query returned no capability data")
    return data


def list_ai_targets(cu):
    """List installed targets with catalog-declared AI cores, without a SoC allowlist."""
    catalog = catalog_json(cu, ["socs", "list", "--verbose"])
    targets = []
    for soc in catalog.get("socs", []):
        cores = [core.strip() for core in (soc.get("AICores") or "").split(",")
                 if core.strip()]
        if cores:
            targets.append({"soc": soc["Name"], "package": soc.get("Package"),
                            "ai_cores": cores, "description": soc.get("Description")})
    return {"targets": targets, "source": "cfsutil socs list --verbose",
            "note": "AI capability does not guarantee a compatible model, workspace "
                    "template or capture route; those are checked for the selected target."}


def resolve_target(cu, soc, board, requested_package=None, requested_core=None):
    """Resolve the board/package and an AI-capable core from one catalog query."""
    catalog = catalog_json(cu, ["socs", "info", soc, "--boards", "--packages", "--cores"])
    cores = {c["dataModelCoreID"].casefold(): c["dataModelCoreID"]
             for c in catalog.get("cores", [])
             if c.get("aiCompatible") is True and c.get("dataModelCoreID")}
    if not cores:
        raise ValueError(f"No AI-enabled cores advertised for {soc}; inspect the current CFS catalog.")
    if requested_core:
        core = cores.get(requested_core.casefold())
        if not core:
            raise ValueError(f"Core {requested_core!r} is not AI-enabled for {soc}; "
                             f"available AI cores: {list(cores.values())}")
    elif len(cores) == 1:
        core = next(iter(cores.values()))
    else:
        raise ValueError(f"Multiple AI-enabled cores for {soc}: {list(cores.values())}; "
                         "select the intended workflow core with --core.")
    packages = {p["identifier"].casefold(): p["identifier"]
                for p in catalog.get("packages", []) if p.get("identifier")}
    selected_board = next((b for b in catalog.get("boards", [])
                           if str(b.get("identifier", "")).casefold() == board.casefold()), None)
    if selected_board is None:
        raise ValueError(f"Unknown board {board!r} for {soc}; available boards: "
                         f"{[b.get('identifier') for b in catalog.get('boards', [])]}")
    candidates = list(dict.fromkeys(
        str(p).casefold() for p in (selected_board or {}).get("packages", [])))
    if requested_package:
        key = requested_package.casefold()
        if key not in packages:
            raise ValueError(f"Unknown package {requested_package!r} for {soc}; available: {list(packages.values())}")
        if selected_board is not None and key not in candidates:
            raise ValueError(f"Package {requested_package!r} does not match board {board}; board packages: {candidates}")
    elif len(candidates) != 1 or candidates[0] not in packages:
        raise ValueError(f"Cannot uniquely resolve the package for {soc}/{board}; "
                         f"board packages: {candidates}. Supply --package explicitly.")
    else:
        key = candidates[0]
    return {"soc": catalog.get("name") or soc, "board": selected_board["identifier"],
            "package": packages[key], "core": core, "ai_cores": list(cores.values())}


def validate_workspace_package(ws, package, soc=None, board=None):
    """Reject a template/reused workspace that targets a different board or silicon."""
    path = os.path.join(ws, ".cfs", ".cfsworkspace")
    with open(path) as fh:
        metadata = {k.casefold(): v for k, v in json.load(fh).items()}
    for key, expected in (("package", package), ("soc", soc), ("board", board)):
        actual = metadata.get(key)
        if expected and (not actual or str(actual).casefold() != expected.casefold()):
            raise ValueError(f"Workspace {key} {actual!r} does not match selected "
                             f"{key} {expected!r}; check the board/template and requested target.")


def apply_package_pins(runner, cu, ws, specs, install=False, phase="pin_packages"):
    """Apply requested manifest pins to one workspace; return a failed phase name."""
    if not specs:
        return None
    dep = os.path.join(ws, ".cfs", ".cfsdependencies")
    try:
        man = json.load(open(dep))
    except (OSError, ValueError) as exc:
        runner.mark(phase, "failed", 0.0, error=f"{dep}: {exc}")
        return phase
    wanted = {}
    for spec in specs:
        if "=" not in spec:
            runner.mark(phase, "failed", 0.0,
                        error=f"expected NAME=VERSION, got {spec!r}")
            return phase
        name, version = spec.split("=", 1)
        wanted[name.strip()] = version.strip()
    changed = {}
    for package in man.get("packages", []):
        if package.get("name") in wanted:
            changed[package["name"]] = {
                "from": package.get("version"), "to": wanted[package["name"]]}
            package["version"] = wanted[package["name"]]
    for name, version in wanted.items():
        if name not in changed:
            man.setdefault("packages", []).append({"name": name, "version": version})
            changed[name] = {"from": None, "to": version}
    with open(dep, "w") as fh:
        json.dump(man, fh, indent=2)
    runner.mark(phase, "ok", 0.0, manifest=dep, changed=changed)
    if install:
        for name, version in wanted.items():
            install_phase = f"pkg_install_{name}"
            if runner.run(install_phase, [cu, "pkg", "install", f"{name}/{version}"],
                          long=True)[0] != 0:
                return install_phase
    return None


def gate_summary(gate):
    """Keep the actionable gate facts in the run record."""
    return {k: gate.get(k) for k in
            ("workspace", "project", "board", "status", "pinned_zephyr",
             "resolved_zephyr", "resolved_source", "zephelin_module_present",
             "board_present", "uses_zephyr", "needs_zpl", "failures", "warnings",
             "error", "reported_status", "returncode")}


def parse_gate_result(output, returncode, label="pre-build gate"):
    """Normalize the gate protocol while preserving expected compatibility failures."""
    try:
        gate = json.loads(output)
    except (TypeError, ValueError):
        return {
            "status": "error",
            "error": f"{label} returned malformed JSON",
            "returncode": returncode,
        }
    if not isinstance(gate, dict):
        return {
            "status": "error",
            "error": f"{label} returned a non-object JSON response",
            "returncode": returncode,
        }

    status = gate.get("status")
    gate["returncode"] = returncode
    if status == "pass" and returncode == 0:
        return gate
    if status == "fail" and returncode == 1:
        return gate
    if status == "error":
        if not gate.get("error"):
            gate["error"] = f"{label} reported an execution error"
        return gate

    if status is not None:
        gate["reported_status"] = status
    gate["status"] = "error"
    if status == "pass":
        gate["error"] = f"{label} reported pass but exited with code {returncode}"
    elif status == "fail":
        gate["error"] = (
            f"{label} reported a compatibility failure but exited with code {returncode}; "
            "expected code 1"
        )
    elif status is None:
        gate["error"] = f"{label} response omitted status"
    else:
        gate["error"] = f"{label} returned unsupported status {status!r}"
    return gate


def gate_passed(gate):
    """Only an explicit pass paired with a zero exit code permits a build."""
    return gate.get("returncode") == 0 and gate.get("status") == "pass"


def identity_of(rec):
    """Pull model, target and tool identity out of either bundle shape.
    run_record.json carries `inputs.model.sha256`; manifest.json may instead carry
    only the `inputs.model_hashes` map. A reuse test that understands one shape and
    not the other silently never reuses anything."""
    inp = rec.get("inputs") or {}
    ex = rec.get("execution") or {}
    sha = ((inp.get("model") or {}).get("sha256")
           or next((v for k, v in (inp.get("model_hashes") or {}).items()
                    if k.endswith((".tflite", ".tflm", ".onnx"))), None))
    return (sha, str(ex.get("soc") or "").upper(), ex.get("core"),
            ex.get("cfsutil_version"), str(ex.get("package") or "").casefold(),
            str(ex.get("board") or "").casefold())


def static_phase(r, cu, args, model, dataset, record):
    compat = os.path.join(r.ev, "compat.json")
    profile = os.path.join(r.ev, "resource.cfsreport")

    decision = {"mode": "fresh", "reuse_requested": bool(args.reuse_from),
                "reused_from": None, "reason": None}
    record["static_source"] = decision
    if args.reuse_from:
        prior = os.path.abspath(os.path.expanduser(args.reuse_from))
        ok = False
        rec = None
        # run_record.json first: it is the runner's own account and always carries
        # the full identity. manifest.json is a fallback for hand-made directories.
        for cand in ("run_record.json", "manifest.json"):
            path = os.path.join(prior, cand)
            if rec is None and os.path.isfile(path):
                with open(path) as fh:
                    rec = json.load(fh)
        if rec:
            p_sha, p_soc, p_core, p_ver, p_package, p_board = identity_of(rec)
            same_dataset = (((rec.get("inputs") or {}).get("dataset") or {}).get("sha256")
                            == (record["inputs"].get("dataset") or {}).get("sha256"))
            same = (p_sha == record["inputs"]["model"]["sha256"]
                    and p_ver == record["execution"]["cfsutil_version"]
                    and p_soc == args.soc.upper()
                    and p_core == args.core
                    and p_package == args.package.casefold()
                    and p_board == args.board.casefold() and same_dataset)
            if same:
                copied = 0
                for src, dst in ((("compat.cfsreport", "compat.json"), compat),
                                 (("profile.cfsreport", "resource.cfsreport"), profile)):
                    for s in src:
                        if os.path.isfile(os.path.join(prior, s)):
                            shutil.copy2(os.path.join(prior, s), dst)
                            copied += 1
                            break
                ok = copied == 2
                if not ok:
                    decision["reason"] = ("identity matched but the prior directory has "
                                          "an incomplete pair of compat/profile reports")
            else:
                diffs = []
                if not same_dataset:
                    diffs.append("dataset hash changed or is absent from prior evidence")
                if p_sha != record["inputs"]["model"]["sha256"]:
                    diffs.append(f"model sha256 {(p_sha or 'absent')[:12]} != "
                                 f"{record['inputs']['model']['sha256'][:12]}")
                if p_soc != args.soc.upper() or p_core != args.core:
                    diffs.append(f"target {p_soc or '?'}/{p_core or '?'} != "
                                 f"{args.soc}/{args.core}")
                if p_package != args.package.casefold() or p_board != args.board.casefold():
                    diffs.append(f"board/package {p_board or '?'}/{p_package or '?'} != "
                                 f"{args.board}/{args.package}")
                if p_ver != record["execution"]["cfsutil_version"]:
                    diffs.append(f"cfsutil {p_ver or 'absent'} != "
                                 f"{record['execution']['cfsutil_version']}")
                decision["reason"] = "identity mismatch: " + "; ".join(diffs)
        else:
            decision["reason"] = f"no manifest.json or run_record.json under {prior}"
        if ok:
            decision.update(mode="reused", reused_from=prior,
                            reason="model/dataset hashes, target and cfsutil version all match")
            r.mark("static_reuse", "ok", 0.0, source=prior,
                   note="model/dataset hashes, target and cfsutil version all match")
            return 0
        note(f"static reuse declined, running fresh: {decision['reason']}")

    argv = [cu, "ai", "compat", "--soc", args.soc, "--package", args.package,
            "--core", args.core, "--model", model,
            "--report-file", compat, "--format", "json"]
    if dataset:
        argv += ["--dataset", dataset]
    rc, _, _ = r.run("ai_compat", argv)
    if rc != 0:
        return rc
    rc, _, _ = r.run("ai_profile",
                     [cu, "ai", "profile", "--soc", args.soc, "--package", args.package,
                      "--core", args.core, "--model", model, "--report-file", profile,
                      "--report-format", "json", "--format", "json"])
    return rc


def write_static_verdict(ev, record, args, compat, hw, est_ms):
    """Emit a reviewable early estimate the moment the static phase lands.

    `ai compat` and `ai profile` answer in seconds; the workspace, build, flash and
    capture after them take minutes. This writes the headline where a watcher can
    pick it up immediately, so the user gets something to review while the rest of
    the run continues.

    These are ESTIMATES and they are deliberately NON-BLOCKING: this function never
    halts the run, and a NOT_OK status is advisory only. The run proceeds to build,
    flash and capture regardless, because only the hardware settles the question.

    Written atomically via os.replace (a watcher blocking on the path never sees a
    half-written file) and independently of QUIET, so the unattended route still
    leaves the artifact.
    """
    issues = {k: compat.get(k) for k in
              ("memory_issues", "operator_issues", "unsupported_types")
              if compat.get(k)}
    populated = bool(hw.get("SupportedOps"))
    if issues:
        status, word = "NOT_OK", "NOT OK"
        headline = "compat reported " + ", ".join(
            f"{len(v) if isinstance(v, list) else 1} {k.replace('_', ' ')}"
            for k, v in issues.items())
    elif not populated:
        status, word = "OK_WITH_CAVEATS", "OK (with caveats)"
        headline = ("no memory, operator or type issues, but the SupportedOps table "
                    "is EMPTY so this verified less than it appears")
    else:
        status, word = "OK", "OK"
        headline = "no memory, operator or type issues; SupportedOps table populated"

    cat = record["inputs"].get("catalog") or {}
    name = cat.get("model") or os.path.basename(record["inputs"]["model"]["path"])
    quant = cat.get("quantization") or ""
    tagged = cat.get("target_is_tagged")
    tag_txt = ("tagged for this target" if tagged else
               "NOT tagged for this target" if tagged is False else
               "no catalog tag data")
    macs = record["static"]["total_macs"]
    peak = record["static"]["peak_memory_kb"]
    est_txt = f"{est_ms:.3f} ms" if isinstance(est_ms, float) else f"{est_ms} ms"
    remaining = ([] if args.stop_after == "static" else
                 ["workspace", "build", "flash_capture", "analyze_tef"])

    # One line the caller can report verbatim. Keeping the brief pre-built is what
    # stops an early progress note from growing into a second report.
    brief = (f"{word} - early estimate, non-blocking. {name} {quant}".rstrip() +
             f" on {args.soc}/{args.core}, {tag_txt}. Estimated {est_txt}" +
             (f", {peak} KB peak" if peak is not None else "") +
             (f", {macs:,} MACs" if macs else "") + ". " + headline[0].upper() +
             headline[1:] + "." +
             (f" Still running: {', '.join(remaining)}." if remaining else ""))

    verdict = {
        "kind": "early_estimate",
        "blocks_execution": False,
        "static_status": status,
        "brief": brief,
        "headline": headline,
        "target": {"soc": args.soc, "board": args.board, "core": args.core,
                   "package": args.package},
        "model": {"name": name, "quantization": cat.get("quantization"),
                  "sha256": record["inputs"]["model"]["sha256"],
                  "bytes": record["inputs"]["model"]["bytes"],
                  "target_is_tagged": tagged,
                  "tagged_platforms": cat.get("supported_platforms")},
        "compat": {"issues": issues or None, "tables_populated": populated},
        "estimate": {"latency_ms": est_ms, "peak_memory_kb": peak,
                     "total_macs": macs},
        "static_reports_mode": (record["static"].get("source") or {}).get("mode"),
        "phases_remaining": remaining,
        "note": ("Estimates from cfsutil ai compat / ai profile. Nothing has been "
                 "built, flashed or measured yet, and this does not gate the run - "
                 "build, flash and capture continue regardless."),
    }
    tmp = os.path.join(ev, ".static_verdict.json.tmp")
    with open(tmp, "w") as f:
        json.dump(verdict, f, indent=1)
    os.replace(tmp, os.path.join(ev, "static_verdict.json"))
    say(f"  EARLY ESTIMATE ({status}, non-blocking): {headline}")
    return verdict


def read_defines(ws, project):
    hits = glob.glob(os.path.join(ws, project or "*", "src", "adi_tflm", "model.hpp"))
    if not hits:
        return {}
    text = open(hits[0]).read()
    out = {}
    for name in ("MODEL_DATASET_LEN", "MODEL_INPUT_0_LEN", "MODEL_INPUT_0_WIDTH",
                 "MODEL_ARENA_SIZE"):
        m = re.search(rf"^#define\s+{name}\s+\((\d+)\)", text, re.M)
        if m:
            out[name] = int(m.group(1))
    return out


def project_of(ws):
    """Project folders come from .cfs/*.cfsconfig, the same source CFS's own
    resolveWorkspaceFolders uses -- never from guessing a core id."""
    for cfg in glob.glob(os.path.join(ws, ".cfs", "*.cfsconfig")):
        try:
            d = json.load(open(cfg))
        except (ValueError, OSError):
            continue
        for p in d.get("Projects", []):
            name = ((p.get("PlatformConfig") or {}).get("ProjectName")
                    or p.get("ProjectId"))
            if name and os.path.isdir(os.path.join(ws, name)):
                return name, cfg
    for cand in sorted(os.listdir(ws)):
        if os.path.isdir(os.path.join(ws, cand, "src")):
            return cand, None
    return None, None


def project_model_of(ws, core):
    """Resolve the generated project and enabled model assigned to ``core``."""
    for cfg in glob.glob(os.path.join(ws, ".cfs", "*.cfsconfig")):
        try:
            data = json.load(open(cfg))
        except (ValueError, OSError):
            continue
        for project in data.get("Projects", []):
            if project.get("CoreId") != core:
                continue
            name = ((project.get("PlatformConfig") or {}).get("ProjectName")
                    or project.get("ProjectId"))
            models = project.get("AIModels") or []
            enabled = [m for m in models
                       if str(m.get("Enabled", True)).lower() not in ("false", "0")]
            if name and enabled:
                return name, cfg, enabled[0].get("Name")
    return None, None, None


def zephyr_board_of(ws, project):
    """Read the board target from project metadata, preserving underscores."""
    for cfg in glob.glob(os.path.join(ws, ".cfs", "*.cfsconfig")):
        try:
            with open(cfg) as fh:
                data = json.load(fh)
        except (OSError, ValueError):
            continue
        for entry in data.get("Projects", []):
            config = entry.get("PlatformConfig") or {}
            if (config.get("ProjectName") or entry.get("ProjectId")) == project:
                target = config.get("ZephyrBoardName")
                if target:
                    return target.split("/")[0].split("@")[0]
    return None


def _program_file(value, project_dir):
    """Expand the stable workspace variables used by generated CFS settings."""
    if not isinstance(value, str) or not value.strip():
        return None
    path = value.strip().replace("${workspaceFolder}", project_dir)
    path = path.replace("${workspaceFolderBasename}", os.path.basename(project_dir))
    if "${" in path:
        return None
    path = os.path.expandvars(os.path.expanduser(path))
    if not os.path.isabs(path):
        path = os.path.join(project_dir, path)
    return os.path.normpath(path)


def discover_elf(ws, project, build_dir, explicit=None):
    """Find the selected project's firmware without assuming a firmware stack."""
    project_dir = os.path.join(ws, project)
    if explicit:
        path = _program_file(explicit, project_dir)
        if path and os.path.isfile(path):
            return path, "argument", None
        return None, None, f"--elf does not name a file: {path or explicit}"

    settings_path = os.path.join(project_dir, ".vscode", "settings.json")
    settings = {}
    settings_text = ""
    try:
        with open(settings_path) as fh:
            settings_text = fh.read()
        settings = json.loads(settings_text)
    except (OSError, ValueError):
        for key in ("cfs.programFile", "cfs.riscvProgramFile"):
            match = re.search(rf'"{re.escape(key)}"\s*:\s*("(?:\\.|[^"\\])*")',
                              settings_text)
            if match:
                try:
                    settings[key] = json.loads(match.group(1))
                except ValueError:
                    pass
    configured = []
    for key in ("cfs.programFile", "cfs.riscvProgramFile"):
        path = _program_file(settings.get(key), project_dir)
        if path and os.path.isfile(path) and path not in configured:
            configured.append(path)
    if len(configured) == 1:
        return configured[0], "project_settings", None
    if len(configured) > 1:
        return None, None, "multiple firmware files are configured: " + ", ".join(configured)

    candidates = sorted({os.path.normpath(path) for path in
                         glob.glob(os.path.join(build_dir, "**", "*.elf"), recursive=True)
                         if os.path.isfile(path)})
    named = [path for path in candidates
             if os.path.basename(path).casefold() == f"{project}.elf".casefold()]
    if len(named) == 1:
        return named[0], "build_scan", None
    if len(candidates) == 1:
        return candidates[0], "build_scan", None
    if not candidates:
        return None, None, f"no ELF file found under {build_dir}"
    return None, None, ("multiple ELF files found; select the firmware with --elf: "
                        + ", ".join(candidates))


def _size_metrics(payload):
    """Validate CFSUtil's JSON envelope and normalize its section buckets."""
    if not isinstance(payload, dict):
        raise ValueError("ELF size command returned a non-object JSON value")
    if payload.get("ok") is not True:
        raise ValueError(f"ELF size command failed: {payload.get('errors')}")
    data = payload.get("data")
    info = data.get("SizeInfo") if isinstance(data, dict) else None
    if not isinstance(info, dict):
        raise ValueError("ELF size response is missing data.SizeInfo")
    values = {}
    for source, target in (("Text", "text"), ("Data", "data"), ("Bss", "bss")):
        value = info.get(source, 0)
        if (isinstance(value, bool) or not isinstance(value, (int, float)) or
                value < 0 or int(value) != value):
            raise ValueError(f"ELF size response has invalid SizeInfo.{source}")
        values[target] = int(value)
    values.update(flash_bytes=values["text"] + values["data"],
                  ram_bytes=values["data"] + values["bss"])
    return values


def collect_elf_size(runner, cu, elf, source, error=None):
    """Persist platform-independent linked-size evidence from CFSUtil."""
    artifact = os.path.join(runner.ev, "elf_size.json")
    legacy = os.path.join(runner.ev, "size.txt")
    if os.path.isfile(legacy):
        os.unlink(legacy)
    if error:
        result = {"status": "unavailable", "error": error, "elf": elf,
                  "elf_source": source, "source": None, "metrics": None}
        runner.mark("elf_size", "unavailable", error=error)
    else:
        argv = [cu, "elf", "info", elf, "-s", "--format", "json"]
        rc, out, err = runner.run("elf_size", argv, check=False,
                                  error_status="unavailable", timeout=120)
        result = {"status": "unavailable", "elf": elf,
                  "elf_sha256": sha256(elf), "elf_source": source,
                  "source": "cfsutil elf info -s",
                  "command": argv, "returncode": rc, "metrics": None}
        try:
            if rc:
                raise ValueError(err.strip() or out.strip() or
                                 f"cfsutil elf info exited with {rc}")
            payload = json.loads(out)
            metrics = _size_metrics(payload)
            result.update(status="pass", metrics=metrics,
                          convention="cfsutil elf info SizeInfo (Text/Data/Bss)",
                          response=payload)
            dec = metrics["text"] + metrics["data"] + metrics["bss"]
            with open(legacy, "w") as fh:
                fh.write("   text\t   data\t    bss\t    dec\t    hex\tfilename\n")
                fh.write(f"{metrics['text']:8d}\t{metrics['data']:7d}\t"
                         f"{metrics['bss']:7d}\t{dec:7d}\t{dec:x}\t{elf}\n")
            note(f"linked flash {metrics['flash_bytes']:,} B, "
                 f"RAM {metrics['ram_bytes']:,} B (elf {result['elf_sha256'][:12]})")
        except (ValueError, TypeError) as exc:
            result["error"] = str(exc)
            phase = runner.phases[-1]
            phase.update(status="unavailable", error=str(exc))
            note(f"linked size unavailable: {exc}")
    with open(artifact, "w") as fh:
        json.dump(result, fh, indent=2)
    return result


def template_facts(ws):
    data = {}
    try:
        data = json.load(open(os.path.join(ws, ".cfs", ".cfsworkspace")))
    except (ValueError, OSError):
        pass
    return {
        "id": data.get("WorkspacePluginId") or data.get("workspacePluginId"),
        "version": data.get("WorkspacePluginVersion") or data.get("workspacePluginVersion"),
    }


def compatible_profiler_templates(runner, cu, args):
    """Return current compatible aiprof plugins, or ``None`` if discovery failed."""
    argv = [cu, "cfsplugins", "list", "--soc", args.soc, "--board", args.board,
            "--service", "aiprof", "--format", "json"]
    started = time.monotonic()
    try:
        proc = subprocess.run(argv, capture_output=True, text=True, errors="replace",
                              timeout=300)
        rc, out, err = proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired:
        rc, out, err = 124, "", "timed out after 300s"
    except OSError as exc:
        rc, out, err = 127, "", str(exc)
    ended = time.monotonic()
    elapsed = ended - started
    runner.cfs_intervals.append((started, ended))
    log = os.path.join(runner.logs, "template_discovery.log")
    with open(log, "w") as fh:
        fh.write(f"$ {' '.join(argv)}\n\n{out}\n{err}")
    try:
        payload = json.loads(out)
    except ValueError:
        runner.mark("template_discovery", "warning", elapsed,
                    note="plugin inventory unavailable; probing profiler workflow",
                    returncode=rc, command=" ".join(argv), log=log)
        return None
    if not payload.get("ok"):
        codes = {error.get("code") for error in payload.get("errors", [])}
        if "NO_PLUGINS_FOUND" in codes:
            runner.mark("template_discovery", "ok", elapsed,
                        note="no compatible aiprof template in current catalog",
                        returncode=rc, command=" ".join(argv), log=log)
            return []
        runner.mark("template_discovery", "warning", elapsed,
                    note="plugin inventory unavailable; probing profiler workflow",
                    returncode=rc, command=" ".join(argv), log=log)
        return None

    matches = []
    for plugin in (payload.get("data") or {}).get("plugins", []):
        for supported in plugin.get("supportedSocs") or []:
            if str(supported.get("name", "")).lower() != args.soc.lower():
                continue
            board = supported.get("board")
            if board and board.lower() != args.board.lower():
                continue
            package = supported.get("package")
            if package and package.lower() != args.package.lower():
                continue
            cores = supported.get("cores") or []
            if cores and args.core.lower() not in {str(core).lower() for core in cores}:
                continue
            matches.append({"id": plugin.get("pluginId"),
                            "version": plugin.get("pluginVersion")})
            break
    runner.mark("template_discovery", "ok", elapsed,
                note=(f"{len(matches)} compatible aiprof template(s)"
                      if matches else "no compatible aiprof template in current catalog"),
                returncode=rc, command=" ".join(argv), log=log)
    return matches


def create_text_workspace(runner, cu, args, parent, name, model):
    """Create and configure an ordinary AI-enabled TFLM workspace."""
    ws = os.path.join(parent, name)
    argv = [cu, "workspace", "create", "--soc", args.soc, "--board", args.board,
            "--package", args.package, "--template-id", TEXT_TEMPLATE_ID,
            "--output", parent, "--name", name]
    if runner.run("text_workspace_create", argv, long=True)[0] != 0:
        return None, None, None
    project, config, model_name = project_model_of(ws, args.core)
    if not (project and config and model_name):
        runner.mark("text_workspace_select", "failed", 0.0,
                    error=f"no enabled AI model assigned to core {args.core}")
        return None, None, None
    update = [cu, "ai", "model", "update", "--workspace", ws,
              "--name", model_name, "--set", f"model={model}"]
    if args.arena_size:
        update += ["--set", f"ArenaSize={args.arena_size}"]
    if runner.run("text_model_update", update)[0] != 0:
        return None, None, None
    if args.arena_size:
        note(f"arena overridden to {args.arena_size:,} B")
    if runner.run("text_generate", [cu, "generate", "-i", config, "-o", ws])[0] != 0:
        return None, None, None
    return ws, project, config


def set_text_runtime_plan(record, defines):
    """Share the same smoke contract for direct selection and late fallback."""
    record["runtime_plan"] = {
        "expected_inferences": 4,
        "arena_linked_bytes": defines.get("MODEL_ARENA_SIZE"),
        "synthetic": True,
        "input_source": "template hardcoded sine inputs",
        "user_dataset_exercised": False,
    }
    record["telemetry"] = {
        "host_command_telemetry": True,
        "commands": ["workspace create", "ai model update", "generate", "ai build",
                     "tasks run", "port capture"],
        "zephelin_profiler_telemetry": False,
        "note": "CLI phase telemetry can reach the host; no Zephelin runtime payload exists.",
    }
    record["notice"] = TEXT_RUNTIME_NOTICE
    note(TEXT_RUNTIME_NOTICE)


def prepare_text_run(ws, project):
    """Stamp the stock harness so old firmware output cannot satisfy this run."""
    path = os.path.join(ws, project, "src", "main.cpp")
    with open(path) as fh:
        source = fh.read()
    source = re.sub(r'\n[ \t]*MicroPrintf\("CFS_EVAL_RUN [0-9a-f]+"\);'
                    r' // CFS evaluation run marker', '', source)
    anchor = "tflite::InitializeTarget();"
    if source.count(anchor) != 1:
        raise ValueError("text harness must have one tflite::InitializeTarget(); "
                         "cannot establish a fresh-run boundary")
    run_id = uuid.uuid4().hex
    source = source.replace(anchor, anchor + '\n  MicroPrintf("CFS_EVAL_RUN '
                            + run_id + '"); // CFS evaluation run marker')
    with open(path, "w") as fh:
        fh.write(source)
    return run_id


def stop_capture(proc, grace=10):
    """Close the owned process group, including the Node child of shell launchers.

    A forced stop is a capture failure: unflushed data is never silently accepted.
    """
    def alive():
        proc.poll()  # reap the launcher before probing its group
        if os.name == "nt":
            return proc.returncode is None
        try:
            os.killpg(proc.pid, 0)
            return True
        except ProcessLookupError:
            return False

    if alive():
        try:
            if os.name == "nt":
                proc.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                os.killpg(proc.pid, signal.SIGINT)
        except ProcessLookupError:
            pass
    deadline = time.monotonic() + grace
    while alive() and time.monotonic() < deadline:
        time.sleep(0.05)
    forced = alive()
    if forced:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                           capture_output=True, timeout=10, check=False)
        else:
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
    proc.wait(timeout=10)
    return forced


def text_capture(runner, cu, ws, project, port, task, seconds, run_id):
    """Wait for the UART, flash, then capture until this run finishes or times out."""
    capture_dir = os.path.join(runner.ev, "text_capture", run_id)
    os.makedirs(capture_dir, exist_ok=True)
    argv = [cu, "port", "capture", "--port", port, "--workspace", ws,
            "--project", project, "--capture-format", "txt",
            "--capture-dir", capture_dir, "--timeout", "0"]
    log = os.path.join(runner.logs, "text_capture.log")
    started = time.monotonic()
    flash_rc, startup_rc, forced, stop_reason = 0, 0, False, "startup_failed"
    group = ({"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt"
             else {"start_new_session": True})
    with open(log, "w") as fh:
        fh.write(f"$ {' '.join(argv)}\n\n")
        fh.flush()
        try:
            proc = subprocess.Popen(argv, stdout=fh, stderr=subprocess.STDOUT,
                                    text=True, **group)
        except OSError as exc:
            runner.mark("text_capture", "failed", 0.0, error=str(exc), log=log)
            return 127, []
        try:
            ready = False
            deadline = time.monotonic() + 30
            while proc.poll() is None and time.monotonic() < deadline:
                with open(log, errors="replace") as output:
                    ready = "Capturing txt data from " in output.read()
                if ready:
                    break
                time.sleep(0.1)
            if not ready or proc.poll() is not None:
                startup_rc = proc.returncode or 124
            else:
                flash_rc = runner.run(
                    "flash_run", [cu, "tasks", "run", task, "--workspace", ws,
                                  "--project", project], long=True, timeout=seconds + 900)[0]
                # The nonce excludes old firmware even if it prints during flash.
                # The bounded inference window starts only after flashing ends.
                deadline = time.monotonic() + seconds
                stop_reason = "flash_failed" if flash_rc else "timeout"
                while flash_rc == 0 and proc.poll() is None:
                    files = glob.glob(os.path.join(capture_dir, "*.txt"))
                    if analyze_text(files, run_id)["status"] == "completed_smoke":
                        stop_reason = "completed_smoke"
                        break
                    if time.monotonic() >= deadline:
                        break
                    time.sleep(0.1)
        finally:
            forced = stop_capture(proc)
        capture_rc = proc.returncode
    ended = time.monotonic()
    runner.cfs_intervals.append((started, ended))
    rc = startup_rc or flash_rc or capture_rc or (124 if forced else 0)
    runner.mark("text_capture", "ok" if rc == 0 else "failed", ended - started,
                command=" ".join(argv), returncode=rc, process_returncode=capture_rc, log=log,
                stop_reason=stop_reason, forced_cleanup=forced, includes_phases=["flash_run"],
                error=("UART capture never became ready; no flash was attempted"
                       if startup_rc else None))
    return rc, sorted(glob.glob(os.path.join(capture_dir, "*.txt")))


def main():
    # Handled before the main parser, whose required args would otherwise block
    # a pure catalog query.
    if "--list-ai-targets" in sys.argv:
        try:
            cu = cfsutil_bin()
            if not cu:
                raise ValueError("cfsutil not found; set CFSUTIL or add it to PATH")
            print(json.dumps(list_ai_targets(cu), indent=2))
            return 0
        except (OSError, ValueError, subprocess.SubprocessError) as exc:
            print(json.dumps({"status": "failed", "error": str(exc)}, indent=2))
            return 2
    if "--list-zoo-models" in sys.argv:
        pre = argparse.ArgumentParser(add_help=False)
        pre.add_argument("--list-zoo-models", action="store_true")
        pre.add_argument("--catalog", default=DEFAULT_CATALOG)
        return list_zoo_models(pre.parse_known_args()[0].catalog)

    ap = argparse.ArgumentParser()
    ap.add_argument("--list-ai-targets", action="store_true",
                    help="list installed SoCs and AI-enabled cores from the current catalog, then exit")
    ap.add_argument("--list-zoo-models", action="store_true",
                    help="print the ADI Model Zoo catalog (models, quantizations, "
                         "tagged platforms) and exit; no other argument is required")
    ap.add_argument("--soc", required=True)
    ap.add_argument("--board", required=True)
    ap.add_argument("--core", help="AI-enabled core; inferred only when the catalog has one eligible core")
    ap.add_argument("--package")
    ap.add_argument("--model")
    ap.add_argument("--dataset")
    ap.add_argument("--zoo-model")
    ap.add_argument("--zoo-quant", default="int8")
    ap.add_argument("--catalog", default=DEFAULT_CATALOG)
    ap.add_argument("--evidence", required=True)
    ap.add_argument("--workspace-parent")
    ap.add_argument("--name")
    ap.add_argument("--workspace", help="reuse this existing workspace instead of creating one")
    ap.add_argument("--runtime-mode", choices=["auto", "zephelin", "text"], default="auto",
                    help="auto falls back to the ordinary AI-enabled TFLM template "
                         "when Zephelin is unavailable")
    ap.add_argument("--zephyr-board", help="Zephyr board directory name from the selected workspace")
    ap.add_argument("--probe", default="JLink")
    ap.add_argument("--port")
    ap.add_argument("--tile", type=int, default=0)
    ap.add_argument("--arena-size", type=int)
    ap.add_argument("--elf", help="built firmware ELF; required only when discovery is ambiguous")
    ap.add_argument("--capture-margin", type=float, default=2.5)
    ap.add_argument("--settle-seconds", type=int, default=8)
    ap.add_argument("--warmup", type=int, default=0)
    ap.add_argument("--stop-after", choices=["static", "build", "capture"])
    ap.add_argument("--reuse-from")
    ap.add_argument("--pin-package", action="append", default=[], metavar="NAME=VERSION",
                    help="repin a package in .cfs/.cfsdependencies before the gate. "
                         "Repeatable. Choose compatible firmware and toolchain versions "
                         "from the selected workspace's dependency metadata; package "
                         "names and versions depend on the target and template.")
    ap.add_argument("--install-pinned", action="store_true",
                    help="with --pin-package, also `pkg install` each pinned version. "
                         "Required: the build resolves the INSTALLED package, not the pin. "
                         "Installs software.")
    ap.add_argument("--no-caffeinate", action="store_true")
    ap.add_argument("--quiet", action="store_true",
                    help="suppress stderr progress narration")
    args = ap.parse_args()
    global QUIET
    QUIET = args.quiet

    cu = cfsutil_bin()
    if not cu:
        print(json.dumps({"status": "failed", "error":
                          "cfsutil not found; set CFSUTIL or add it to PATH"}, indent=2))
        return 2
    # Helper scripts resolve CFSUtil independently. Export the executable found
    # above so every gate and recheck uses the same installation as this run.
    os.environ["CFSUTIL"] = cu
    if not (args.model or args.zoo_model):
        print(json.dumps({"status": "failed",
                          "error": "give --model or --zoo-model"}, indent=2))
        return 2

    ev = os.path.abspath(os.path.expanduser(args.evidence))
    if any(os.path.exists(os.path.join(ev, name)) for name in ("run_record.json", "manifest.json")):
        print(json.dumps({"status": "failed", "error":
                          "evidence directory already contains a run; choose a fresh "
                          "--evidence directory and use --reuse-from for static reuse"}, indent=2))
        return 2
    os.makedirs(ev, exist_ok=True)
    inputs_dir = os.path.join(ev, "inputs")
    os.makedirs(inputs_dir, exist_ok=True)
    r = Runner(ev, wrap_caffeinate=not args.no_caffeinate)

    ver = subprocess.run([cu, "--version"], capture_output=True, text=True,
                         errors="replace").stdout.strip()
    say(f"\nCFS AI evaluation  {args.soc} / {args.board} / {args.core}"
        f"{' / ' + args.package if args.package else ''}")
    say(f"  cfsutil {ver}")
    say(f"  evidence {ev}")
    say()
    record = {
        "schema": "cfs-ai-evaluation/run-record/1",
        "started_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "status": "running",
        "execution": {"cfsutil_version": ver, "soc": args.soc, "board": args.board,
                      "core": args.core, "package": args.package,
                      "probe": args.probe, "port": args.port, "evidence_dir": ev},
        "inputs": {},
    }

    # ---- phase: resolve -------------------------------------------------
    t0 = time.monotonic()
    try:
        target = resolve_target(cu, args.soc, args.board, args.package, args.core)
        args.soc, args.board, args.package, args.core = (
            target[key] for key in ("soc", "board", "package", "core"))
        record["execution"].update(target)
        note(f"AI-enabled target {args.soc}/{args.board}/{args.core}, package {args.package}")
        if args.workspace:
            validate_workspace_package(os.path.abspath(os.path.expanduser(args.workspace)),
                                       args.package, args.soc, args.board)
        if args.zoo_model:
            model, dataset = resolve_zoo(args, inputs_dir, record)
        else:
            model, dataset = localize(args.model, inputs_dir), localize(args.dataset, inputs_dir)
    except SystemExit as exc:
        r.mark("resolve", "failed", time.monotonic() - t0, error=str(exc))
        return finish(r, dict(record, status="failed"), failed="resolve", code=1)
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        r.mark("resolve", "failed", time.monotonic() - t0, error=repr(exc))
        return finish(r, dict(record, status="failed"), failed="resolve", code=1)

    record["inputs"]["model"] = {"path": model, "sha256": sha256(model),
                                 "bytes": os.path.getsize(model)}
    if dataset:
        record["inputs"]["dataset"] = {"path": dataset, "sha256": sha256(dataset),
                                       "bytes": os.path.getsize(dataset)}
    r.mark("resolve", "ok", time.monotonic() - t0)
    cat = record["inputs"].get("catalog")
    if cat:
        note(f"catalog {cat.get('version')}: {cat.get('model')} / {cat.get('quantization')}")
        note(f"tagged platforms {cat.get('supported_platforms')}; "
             f"target_is_tagged={cat.get('target_is_tagged')}"
             + ("" if cat.get("target_is_tagged")
                else f" (using {cat.pop('_artifacts_from', None)} artifacts)"))
        if not cat.pop("_has_sample", True):
            note("catalog carries no sample binary for this quantization")
        cat.pop("_artifacts_from", None)
    note(f"model {os.path.basename(model)} "
         f"{record['inputs']['model']['bytes']:,} B "
         f"sha256 {record['inputs']['model']['sha256'][:12]}")
    if dataset:
        note(f"dataset {os.path.basename(dataset)} "
             f"{record['inputs']['dataset']['bytes']:,} B "
             f"sha256 {record['inputs']['dataset']['sha256'][:12]}")
    else:
        note("no dataset: the template's synthetic input will be used")
    if args.package:
        note(f"package {args.package}")
    write_input_hashes(ev, record)

    # ---- phase: static --------------------------------------------------
    if static_phase(r, cu, args, model, dataset, record) != 0:
        return finish(r, dict(record, status="failed"), failed="static", code=1)
    prof = {}
    try:
        prof = json.load(open(os.path.join(ev, "resource.cfsreport")))
    except (OSError, ValueError):
        pass
    est_ms = (prof.get("hardware_metrics") or {}).get("estimated_latency_ms")
    compat = {}
    try:
        compat = json.load(open(os.path.join(ev, "compat.json")))
    except (OSError, ValueError):
        pass
    hw = (prof.get("info") or {}).get("hardware") or {}
    record["static"] = {
        "estimated_latency_ms": est_ms,
        "peak_memory_kb": (prof.get("hardware_metrics") or {}).get("peak_memory_kb"),
        "total_macs": (prof.get("optimization_opportunities") or {}).get("total_macs"),
        "source": record.pop("static_source", None),
        "compat": {k: compat.get(k) for k in
                   ("code", "memory_issues", "operator_issues", "unsupported_types")},
        # An empty SupportedOps table means a compat "pass" verified less than it
        # looks like it did; the caller has to be able to see that.
        "compat_tables_populated": bool(hw.get("SupportedOps")),
    }
    issues = [k for k in ("memory_issues", "operator_issues", "unsupported_types")
              if compat.get(k)]
    note("ai compat: " + (f"issues in {issues}" if issues else "no memory, operator or "
         "type issues") + ("" if hw.get("SupportedOps") else
         "; SupportedOps table is EMPTY so this verified less than it appears"))
    est_txt = f"{est_ms:.3f}" if isinstance(est_ms, float) else str(est_ms)
    note(f"ai profile: est {est_txt} ms, "
         f"{record['static']['total_macs']:,} MACs, "
         f"peak_memory {record['static']['peak_memory_kb']} KB"
         if record["static"]["total_macs"] else f"ai profile: est {est_txt} ms")
    write_static_verdict(ev, record, args, compat, hw, est_ms)
    if args.stop_after == "static":
        return finish(r, dict(record, status="completed", endpoint="static"))

    # ---- phase: workspace -----------------------------------------------
    runtime_mode = args.runtime_mode
    if args.workspace:
        ws = os.path.abspath(os.path.expanduser(args.workspace))
        r.mark("workspace_reuse", "ok", 0.0, workspace=ws)
        if runtime_mode == "auto":
            runtime_mode = ("zephelin" if os.path.isfile(
                os.path.join(ws, ".cfs", "ai.cfsaiprof")) else "text")
    else:
        if not (args.workspace_parent and args.name):
            r.mark("workspace", "failed", 0.0,
                   error="need --workspace-parent and --name, or --workspace")
            return finish(r, dict(record, status="failed"), failed="workspace", code=1)
        parent = os.path.abspath(os.path.expanduser(args.workspace_parent))
        os.makedirs(parent, exist_ok=True)
        if runtime_mode == "auto":
            profiler_templates = compatible_profiler_templates(r, cu, args)
            if profiler_templates == []:
                runtime_mode = "text"
                record["execution"]["runtime_selection"] = {
                    "reason": "no compatible aiprof template in current plugin catalog",
                    "profiler_templates": [],
                }
                note("no compatible Zephelin profiler template is currently available; "
                     "selecting the ordinary AI-enabled TFLM workflow")
            elif profiler_templates:
                record["execution"]["runtime_selection"] = {
                    "reason": "compatible aiprof template available",
                    "profiler_templates": profiler_templates,
                }
            else:
                record["execution"]["runtime_selection"] = {
                    "reason": "template discovery unavailable; probing the profiler workflow",
                    "profiler_templates": None,
                }
        if runtime_mode == "text":
            ws, project, cfsconfig = create_text_workspace(
                r, cu, args, parent, args.name, model)
            if not ws:
                return finish(r, dict(record, status="failed"), failed="workspace", code=1)
        else:
            runtime_mode = "zephelin"
            ws = os.path.join(parent, args.name)
            argv = [cu, "ai", "workspace", "create", "--soc", args.soc, "--board", args.board,
                    "--core", args.core, "--model", model, "--output", parent, "--name", args.name,
                    "--skip-compat"]  # static_phase already checked this exact model/target
            if dataset:
                argv += ["--dataset", dataset]
            rc, out, _ = r.run(
                "ai_workspace_create", argv, long=True,
                error_status="unavailable" if args.runtime_mode == "auto" else "failed")
            if rc != 0:
                if args.runtime_mode != "auto":
                    return finish(r, dict(record, status="failed"), failed="workspace", code=1)
                profiler_ws = ws
                ws, project, cfsconfig = create_text_workspace(
                    r, cu, args, parent, f"{args.name}_text", model)
                if not ws:
                    return finish(r, dict(record, status="failed"), failed="workspace", code=1)
                runtime_mode = "text"
                record["execution"]["superseded_workspace"] = profiler_ws
                record["execution"]["runtime_selection"] = {
                    "reason": "profiler workflow unavailable; ordinary AI template selected",
                    "profiler_templates": record["execution"].get(
                        "runtime_selection", {}).get("profiler_templates"),
                }
                note("profiler workflow is unavailable; selecting the ordinary "
                     "AI-enabled TFLM workflow")
            else:
                m = re.search(r"Estimated to be (\d+) bytes", out)
                if m:
                    record.setdefault("build", {})["arena_estimated_bytes"] = int(m.group(1))
                m = re.search(r"Template:\s*(\S+)\s*\(version\s*([^)]+)\)", out)
                if m:
                    record["execution"]["template"] = {
                        "id": m.group(1), "version": m.group(2).strip()}
        if not record["execution"].get("template"):
            record["execution"]["template"] = template_facts(ws)
        tmpl = record["execution"].get("template") or {}
        if tmpl:
            note(f"template {tmpl.get('id')} {tmpl.get('version')}")
        est_arena = (record.get("build") or {}).get("arena_estimated_bytes")
        if est_arena:
            note(f"arena auto-estimated at {est_arena:,} B "
                 "(historically ~8x the true high-water mark; the trace settles it)")
    record["execution"]["workspace"] = ws
    record["execution"]["runtime_mode"] = runtime_mode
    note(f"workspace {ws}")
    try:
        validate_workspace_package(ws, args.package, args.soc, args.board)
    except (OSError, ValueError) as exc:
        r.mark("workspace_package", "failed", error=str(exc))
        return finish(r, dict(record, status="failed"), failed="workspace_package", code=1)

    # ---- phase: declared package pins ----------------------------------
    # Repinning the manifest is inert on its own: verified 2026-10-03, a build
    # with the manifest repinned to zephyr 4.3.0 but 4.4.0-b.1 installed still
    # resolved 4.4.0-b.1 and aborted in Kconfig. --install-pinned is what makes
    # the pin take effect.
    pin_failure = apply_package_pins(
        r, cu, ws, args.pin_package, install=args.install_pinned)
    if pin_failure:
        return finish(r, dict(record, status="failed"), failed=pin_failure, code=1)

    selected_project, selected_config, selected_model = project_model_of(ws, args.core)
    project = selected_project
    cfsconfig = selected_config
    record["execution"]["project"] = project
    if not project:
        r.mark("workspace", "failed", 0.0,
               error=f"no project with an enabled AI model assigned to core {args.core} under {ws}")
        return finish(r, dict(record, status="failed"), failed="workspace", code=1)

    # ---- phase: dataset sizing + arena override (one regeneration pass) --
    d = read_defines(ws, project)
    inp = d.get("MODEL_INPUT_0_LEN", 0) * d.get("MODEL_INPUT_0_WIDTH", 0)
    have = (d.get("MODEL_DATASET_LEN", 0) // inp) if inp else 0
    sets = []
    if runtime_mode == "text":
        if dataset or args.tile:
            note("text fallback keeps the template inputs unchanged; the supplied dataset "
                 "and --tile request are not applied")
    elif args.tile and dataset and inp and have < args.tile:
        raw = open(dataset, "rb").read()[:inp] if inp else b""
        tiled = os.path.join(inputs_dir,
                             f"{os.path.splitext(os.path.basename(dataset))[0]}_x{args.tile}.bin")
        with open(tiled, "wb") as fh:
            fh.write(raw * args.tile)
        sets.append(f"dataset={tiled}")
        record["inputs"]["dataset_tiled"] = {
            "path": tiled, "sha256": sha256(tiled), "bytes": os.path.getsize(tiled),
            "tiled_from": dataset, "samples": args.tile}
        write_input_hashes(ev, record)
        note(f"dataset tiled {have} -> {args.tile} samples "
             f"({os.path.getsize(tiled):,} B) so latency statistics are possible")
    elif args.tile and have >= args.tile:
        note(f"dataset already drives {have} inferences; no tiling needed")
    # Newly created text workspaces receive the arena override together with
    # their model replacement before their first regeneration. Reused text
    # workspaces still need the update here.
    if args.arena_size and (runtime_mode != "text" or args.workspace):
        sets.append(f"ArenaSize={args.arena_size}")
        note(f"arena overridden to {args.arena_size:,} B")
    if sets:
        argv = [cu, "ai", "model", "update", "--workspace", ws,
                "--name", selected_model or "model"]
        for s in sets:
            argv += ["--set", s]
        if r.run("ai_model_update", argv)[0] != 0:
            return finish(r, dict(record, status="failed"), failed="model_update", code=1)
        if cfsconfig:
            if r.run("generate", [cu, "generate", "-i", cfsconfig, "-o", ws])[0] != 0:
                return finish(r, dict(record, status="failed"), failed="generate", code=1)
        d = read_defines(ws, project)
    if runtime_mode == "text":
        expected = 4
        set_text_runtime_plan(record, d)
    else:
        expected = ((d.get("MODEL_DATASET_LEN", 0) // inp) if inp else 0) or 10
        record["runtime_plan"] = {"expected_inferences": expected,
                                  "arena_linked_bytes": d.get("MODEL_ARENA_SIZE"),
                                  "synthetic": "MODEL_DATASET_LEN" not in d,
                                  "user_dataset_exercised": bool(dataset)}
        note(f"{expected} inferences expected from the linked dataset; "
             f"arena linked at {(d.get('MODEL_ARENA_SIZE') or 0):,} B")

    # ---- phase: gate ----------------------------------------------------
    zb = args.zephyr_board or zephyr_board_of(ws, project)
    gate_argv = [sys.executable, os.path.join(HERE, "prebuild_gate.py"),
                 "--workspace", ws, "--project", project, "--json"]
    if zb:
        gate_argv += ["--board", zb]
    gate_rc, out, _ = r.run(
        "prebuild_gate", gate_argv, check=False,
        error_status=("check" if args.runtime_mode == "auto" and
                      runtime_mode == "zephelin" else "failed"))
    gate = parse_gate_result(out, gate_rc)
    gate_path = os.path.join(ev, "gate.json")
    with open(gate_path, "w") as fh:
        json.dump(gate, fh, indent=2)
    record["gate"] = gate_summary(gate)
    will_use_text_fallback = (
        gate.get("status") == "fail" and args.runtime_mode == "auto"
        and not args.workspace and gate.get("zephelin_module_present") is False)
    if gate.get("status") == "error":
        note(f"gate error: {gate.get('error')}")
    elif gate.get("uses_zephyr"):
        note(f"gate {gate.get('status')}: zephyr pinned {gate.get('pinned_zephyr')}, "
             f"resolved {gate.get('resolved_zephyr')} (via {gate.get('resolved_source')}); "
             f"zephelin={gate.get('zephelin_module_present')} "
             f"board={gate.get('board_present')}")
    else:
        note(f"gate {gate.get('status')}: non-Zephyr workspace; model and dataset checked")
    for f in (gate.get("failures") or []):
        note(("profiler gate failure: " if will_use_text_fallback else "gate failure: ") + f)
    for w in (gate.get("warnings") or []):
        note(f"gate warning: {w}")

    if gate.get("status") == "fail":
        if (args.runtime_mode == "auto" and not args.workspace
                and gate.get("zephelin_module_present") is False):
            fallback_name = f"{args.name}_text"
            old_ws = ws
            profiler_gate = gate
            profiler_gate_path = os.path.join(ev, "profiler_gate.json")
            if os.path.isfile(gate_path):
                os.replace(gate_path, profiler_gate_path)
            else:
                with open(profiler_gate_path, "w") as fh:
                    json.dump(profiler_gate, fh, indent=2)
            record["profiler_gate"] = gate_summary(profiler_gate)
            record["profiler_gate"]["evidence"] = profiler_gate_path
            record["gate"] = {}
            next(p for p in reversed(r.phases)
                 if p["phase"] == "prebuild_gate")["status"] = "unavailable"
            ws, project, cfsconfig = create_text_workspace(
                r, cu, args, parent, fallback_name, model)
            if not ws:
                return finish(r, dict(record, status="failed"),
                              failed="text_workspace", code=1)
            runtime_mode = "text"
            record["execution"].update({
                "workspace": ws,
                "project": project,
                "runtime_mode": runtime_mode,
                "template": template_facts(ws),
                "superseded_workspace": old_ws,
            })
            record["execution"]["runtime_selection"] = {
                "reason": "Zephelin dependency unavailable; ordinary AI template selected",
                "profiler_templates": record["execution"].get(
                    "runtime_selection", {}).get("profiler_templates"),
            }
            record.pop("runtime_plan", None)
            record.pop("telemetry", None)
            record.pop("notice", None)
            try:
                validate_workspace_package(ws, args.package, args.soc, args.board)
            except (OSError, ValueError) as exc:
                r.mark("text_workspace_package", "failed", error=str(exc))
                return finish(r, dict(record, status="failed"),
                              failed="text_workspace_package", code=1)
            pin_failure = apply_package_pins(
                r, cu, ws, args.pin_package, phase="text_pin_packages")
            if pin_failure:
                return finish(r, dict(record, status="failed"),
                              failed=pin_failure, code=1)

            text_zb = args.zephyr_board or zephyr_board_of(ws, project)
            text_gate_argv = [sys.executable, os.path.join(HERE, "prebuild_gate.py"),
                              "--workspace", ws, "--project", project, "--json"]
            if text_zb:
                text_gate_argv += ["--board", text_zb]
            text_gate_rc, text_gate_out, _ = r.run(
                "text_prebuild_gate", text_gate_argv, check=False)
            gate_rc = text_gate_rc
            gate = parse_gate_result(
                text_gate_out, gate_rc, label="replacement workspace pre-build gate")
            gate.setdefault("workspace", ws)
            gate.setdefault("project", project)
            gate.setdefault("board", text_zb)
            with open(gate_path, "w") as fh:
                json.dump(gate, fh, indent=2)
            record["gate"] = gate_summary(gate)
            record["gate"]["fallback"] = "ordinary AI-enabled TFLM workspace"
            record["gate"]["profiler_gate_evidence"] = profiler_gate_path
            if gate.get("status") == "error":
                note(f"replacement gate error: {gate.get('error')}")
            elif gate.get("uses_zephyr"):
                note(f"replacement gate {gate.get('status')}: zephyr pinned "
                     f"{gate.get('pinned_zephyr')}, resolved {gate.get('resolved_zephyr')} "
                     f"(via {gate.get('resolved_source')}); board={gate.get('board_present')}")
            else:
                note(f"replacement gate {gate.get('status')}: non-Zephyr workspace; "
                     "model and dataset checked")
            for failure in (gate.get("failures") or []):
                note(f"replacement gate failure: {failure}")
            for warning in (gate.get("warnings") or []):
                note(f"replacement gate warning: {warning}")
            if not gate_passed(gate):
                r.phases[-1]["status"] = "failed"
                record["remedy"] = gate.get("failures") or [
                    gate.get("error") or
                    "replacement workspace did not pass its pre-build gate"
                ]
                return finish(
                    r, dict(record, status="blocked",
                            note="replacement workspace pre-build gate failed; "
                                 "nothing was built or flashed"),
                    failed="text_prebuild_gate", code=1)
            expected = 4
            d = read_defines(ws, project)
            set_text_runtime_plan(record, d)
            note(f"continuing with text-runtime smoke workspace {ws}")
    if not gate_passed(gate):
        r.phases[-1]["status"] = "failed"
        record["remedy"] = gate.get("failures") or [
            gate.get("error") or "pre-build gate did not pass"
        ]
        note_text = "pre-build gate did not pass; nothing was built or flashed"
        if (gate.get("status") == "fail"
                and gate.get("zephelin_module_present") is False):
            note_text += (". Select a compatible Zephelin-bearing Zephyr reference, then "
                          "re-run with --pin-package zephyr=VERSION --install-pinned")
        return finish(r, dict(record, status="blocked", note=note_text),
                      failed="prebuild_gate", code=1)

    # ---- phase: build ---------------------------------------------------
    if runtime_mode == "text":
        try:
            record["runtime_plan"]["run_id"] = prepare_text_run(ws, project)
        except (OSError, ValueError) as exc:
            r.mark("text_run_marker", "failed", error=str(exc))
            return finish(r, dict(record, status="failed"), failed="text_run_marker", code=1)
    if r.run("build", [cu, "tasks", "run", "build", "--workspace", ws, "--project", project],
             long=True)[0] != 0:
        return finish(r, dict(record, status="failed"), failed="build", code=1)
    build_phase_seconds = r.phases[-1].get("seconds") or 0.0
    bd = os.path.join(ws, project, "build")
    tc = subprocess.run([sys.executable, os.path.join(HERE, "check_build_timing.py"), bd,
                         "--json"], capture_output=True, text=True, errors="replace")
    try:
        timing_check = json.loads(tc.stdout)
        with open(os.path.join(ev, "build_timing_check.json"), "w") as fh:
            json.dump(timing_check, fh, indent=2)
        record.setdefault("build", {})["timing_sound"] = timing_check.get("timing_sound")
        if not timing_check.get("timing_sound"):
            r.mark("build_timing", "warning", 0.0,
                   note="host suspend signature found; the build duration is VOID, not slow")
        else:
            nw = timing_check.get("wall_seconds") or 0.0
            msg = (f"build timing sound: ninja log reports {nw}s wall, implied "
                   f"parallelism {timing_check.get('implied_parallelism')}; "
                   f"this phase took {build_phase_seconds:.2f}s")
            if build_phase_seconds and nw > build_phase_seconds * 2:
                msg += (" -- incremental build, so the ninja log describes an earlier "
                        "compile; do not quote it as this run's build time")
            note(msg)
    except ValueError:
        pass
    # The authoritative record of which Zephyr was used, and whether the
    # instrumentation module came with it. Evidence, never inference.
    cache_txt = os.path.join(bd, "CMakeCache.txt")
    if os.path.isfile(cache_txt):
        for line in open(cache_txt):
            if line.startswith("ZEPHYR_BASE"):
                record.setdefault("build", {})["zephyr_base"] = line.split("=", 1)[1].strip()
                break
    dotcfg = os.path.join(bd, "zephyr", ".config")
    if os.path.isfile(dotcfg):
        txt = open(dotcfg).read()
        record.setdefault("build", {})["zephelin_module_present"] = (
            "CONFIG_ZEPHYR_ZEPHELIN_MODULE=y" in txt)
        record["build"]["debug_build"] = "CONFIG_DEBUG=y" in txt
        record["build"]["speed_optimizations"] = "CONFIG_SPEED_OPTIMIZATIONS=y" in txt
        note(f"config: zephelin={record['build'].get('zephelin_module_present')}, "
             f"debug={record['build']['debug_build']}, "
             f"speed_opt={record['build']['speed_optimizations']}")
        if record["build"]["debug_build"] and not record["build"]["speed_optimizations"]:
            note("CONFIG_DEBUG=y with CONFIG_SPEED_OPTIMIZATIONS unset: part of any "
                 "measured-vs-estimated gap is debug overhead, not silicon")

    elf, elf_source, elf_error = discover_elf(ws, project, bd, args.elf)
    build_record = record.setdefault("build", {})
    if elf:
        build_record.update(elf_path=elf, elf_source=elf_source,
                            elf_sha256=sha256(elf))
    size_result = collect_elf_size(r, cu, elf, elf_source, elf_error)
    build_record["size"] = {
        key: size_result.get(key) for key in
        ("status", "source", "error", "metrics", "convention")
        if size_result.get(key) is not None
    }
    if args.stop_after == "build":
        return finish(r, dict(record, status="completed", endpoint="build"))

    # ---- phase: flash + capture ----------------------------------------
    if not args.port:
        r.mark("capture", "failed", 0.0, error="--port is required to capture")
        return finish(r, dict(record, status="failed"), failed="capture", code=1)
    aiprof = {}
    ap_path = os.path.join(ws, ".cfs", "ai.cfsaiprof")
    if os.path.isfile(ap_path):
        try:
            aiprof = json.load(open(ap_path))
        except (ValueError, OSError):
            pass
    label = (aiprof.get("Debuggers") or {}).get(args.probe)
    task = sanitize_task_label(label) if label else f"flash_run_{args.probe}"
    record["execution"]["flash_task"] = task
    record["execution"]["capture"] = (aiprof.get("Output") if aiprof else {
        "Interface": "UART", "Format": "TEXT", "Port": args.port})

    secs = int(expected * ((est_ms or 0) / 1000.0) * args.capture_margin) + args.settle_seconds
    secs = max(secs, args.settle_seconds + 2)
    record["runtime_plan"]["capture_seconds"] = secs
    record["runtime_plan"]["capture_derivation"] = (
        f"{expected} inferences x {est_ms} ms x {args.capture_margin} margin "
        f"+ {args.settle_seconds}s settle")
    note(f"flash task {task} on {args.probe} via {args.port}")
    note(f"capture window {secs}s = {expected} inferences x "
         f"{(est_ms or 0):.3f} ms x {args.capture_margin} margin "
         f"+ {args.settle_seconds}s settle")
    say("    -> flashing now; this REPLACES the firmware on the attached board")
    if runtime_mode == "text":
        run_id = record["runtime_plan"]["run_id"]
        rc, text_files = text_capture(r, cu, ws, project, args.port, task, secs, run_id)
        if rc != 0:
            return finish(r, dict(record, status="failed"), failed="flash_capture", code=1)
        if args.stop_after == "capture":
            return finish(r, dict(record, status="completed", endpoint="text capture"))
        argv = [sys.executable, os.path.join(HERE, "analyze_text.py"), *text_files,
                "--run-id", run_id, "--json"]
        rc, out, _ = r.run("analyze_text", argv, check=False)
        try:
            analysis = json.loads(out)
            with open(os.path.join(ev, "text_analysis.json"), "w") as fh:
                json.dump(analysis, fh, indent=2)
        except ValueError:
            analysis = None
        if rc != 0 or not analysis or analysis.get("status") != "completed_smoke":
            record["remedy"] = [
                "The UART capture did not contain this firmware's run marker, all four "
                "ordered Test lines and the final Done marker in one harness invocation. "
                "Inspect text_capture.log and the raw capture before a targeted retry."
            ]
            return finish(r, dict(record, status="failed"), failed="analyze_text", code=1)
        cycles = analysis.get("cycles")
        record["runtime"] = {
            "expected_inferences": expected,
            "observed_inferences": analysis.get("observed_inferences"),
            "valid_inferences": analysis.get("observed_inferences"),
            "complete": analysis.get("observed_inferences") == expected,
            "cycles": cycles,
            "arena_used_bytes": analysis.get("arena_used_bytes"),
            "accuracy_measured": False,
            "per_layer_timing_available": False,
            "user_dataset_exercised": False,
            "text_files": text_files,
        }
        record["endpoint"] = "hardware inference smoke evaluation"
        save_record(r, record)
        bargv = [sys.executable, os.path.join(HERE, "build_bundle.py"),
                 "--evidence", ev, "--workspace", ws, "--project", project]
        if r.run("build_bundle", bargv)[0] != 0:
            return finish(r, dict(record, status="failed"), failed="build_bundle", code=1)
        with open(os.path.join(ev, "manifest.json")) as fh:
            manifest = json.load(fh)
        record["bundle"] = {"manifest": os.path.join(ev, "manifest.json"),
                            "runtime_report": manifest["reports"]["runtime"],
                            "evidence_dir": ev}
        note(f"text runtime observed {analysis.get('observed_inferences')} inference calls; "
             f"arena used {format_metric(analysis.get('arena_used_bytes'), ',')} B")
        if cycles:
            note(f"whole-inference cycles mean {cycles.get('mean')}, "
                 f"min {cycles.get('min')}, max {cycles.get('max')}")
        note(TEXT_RUNTIME_NOTICE)
        return finish(r, dict(record, status="completed_smoke"),
                      failed=None, code=0)

    tef = os.path.join(ev, "run.tef")
    if r.run("flash_capture",
             [cu, "tasks", "run", task, "--workspace", ws, "--project", project,
              "--capture", "--port", args.port, "--timeout", str(secs),
              "--zephyrTraceFile", tef], long=True, timeout=secs + 900)[0] != 0:
        return finish(r, dict(record, status="failed"), failed="flash_capture", code=1)
    if args.stop_after == "capture":
        return finish(r, dict(record, status="completed", endpoint="capture"))

    # ---- phase: analyze + bundle ---------------------------------------
    argv = [sys.executable, os.path.join(HERE, "analyze_tef.py"), tef, "--json"]
    if args.warmup:
        argv += ["--warmup", str(args.warmup)]
    rc, out, _ = r.run("analyze_tef", argv, check=False)
    try:
        analysis = json.loads(out)
        with open(os.path.join(ev, "analysis.json"), "w") as fh:
            json.dump(analysis, fh, indent=2)
    except ValueError:
        analysis = None
    if rc != 0 or not analysis or not analysis.get("contexts"):
        record["remedy"] = [
            "No complete inference spans in the trace. Most often the arena is too small: "
            "the profiling template has no console, so a failed AllocateTensors() is silent. "
            "Re-run with a larger --arena-size, or widen --capture-margin if the window "
            "may have truncated the run."]
        return finish(r, dict(record, status="failed"), failed="analyze_tef", code=1)

    bargv = [sys.executable, os.path.join(HERE, "build_bundle.py"), "--evidence", ev,
             "--workspace", ws, "--project", project]
    if args.warmup:
        bargv += ["--warmup", str(args.warmup)]
    record["endpoint"] = "hardware evaluation"
    save_record(r, record)
    if r.run("build_bundle", bargv)[0] != 0:
        return finish(r, dict(record, status="failed"), failed="build_bundle", code=1)

    ctx = analysis["contexts"][0]
    lat = ctx.get("latency_us") or {}
    mean_ms = (lat.get("mean") or 0) / 1000.0
    record["runtime"] = {
        "expected_inferences": expected,
        "observed_inferences": ctx.get("observed_inferences"),
        "valid_inferences": ctx.get("valid_inferences"),
        "mean_latency_ms": round(mean_ms, 6),
        "complete": ctx.get("observed_inferences") == expected,
    }
    if est_ms:
        record["runtime"]["measured_vs_estimated_ratio"] = round(mean_ms / est_ms, 4)
    obs = ctx.get("observed_inferences")
    note(f"inferences expected {expected} / observed {obs} / "
         f"valid {ctx.get('valid_inferences')}"
         + ("" if obs == expected else "  <-- MISMATCH: do not quote this timing"))
    note(f"latency mean {mean_ms:.3f} ms "
         f"(min {(lat.get('min') or 0) / 1000:.3f}, max {(lat.get('max') or 0) / 1000:.3f}, "
         f"stdev {lat.get('stdev') or 0:.1f} us)"
         + (f"; {record['runtime']['measured_vs_estimated_ratio']}x the "
            f"{est_ms:.3f} ms estimate" if est_ms else ""))
    if ctx.get("observed_inferences") != expected:
        r.mark("capture_completeness", "warning", 0.0,
               note=f"observed {ctx.get('observed_inferences')} of {expected} expected; "
                    "widen --capture-margin and recapture before trusting the statistics")
    with open(os.path.join(ev, "manifest.json")) as fh:
        manifest = json.load(fh)
    record["bundle"] = {"manifest": os.path.join(ev, "manifest.json"),
                        "runtime_report": manifest["reports"]["runtime"],
                        "evidence_dir": ev}
    try:
        man = json.load(open(os.path.join(ev, "manifest.json")))
        b, cor = man.get("build") or {}, man.get("correlation") or {}
        runtime = man.get("runtime") or {}
        note(f"linked RAM {format_metric(b.get('ram_bytes'), ',')}/"
             f"{format_metric(b.get('ram_total'), ',')} B "
             f"({format_metric(b.get('ram_pct'), unit='%')}), flash "
             f"{format_metric(b.get('flash_bytes'), ',')}/"
             f"{format_metric(b.get('flash_total'), ',')} B")
        note(f"arena linked {format_metric(b.get('arena_linked_bytes'), ',')} B "
             f"vs measured {format_metric(runtime.get('arena_used_bytes'), ',')} B "
             f"({format_metric(cor.get('arena_linked_over_used'), unit='x')} over; "
             f"{format_metric(cor.get('reclaimable_ram_bytes'), ',')} B reclaimable)")
        cav = man.get("caveats") or []
        if cav:
            note(f"caveats: {', '.join(cav)}")
    except (OSError, TypeError, ValueError):
        pass
    return finish(r, dict(record, status="completed", endpoint="hardware evaluation"))


if __name__ == "__main__":
    sys.exit(main())
