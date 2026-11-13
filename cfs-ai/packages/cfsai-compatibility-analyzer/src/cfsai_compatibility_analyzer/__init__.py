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

from cfsai_model_explorer.adapters import adapt_explore_to_compat
from cfsai_model_explorer.backends.tflm_static.compat_schemas import (
    CompatibilityReport,
)
from cfsai_model_explorer.registry import get_backend
from cfsai_model_explorer.schemas import ExploreReport
from pydantic import BaseModel

from cfsai_types.hardware_profile import HardwareProfile


class CompatibilityAnalyzer:
    """Backward-compatible wrapper that delegates to model-explorer."""

    def __init__(self) -> None:
        """Initialize the analyzer."""

    def analyze_model(
        self,
        model_path: Union[str, Path],
        hw_metadata: HardwareProfile,
        dataset_path: Optional[Union[str, Path]] = None,
    ) -> BaseModel:
        """Run compatibility analysis on a TFLite model."""
        backend = get_backend(hw_metadata)
        ds = Path(dataset_path) if dataset_path else None
        report = backend.check_compat(Path(model_path), hw_metadata, ds)

        if isinstance(report, ExploreReport):
            data = adapt_explore_to_compat(report)
            return CompatibilityReport(**data)

        return report


__all__ = ["CompatibilityAnalyzer"]
