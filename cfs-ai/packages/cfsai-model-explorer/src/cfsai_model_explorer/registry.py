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
Backend registry.

Resolves the analysis backend from the hardware target. When a
``backends/mot.json`` file is found in the CFS install tree, any
target whose (SoC, Core) appears in a backend with a ``Mot.DockerImage``
is routed to the XNNC explore backend. All other targets fall back
to the static TFLM analysis.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

from cfsai_model_explorer.backend import AnalysisBackend
from cfsai_types.hardware_profile import HardwareProfile

logger = logging.getLogger(__name__)


def get_backend(hw: HardwareProfile, **kwargs: object) -> AnalysisBackend:
    """Resolve the appropriate backend for the given hardware profile."""
    target = hw.target
    soc = (getattr(target, "soc", "") or "").upper() if target else ""
    core = (getattr(target, "core", "") or "").upper() if target else ""

    mot_match = _find_mot_backend(soc, core)

    if mot_match:
        docker_image = mot_match["docker_image"]
        mot_soc = mot_match.get("mot_soc", "")
        mot_subsystem = mot_match.get("mot_subsystem", "")
        logger.debug(
            "Matched (%s, %s) to mot backend with image %s "
            "(mot soc: %s, subsystem: %s)",
            soc, core, docker_image, mot_soc, mot_subsystem,
        )
        from cfsai_model_explorer.backends.xnnc_explore import (
            XnncExploreBackend,
        )
        return XnncExploreBackend(
            docker_image=docker_image,
            soc=mot_soc or soc,
            subsystem=mot_subsystem,
            **kwargs,
        )

    logger.debug(
        "No mot backend for (%s, %s), using TflmStatic", soc, core,
    )
    from cfsai_model_explorer.backends.tflm_static import (
        TflmStaticBackend,
    )
    return TflmStaticBackend(**kwargs)


def _find_mot_backend(
    soc: str, core: str
) -> Optional[dict[str, str]]:
    """Search mot.json for a backend matching the given (SoC, Core).

    Returns a dict with ``docker_image`` if found, None otherwise.
    """
    mot_data = _load_mot_json()
    if not mot_data:
        return None

    backends = mot_data.get("SupportedBackends", {})
    for name, backend in backends.items():
        # Only match XNNC backends — TFLM backends use the container
        # for code generation, not for explore profiling.
        if "xnnc" not in name.lower():
            continue
        mot = backend.get("Mot")
        if not mot or not mot.get("DockerImage"):
            continue
        for target in backend.get("Targets", []):
            hw = target.get("Hardware", {})
            t_soc = (hw.get("Soc") or "").upper()
            t_core = (hw.get("Core") or "").upper()
            if t_soc == soc and t_core == core:
                return {
                    "docker_image": mot["DockerImage"],
                    "mot_soc": mot.get("Soc", ""),
                    "mot_subsystem": mot.get("Subsystem", ""),
                }

    return None


_SENTINEL = object()
_cached_mot_data: object = _SENTINEL


def _load_mot_json() -> Optional[dict]:
    """Load and cache mot.json from the CFS install tree."""
    global _cached_mot_data
    if _cached_mot_data is not _SENTINEL:
        return _cached_mot_data  # type: ignore[return-value]

    mot_path = _find_mot_json()
    if not mot_path:
        _cached_mot_data = None
        return None

    try:
        with open(mot_path) as f:
            _cached_mot_data = json.load(f)
        logger.debug("Loaded mot.json from %s", mot_path)
        return _cached_mot_data  # type: ignore[return-value]
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Found %s but failed to read it: %s", mot_path, exc)
        _cached_mot_data = None
        return None


def _find_mot_json() -> Optional[Path]:
    """Locate backends/mot.json in the CFS install tree."""
    cfs_ai_path = os.environ.get("CFSAI_PATH")
    if cfs_ai_path:
        candidate = Path(cfs_ai_path) / "backends" / "mot.json"
        if candidate.exists():
            return candidate

    pkg_dir = Path(__file__).resolve().parent
    for parent in pkg_dir.parents:
        candidate = parent / "backends" / "mot.json"
        if candidate.exists():
            return candidate

    return None
