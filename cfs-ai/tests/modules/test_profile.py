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

import sys
import subprocess
import time
import shutil
from pathlib import Path
import pytest
import os
import tempfile
import json

from cfsai_types.config.aiconfig import ConfigBackend
from cfsai_types.config.targets import UserTarget
from cfsai_types.hardware_profile import HardwareProfile, OperatorInfo

_good_models = { 
    "HELLO": "tests/data/models/hello_world_f32.tflite"
}

def create_hardware_profile(flash, ram, clock, ops, types, infos=[]):
    soc = "TestSoc"
    core = "TestCore"
    family = "TestFamily"
    t = UserTarget(
        soc=soc,
        core=core,
        family=family
    )
    p = HardwareProfile(
        flash_size=flash,
        ram_size=ram,
        core_clock=clock,
        supported_ops=ops,
        accel_ops=[],
        supported_data_types=types,
        operator_infos=infos,
        target=t
    )
    return p

def find_input_files():
    base = Path("tests/data/json")
    files = list(base.glob("compat.*.json")) if base.exists() else []
    return files

# Build params: for each input file
_json_files = find_input_files()
_json_params = [(str(f)) for f in _json_files]
_json_ids = [
    f"{f.name}"
    for f in _json_files
]

@pytest.fixture(autouse=True)
def cleanup_output_directories(tmp_path):
    # Cleanup output directories before and after tests
    OUTPUT_CLEANUP_PATHS = [
        Path("./output"),
    ]
    
    def cleanup_path(path):
        if path.exists():
            try:
                time.sleep(0.2)  # Give processes time to release handles
                shutil.rmtree(path, ignore_errors=True)
            except Exception:
                # If not, pass
                pass
    
    # Cleanup before test
    for path in OUTPUT_CLEANUP_PATHS:
        cleanup_path(path)
    
    yield  # Run the test

    # Cleanup after test
    time.sleep(0.1)  # Brief pause before cleanup
    for path in OUTPUT_CLEANUP_PATHS:
        cleanup_path(path)

def invoke_module_with_file(file: str, model: str):
    args = [sys.executable, "-m", "cfsai_resource_profiler", "--file", file, "--model", model]
    result = subprocess.run(args, capture_output=True, text=True)
    return result

def invoke_model_with_class(config, model):
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as tmp:
        json.dump(config.model_dump(), tmp)
        tmp_path = tmp.name
    result = invoke_module_with_file(tmp_path, model)
    os.remove(tmp_path)
    return result

@pytest.mark.parametrize("file", _json_params, ids=_json_ids)
def test_profile_jsons(file):
    expected_exit_code = 0
    for model in _good_models.values():
        result = invoke_module_with_file(file, model)
        assert result.returncode == expected_exit_code

def test_valid_model():
    expected_exit_code = 0

    # Basic profile that supports everything
    flash = 1024
    ram = 1024
    clock = 100
    ops = []
    types = []
    opinfo = OperatorInfo(
        name="MAC",
        cycles=2,
        energy=0.1
    )
    opinfos = [ opinfo ]

    p = create_hardware_profile(flash, ram, clock, ops, types, opinfos)
    
    result = invoke_model_with_class(
        p, 
        "tests/data/models/resnet.tflite" 
    )
    assert result.returncode == expected_exit_code
    # Look for some key words that indicate a full report has been generated
    # without any specifics that may change. 
    assert "Memory Recommendations" in result.stdout
    assert "High memory variance detected " in result.stdout 
    assert "Total MACs" in result.stdout

def test_invalid_models():
    expected_exit_code = 1

    # Basic profile that supports everything
    flash = 1024
    ram = 1024
    clock = 100
    ops = []
    types = []
    opinfo = OperatorInfo(
        name="MAC",
        cycles=2,
        energy=0.1
    )
    opinfos = [ opinfo ]

    p = create_hardware_profile(flash, ram, clock, ops, types, opinfos)
    
    # Model file not found
    result = invoke_model_with_class(
        p, 
        "tests/missing.tflite" 
    )
    assert result.returncode == expected_exit_code
    assert "Model file not found" in result.stderr

    # Model not a tflite
    result = invoke_model_with_class(
        p, 
        "tests/data/models/ai85-catsdogs-qat8-q.pth.tar" 
    )
    assert result.returncode == expected_exit_code
    assert "Unsupported file extension" in result.stderr

    # tflite file is corrupt
    result = invoke_model_with_class(
        p, 
        "tests/data/models/corrupt.tflite" 
    )
    assert result.returncode == expected_exit_code
    assert "File does not have correct magic bytes" in result.stderr
