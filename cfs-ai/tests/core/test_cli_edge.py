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
import shutil
import time
import re
import urllib.parse
import os
from pathlib import Path
from typer.testing import CliRunner
from unittest.mock import patch, MagicMock
from cfsai.cli import cli
 
runner = CliRunner()

# Variables for test cases
SUCCESS_EXIT_CODE = 0
FAILURE_EXIT_CODE = 1

# Targets
MAX32690_TARGET = "max32690.cm4"
MAX78002_TARGET = "max78002.cm4"
MAX32657_TARGET = "max32657.cm33"
MAX78002_CNN_TARGET = "max78002.cm4.cnn"
ADSPSC835_FX_TARGET = "ADSP-SC835.FX"
ADSPSC835_CM33_TARGET = "ADSP-SC835.CM33"
ADSPSC834_CM33_TARGET = "ADSP-SC834.CM33"
# Note: Using the correct SoC names and cores from CLI feedback
# Other SHARC-FX targets would follow the same pattern: <SoC>.FX
SHARCFX_TARGETS = [
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
    ADSPSC835_FX_TARGET,
    "ADSP-SC835w.FX"
]

CNN_TARGETS = [
    MAX78002_CNN_TARGET
]

CM33_TARGETS = [
    ADSPSC835_CM33_TARGET,
    "ADSP-SC835w.CM33", 
    ADSPSC834_CM33_TARGET,
    "ADSP-SC834w.CM33"
]

TARGETS = [MAX32690_TARGET, MAX78002_TARGET, MAX32657_TARGET]
ALL_TARGETS = TARGETS + SHARCFX_TARGETS + CM33_TARGETS

# Output path constants
OUTPUT_PATH = "./output"
OUTPUT_PATH_M4 = "./m4"
OUTPUT_PATH_FX = "./fx_output"
OUTPUT_PATH_SHARCFX = "./sharcfx_output"
IZER_OUTPUT_PATH = "./izer_output"


# Models
TFLITE_HELLO_MODEL_INT8 = "tests/data/models/hello_world_int8.tflite"
TFLITE_HELLO_MODEL_F32 = "tests/data/models/hello_world_f32.tflite"
TFLITE_RESNET = "tests/data/models/resnet.tflite"
MODELS = [
    TFLITE_HELLO_MODEL_INT8,
    TFLITE_HELLO_MODEL_F32,
    TFLITE_RESNET
]
# CNN Models (PyTorch models for izer backend)
CNN_MODEL_URL = "https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/refs/heads/develop/trained/ai85-catsdogs-qat8-q.pth.tar"
CNN_NETWORK_CONFIG_URL = "https://raw.githubusercontent.com/analogdevicesinc/ai8x-synthesis/refs/heads/develop/networks/cats-dogs-hwc-no-fifo.yaml"

# Alternative CNN URLs for testing (github.com direct links)
CNN_MODEL_URL_GITHUB = "https://github.com/analogdevicesinc/ai8x-synthesis/raw/develop/trained/ai85-catsdogs-qat8-q.pth.tar"
CNN_NETWORK_CONFIG_URL_GITHUB = "https://github.com/analogdevicesinc/ai8x-synthesis/raw/develop/networks/cats-dogs-hwc-no-fifo.yaml"


# Configs
MAX32690_MSDK_CONFIG = "tests/configs/max32690.msdk.cfsconfig"
MAX32690_ZEPHYR_CONFIG = "tests/configs/max32690.zephyr41.cfsconfig"
MAX78002_MSDK_CONFIG = "tests/configs/max78002.msdk.cfsconfig"

# SHARC-FX specific configs (using the actual config file that exists)
ADSPSC835_CONFIG = "tests/configs/adspsc835.cfsconfig"

CONFIGS = [
    MAX32690_MSDK_CONFIG,
    MAX32690_ZEPHYR_CONFIG,
    MAX78002_MSDK_CONFIG,
    ADSPSC835_CONFIG
]

@pytest.fixture(autouse=True)
def cleanup_output_directories():
    # Cleanup output directories before and after tests
    OUTPUT_CLEANUP_PATHS = [
        Path("./m4"),
        Path("./output"),
        Path("./izer_output"),
        Path("./fx_output"),
        Path("./sharcfx_output"),
        Path("./sfx"),
        Path("./src/adi_cnn"),
        Path("./src/adi_tflm")
    ]
    
    def cleanup_path(path):
        if path.exists():
            try:
                time.sleep(0.2)  # Give processes time to release handles
                shutil.rmtree(path, ignore_errors=True)
            except Exception:
                # If still can't delete, try individual files
                try:
                    for root, dirs, files in os.walk(path, topdown=False):
                        for file in files:
                            file_path = Path(root) / file
                            try:
                                file_path.unlink()
                            except Exception:
                                pass
                        for dir in dirs:
                            dir_path = Path(root) / dir
                            try:
                                dir_path.rmdir()
                            except Exception:
                                pass
                    path.rmdir()
                except Exception:
                    pass
    
    # Cleanup before test
    for path in OUTPUT_CLEANUP_PATHS:
        cleanup_path(path)
    
    yield  # Run the test

    # Cleanup after test
    time.sleep(0.1)  # Brief pause before cleanup
    for path in OUTPUT_CLEANUP_PATHS:
        cleanup_path(path)

@pytest.fixture
def dummy_model_file(tmp_path):
    model_path = tmp_path / "model.tflite"
    model_path.write_bytes(b'TFL3' + b'\x00' * 100)  # Minimal invalid TFLite file
    return model_path
 
@pytest.fixture
def cli_commands(dummy_model_file):
    return {
        "build": {
            "valid_short_options": [
                "build",
                "-t", MAX32690_TARGET,
                "-m", TFLITE_HELLO_MODEL_INT8
            ],
            "valid_with_optional": [
                "build",
                "-t", MAX32690_TARGET,
                "-m", TFLITE_HELLO_MODEL_INT8,
                "--output-path", "."
            ],
            # SHARC-FX valid test cases
            "sharcfx_valid_short": [
                "build",
                "-t", ADSPSC835_FX_TARGET,
                "-m", TFLITE_HELLO_MODEL_INT8,
                "--no-path-checks"
            ],
            "sharcfx_valid_with_optional": [
                "build",
                "-t", ADSPSC835_FX_TARGET,
                "-m", TFLITE_HELLO_MODEL_F32,
                "--output-path", "./fx_output",
                "--no-path-checks"
            ],
                        "cnn_missing_backend": [
                "build",
                "--target", MAX78002_CNN_TARGET,
                "--model", CNN_MODEL_URL,
                "--izer-network-config", CNN_NETWORK_CONFIG_URL
            ],
            # GitHub URL variant for CNN testing
            "cnn_github_urls_debug": [
                "build",
                "--target", MAX78002_CNN_TARGET,
                "--model", CNN_MODEL_URL_GITHUB,
                "--izer-network-config", CNN_NETWORK_CONFIG_URL_GITHUB
            ],
            "missing_model": [
                "build",
                "--target", MAX32690_TARGET
            ],
            "missing_target": [
                "build",
                "--model", TFLITE_HELLO_MODEL_INT8
            ],
            "invalid_model": [
                "build",
                "--target", MAX32690_TARGET,
                "--model", str(dummy_model_file)
            ],
            "invalid_target": [
                "build",
                "--target", "invalid.target",
                "--model", TFLITE_HELLO_MODEL_INT8
            ],
            "invalid_backend": [
                "build",
                "-t", MAX32690_TARGET,
                "-m", TFLITE_HELLO_MODEL_INT8,
                "--backend", "invalid.backend",
            ],
            "conflicting_options": [
                "build",
                "--target", MAX32690_TARGET,
                "--model", TFLITE_HELLO_MODEL_INT8,
                "--config", MAX32690_MSDK_CONFIG,
                "--no-path-checks"
            ],
            "nonexisting_model": [
                "build",
                "--target", MAX32690_TARGET,
                "--model", "nonexistent.tflite",
                "--cwd", str(dummy_model_file.parent)
            ],
            # SHARC-FX nonexisting model test
            "sharcfx_nonexisting_model": [
                "build",
                "--target", ADSPSC835_FX_TARGET,
                "--model", "nonexistent.tflite",
                "--no-path-checks"
            ],
            "empty_arguments": [
                "build",
                "--target", "",
                "--model", str(dummy_model_file),
                "--cwd", str(dummy_model_file.parent)
            ],
            # CNN-specific test cases
            "cnn_missing_network_config": [
                "build",
                "--target", MAX78002_CNN_TARGET,
                "--model", CNN_MODEL_URL,
                "--backend", "izer"
            ],
            "cnn_invalid_model_type": [
                "build",
                "--target", MAX78002_CNN_TARGET,
                "--model", TFLITE_HELLO_MODEL_INT8,
                "--backend", "izer",
                "--izer-network-config", CNN_NETWORK_CONFIG_URL
            ]
        }
    }
 
@pytest.fixture(params=TARGETS)
def target(request):
    return request.param

@pytest.fixture(params=CNN_TARGETS)
def cnn_target(request):
    return request.param


@pytest.fixture(params=MODELS)
def model(request):
    return request.param

@pytest.fixture(params=CONFIGS)
def config(request):
    return request.param

def invoke_cli(command, extra_args=None):
    # Helper to invoke CLI with base arguments
    full_cmd = command + (extra_args if extra_args else [])
    result = runner.invoke(cli, full_cmd)
    print(f"Command: {' '.join(full_cmd)}")
    print(f"Exit Code: {result.exit_code}")
    print(f"Output: {result.output}")
    return result

def strip_ansi_and_rich_formatting(text):
    """
    Remove ANSI escape sequences and Rich formatting characters from text.

    This function provides comprehensive cleaning of terminal output by handling:

    - ANSI color codes (e.g., \\x1b[31m for red text)
    - ANSI cursor movement and erase codes
    - Rich library box drawing characters (│, ╭, ╰, ─, etc.)
    - Unicode box drawing and block characters
    - Whitespace normalization

    This is more robust than manual character replacement and handles
    the full spectrum of terminal formatting that might appear in CLI output.

    Args:
        text (str): The text containing ANSI escape sequences and formatting

    Returns:
        str: Clean text with all formatting removed and normalized whitespace

    Examples:
        >>> strip_ansi_and_rich_formatting("\\x1b[31mError\\x1b[0m")
        'Error'
        >>> strip_ansi_and_rich_formatting("╭─ Options ──╮\\n│ --help │\\n╰─────────────╯")
        'Options --help'
    """
    # Remove ANSI escape sequences (comprehensive pattern)
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    text = ansi_escape.sub('', text)

    # Remove Rich box drawing and formatting characters
    rich_chars = {
        '│', '╭', '╰', '╯', '╮', '─', '┌', '┐', '└', '┘',
        '├', '┤', '┬', '┴', '┼', '║', '╔', '╗', '╚', '╝',
        '╠', '╣', '╦', '╩', '╬', '▌', '█', '▀', '▄', '░',
        '▒', '▓', '■', '□', '▪', '▫', '●', '○', '◆', '◇'
    }
    for char in rich_chars:
        text = text.replace(char, '')

    # Clean up extra whitespace that may result from character removal
    text = re.sub(r'\s+', ' ', text).strip()

    return text

@pytest.mark.parametrize("case, expected_exit_code, expected_in_output", [
    # Valid test cases
    ("valid_short_options", SUCCESS_EXIT_CODE, "Created file"),
    ("valid_with_optional", SUCCESS_EXIT_CODE, "Created file"),  # JSON will be checked separately
    # SHARC-FX valid test cases
    ("sharcfx_valid_short", SUCCESS_EXIT_CODE, "Created file"),
    ("sharcfx_valid_with_optional", SUCCESS_EXIT_CODE, "Created file"),
    # Invalid test cases
    ("missing_model", FAILURE_EXIT_CODE, "A target and model are the minimum required"),
    ("missing_target", FAILURE_EXIT_CODE, "A target and model are the minimum required"),
    #("invalid_model", FAILURE_EXIT_CODE, "not a valid TFLite file"), uncomment once exit code is fixed
    ("invalid_target", FAILURE_EXIT_CODE, "SoC INVALID could not be found"),
    ("invalid_backend", FAILURE_EXIT_CODE, "Could not find the backend"),  # JSON will be checked separately
    #("conflicting_options", FAILURE_EXIT_CODE, "Created file"), to confirm conflict handling
    ("nonexisting_model", FAILURE_EXIT_CODE, "files could not be found"),
    # SHARC-FX nonexisting model test
    ("sharcfx_nonexisting_model", FAILURE_EXIT_CODE, "files could not be found"),
    ("empty_arguments", FAILURE_EXIT_CODE, "not a valid target specification"),
    # CNN-specific test cases
    ("cnn_missing_network_config", FAILURE_EXIT_CODE, "--izer-network-config option is required"),
    ("cnn_invalid_model_type", FAILURE_EXIT_CODE, "invalid load key"),
    ("cnn_missing_backend", SUCCESS_EXIT_CODE, "Created file"),  # Auto-selects izer backend
    ("cnn_github_urls_debug", SUCCESS_EXIT_CODE, "Created file")  # GitHub URLs with debug
])

# This function covers checking of exit codes and output messages as error handling (GID-6105735)
def test_build_commands(cli_commands, case, expected_exit_code, expected_in_output):
    """Test build commands with various cases and expected outcomes."""

    # Check if this test case involves CNN requirements
    cnn_cases = ["cnn_missing_network_config", "cnn_invalid_model_type", "cnn_missing_backend", "cnn_github_urls_debug"]
    # No need to skip CNN test cases as they no longer require Docker

    result = invoke_cli(cli_commands["build"][case])
    assert result.exit_code == expected_exit_code
    if expected_in_output:
        # Use robust ANSI and Rich formatting removal
        clean_output = strip_ansi_and_rich_formatting(result.output)
        assert expected_in_output in clean_output


def test_json_output(cli_commands):
    """Test JSON output functionality."""
    command = cli_commands["build"]["valid_with_optional"]
    result = invoke_cli(command)
    assert result.exit_code == 0 # only checking exit code here since the json content is displayed in the output
 
def test_help_command():
    """Test the help command functionality."""
    result = invoke_cli(["build", "--help"])
    assert result.exit_code == 0 
    clean_output = strip_ansi_and_rich_formatting(result.output)
    assert "build [OPTIONS]" in clean_output
    
    # Test for key help sections and options
    assert "Usage:" in clean_output
    assert "Options" in clean_output
    assert "--target" in clean_output
    assert "--model" in clean_output
    assert "--config" in clean_output
    assert "--output-path" in clean_output
    assert "--backend" in clean_output
    assert "--firmware-platform" in clean_output
    assert "--izer-network-config" in clean_output
    
    # Test help descriptions
    assert "Compile a model to source code or a linkable binary" in clean_output
    # Make description checks more flexible to handle formatting differences
    assert "target" in clean_output.lower()
    assert "model" in clean_output.lower()
    assert "config" in clean_output.lower()

@pytest.mark.parametrize("target,model", [
    (MAX32690_TARGET, TFLITE_HELLO_MODEL_INT8),
    (MAX32690_TARGET, TFLITE_HELLO_MODEL_F32),
    (MAX32657_TARGET, TFLITE_HELLO_MODEL_INT8),
    (MAX32657_TARGET, TFLITE_HELLO_MODEL_F32),
    # SHARC-FX target combinations - covering requirement: Supported Models
    (ADSPSC835_FX_TARGET, TFLITE_HELLO_MODEL_INT8),
    (ADSPSC835_FX_TARGET, TFLITE_HELLO_MODEL_F32),
    # CM33 target combinations - following same pattern as CM4 targets
    (ADSPSC835_CM33_TARGET, TFLITE_HELLO_MODEL_INT8),
    (ADSPSC835_CM33_TARGET, TFLITE_HELLO_MODEL_F32),
    (ADSPSC834_CM33_TARGET, TFLITE_HELLO_MODEL_INT8),
    (ADSPSC834_CM33_TARGET, TFLITE_HELLO_MODEL_F32),
])
def test_valid_target_model_combinations(target, model):
    """Test valid combinations of targets and models."""
    result = invoke_cli([
        "build",
        "--target", target,
        "--model", model,
        "--no-path-checks"
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    clean_output = strip_ansi_and_rich_formatting(result.output)
    assert "Created file" in clean_output


@pytest.mark.parametrize("target", ALL_TARGETS)
def test_supported_platforms(target):
    """Test all supported platforms including SHARC-FX (GID-6105756)"""
    result = invoke_cli([
        "build",
        "--target", target,
        "--model", TFLITE_HELLO_MODEL_F32,
        "--output-path", "./fx_output",
        "--no-path-checks"
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE

@pytest.mark.parametrize("backend,model_url,config_url", [
    # Explicit izer backend
    ("izer", CNN_MODEL_URL, CNN_NETWORK_CONFIG_URL),
    # Auto backend selection
    (None, CNN_MODEL_URL, CNN_NETWORK_CONFIG_URL),
    # GitHub URLs variant
    (None, CNN_MODEL_URL_GITHUB, CNN_NETWORK_CONFIG_URL_GITHUB),
])
def test_cnn_target_combinations(backend, model_url, config_url):
    """Test CNN target with various backend and URL combinations."""
    cmd = [
        "build",
        "--target", MAX78002_CNN_TARGET,
        "--model", model_url,
        "--izer-network-config", config_url,
        "--output-path", IZER_OUTPUT_PATH
    ]
    
    if backend:
        cmd.extend(["--backend", backend])
        
    result = invoke_cli(cmd)
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output
    
    # For GitHub URLs, verify they're being used
    if urllib.parse.urlparse(model_url).hostname == "github.com":
        clean_output = strip_ansi_and_rich_formatting(result.output)
        urls = re.findall(r'https?://[^\s\'",]+', clean_output)
        assert any(
            urllib.parse.urlparse(url).hostname == "github.com"
            for url in urls
        ), "No URL with hostname github.com found in output"

@pytest.mark.parametrize("target", CNN_TARGETS)
def test_supported_cnn_platforms(target):
    """Test all supported CNN platforms with izer backend."""
    result = invoke_cli([
        "build",
        "--target", target,
        "--model", CNN_MODEL_URL,
        "--backend", "izer",
        "--izer-network-config", CNN_NETWORK_CONFIG_URL,
        "--output-path", "./izer_output"
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output

@pytest.mark.parametrize("config", CONFIGS)
def test_valid_config_combinations(config):
    """No longer need to check if config requires Docker (MAX78002 izer no longer requires Docker) """
    result = invoke_cli([
        "build",
        "--config", config,
        "--no-path-checks",
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output

def test_max78002_config_validation():
    """Test MAX78002 config file functionality."""
    good_config_path = Path(MAX78002_MSDK_CONFIG)
    assert good_config_path.exists(), f"Config file {MAX78002_MSDK_CONFIG} should exist"
    
    # Test normal config usage
    result = invoke_cli([
        "build",
        "--config", MAX78002_MSDK_CONFIG,
        "--no-path-checks",
        "--output-path", "./izer_output"
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output
    
    # Test JSON output with config
    result = invoke_cli([
        "--json",
        "build",
        "--config", MAX78002_MSDK_CONFIG,
        "--no-path-checks",
        "--output-path", "./izer_output"
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output

def test_sharcfx_config_file_support():
    """Test SHARC-FX with configuration files"""
    result = invoke_cli([
        "build",
        "--config", ADSPSC835_CONFIG,
        "--no-path-checks"
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output
# Code generation tests are covered in the comprehensive test below

def test_cnn_accelerator_full_pipeline():
    """Test full CNN accelerator pipeline including code generation."""
    result = invoke_cli([
        "build",
        "--target", MAX78002_CNN_TARGET,
        "--model", CNN_MODEL_URL,
        "--backend", "izer",
        "--izer-network-config", CNN_NETWORK_CONFIG_URL,
        "--output-path", IZER_OUTPUT_PATH
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output


@pytest.mark.parametrize("target,model", [
    (MAX32690_TARGET, TFLITE_HELLO_MODEL_F32),
    (MAX78002_TARGET, TFLITE_HELLO_MODEL_F32),
    (MAX32657_TARGET, TFLITE_HELLO_MODEL_F32),
    # SHARC-FX code generation tests - covering requirement: Generated Code
    (ADSPSC835_FX_TARGET, TFLITE_HELLO_MODEL_F32),
    (ADSPSC835_FX_TARGET, TFLITE_HELLO_MODEL_INT8),
    # CM33 code generation tests - following same pattern as CM4 targets
    (ADSPSC835_CM33_TARGET, TFLITE_HELLO_MODEL_F32),
    (ADSPSC834_CM33_TARGET, TFLITE_HELLO_MODEL_F32),
])
def test_pass_generated_code(target, model):
    # Test code generation for different target/model combinations including SHARC-FX (GID-6105758)
    cmd = [
        "build",
        "--target", target,
        "--model", model,
        "--output-path", "./fx_output"
    ]
    
    # Add --no-path-checks for SHARC-FX targets (but not CM33 targets)
    if target.endswith(".FX"):
        cmd.append("--no-path-checks")
        
    result = invoke_cli(cmd)
    assert result.exit_code == SUCCESS_EXIT_CODE, f"CLI failed with output: {result.output}"

    output_path = Path("./fx_output")
    # Derive expected output filenames from the model name
    model_base = Path(model).stem
    
    # Verify C++ source file exists
    cpp_file = output_path / f"{model_base}.cpp"
    assert cpp_file.exists(), "Generated C++ source file is missing"
    
    # Verify header file exists  
    hpp_file = output_path / f"{model_base}.hpp"
    assert hpp_file.exists(), "Generated header file is missing"
    
    # For SHARC-FX targets, verify tflite-micro compatibility
    if target.endswith(".FX"):
        cpp_content = cpp_file.read_text()
        hpp_content = hpp_file.read_text()
        
        # Check for tflite-micro library includes/references
        assert any(keyword in cpp_content.lower() for keyword in [
            "tflite", "tensorflow", "micro"
        ]), "C++ file should contain tflite-micro references"
        
        assert any(keyword in hpp_content.lower() for keyword in [
            "tflite", "tensorflow", "micro"
        ]), "Header file should contain tflite-micro references"
    
    # For CM33 targets, verify tflite-micro compatibility (same as CM4 targets)
    if target.endswith(".CM33"):
        cpp_content = cpp_file.read_text()
        hpp_content = hpp_file.read_text()
        
        # Check for tflite-micro library includes/references
        assert any(keyword in cpp_content.lower() for keyword in [
            "tflite", "tensorflow", "micro"
        ]), "C++ file should contain tflite-micro references for CM33"
        
        assert any(keyword in hpp_content.lower() for keyword in [
            "tflite", "tensorflow", "micro"
        ]), "Header file should contain tflite-micro references for CM33"

def test_sharcfx_local_execution():
    """Test SHARC-FX requirement: Local Execution - runs locally without external resources"""
    result = invoke_cli([
        "build",
        "--target", ADSPSC835_FX_TARGET,
        "--model", TFLITE_HELLO_MODEL_F32,
        "--output-path", OUTPUT_PATH_FX,
        "--no-path-checks"
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output
    # Verify no network calls or external dependencies are mentioned in output
    assert "docker" not in result.output.lower()
    assert "download" not in result.output.lower()
    assert "remote" not in result.output.lower()


@pytest.mark.parametrize("cm33_target", CM33_TARGETS)
def test_cm33_target_support(cm33_target):
    """Test CM33 targets follow the same pattern as CM4 targets - use tflm backend"""
    result = invoke_cli([
        "build",
        "--target", cm33_target,
        "--model", TFLITE_HELLO_MODEL_F32,
        "--output-path", "./fx_output"
        # Note: No --no-path-checks flag needed for CM33 targets (unlike .FX targets)
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output


@pytest.mark.parametrize("sharcfx_target", SHARCFX_TARGETS)
def test_sharcfx_host_os_support(sharcfx_target):
    """Test SHARC-FX requirement: Backend Host OS - supports execution on any CodeFusion Studio platform"""
    result = invoke_cli([
        "build",
        "--target", sharcfx_target,
        "--model", TFLITE_HELLO_MODEL_F32,
        "--output-path", OUTPUT_PATH_FX,
        "--no-path-checks"
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output


def test_sharcfx_multiple_models_support():
    """Test SHARC-FX requirement: Multiple Models - supports multiple TFLite inputs"""
    output_path = Path(OUTPUT_PATH_FX)
    
    for model in MODELS:
        result = invoke_cli([
            "build",
            "--target", ADSPSC835_FX_TARGET,
            "--model", model,
            "--output-path", str(output_path),
            "--no-path-checks"
        ])
        assert result.exit_code == SUCCESS_EXIT_CODE
        assert "Created file" in result.output
        
        # Verify each model generates its own files
        model_base = Path(model).stem
        assert (output_path / f"{model_base}.cpp").exists()
        assert (output_path / f"{model_base}.hpp").exists()


@pytest.mark.parametrize("error_case,expected_error_message", [
    # Invalid SHARC-FX target
    (["build", "--target", "invalid.sharcfx", "--model", TFLITE_HELLO_MODEL_F32], 
     "SoC INVALID could not be found"),
    
    # Missing model for SHARC-FX target
    (["build", "--target", ADSPSC835_FX_TARGET], 
     "A target and model are the minimum required"),
    
    # Invalid model file for SHARC-FX
    (["build", "--target", ADSPSC835_FX_TARGET, "--model", "nonexistent.tflite"], 
     "files could not be found"),
    
    # Empty target specification for SHARC-FX
    (["build", "--target", "", "--model", TFLITE_HELLO_MODEL_F32], 
     "not a valid target specification"),
])
def test_sharcfx_error_handling(error_case, expected_error_message):
    """Test SHARC-FX requirement: Error Handling - fails gracefully with useful information"""
    result = invoke_cli(error_case)
    assert result.exit_code == FAILURE_EXIT_CODE
    assert expected_error_message in result.output
    
    # Verify error message is informative (not just a stack trace)
    assert len(result.output.strip()) > 0
    # Should not contain raw stack traces in user-facing output
    assert "Traceback" not in result.output

def test_sharcfx_output_path_handling():
    """Test SHARC-FX custom output path handling"""
    custom_output = OUTPUT_PATH_SHARCFX
    result = invoke_cli([
        "build",
        "--target", ADSPSC835_FX_TARGET,
        "--model", TFLITE_HELLO_MODEL_F32,
        "--output-path", custom_output,
        "--no-path-checks"
    ])
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output
    
    # Verify files are created in the specified output path
    output_path = Path(custom_output)
    model_base = Path(TFLITE_HELLO_MODEL_F32).stem
    assert (output_path / f"{model_base}.cpp").exists()
    assert (output_path / f"{model_base}.hpp").exists()


@pytest.mark.parametrize("argument_format", [
    # Short form arguments
    ["build", "-t", ADSPSC835_FX_TARGET, "-m", TFLITE_HELLO_MODEL_F32, "--no-path-checks"],
    
    # Long form arguments  
    ["build", "--target", ADSPSC835_FX_TARGET, "--model", TFLITE_HELLO_MODEL_F32, "--no-path-checks"],
    
    # Mixed arguments
    ["build", "-t", ADSPSC835_FX_TARGET, "--model", TFLITE_HELLO_MODEL_F32, "--no-path-checks"]
])
def test_sharcfx_cross_platform_consistency(argument_format):
    """Test SHARC-FX behavior consistency across different invocation methods"""
    result = invoke_cli(argument_format)
    assert result.exit_code == SUCCESS_EXIT_CODE
    assert "Created file" in result.output
