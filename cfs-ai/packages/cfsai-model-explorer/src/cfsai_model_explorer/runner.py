# Copyright (c) 2026 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
CLI dispatcher and unified Python API.

The ``run()`` function is the entry point used by the wrapper packages
(``cfsai_resource_profiler`` and ``cfsai_compatibility_analyzer``).

When the backend returns an ``ExploreReport`` (from the XNNC explore
backend), the report is adapted to the legacy ``"profile"`` or
``"compat"`` shape so the TypeScript consumer can process it unchanged.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Union

from pydantic import BaseModel

from cfsai_model_explorer.adapters import (
    adapt_explore_to_compat,
    adapt_explore_to_profile,
)
from cfsai_model_explorer.registry import get_backend
from cfsai_model_explorer.schemas import ExploreReport
from cfsai_types.hardware_profile import HardwareProfile
from cfsai_types.logging import EventType, dump_logs, log_data, log_event, setup_logger

logger = logging.getLogger("cfsai_model_explorer")


class ModelExplorer:
    """
    Unified Python API for model analysis.

    Dispatches to the correct backend based on the hardware profile's
    target (family + accelerator).
    """

    def __init__(self, **kwargs: object) -> None:
        """Initialize with optional backend kwargs."""
        self._kwargs = kwargs

    def analyze_model(
        self,
        model_path: Union[str, Path],
        hardware_profile: HardwareProfile,
        mode: str = "profile",
    ) -> BaseModel:
        """Run analysis in the given mode using the target-appropriate backend."""
        if mode not in ("profile", "compat"):
            raise ValueError(
                f"Unsupported mode {mode!r}. Use 'profile' or 'compat'."
            )
        backend = get_backend(hardware_profile, **self._kwargs)
        if mode == "compat":
            return backend.check_compat(Path(model_path), hardware_profile)
        return backend.profile(Path(model_path), hardware_profile)


def run(mode: str = "profile") -> None:
    """CLI entry point called by wrapper packages."""
    parser = argparse.ArgumentParser(
        description="Model analysis — dispatches to the appropriate backend"
    )
    parser.add_argument("--file", required=True, help="Hardware profile JSON")
    parser.add_argument("--model", required=True, help="TFLite model file")
    parser.add_argument("--xtensa-core", help="Xtensa core name override")
    parser.add_argument("--json-file", help="Output JSON file")
    parser.add_argument("--text-file", help="Output text file")
    parser.add_argument("--dataset", help="Dataset file (compat mode)")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    args = parser.parse_args()

    setup_logger(debug_level=args.verbose)
    logger.debug("mode=%s args=%s", mode, args)

    try:
        with open(args.file) as f:
            data = json.load(f)
        hw = HardwareProfile(**data)

        kwargs = {}
        if args.xtensa_core:
            kwargs["xtensa_core"] = args.xtensa_core

        backend = get_backend(hw, **kwargs)

        if mode == "compat":
            ds = Path(args.dataset) if args.dataset else None
            report = backend.check_compat(Path(args.model), hw, ds)
        else:
            report = backend.profile(Path(args.model), hw)

        _output_report(report, mode, args)

        if mode == "compat" and _report_has_critical_issues(report):
            sys.exit(10)
    except Exception as e:
        logger.error(f"{e.__class__.__name__}: {e}")
        sys.exit(1)
    finally:
        print(dump_logs())


def _output_report(
    report: BaseModel, mode: str, args: argparse.Namespace
) -> None:
    report_data = _adapt_if_explore(report, mode)

    if args.json_file:
        _save_json(report_data, args.json_file)
        log_event(logger, EventType.FILE, args.json_file)
    if args.text_file:
        if hasattr(report, "visualize_resource_profile"):
            _save_text(report, args.text_file)
        else:
            _save_json(report_data, args.text_file)
        log_event(logger, EventType.FILE, args.text_file)
    if not args.json_file and not args.text_file:
        log_data(logger, report_data)


def _adapt_if_explore(report: BaseModel, mode: str) -> dict:
    """If the report is an ExploreReport, adapt it to the legacy shape."""
    if isinstance(report, ExploreReport):
        if mode == "compat":
            return adapt_explore_to_compat(report)
        return adapt_explore_to_profile(report)
    return report.model_dump(mode="json")


def _save_json(data: dict, filepath: str) -> None:
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def _save_text(report: BaseModel, filepath: str) -> None:
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    text = report.visualize_resource_profile(to_buffer=True)
    if text:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)


def _report_has_critical_issues(report: BaseModel) -> bool:
    """Check if a compat report has critical issues (exit code 10)."""
    if hasattr(report, "has_critical_issues"):
        return report.has_critical_issues()
    # ExploreReport: pushed-to-Host ops are warnings, not critical.
    # The model still runs — those ops execute on the DSP instead of NPU.
    return False
