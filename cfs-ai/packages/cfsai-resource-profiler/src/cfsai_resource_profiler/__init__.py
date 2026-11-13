# Copyright (c) 2025-2026 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Thin wrapper — delegates to cfsai_model_explorer."""

from __future__ import annotations

from pathlib import Path
from typing import Optional, Union

from cfsai_model_explorer.adapters import adapt_explore_to_profile
from cfsai_model_explorer.backends.tflm_static.profiler_schemas import (
    ResourceProfileReport,
)
from cfsai_model_explorer.registry import get_backend
from cfsai_model_explorer.schemas import ExploreReport
from pydantic import BaseModel

from cfsai_types.hardware_profile import HardwareProfile


class TFLiteResourceProfiler:
    """Backward-compatible wrapper that delegates to model-explorer."""

    def __init__(self) -> None:
        """Initialize the profiler."""

    def analyze_model(
        self,
        model_path: Union[str, Path],
        hardware_profile: HardwareProfile,
        output_file: Optional[str] = None,
    ) -> BaseModel:
        """Run profiling analysis on a TFLite model."""
        backend = get_backend(hardware_profile)
        report = backend.profile(Path(model_path), hardware_profile)

        if isinstance(report, ExploreReport):
            data = adapt_explore_to_profile(report)
            return ResourceProfileReport(**data)

        return report


__all__ = ["TFLiteResourceProfiler"]
