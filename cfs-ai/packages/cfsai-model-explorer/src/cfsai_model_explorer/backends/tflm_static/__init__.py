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

"""TFLM static analysis backend for Cortex-M and SHARC-FX targets.

Uses the original MACs x CPI profiler and static op-list compatibility
checker. This is the fallback for targets without an NPU compiler.
"""

from __future__ import annotations

from pathlib import Path

from cfsai_model_explorer.backends.tflm_static.compat import (
    CompatibilityAnalyzer,
)
from cfsai_model_explorer.backends.tflm_static.compat_exceptions import (
    CompatibilityAnalysisError,
)
from cfsai_model_explorer.backends.tflm_static.compat_schemas import (
    CompatibilityReport,
)
from cfsai_model_explorer.backends.tflm_static.profiler import (
    TFLiteResourceProfiler,
)
from cfsai_model_explorer.backends.tflm_static.profiler_exceptions import (
    ModelAnalysisError as ProfilerModelAnalysisError,
)
from cfsai_model_explorer.backends.tflm_static.profiler_schemas import (
    ResourceProfileReport,
)
from cfsai_model_explorer.exceptions import ModelAnalysisError
from cfsai_types.hardware_profile import HardwareProfile


class TflmStaticBackend:
    """Backend using static MACs x CPI profiling and op-list compat."""

    def __init__(self, **_kwargs: object) -> None:
        """Initialize the backend."""

    def profile(
        self, model_path: Path, hw: HardwareProfile
    ) -> ResourceProfileReport:
        """Run static MACs x CPI profiling."""
        try:
            profiler = TFLiteResourceProfiler()
            return profiler.analyze_model(str(model_path), hw)
        except ProfilerModelAnalysisError as exc:
            raise ModelAnalysisError(
                str(exc), error_code=getattr(exc, "error_code", None)
            ) from exc

    def check_compat(
        self,
        model_path: Path,
        hw: HardwareProfile,
        dataset_path: Path | None = None,
    ) -> CompatibilityReport:
        """Run static operator compatibility check."""
        try:
            analyzer = CompatibilityAnalyzer()
            return analyzer.analyze_model(
                str(model_path),
                hw,
                dataset_path=str(dataset_path) if dataset_path else None,
            )
        except CompatibilityAnalysisError as exc:
            raise ModelAnalysisError(
                str(exc), error_code=getattr(exc, "error_code", None)
            ) from exc
