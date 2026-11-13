#!/usr/bin/env python3
# Copyright (c) 2026 Analog Devices, Inc.
"""Extract smoke-level runtime facts from the stock non-Zephelin TFLM demo.

The ordinary ``com.analog.zephyr.workspace.tflm`` template prints arena use,
one ``Test N`` line per invocation, an optional template-provided cycle summary, and a
final ``Done`` line.  This parser deliberately leaves predictions and pass/fail
results uninterpreted: the demo's sine inputs are not the user's dataset and do
not establish accuracy for a replacement model.
"""

import argparse
import json
import os
import re
import sys


NOTICE = (
    "Zephelin AI profiler is not available for this workspace, hence AI inference "
    "report lacks accuracy data, per-layer timing and user data set is not exercised"
)


def analyze(paths, run_id=None):
    """Read the latest harness invocation; never merge tests across boots/files.

    New captures require the nonce embedded in the flashed firmware. Unmarked
    historical captures can still be inspected, but cannot prove run identity.
    Zephyr's buffered boot banner may arrive *after* Done, so it is not a boundary.
    """
    existing = []
    text = ""
    for path in sorted(paths):
        if os.path.isfile(path):
            existing.append(os.path.abspath(path))
            with open(path, errors="replace") as fh:
                chunk = fh.read()
            text = chunk

    markers = list(re.finditer(r"CFS_EVAL_RUN ([0-9a-f]+)\b", text))
    captured_run_id = markers[-1].group(1) if markers else None
    if markers:
        text = text[markers[-1].end():]
    identity_matches = run_id is None or captured_run_id == run_id

    # Arena output starts a new harness, even if it crashes before Test 0. A
    # repeated Test 0 also starts a new harness when no arena header was captured.
    start, tests_seen = 0, False
    for boundary in re.finditer(r"TFLM arena usage:|\bTest\s+0\s+(?:passed|failed)\b",
                                text, re.I):
        if boundary.group().lower().startswith("tflm"):
            start, tests_seen = boundary.start(), False
        else:
            if tests_seen:
                start = boundary.start()
            tests_seen = True
    text = text[start:]

    arena = re.search(
        r"TFLM arena usage:\s*.*?Used=(\d+) bytes\s*.*?Total=(\d+) bytes\s*"
        r".*?Free=(\d+) bytes",
        text,
        re.S,
    )
    tests = list(re.finditer(r"\bTest\s+(\d+)\s+(passed|failed)\b", text, re.I))
    done = re.search(r"\bDone\s*-\s*(Success|Failures)\b", text, re.I)
    cycles = re.search(
        r"Inference performance \(CPU cycles\):\s*.*?avg:\s*([0-9.]+)\s*"
        r".*?min:\s*(\d+)\s*.*?max:\s*(\d+)",
        text,
        re.S | re.I,
    )

    indices = [int(test.group(1)) for test in tests]
    complete = (identity_matches and indices == [0, 1, 2, 3]
                and done is not None and done.start() > tests[-1].end())
    result = {
        "schema": "cfs-ai-evaluation/text-runtime/1",
        "runtime_mode": "text",
        "source_files": existing,
        "bytes_captured": sum(os.path.getsize(path) for path in existing),
        "run_id": captured_run_id,
        "run_identity_verified": run_id is not None and identity_matches,
        "observed_inferences": len(indices),
        "test_indices": indices,
        "harness_completed": bool(done),
        "harness_result_ignored": done.group(1).lower() if done else None,
        "arena_used_bytes": int(arena.group(1)) if arena else None,
        "arena_total_bytes": int(arena.group(2)) if arena else None,
        "arena_free_bytes": int(arena.group(3)) if arena else None,
        "cycles": {
            "mean": float(cycles.group(1)),
            "min": int(cycles.group(2)),
            "max": int(cycles.group(3)),
        } if cycles else None,
        "user_dataset_exercised": False,
        "accuracy_measured": False,
        "per_layer_timing_available": False,
        "notice": NOTICE,
    }
    result["status"] = (
        "completed_smoke" if complete else "incomplete"
    )
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--run-id", help="require this firmware run marker")
    args = ap.parse_args()
    result = analyze(args.paths, args.run_id)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(result["notice"])
        print(f"status: {result['status']}")
        print(f"observed inferences: {result['observed_inferences']}")
        print(f"arena used: {result['arena_used_bytes']}")
    return 0 if result["status"] == "completed_smoke" else 2


if __name__ == "__main__":
    sys.exit(main())
