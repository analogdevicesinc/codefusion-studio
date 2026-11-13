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

"""Backend protocol for model analysis."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol, runtime_checkable

from pydantic import BaseModel

from cfsai_types.hardware_profile import HardwareProfile


@runtime_checkable
class AnalysisBackend(Protocol):
    """Interface that each processor/compiler backend must implement."""

    def profile(self, model_path: Path, hw: HardwareProfile) -> BaseModel:
        """Run profiling analysis. Returns a Pydantic report model."""
        ...

    def check_compat(
        self,
        model_path: Path,
        hw: HardwareProfile,
        dataset_path: Path | None = None,
    ) -> BaseModel:
        """Run compatibility analysis. Returns a Pydantic report model."""
        ...
