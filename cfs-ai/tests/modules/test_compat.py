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
import numpy as np

from cfsai_types.config.aiconfig import ConfigBackend
from cfsai_types.config.targets import UserTarget
from cfsai_types.hardware_profile import HardwareProfile

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

def invoke_module_with_file(file: str, model: str, dataset: str = None):
    args = [
        sys.executable, "-m", "cfsai_compatibility_analyzer",
        "--file", file, "--model", model
    ]
    if dataset:
        args.extend(["--dataset", dataset])
    result = subprocess.run(args, capture_output=True, text=True)
    return result

def invoke_model_with_class(config, model, dataset=None):
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as tmp:
        json.dump(config.model_dump(), tmp)
        tmp_path = tmp.name
    result = invoke_module_with_file(tmp_path, model, dataset)
    os.remove(tmp_path)
    return result

@pytest.mark.parametrize("file", _json_params, ids=_json_ids)
def test_compat_jsons(file):
    expected_exit_code = 0
    for model in _good_models.values():
        result = invoke_module_with_file(file, model)
        assert result.returncode == expected_exit_code

def test_invalid_models():
    expected_exit_code = 1

    # Basic profile that supports everything
    flash = 1024
    ram = 1024
    clock = 100
    ops = []
    types = []

    p = create_hardware_profile(flash, ram, clock, ops, types)
    
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


def test_incompatible_memory():
    expected_exit_code = 10

    # Basic profile that supports everything
    flash = 1024
    ram = 1024
    clock = 100
    ops = []
    types = []

    p = create_hardware_profile(flash, ram, clock, ops, types)
    
    # Resnet - too big to fit in any memory
    result = invoke_model_with_class(
        p, 
        "tests/data/models/resnet.tflite"
    )
    assert result.returncode == expected_exit_code
    assert "issues identified" in result.stdout
    assert "memory_overflow" in result.stdout
    assert "flash_overflow" in result.stdout
    assert "ram_overflow" in result.stdout

def test_incompatible_types():
    expected_exit_code = 10

    # Basic profile that only supports INT16
    flash = 1024
    ram = 1024
    clock = 100
    ops = []
    types = ["INT16"]

    p = create_hardware_profile(flash, ram, clock, ops, types)
    
    # Resnet - too big to fit in any memory
    result = invoke_model_with_class(
        p, 
        "tests/data/models/hello_world_f32.tflite"
    )
    assert result.returncode == expected_exit_code
    assert "issues identified" in result.stdout
    assert "FULLY_CONNECTED operation uses FLOAT32." in result.stdout

def test_incompatible_operators():
    expected_exit_code = 10

    # Basic profile that only supports Dummy operator
    flash = 1024
    ram = 1024
    clock = 100
    ops = ["DUMMY"]
    types = []

    p = create_hardware_profile(flash, ram, clock, ops, types)

    # Resnet - too big to fit in any memory
    result = invoke_model_with_class(
        p,
        "tests/data/models/hello_world_f32.tflite"
    )
    assert result.returncode == expected_exit_code
    assert "issues identified" in result.stdout
    assert "Operations not supported" in result.stdout
    assert "FULLY_CONNECTED" in result.stdout
    assert "Layer(s)" in result.stdout


def test_dataset_memory_overflow():
    """Test that dataset size contributes to memory overflow calculations."""
    expected_exit_code = 10

    # Create a profile with memory that fits model alone but not with dataset
    # hello_world_f32.tflite is approximately 2.5 KB
    flash = 4.5   # 4.5 KB - enough for model alone but not model + dataset
    ram = 4       # 4 KB - tight, will overflow with model + dataset + runtime
    clock = 100
    ops = []
    types = []

    p = create_hardware_profile(flash, ram, clock, ops, types)

    # Create a temporary .bin dataset file that's large enough to cause overflow
    # 2 KB dataset + ~2.5 KB model should exceed both 4.5 KB flash and 4 KB RAM limits
    with tempfile.NamedTemporaryFile(suffix='.bin', delete=False) as tmp:
        dataset_path = tmp.name
        # Create a dataset array: 512 float32 values = 2048 bytes = 2 KB
        # Convert to binary format (contiguous, little-endian)
        dataset = np.random.randn(512).astype(np.float32)
        dataset = np.ascontiguousarray(dataset)
        dataset = dataset.newbyteorder('<')  # little-endian (important for MCUs)
        dataset.tofile(dataset_path)

    try:
        # Test without dataset first - should pass without critical issues
        result_no_dataset = invoke_model_with_class(
            p,
            "tests/data/models/hello_world_f32.tflite"
        )
        # Without dataset, model should fit (exit code 0 or non-critical)
        # This verifies the dataset is what pushes it over the limit
        assert result_no_dataset.returncode == 0, \
            "Model alone should fit without dataset"

        # Test with dataset - should cause critical memory overflow
        result = invoke_model_with_class(
            p,
            "tests/data/models/hello_world_f32.tflite",
            dataset=dataset_path
        )
        assert result.returncode == expected_exit_code, \
            "Model with dataset should trigger memory overflow"
        assert "issues identified" in result.stdout
        assert (
            "Memory Constraint Issues" in result.stdout
            or "memory" in result.stdout.lower()
        )
    finally:
        # Clean up temporary file
        if os.path.exists(dataset_path):
            os.remove(dataset_path)


def test_dataset_file_not_found():
    """Test proper error handling when dataset file doesn't exist."""
    expected_exit_code = 1

    # Basic profile with plenty of memory
    flash = 10000
    ram = 10000
    clock = 100
    ops = []
    types = []

    p = create_hardware_profile(flash, ram, clock, ops, types)

    # Test with non-existent dataset file
    result = invoke_model_with_class(
        p,
        "tests/data/models/hello_world_f32.tflite",
        dataset="tests/data/nonexistent_dataset.bin"
    )

    assert result.returncode == expected_exit_code
    assert "Dataset file not found" in result.stderr


def test_dataset_unsupported_format():
    """Test proper error handling when dataset file has unsupported format."""
    expected_exit_code = 1

    # Basic profile with plenty of memory
    flash = 10000
    ram = 10000
    clock = 100
    ops = []
    types = []

    p = create_hardware_profile(flash, ram, clock, ops, types)

    # Create a temporary .npy dataset file (unsupported format)
    with tempfile.NamedTemporaryFile(suffix='.npy', delete=False) as tmp:
        dataset_path = tmp.name
        dataset = np.random.randn(512).astype(np.float32)
        np.save(dataset_path, dataset)

    try:
        # Test with unsupported dataset format
        result = invoke_model_with_class(
            p,
            "tests/data/models/hello_world_f32.tflite",
            dataset=dataset_path
        )

        assert result.returncode == expected_exit_code
        assert "Unsupported dataset format" in result.stderr
        assert "Only binary (.bin) files are supported" in result.stderr
    finally:
        # Clean up temporary dataset file
        if os.path.exists(dataset_path):
            os.remove(dataset_path)
