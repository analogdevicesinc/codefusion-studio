# Copyright (c) 2025 Analog Devices, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


import json
from pathlib import Path

from pydantic import ValidationError
import pytest

from cfsai_types.config.cfsconfig import CfsConfig
from cfsai_types.config.aiconfig import (
    FileInfo, 
    ModelConfig, 
    ConfigTargetExplicit, 
    ConfigBackend
)

data_path = Path(__file__).parent.parent / 'data' / 'aiconfig'
aiconfig_data = dict()
for file in data_path.iterdir():
    with open(file, 'r', encoding='utf8') as fd:
        aiconfig_data[file.stem] = json.load(fd)

def remove_test_meta_data(data):
    for x in data:
        del x['testDescription']

def get_fails(name: str):
    ret = aiconfig_data[name]['fail']
    remove_test_meta_data(ret)
    return ret

def get_passes(name: str):
    ret = [t for t in aiconfig_data[name]['pass']]
    remove_test_meta_data(ret)
    return ret

@pytest.fixture
def fail_optionals():
    return get_fails('optionals')

@pytest.fixture
def pass_optionals():
    return get_passes('optionals')

@pytest.fixture
def fail_types():
    return get_fails('types')

@pytest.fixture
def pass_types():
    return get_passes('types')

TEST_FILE = Path("tests/data/aiconfig/optionals.json")

def test_file_info_creation():
    file_info = FileInfo(model=TEST_FILE)
    assert file_info.model == TEST_FILE


def test_model_config_creation():
    file_info = FileInfo(
             model=Path("tests/data/aiconfig/optionals.json"),
             network=Path("tests/data/aiconfig/optionals.json"),
             input=Path("tests/data/aiconfig/optionals.json")
             )
    model_config = ModelConfig(
        Name='My Test',
        OutDir=Path('./data'),
        Files=file_info,
        Target=ConfigTargetExplicit(
            Core="Core1",
            Accelerator="NPU",
            Runtime="TFLite"
        ),
        Active=True,
        Backend=ConfigBackend(Name="TensorFlow"),
    )
    assert model_config.file_info == file_info
    assert model_config.target.core == "CORE1"
    assert model_config.target.accelerator == "NPU"
    assert model_config.backend.name == "TensorFlow"
    assert model_config.target.runtime == "TFLITE"

def test_invalid_file_info():
    with pytest.raises(Exception):
        FileInfo(model=None)

def test_invalid_model_config():
    with pytest.raises(ValidationError):
        ModelConfig(
            model_file_info=None,
            Target="Core1",
            Active=True
        )

def test_fail_optionals(fail_optionals):
    for d in fail_optionals:
        with pytest.raises(ValueError):
            _ = CfsConfig(**d)

def test_pass_optionals(pass_optionals):
    for d in pass_optionals:
        _ = CfsConfig(**d)

def test_fail_types(fail_types):
    for d in fail_types:
        with pytest.raises(ValueError):
            _ = CfsConfig(**d)

def test_pass_types(pass_types):
    for d in pass_types:
        _ = CfsConfig(**d)
