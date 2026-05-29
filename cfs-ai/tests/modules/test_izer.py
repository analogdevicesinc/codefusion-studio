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
from cfsai_types.config.verified import ProjectInfo, VerifiedConfig, VerifiedBackendConfig

_models = { 
    ("tests/data/models/ai85-catsdogs-qat8-q.pth.tar", "tests/data/models/cats-dogs-hwc-no-fifo.yaml")
}

def create_backend_config(model, network):
    p = ProjectInfo(
        name="test",
        workspace=".",
        out_dir="output"
    )
    f = { 'Model': model, 'NetworkConfig': network }
    t = UserTarget(
        soc="MAX78002",
        core="CM4",
        accelerator="CNN",
        family="Cortex-M"
    )
    b = ConfigBackend(
        name="izer"
    )

    v = VerifiedConfig(
        name="MyModel",
        prj_info=p,
        files=f,
        target=t,
        backend=b
    )
    c = VerifiedBackendConfig(
        items=[v]
    )
    return c

def generate_configs():
    c = {}
    for model,network in _models:
        c[model] = create_backend_config(model,network)
    return c
        

_configs = generate_configs()
_config_params = [(c) for c in _configs.values()]
_config_ids = [
    f"{k}"
    for k in _configs.keys()
]


def find_input_files():
    base = Path("tests/data/json")
    files = list(base.glob("izer.*.json")) if base.exists() else []
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

def invoke_module_with_file(file: str):
    args = [sys.executable, "-m", "cfsai_backend_izer", "--file", file]
    result = subprocess.run(args, capture_output=True, text=True)
    return result

def invoke_model_with_class(config):
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as tmp:
        json.dump(config.model_dump(), tmp)
        tmp_path = tmp.name
    result = invoke_module_with_file(tmp_path)
    os.remove(tmp_path)
    return result

@pytest.mark.parametrize("file", _json_params, ids=_json_ids)
def test_izer_jsons(file):
    expected_exit_code = 0
    result = invoke_module_with_file(file)
    assert result.returncode == expected_exit_code

@pytest.mark.parametrize("config", _config_params, ids=_config_ids)
def test_izer_configs(config):
    expected_exit_code = 0

    result = invoke_model_with_class(config)
    assert result.returncode == expected_exit_code

    assert "cnn.c" in result.stdout
    assert "cnn.h" in result.stdout
    assert "sampledata.h" in result.stdout
    assert "softmax.c" in result.stdout
    assert "weights.h" in result.stdout
    assert "Created file" in result.stdout

def test_bad_models():
    expected_exit_code = 1
    
    # Model file not found
    c = create_backend_config(
        "missing",
        "tests/data/models/cats-dogs-hwc-no-fifo.yaml"
    )
    result = invoke_model_with_class(c)
    assert result.returncode == expected_exit_code
    # Izer backend doesn't test if model exists, returns
    # indexing error later.
    assert "list index out of range" in result.stderr

    # Network file not found
    c = create_backend_config(
        "tests/data/models/ai85-catsdogs-qat8-q.pth.tar",
        "missing"
    )
    result = invoke_model_with_class(c)
    assert result.returncode == expected_exit_code
    assert "YAML configuration file missing does not exist" in result.stderr

    # Model not a valid pytorch
    c = create_backend_config(
        "tests/data/models/hello_world_f32.tflite",
        "tests/data/models/cats-dogs-hwc-no-fifo.yaml"
    )
    result = invoke_model_with_class(c)
    assert result.returncode == expected_exit_code
    assert "valid" in result.stderr

    # Network not valid
    c = create_backend_config(
        "tests/data/models/ai85-catsdogs-qat8-q.pth.tar",
        "tests/data/models/hello_world_f32.tflite"
    )
    result = invoke_model_with_class(c)
    assert result.returncode == expected_exit_code
    assert "valid" in result.stderr

