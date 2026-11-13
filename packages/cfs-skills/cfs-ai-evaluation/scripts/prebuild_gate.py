#!/usr/bin/env python3
# Copyright (c) 2026 Analog Devices, Inc.
"""Pre-build gate for a CFS AI workspace.

Catches, in seconds, the two failures that otherwise cost a full
create-generate-build-flash pipeline:

  1. The AI profiling template emits CONFIG_ZPL_* Kconfig symbols, but the
     Zephyr that actually resolves does not contain modules/zephelin -> build
     aborts in Kconfig with "undefined symbol ZPL". A zephelin.yml alone is a
     west manifest fragment, NOT the module.
  2. The dataset cannot drive as many inferences as the report will claim.
     inferences = MODEL_DATASET_LEN // (MODEL_INPUT_0_LEN * MODEL_INPUT_0_WIDTH)

For workspaces that use Zephyr, check 1 keys off the *installed* package, not
the version pinned in
.cfs/.cfsdependencies. Those differ in practice: CFS installs a pinned
package as a side effect of building, so the pin can name a version that is
not yet (or no longer) the one CMake resolves. `cfsutil validate dependencies
--format json` reports `installedVersion` per package and is the authoritative
source; the pin alone produces both false passes and false failures.

Usage:
    python3 prebuild_gate.py --workspace <ws> [--project <project>] [--board <zephyr-board>]
    python3 prebuild_gate.py --workspace <ws> --board <b> --json
    python3 prebuild_gate.py --list-zephyr     # inspect the installed package

Exit codes: 0 all checks passed; 1 a gate failed; 3 a required installed
Zephyr package could not be located through cfsutil.
"""

import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys

_boards_cache = {}


def boards_of(info):
    """Board dir names for one inventory entry, globbed on first access and
    memoized by root path."""
    root = info["path"]
    if root not in _boards_cache:
        _boards_cache[root] = sorted(
            os.path.basename(p)
            for p in glob.glob(os.path.join(root, "zephyr", "boards", "*", "*"))
            if os.path.isdir(p)
        )
    return _boards_cache[root]


def print_inventory(inv, board=None):
    print(f"{'zephyr package':30s}{'zephelin':>10s}" + (f"{'board':>8s}" if board else ""))
    for ref in sorted(inv):
        info = inv[ref]
        mark = "yes" if info["zephelin"] else ("yml-only" if info["zephelin_yml_only"] else "no")
        line = f"{ref:30s}{mark:>10s}"
        if board:
            line += f"{('yes' if board in boards_of(info) else 'no'):>8s}"
        print(line)


def cfsutil():
    """cfsutil is frequently absent from PATH; the caller may still have told
    us where it is. Returns an argv prefix or None."""
    env = os.environ.get("CFSUTIL")
    if env and os.path.isfile(env):
        return [env]
    found = shutil.which("cfsutil")
    return [found] if found else None


def _run(argv, ok_returncodes=(0,)):
    try:
        p = subprocess.run(argv, capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.SubprocessError):
        return None
    return p.stdout if p.returncode in ok_returncodes else None


def installed_zephyr_path():
    """Return the package-manager-owned path of the installed Zephyr tree."""
    cu = cfsutil()
    if not cu:
        return None, "cfsutil not found; set CFSUTIL or add it to PATH"

    argv = cu + ["pkg", "path", "zephyr", "--format", "json"]
    try:
        proc = subprocess.run(argv, capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.SubprocessError) as exc:
        return None, f"cfsutil pkg path zephyr failed: {exc}"

    try:
        payload = json.loads(proc.stdout)
    except (ValueError, TypeError):
        detail = (proc.stderr or proc.stdout).strip() or f"exit code {proc.returncode}"
        return None, f"cfsutil pkg path zephyr returned invalid JSON: {detail}"
    if not isinstance(payload, dict):
        return None, "cfsutil pkg path zephyr returned an unexpected JSON response"

    if proc.returncode != 0 or payload.get("ok") is False:
        errors = payload.get("errors") or []
        detail = "; ".join(
            str(error.get("message") or error.get("code") or error)
            if isinstance(error, dict) else str(error)
            for error in errors
        ) or (proc.stderr or "").strip() or f"exit code {proc.returncode}"
        return None, f"cfsutil pkg path zephyr failed: {detail}"

    data = payload.get("data", payload)
    root = data.get("path") if isinstance(data, dict) else None
    if not root:
        return None, "cfsutil pkg path zephyr returned no package path"
    root = os.path.abspath(os.path.expanduser(root))
    if not os.path.isdir(root):
        return None, f"cfsutil reported a Zephyr package path that does not exist: {root}"
    return root, None


def zephyr_info(root):
    """Inspect only the installed tree resolved by the package manager."""
    zephelin = os.path.isdir(os.path.join(root, "modules", "zephelin"))
    return {
        "path": root,
        "zephelin": zephelin,
        "zephelin_yml_only": os.path.isfile(os.path.join(root, "zephelin.yml"))
        and not zephelin,
    }


def installed_zephyr(ws):
    """The Zephyr version that will actually resolve, with provenance.

    Order of authority:
      1. `pkg list` -> the installed zephyr/<version> line. Same fact as (2) and
         ~15x faster (0.5s vs 7.5s), which matters because this runs on every gate.
      2. `validate dependencies --format json` -> [].packages[name=zephyr].installedVersion
         (what the build itself verifies, via verifyPackageDependenciesLocally)
      3. unknown version -- package path still identifies the installed tree
    """
    cu = cfsutil()
    if not cu:
        return None, "cfsutil-not-found"

    out = _run(cu + ["pkg", "list"])
    if out:
        m = re.search(r"^\s*-\s*zephyr/(\S+)\s*$", out, re.M)
        if m:
            return m.group(1), "pkg-list"

    if not ws:
        return None, "undetermined"

    # Exit 1 means some manifest has unmet dependencies; the results still
    # report every installed version.
    out = _run(
        cu + ["validate", "dependencies", "--workspace", ws, "--format", "json"],
        ok_returncodes=(0, 1),
    )
    if out:
        try:
            for result in json.loads(out):
                for pkg in result.get("packages", []):
                    if pkg.get("name") == "zephyr" and pkg.get("installedVersion"):
                        return pkg["installedVersion"], "validate-dependencies"
        except (ValueError, TypeError, AttributeError):
            pass

    return None, "undetermined"


def read_defines(model_hpp):
    text = open(model_hpp).read()
    want = (
        "MODEL_DATASET_LEN",
        "MODEL_INPUT_0_LEN",
        "MODEL_INPUT_0_WIDTH",
        "MODEL_OUTPUT_0_LEN",
        "MODEL_OUTPUT_0_WIDTH",
        "MODEL_ARENA_SIZE",
        "MODEL_LEN",
    )
    out = {}
    for name in want:
        m = re.search(rf"^#define\s+{name}\s+\((\d+)\)", text, re.M)
        if m:
            out[name] = int(m.group(1))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workspace")
    ap.add_argument("--project", default=None)
    ap.add_argument("--board", default=None, help="Zephyr board directory name from the selected workspace")
    ap.add_argument("--list-zephyr", action="store_true")
    ap.add_argument("--json", action="store_true", help="emit a machine-readable record")
    args = ap.parse_args()

    ws = os.path.abspath(os.path.expanduser(args.workspace)) if args.workspace else None

    if args.list_zephyr or not args.workspace:
        resolved, _ = installed_zephyr(ws)
        zephyr_root, path_error = installed_zephyr_path()
        if path_error:
            if args.json:
                print(json.dumps({"status": "error", "error": path_error}, indent=2))
            else:
                print(path_error, file=sys.stderr)
            return 3
        ref = f"zephyr/{resolved}" if resolved else "zephyr/<installed>"
        inv = {ref: zephyr_info(zephyr_root)}
        if args.json:
            print(json.dumps(
                {ref: {"zephelin": i["zephelin"],
                       "zephelin_yml_only": i["zephelin_yml_only"],
                       "boards": boards_of(i) if args.board else None}
                 for ref, i in sorted(inv.items())}, indent=2))
        else:
            print_inventory(inv, args.board)
        return 0

    failures = []
    warnings = []
    rec = {"workspace": ws, "project": args.project, "board": args.board}

    # --- What the manifest asks for, and what is actually installed --------
    dep_path = os.path.join(ws, ".cfs", ".cfsdependencies")
    pinned = None
    project_roots = ([os.path.join(ws, args.project)] if args.project
                     else glob.glob(os.path.join(ws, "*")))
    dependency_paths = [dep_path] + [
        os.path.join(root, ".cfs", ".cfsdependencies") for root in project_roots
    ]
    for candidate in dependency_paths:
        if not os.path.isfile(candidate):
            continue
        deps = json.load(open(candidate))
        for p in deps.get("packages", []):
            if p.get("name") == "zephyr":
                pinned = p.get("version")
                dep_path = candidate
                break
        if pinned:
            break
    rec["pinned_zephyr"] = pinned

    # Does any project conf actually ask for ZPL?
    needs_zpl = False
    for root in project_roots:
        for conf in [os.path.join(root, "prj.conf")] + glob.glob(
            os.path.join(root, "boards", "*.conf")
        ):
            if os.path.isfile(conf) and "CONFIG_ZPL" in open(conf).read():
                needs_zpl = True
                break
        if needs_zpl:
            break
    rec["needs_zpl"] = needs_zpl

    uses_zephyr = bool(pinned or needs_zpl)
    rec["uses_zephyr"] = uses_zephyr
    resolved = None
    provenance = "not-applicable"
    inv = {}
    if uses_zephyr:
        resolved, provenance = installed_zephyr(ws)
        zephyr_root, path_error = installed_zephyr_path()
        if path_error:
            if args.json:
                print(json.dumps({"status": "error", "error": path_error}, indent=2))
            else:
                print(path_error, file=sys.stderr)
            return 3
        ref = f"zephyr/{resolved}" if resolved else "zephyr/<installed>"
        inv = {ref: zephyr_info(zephyr_root)}

    rec["resolved_zephyr"] = resolved
    rec["resolved_source"] = provenance

    if not args.json:
        if uses_zephyr:
            print(f"pinned zephyr        : {pinned or 'UNKNOWN'}")
            print(f"resolved zephyr      : {resolved or 'UNDETERMINED'}  (via {provenance})")
            if pinned and resolved and not resolved.startswith(pinned):
                print("  NOTE: the pin is not what resolves. The installed package is what "
                      "CMake will use; a pinned-but-not-installed version is only a request.")
            print(f"template needs ZPL   : {needs_zpl}")
        else:
            print("zephyr               : not used by this workspace")

    # cfsutil pkg path resolves the one installed package CMake will consume.
    target = resolved or pinned or "<installed>"
    matches = inv

    # --- Gate 1: the resolved Zephyr must carry the instrumentation module --
    zephelin_present = None
    if needs_zpl:
        if not matches:
            warnings.append(
                f"zephyr/{target} could not be inspected. If it lacks modules/zephelin, "
                "the build will abort in Kconfig."
            )
        else:
            zephelin_present = any(i["zephelin"] for i in matches.values())
            good = sorted(
                r for r, i in inv.items()
                if i["zephelin"] and (not args.board or args.board in boards_of(i))
            )
            if zephelin_present:
                ok = sorted(r for r, i in matches.items() if i["zephelin"])
                if not args.json:
                    print(f"zephelin module      : present in {ok}")
            else:
                # The installed package is what CMake resolves. Verified 2026-10-03:
                # with the manifest repinned to 4.3.0 but 4.4.0-b.1 installed, the
                # build still used 4.4.0-b.1 (ZEPHYR_BASE -> zephy9f05f5745cd59) and
                # aborted in Kconfig. Repinning alone is inert; the zephelin-bearing
                # version has to be installed.
                failures.append(
                    f"the installed zephyr/{target} does not contain modules/zephelin, "
                    "but the template emits CONFIG_ZPL_*. The build WILL abort in Kconfig.\n"
                    f"    Fix: install a zephelin-bearing version and pin it in {dep_path} -- "
                    f"cfsutil pkg install {(good or ['zephyr/<ver>'])[0]}\n"
                    "    Repinning the manifest alone does NOT work: the build resolves the "
                    "installed package, not the pin."
                )
    rec["zephelin_module_present"] = zephelin_present

    # --- Gate 2: board must exist in that Zephyr ---------------------------
    board_present = None
    if args.board and matches:
        board_present = any(args.board in boards_of(i) for i in matches.values())
        if not board_present:
            failures.append(
                f"board '{args.board}' not found under zephyr/{target}/zephyr/boards/*/"
            )
        elif not args.json:
            print(f"board {args.board:14s} : present")
    rec["board_present"] = board_present

    # --- Gate 3: achievable inference count --------------------------------
    model = {}
    pattern = os.path.join(ws, args.project or "*", "src", "adi_tflm", "model.hpp")
    hits = glob.glob(pattern)
    if hits:
        hpp = hits[0]
        d = read_defines(hpp)
        inp = d.get("MODEL_INPUT_0_LEN", 0) * d.get("MODEL_INPUT_0_WIDTH", 0)
        ds = d.get("MODEL_DATASET_LEN")
        model = {
            "model_hpp": hpp,
            "input_bytes": inp,
            "input_len": d.get("MODEL_INPUT_0_LEN"),
            "input_width": d.get("MODEL_INPUT_0_WIDTH"),
            "output_len": d.get("MODEL_OUTPUT_0_LEN"),
            "output_width": d.get("MODEL_OUTPUT_0_WIDTH"),
            "arena_size": d.get("MODEL_ARENA_SIZE"),
            "model_len": d.get("MODEL_LEN"),
            "dataset_bytes": ds,
            "inferences": (ds // inp) if (ds is not None and inp) else None,
            "whole_multiple": (ds % inp == 0) if (ds is not None and inp) else None,
            "synthetic": ds is None,
        }
        if not args.json:
            print(f"\nmodel.hpp            : {hpp}")
            print(f"  input tensor       : {d.get('MODEL_INPUT_0_LEN')} x {d.get('MODEL_INPUT_0_WIDTH')} = {inp} bytes")
            print(f"  output tensor      : {d.get('MODEL_OUTPUT_0_LEN')} x {d.get('MODEL_OUTPUT_0_WIDTH')}")
            print(f"  arena size         : {d.get('MODEL_ARENA_SIZE')} bytes  (compare to 'ai profile' peak_memory_kb)")
            if ds is None:
                print("  dataset            : ABSENT -> synthetic run, stock template does "
                      "10 random-input inferences. NOT an accuracy or workload test.")
            elif inp:
                print(f"  dataset            : {ds} bytes -> {model['inferences']} inference(s)")
                if model["inferences"] < 2:
                    print("  NOTE: n<2. No mean/min/max/percentiles or warm-up separation "
                          "are possible. Tile the sample binary for a real population.")
                if not model["whole_multiple"]:
                    print(f"  WARNING: {ds} is not a whole multiple of {inp}; "
                          f"{ds % inp} trailing bytes will be ignored.")
    elif not args.json:
        print(f"\nmodel.hpp not found at {pattern} (run 'ai build' / workspace create first)")
    rec["model"] = model

    rec["failures"] = failures
    rec["warnings"] = warnings
    rec["status"] = "fail" if failures else "pass"

    if args.json:
        print(json.dumps(rec, indent=2))
        return 1 if failures else 0

    print()
    for w in warnings:
        print(f"WARNING: {w}")
    if failures:
        print("GATE FAILED:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("pre-build gate: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
