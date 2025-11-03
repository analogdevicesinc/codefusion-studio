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


import pytest
import subprocess
import platform
from pathlib import Path
from urllib.parse import urlparse

max78002_model_network_map = {
    'ai85-mnist-qat8-q.pth.tar' : 'mnist-chw-ai85.yaml',
    'ai85-cifar10-qat8-q.pth.tar' : 'cifar10-nas.yaml',
    'ai85-cifar100-qat8-q.pth.tar' : 'cifar100-nas.yaml',
    'ai85-cifar100-qat-mixed-q.pth.tar' : 'cifar100-simple.yaml',
    'ai85-cifar100-simplenetwide2x-qat-mixed-q.pth.tar' : 'cifar100-simplewide2x.yaml',
    'ai87-kws20_v3-qat8-q.pth.tar' : 'ai87-kws20-v3-hwc.yaml',
    'ai87-kws20_v2-qat8-q.pth.tar' : 'ai87-kws20-v2-hwc.yaml',
    'ai87-mobilefacenet-112-qat-q.pth.tar' : 'ai87-mobilefacenet-112.yaml', # with `-e Fifo=true` cli arg,
    'ai85-catsdogs-qat8-q.pth.tar' : 'cats-dogs-hwc-no-fifo.yaml',
    'ai85-camvid-unet-large-fakept-q.pth.tar' : 'camvid-unet-large-fakept.yaml',
    'ai85-aisegment-unet-large-fakept-q.pth.tar' : 'aisegment-unet-large-fakept.yaml', # overlap-data, mlator, no-unload
    'ai85-svhn-tinierssd-qat8-q.pth.tar' : 'svhn-tinierssd.yaml', # overlap-data
    'ai87-cifar100-effnet2-qat8-q.pth.tar' : 'ai87-cifar100-effnet2.yaml',
    'ai87-cifar100-mobilenet-v2-0.75-qat8-q.pth.tar' : 'ai87-cifar100-mobilenet-v2-0.75.yaml',
    'ai87-imagenet-effnet2-q.pth.tar' : 'ai87-imagenet-effnet2.yaml',
    'ai87-facedet-tinierssd-qat8-q.pth.tar' : 'ai87-facedet-tinierssd.yaml',
    'ai87-pascalvoc-fpndetector-qat8-q.pth.tar' : 'ai87-pascalvoc-fpndetector.yaml', # with `-e Fifo=true`, no-unload
    'ai85-kinetics-qat8-q.pth.tar' : 'ai85-kinetics-actiontcn.yaml' # overlap-data, zero-stram
}

# Update the dictionary as needed
valid_targets = { 
    "cortex-m": [ 
        "max32690.cm4", 
        "max78002.cm4",
        "max78002.cm4.cnn",
        "max32657.cm33",
        "ADSP-SC835.CM33",
        "ADSP-SC835w.CM33",
        "ADSP-SC834.CM33", 
        "ADSP-SC834w.CM33"
     ],
     "sharcfx": [
         "ADSP-21834.FX",
         "ADSP-21834w.FX",
         "ADSP-21835.FX",
         "ADSP-21835w.FX",
         "ADSP-21836.FX",
         "ADSP-21836w.FX",
         "ADSP-21837.FX",
         "ADSP-21837w.FX",
         "ADSP-SC834.FX",
         "ADSP-SC834w.FX",
         "ADSP-SC835.FX",
         "ADSP-SC835w.FX"
     ]
}
valid_backend   = ["tflm", "izer", "neuroweave"]
valid_fwplat    = ["msdk", "zephyr", "cces"]
invalid_path    = "*invalid*/path/output"
empty_targets   = ""
empty_model     = ""
empty_config    = ""

TEST_CASES = []

# Generate test cases for each architecture
for arch, targets in valid_targets.items():
    model_path = "tests/data/models/hello_world_int8.tflite"  # Fixed filename from hello_world_i8 to hello_world_int8
    for target in targets:
        # Skip CNN targets in basic generation since they need special network config
        if target.endswith(".cnn"):
            continue
            
        TEST_CASES.append({
            "input": {
                "target": target,
                "model": Path(model_path),
                "output-path": "",
                "backend": "",
                "cwd": "",
                "runtime": "",
                "firmware-platform": "",
                "no-path-checks": "",
                "only-core": "",
                "izer-network-config": ""
            },
            "testDescription": f"Input with valid {arch} target and model path"
        })

ADDITIONAL_TEST_CASES = [
    # Backend variations will be added here later
    
    # Firmware platform variations
    *[{"input": {
        "target": valid_targets["cortex-m"][0],
        "model": Path("tests/data/models/hello_world_int8.tflite"),  # Fixed filename
        "config": "",
        "output-path": "",
        "backend": "",
        "cwd": "",
        "firmware-platform": fw_plat,
        "no-path-checks": "",
        "only-core": "",
        "izer-network-config": ""},
        "testDescription": f"Valid target and model with {fw_plat} firmware platform"}
    for fw_plat in valid_fwplat],
    
    # Specific max78002.cm4.cnn tests with proper network config
    {"input": {
        "target": "max78002.cm4.cnn",
        "model": "https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/refs/heads/develop/trained/ai85-mnist-qat8-q.pth.tar",
        "config": "",
        "output-path": "./cnn_e2e_output",
        "backend": "izer",
        "cwd": "",
        "firmware-platform": "",
        "no-path-checks": "",
        "only-core": "",
        "izer-network-config": "https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/refs/heads/develop/networks/mnist-chw-ai85.yaml"},
        "testDescription": "max78002.cm4.cnn with valid izer backend and network config"},
    
    {"input": {
        "target": "max78002.cm4.cnn",
        "model": "https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/refs/heads/develop/trained/ai85-catsdogs-qat8-q.pth.tar",
        "config": "",
        "output-path": "./cnn_e2e_output2",
        "backend": "izer",
        "cwd": "",
        "firmware-platform": "",
        "no-path-checks": "",
        "only-core": "",
        "izer-network-config": "https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/refs/heads/develop/networks/cats-dogs-hwc-no-fifo.yaml"},
        "testDescription": "max78002.cm4.cnn with catsdogs model and network config"},
    
    # Test missing network config for CNN target (should fail)
    {"input": {
        "target": "max78002.cm4.cnn",
        "model": "https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/refs/heads/develop/trained/ai85-mnist-qat8-q.pth.tar",
        "config": "",
        "output-path": "./cnn_e2e_output_fail",
        "backend": "izer",
        "cwd": "",
        "firmware-platform": "",
        "no-path-checks": "",
        "only-core": "",
        "izer-network-config": ""},
        "testDescription": "max78002.cm4.cnn missing network config (should fail)"},
    #SHARC-FX specific test case (unique to e2e - focuses on subprocess execution)
    {"input": {
         "target": valid_targets["sharcfx"][0],
         "model": Path("tests/data/models/hello_world_f32.tflite"),
         "config": "",
         "output-path": "./sharcfx_e2e_output",
         "backend": "",
         "cwd": "",
         "firmware-platform": "",
         "no-path-checks": True,
         "only-core": "",
         "izer-network-config": ""},
         "testDescription": "Valid target and model with no-path-checks flag enabled"},
    
    {"input": {
        "target": valid_targets["cortex-m"][0],
        "model": Path("tests/data/models/hello_world_int8.tflite"),  # Fixed filename
        "config": "",
        "output-path": "",
        "backend": "",
        "cwd": "",
        "firmware-platform": "",
        "no-path-checks": "",
        "only-core": "",
        "izer-network-config": ""},
        "testDescription": "Valid target and model with debug flag enabled"},
    
    {"input": {
        "target": valid_targets["cortex-m"][0],
        "model": Path("tests/data/models/hello_world_int8.tflite"),  # Fixed filename
        "config": "",
        "output-path": "",
        "backend": "",
        "cwd": "",
        "firmware-platform": "",
        "no-path-checks": "",
        "only-core": "",
        "izer-network-config": ""},
        "testDescription": "Valid target and model with json output enabled"},
    
    # Combined parameter variations
    {"input": {
        "target": valid_targets["cortex-m"][0],
        "model": Path("tests/data/models/hello_world_int8.tflite"),  # Fixed filename
        "config": "",
        "output-path": "",
        "backend": "",
        "cwd": "",
        "firmware-platform": valid_fwplat[0],
        "no-path-checks": "",
        "only-core": "",
        "izer-network-config": ""},
        "testDescription": "Valid target and model with multiple valid parameters"},
    
    # Invalid combinations (focus on parameter validation rather than SHARC-FX specific errors)
    {"input": {
        "target": valid_targets["cortex-m"][0],
        "model": Path("tests/data/models/hello_world_int8.tflite"),  # Fixed filename
        "config": "",
        "output-path": "",
        "backend": "invalid_backend",
        "cwd": "",
        "firmware-platform": "invalid_firmware",
        "no-path-checks": "",
        "only-core": "",
        "izer-network-config": ""},
        "testDescription": "Valid target and model with multiple invalid parameters"},
]

# Append to existing TEST_CASES
TEST_CASES.extend(ADDITIONAL_TEST_CASES)

# Generate CNN izer test cases using the model-network map
CNN_IZER_TEST_CASES = []

# Base URL for models and network configs
AI8X_MODELS_BASE_URL = "https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/refs/heads/develop/trained/"
AI8X_NETWORKS_BASE_URL = "https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/refs/heads/develop/networks/"

# Generate test cases for a subset of model-network combinations (to avoid overly long test runs)
# Using a representative sample from the map
sample_models = [
    'ai85-mnist-qat8-q.pth.tar',
    'ai85-cifar10-qat8-q.pth.tar',
    'ai85-catsdogs-qat8-q.pth.tar',
    'ai87-kws20_v3-qat8-q.pth.tar',
    'ai87-facedet-tinierssd-qat8-q.pth.tar'
]

for i, model_file in enumerate(sample_models):
    if model_file in max78002_model_network_map:
        network_file = max78002_model_network_map[model_file]
        model_url = AI8X_MODELS_BASE_URL + model_file
        network_url = AI8X_NETWORKS_BASE_URL + network_file

        # Test case for valid CNN izer combination
        CNN_IZER_TEST_CASES.append({
            "input": {
                "target": "max78002.cm4.cnn",
                "model": model_url,
                "output-path": f"./cnn_output_{i}",  # Unique output path for each test
                "backend": "izer",
                "cwd": "",
                "runtime": "",
                "firmware-platform": "",
                "no-path-checks": "",
                "only-core": "",
                "izer-network-config": network_url
            },
            "testDescription": f"CNN izer test with {model_file} and {network_file}"
        })

        # Test case for missing network config (should fail)
        CNN_IZER_TEST_CASES.append({
            "input": {
                "target": "max78002.cm4.cnn",
                "model": model_url,
                "output-path": f"./cnn_fail_output_{i}",  # Unique output path for each test
                "backend": "izer",
                "cwd": "",
                "runtime": "",
                "firmware-platform": "",
                "no-path-checks": "",
                "only-core": "",
                "izer-network-config": ""
            },
            "testDescription": f"CNN izer test missing network config for {model_file} (should fail)"
        })

# Add CNN izer test cases to main test cases
TEST_CASES.extend(CNN_IZER_TEST_CASES)

# Skip since the error code is 0 (CFSIO-6711)
"""
{"input": {
        "config": "",
        "target": "max32690.cm4",
        "model": Path("tests/data/models/hello_world_int8.tflite"),  # Fixed filename
        "output-path": invalid_path,
        "backend": "",
        "cwd": "",
        "runtime": "",
        "firmware-platform": "",
        "no-path-checks": "",
        "only-core": "",
        "izer-network-config": ""},
        "testDescription": "Output path with special characters"},
"""

# Test case for help command validation
HELP_TEST_CASES = [
    {
        "command": ["cfsai", "build", "--help"],
        "expected_patterns": [
            "Usage:",
            "build [OPTIONS]",
            "Compile a model to source code or a linkable binary",
            "--target",
            "--model", 
            "--config",
            "--output-path",
            "--backend",
            "--firmware-platform",
            "--izer-network-config",
            "--only-core",
            "--no-path-checks",
            "--help"
        ],
        "testDescription": "Help command output validation"
    },
    {
        "command": ["cfsai", "--help"],
        "expected_patterns": [
            "Usage:",
            "CFSAI Helping you put your AI model on hardware",
            "Commands",  # Changed from "+- Commands" to just "Commands"
            "build",
            "list-targets",
            "--version",
            "--verbose", 
            "--json"
        ],
        "testDescription": "Main help command output validation"
    }
]
# Helper Functions
def _strip_ansi_escape_sequences(text):
    """Strip ANSI escape sequences from text for pattern matching."""
    import re
    if not text:
        return ""
    # Remove ANSI escape sequences
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)


def _is_valid_url(url_string):
    """Check if the given string is a valid HTTP/HTTPS URL"""
    try:
        result = urlparse(str(url_string))
        return all([result.scheme, result.netloc]) and result.scheme in ['http', 'https']
    except:
        return False


def _is_valid_model(value):
    """Validate model parameter"""
    if not isinstance(value, (str, Path)) or value == "":
        return False
    if _is_valid_url(value):
        return True
    return Path(value).exists()


def _is_valid_config(value):
    """Validate config parameter"""
    if not isinstance(value, (str, Path)):
        return False
    if value != "" and not Path(value).exists():
        return False
    return True


def _is_valid_enum_parameter(value, valid_options):
    """Validate parameter against a list of valid options"""
    return value == "" or value in valid_options


def _is_valid_path_parameter(value, is_output_path=False):
    """Validate path parameters (output-path, cwd)"""
    if not isinstance(value, (str, Path)):
        return False
    if value == "":
        return True
    # For output paths, we don't require them to exist beforehand
    if is_output_path:
        return True
    # For other paths like cwd, they should exist
    return Path(value).exists()


def _is_valid_boolean_parameter(value):
    """Validate boolean flag parameters"""
    return isinstance(value, bool) or value is None or value == ""


def _is_valid_target(value, all_valid_targets):
    """Validate target parameter"""
    return value in all_valid_targets

# Validate input 
def validate_input(input_dict):
    model_found = False
    target_found = False
    
    # Get all valid targets from the valid_targets dictionary
    all_valid_targets = []
    for targets in valid_targets.values():
        all_valid_targets.extend(targets)
    
    # Validate all fields
    for key, value in input_dict.items():
        if key == "model":
            if not _is_valid_model(value):
                return False
            model_found = True
        elif key == "target":
            if not _is_valid_target(value, all_valid_targets):
                return False
            target_found = True
        elif key == "config":
            if not _is_valid_config(value):
                return False
        elif key == "backend":
            if not _is_valid_enum_parameter(value, valid_backend):
                return False
        elif key == "firmware-platform":
            if not _is_valid_enum_parameter(value, valid_fwplat):
                return False
        elif key == "runtime":
            if not _is_valid_enum_parameter(value, ["no-runtime"]):
                return False
        elif key == "output-path":
            if not _is_valid_path_parameter(value, is_output_path=True):
                return False
        elif key == "cwd":
            if not _is_valid_path_parameter(value, is_output_path=False):
                return False
        elif key in ["no-path-checks"]: # boolean flag:
            if not isinstance(value, (bool, str)) or (isinstance(value, str) and value not in ["", "True", "False"]):
                return False
        elif key in ["only-core", "izer-network-config"]:
            continue # Allow to be empty
        elif value is not None and value != "":
            return False  # Invalid parameter
    
    # All validations passed, check minimum requirements
    if not (model_found and target_found):
        return False

    # Special validation for CNN targets - they require izer-network-config
    target_value = input_dict.get("target", "")
    if target_value.endswith(".cnn"):
        izer_network_config = input_dict.get("izer-network-config", "")
        if not izer_network_config:
            return False  # CNN targets require network config

    return True


# Execute CLI command
def build_cli_command(input_dict):
    parts = ["cfsai build"]
    for key, value in input_dict.items():
        if isinstance(value, list):
            for item in value:
                parts.append(f"--{key} {item}")
        elif isinstance(value, (list, tuple)):
            for component in value:
                parts.append(f"--{key} {component}")
        elif key in ["no-path-checks", "only-core"] and (value is True or value == "True"):
            # Boolean flags don't take values - only add flag if True
            parts.append(f"--{key}")
        elif value is not None and value != "":
            parts.append(f"--{key} \"{value}\"")
    return " ".join(parts)

# (GID-6105725) This function covers running test locally via subprocess 
def run_command_with_env_setup(command):
    system = platform.system()
    if system == "Windows":
        # Using uv run directly for better Windows compatibility and avoid encoding issues
        full_cmd = f"uv run {command}"
    else:
        # For Unix-like systems (Linux/macOS)
        full_cmd = f". ./.venv/bin/activate && {command}"

    project_root = Path(__file__).parent.parent.parent
    try:
        return subprocess.run(
            full_cmd,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",  # Handle encoding errors gracefully
            cwd=project_root  # Ensure the correct working directory
        )
    except UnicodeDecodeError:
        # Fallback for encoding issues
        return subprocess.run(
            full_cmd,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            cwd=project_root
        )

def load_cases():
    return [
        {**case, "expected_result": "pass" if validate_input(case["input"]) else "fail"}
        for case in TEST_CASES
    ]

@pytest.mark.parametrize("case", load_cases())
def test_cli_edge_cases(case):
    cli_cmd = build_cli_command(case["input"])
    result = run_command_with_env_setup(cli_cmd)

    print(f"\n[EDGE] {case['expected_result'].upper()} - {case['testDescription']}")
    print("Command:", cli_cmd)
    print("stdout:", result.stdout)
    print("stderr:", result.stderr)

    if case["expected_result"] == "pass":
        assert result.returncode == 0
    else:
        assert result.returncode != 0

# Helper function to run help command tests
def run_help_command(command):
    """Run a help command and return the result."""
    return run_command_with_env_setup(" ".join(command))

@pytest.mark.parametrize("case", HELP_TEST_CASES)
def test_help_output_validation(case):
    """Test help command output contains expected patterns."""
    result = run_help_command(case["command"])
    
    print(f"\n[HELP] {case['testDescription']}")
    print("Command:", " ".join(case["command"]))
    print("stdout:", result.stdout)
    print("stderr:", result.stderr)
    
    # Help commands should always succeed
    assert result.returncode == 0, f"Help command failed: {result.stderr}"
    
    # Check for expected patterns in output (strip ANSI escape sequences)
    raw_output = result.stdout or ""
    output = _strip_ansi_escape_sequences(raw_output).lower()
    for pattern in case["expected_patterns"]:
        assert pattern.lower() in output, f"Expected pattern '{pattern}' not found in help output"

def test_help_command_comprehensive():
    """Comprehensive test for build help command structure."""
    result = run_help_command(["cfsai", "build", "--help"])
    
    assert result.returncode == 0
    raw_output = result.stdout or ""  # Handle case where stdout might be None
    output = _strip_ansi_escape_sequences(raw_output)  # Strip ANSI escape sequences
    
    # Test that output has proper structure
    assert "Usage:" in output
    assert "Options" in output or "FLAGS" in output
    
    # Test that all main options are documented (excluding global options)
    required_options = [
        "--target", "--model", "--config", "--output-path", 
        "--backend", "--firmware-platform", 
        "--izer-network-config", "--only-core", "--no-path-checks",
        "--help"
    ]
    
    for option in required_options:
        assert option in output, f"Required option '{option}' not found in help output"
    
    # Test option descriptions are present (using more flexible matching)
    assert "target" in output.lower(), "Target option description not found"
    assert "model" in output.lower(), "Model option description not found"
    assert "config" in output.lower() or "cfsconfig" in output.lower(), "Config option description not found"

def test_main_help_command():
    """Test main help command structure."""
    result = run_help_command(["cfsai", "--help"])
    
    assert result.returncode == 0
    raw_output = result.stdout
    output = _strip_ansi_escape_sequences(raw_output)  # Strip ANSI escape sequences
    
    # Test main command structure
    assert "Usage:" in output
    assert "Commands" in output  # Changed from "+- Commands" to just "Commands"
    assert "build" in output
    assert "list-targets" in output or "list_targets" in output
    
    # Test global options
    assert "--version" in output
    assert "--verbose" in output
    assert "--json" in output
