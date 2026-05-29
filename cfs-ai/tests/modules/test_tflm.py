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
    "HELLO": "tests/data/models/hello_world_f32.tflite",
    "RESNET": "tests/data/models/resnet.tflite"
}

_cores = [
    ("Cortex-M", "MAX32690", "CM4"),
    ("Cortex-M", "MAX32657", "CM33"),
    ("SHARC-FX", "ADSP-21835", "FX"),
    ("Cortex-M", "ADSP-SC835", "M33")
]

def create_backend_config(family, soc, core, model):
    p = ProjectInfo(
        name="test",
        workspace=".",
        out_dir="output"
    )
    f = { 'Model': model }
    t = UserTarget(
        soc=soc,
        core=core,
        family=family
    )
    b = ConfigBackend(
        name="tflm"
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
    for key, model in _models.items():
        for family, soc, core in _cores:
            k = f'{soc}.{core}.{key}'
            c[k] = create_backend_config(
                family, 
                soc, 
                core,
                model
        )

    return c


_configs = generate_configs()
_config_params = [(c) for c in _configs.values()]
_config_ids = [
    f"{k}"
    for k in _configs.keys()
]


def find_input_files():
    base = Path("tests/data/json")
    files = list(base.glob("tflm.*.json")) if base.exists() else []
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
    args = [sys.executable, "-m", "cfsai_backend_tflm", "--file", file]
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
def test_tflm_jsons(file):
    expected_exit_code = 0
    result = invoke_module_with_file(file)
    assert result.returncode == expected_exit_code

@pytest.mark.parametrize("config", _config_params, ids=_config_ids)
def test_tflm_configs(config):
    expected_exit_code = 0

    result = invoke_model_with_class(config)
    assert result.returncode == expected_exit_code

    assert "MyModel.cpp" in result.stdout
    assert "MyModel.hpp" in result.stdout
    assert "Created file" in result.stdout

def test_bad_models():
    expected_exit_code = 1
    family = "Cortex-M"
    soc = "MAX32690"
    core = "CM4"
    
    # Model file not found
    c = create_backend_config(
        family, 
        soc, 
        core,
        "tests/data/models/missing.tflite"
    )
    result = invoke_model_with_class(c)
    assert result.returncode == expected_exit_code
    assert "No such file or directory" in result.stderr

    # Model not a valid tflite
    c = create_backend_config(
        family, 
        soc, 
        core,
        "tests/data/models/ai85-catsdogs-qat8-q.pth.tar"
    )
    result = invoke_model_with_class(c)
    assert result.returncode == expected_exit_code
    assert "valid" in result.stderr

