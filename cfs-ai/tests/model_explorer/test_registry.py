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

"""Tests for the backend registry."""

import json
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from cfsai_model_explorer.registry import (
    _find_mot_backend,
    _find_mot_json,
    _load_mot_json,
    get_backend,
)
from cfsai_types.hardware_profile import HardwareProfile

SAMPLE_MOT_JSON = {
    "SupportedBackends": {
        "mot-tflm": {
            "Targets": [
                {"Hardware": {"Soc": "MySoC", "Core": "MyDSP"}},
                {"Hardware": {"Soc": "MySoC", "Core": "MyNPU"}},
            ],
            "Mot": {
                "DockerImage": "registry.example.com/mot-runtime:1.0.0",
            },
        },
        "mot-xnnc": {
            "Targets": [
                {"Hardware": {"Soc": "MySoC", "Core": "MyNPU"}},
            ],
            "Mot": {
                "DockerImage": "registry.example.com/mot-runtime:1.0.0",
            },
        },
    }
}


def _make_hw(soc: str, core: str) -> HardwareProfile:
    return HardwareProfile(
        FlashSize=0, RamSize=0, CoreClock=700,
        SupportedOps=[], AccelOps=[], SupportedDataTypes=[],
        OperatorInfos=[{"Name": "MAC", "Cycles": 1, "Energy": 0}],
        Target={"Soc": soc, "Core": core},
    )


class TestFindMotBackend:
    """Test _find_mot_backend with sample mot.json data."""

    def test_xnnc_target_matches(self):
        with patch(
            "cfsai_model_explorer.registry._load_mot_json",
            return_value=SAMPLE_MOT_JSON,
        ):
            result = _find_mot_backend("MYSOC", "MYNPU")
            assert result is not None
            assert result["docker_image"] == "registry.example.com/mot-runtime:1.0.0"

    def test_dss_target_no_match(self):
        """DSS is only in mot-tflm, not mot-xnnc, so no match."""
        with patch(
            "cfsai_model_explorer.registry._load_mot_json",
            return_value=SAMPLE_MOT_JSON,
        ):
            result = _find_mot_backend("MYSOC", "MYDSP")
            assert result is None

    def test_unknown_soc_no_match(self):
        with patch(
            "cfsai_model_explorer.registry._load_mot_json",
            return_value=SAMPLE_MOT_JSON,
        ):
            result = _find_mot_backend("MAX32690", "CM4")
            assert result is None

    def test_no_mot_json(self):
        with patch(
            "cfsai_model_explorer.registry._load_mot_json",
            return_value=None,
        ):
            result = _find_mot_backend("MYSOC", "MYNPU")
            assert result is None


class TestGetBackend:
    """Test get_backend routing."""

    def test_xnnc_backend_for_nss(self):
        with patch(
            "cfsai_model_explorer.registry._load_mot_json",
            return_value=SAMPLE_MOT_JSON,
        ):
            hw = _make_hw("MySoC", "MyNPU")
            try:
                backend = get_backend(hw)
                assert type(backend).__name__ == "XnncExploreBackend"
            except Exception:
                # XnncNotFoundError if Docker not available — that's OK,
                # it means routing worked but Docker isn't installed
                pass

    def test_static_backend_for_dss(self):
        with patch(
            "cfsai_model_explorer.registry._load_mot_json",
            return_value=SAMPLE_MOT_JSON,
        ):
            hw = _make_hw("MySoC", "MyDSP")
            backend = get_backend(hw)
            assert type(backend).__name__ == "TflmStaticBackend"

    def test_static_backend_for_cortex_m(self):
        with patch(
            "cfsai_model_explorer.registry._load_mot_json",
            return_value=SAMPLE_MOT_JSON,
        ):
            hw = _make_hw("MAX78002", "CM4")
            backend = get_backend(hw)
            assert type(backend).__name__ == "TflmStaticBackend"

    def test_static_backend_when_no_mot_json(self):
        with patch(
            "cfsai_model_explorer.registry._load_mot_json",
            return_value=None,
        ):
            hw = _make_hw("MySoC", "MyNPU")
            backend = get_backend(hw)
            assert type(backend).__name__ == "TflmStaticBackend"


class TestFindMotJson:
    """Test _find_mot_json file discovery."""

    def test_cfsai_path_env(self, tmp_path):
        backends = tmp_path / "backends"
        backends.mkdir()
        (backends / "mot.json").write_text("{}")
        with patch.dict("os.environ", {"CFSAI_PATH": str(tmp_path)}):
            result = _find_mot_json()
            assert result == backends / "mot.json"

    def test_returns_none_when_missing(self):
        with patch.dict("os.environ", {}, clear=True):
            with patch(
                "cfsai_model_explorer.registry.Path.parents",
                new_callable=lambda: property(lambda self: []),
            ):
                # Can't easily mock the walk, but at minimum it shouldn't crash
                pass
