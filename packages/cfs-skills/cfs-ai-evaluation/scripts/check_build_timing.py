#!/usr/bin/env python3
# Copyright (c) 2026 Analog Devices, Inc.
"""Report true build wall time from ninja's own log and flag corrupted timings.

Reads `<project>/build/.ninja_log`, which the Zephyr/west build already writes
for every target, and reports the build's real wall span, aggregate task time
and implied parallelism. No extra instrumentation is added to the build.

Its main job is to reject a measurement rather than to produce one. A host
suspend (macOS idle sleep, lid close, hibernate) freezes every in-flight
compiler process and resumes them together, so the wrapper's wall-clock delta
counts the suspend as build time. The signature is unmistakable in the ninja
log: a cluster of targets whose durations are long, near-identical and whose
end times land within a fraction of a second of each other, regardless of how
much work each target actually represents. Treat any phase timing that spans a
suspend as void -- do not report it, and do not optimize against it.

Usage:
    python3 check_build_timing.py <workspace>/<project>/build [--json]
    python3 check_build_timing.py <path-to-.ninja_log> [--json]

Exit codes: 0 timing looks sound; 2 timing is suspect (stall detected);
            3 no usable ninja log.
"""

import argparse
import json
import os
import re
import statistics
import subprocess
import sys

# A target is only a stall candidate if it ran this long. Real Zephyr/TFLM
# translation units land well under this even on a slow host.
STALL_MIN_SECONDS = 30.0
# Stalled peers release together on resume; this is the spread we allow
# between their end times before we stop calling it one event.
STALL_END_SPREAD_SECONDS = 2.0
# A stall needs at least this many peers. A single genuinely slow target
# (a large C++ TU) is not a suspend.
STALL_MIN_TARGETS = 3


def find_log(arg):
    if os.path.isdir(arg):
        return os.path.join(arg, ".ninja_log")
    return arg


def load_entries(path):
    """Return [(start_s, end_s, dur_s, output)] for the most recent session.

    ninja appends to .ninja_log across invocations and its offsets are
    relative to each invocation's start, so mixing sessions would make the
    wall span meaningless. ninja rewrites the log in place on each run and
    keeps the last entry per output, so dedupe by output keeping the last
    occurrence, then treat what remains as one session.
    """
    entries = {}
    with open(path) as fh:
        for line in fh:
            if line.startswith("#"):
                continue
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 5:
                continue
            try:
                start, end = int(parts[0]), int(parts[1])
            except ValueError:
                continue
            entries[parts[3]] = (start / 1000.0, end / 1000.0, (end - start) / 1000.0, parts[3])
    return sorted(entries.values(), key=lambda r: r[0])


def detect_stall(rows):
    """Group long targets whose end times cluster. Returns list of clusters."""
    long_rows = sorted((r for r in rows if r[2] >= STALL_MIN_SECONDS), key=lambda r: r[1])
    clusters = []
    current = []
    for row in long_rows:
        if current and row[1] - current[-1][1] > STALL_END_SPREAD_SECONDS:
            clusters.append(current)
            current = []
        current.append(row)
    if current:
        clusters.append(current)
    return [c for c in clusters if len(c) >= STALL_MIN_TARGETS]


def sleep_events(window_hint=None):
    """Best-effort host suspend lookup. Returns (events, available).

    macOS only; `pmset -g log` records entry into sleep with the duration it
    stayed asleep. Absence of this tool is not evidence that no suspend
    happened, so callers must not treat an empty list as a clean bill.
    """
    if sys.platform != "darwin":
        return [], False
    try:
        out = subprocess.run(
            ["pmset", "-g", "log"], capture_output=True, text=True, timeout=30
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return [], False
    found = []
    for line in out.splitlines():
        if "Entering Sleep state" not in line:
            continue
        stamp = line.split(" +")[0].strip()
        secs = re.search(r"(\d+)\s+secs", line)
        found.append({"at": stamp, "slept_seconds": int(secs.group(1)) if secs else None})
    return found, True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("build_dir", help="project build directory, or a .ninja_log path")
    ap.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = ap.parse_args()

    path = find_log(args.build_dir)
    if not os.path.exists(path):
        print(f"no ninja log at {path}", file=sys.stderr)
        return 3
    rows = load_entries(path)
    if not rows:
        print(f"ninja log at {path} has no usable entries", file=sys.stderr)
        return 3

    wall = max(r[1] for r in rows) - min(r[0] for r in rows)
    task_time = sum(r[2] for r in rows)
    durations = sorted(r[2] for r in rows)
    clusters = detect_stall(rows)
    stalled_seconds = sum(max(c, key=lambda r: r[2])[2] for c in clusters)
    suspends, suspend_lookup_available = sleep_events()

    out = {
        "ninja_log": path,
        "targets": len(rows),
        "wall_seconds": round(wall, 2),
        "task_seconds": round(task_time, 2),
        "implied_parallelism": round(task_time / wall, 2) if wall > 0 else None,
        "median_target_seconds": round(statistics.median(durations), 3),
        "max_target_seconds": round(durations[-1], 2),
        "timing_sound": not clusters,
        "stall_clusters": [
            {
                "targets": len(c),
                "duration_seconds": round(max(r[2] for r in c), 2),
                "end_spread_seconds": round(max(r[1] for r in c) - min(r[1] for r in c), 3),
                "examples": [os.path.basename(r[3]) for r in c[:4]],
            }
            for c in clusters
        ],
        "stalled_seconds": round(stalled_seconds, 2),
        "corrected_wall_seconds": round(max(wall - stalled_seconds, 0.0), 2) if clusters else round(wall, 2),
        "host_suspend_lookup_available": suspend_lookup_available,
        "host_suspends_seen": suspends[-3:],
    }

    if args.json:
        json.dump(out, sys.stdout, indent=2)
        sys.stdout.write("\n")
    else:
        print(f"ninja log:            {path}")
        print(f"targets:              {out['targets']}")
        print(f"wall:                 {out['wall_seconds']}s")
        print(f"aggregate task time:  {out['task_seconds']}s "
              f"(implied parallelism {out['implied_parallelism']}x)")
        print(f"median target:        {out['median_target_seconds']}s   "
              f"max target: {out['max_target_seconds']}s")
        if clusters:
            print("\nTIMING SUSPECT -- stall signature found:")
            for c in out["stall_clusters"]:
                print(f"  {c['targets']} targets held ~{c['duration_seconds']}s and ended "
                      f"within {c['end_spread_seconds']}s of each other")
                print(f"    e.g. {', '.join(c['examples'])}")
            print(f"\n  corrected build wall: ~{out['corrected_wall_seconds']}s "
                  f"(excluding ~{out['stalled_seconds']}s of stall)")
            print("  Treat the wrapper's measured phase time as VOID, not slow.")
            if not suspend_lookup_available:
                print("  Host suspend log unavailable; could not corroborate.")
        else:
            print("\ntiming sound: no stall signature")
        if suspends:
            last = suspends[-1]
            print(f"\nmost recent host suspend: {last['at']} "
                  f"({last['slept_seconds']}s asleep)")

    return 2 if clusters else 0


if __name__ == "__main__":
    sys.exit(main())
