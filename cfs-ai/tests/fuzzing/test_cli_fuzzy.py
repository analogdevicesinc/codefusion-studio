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
import tempfile
import subprocess
import shutil
from pathlib import Path
from hypothesis import given, settings
import pytest

from cfsai_types.config.cfsconfig import CfsConfig
from cfsai.support import validate
from strats import core_cfs_strat


def is_charmap_compliant(s: str, encoding: str = "charmap") -> bool:
    """
    Checks if a string contains only characters valid in the specified encoding.
    Args:
        s (str): The string to check.
        encoding (str): The encoding to validate against (default is "charmap").
    Returns:
        bool: True if the string contains only valid characters for the encoding, False otherwise.
    """
    try:
        # Attempt to encode the string using the specified encoding
        s.encode(encoding)
        return True
    except UnicodeEncodeError:
        return False


def is_windows_reserved_name(name: str) -> bool:
    """
    Checks if a name is a Windows reserved device name.
    Args:
        name (str): The name to check.
    Returns:
        bool: True if the name is a Windows reserved device name, False otherwise.
    """
    reserved_names = {
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
        'CON', 'PRN', 'AUX', 'NUL'
    }
    # Check both the exact name and name without extension
    base_name = name.split('.')[0].upper()
    return base_name in reserved_names

@pytest.mark.fuzzing
@settings(max_examples=50, deadline=10000)
@given(core_cfs_strat()) # Used core_cfs_strat from core.py to generate a CfsConfig
def test_integration_with_cli(config: CfsConfig):
    # Extract projects early to ensure it's always available for cleanup
    projects = config.projects or []
    
    # Validate if the generated cfsconfig can be processed
    try:
        validate(config)
    except Exception as e:
        # If validation fails, this configuration should be invalid
        # so the CLI should also fail
        return

    # Create a temporary directory for the config file
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        config_path = tmp_path / "config.json"

        # Save config to disk
        with config_path.open("w", encoding="utf-8") as f:
            json.dump(config.model_dump(), f, default=str)

        # Extract the `soc` field and validate other potential error conditions
        soc = config.soc
        errPrjFlag = 0
        errDockerFlag = 0

        for project in projects:
            try:
                project_name = project.name
                # Check for encoding issues and Windows reserved device names
                if not is_charmap_compliant(project_name) or is_windows_reserved_name(project_name):
                    errPrjFlag = 1
            except RuntimeError:
                errPrjFlag = 1

        if soc.lower() in ["max78002"]:
            errDockerFlag = 1

        # Check for errors in the output
        if errPrjFlag or errDockerFlag:
             # skip the CLI execution if there are expected errors
            return

        # Run the CLI command
        cli_cmd = ["uv", "run", "python", "-m", "cfsai", "build", "--config", str(config_path), "--no-path-checks"]
        result = subprocess.run(cli_cmd, capture_output=True, text=True)
        
        # If we reached this point, the configuration passed validation and 
        # doesn't have known error conditions, so the CLI should succeed
        if result.returncode != 0:
            # Print debug information when the test fails
            print(f"Config: {config}")
            print(f"STDOUT:\n{result.stdout}")
            print(f"STDERR:\n{result.stderr}")
            print(f"Exit code: {result.returncode}")
        
        assert result.returncode == 0, f"CLI should have succeeded but failed with code {result.returncode}"
        
        # Cleanup generated files
        for project in projects:
            try:
                generated_folder = Path(project.name)
                if generated_folder.exists():
                    shutil.rmtree(generated_folder)
            except Exception as e:
                print(f"Failed to delete folder {generated_folder}: {e}")
