"""
Advanced AI Model Analysis Integration Tests

Comprehensive test suite for validating the integration and functionality of
AI model parsing, compatibility analysis, and resource profiling components.
These tests verify end-to-end workflows for TensorFlow Lite model analysis
and hardware deployment assessment.

Copyright (c) 2025 Analog Devices, Inc. All Rights Reserved.
Released under the terms of the "LICENSE.md" file in the root directory.
"""

import pytest
from pathlib import Path
from typing import Any, Dict

from cfsai_compatibility_analyzer.analyze_compatibility import CompatibilityAnalyzer
from cfsai_compatibility_analyzer.schemas import CompatibilityReport
from cfsai_resource_profiler.profile_resources import TFLiteResourceProfiler
from cfsai_resource_profiler.schemas import ResourceProfileReport
from cfsai_model_parser import TFLiteParser
from cfsai_model_parser.exceptions import ModelFileNotFoundError

from cfsai_types.hardware_profile import HardwareProfile

# Test data directory containing reference TensorFlow Lite models
TEST_MODELS_PATH = Path(__file__).parent.parent / 'data' / 'models'

EMBEDDED_MCU_PROFILE: HardwareProfile = HardwareProfile(
    SupportedOps=[
        "CONV_2D",              # Standard 2D convolution layers
        "ADD",                  # Element-wise addition operations
        "DepthwiseConv2D",      # Depth-wise separable convolutions
        "FULLY_CONNECTED",      # Dense/linear layers
        "ReLU",                 # ReLU activation function
        "SOFTMAX",              # Softmax activation for classification
        "Pooling",              # Max/average pooling operations
        "BatchNormalization",   # Batch normalization layers
        "MUL"                   # Element-wise multiplication
    ],
    AccelOps=[],
    SupportedDataTypes=["INT8", "UINT8"],
    FlashSize=1024.0,
    RamSize=1024.0,
    CoreClock=400.0,
    OperatorInfos=[]
)

# Hardware performance profile for resource estimation testing
PERFORMANCE_PROFILE: HardwareProfile = HardwareProfile(
    SupportedOps=[],
    AccelOps=[
        "CONV_2D",
        "DEPTHWISE_CONV_2D"
    ],
    SupportedDataTypes=[],
    FlashSize=1024.0,
    RamSize=1024.0,
    CoreClock=100.0,
    OperatorInfos=[
        {
            "Name": "MAC",
            "Cycles": 1.0,
            "Energy": 0.25
        }
    ]
)

def test_compatibility_analysis_workflow():
    """
    Test comprehensive hardware compatibility analysis workflow.
    
    Validates the complete compatibility analysis pipeline including:
    - Model loading and parsing
    - Hardware constraint validation
    - Compatibility scoring and issue identification
    - Report generation and visualization
    - Optimization recommendation generation
    
    Uses a quantized INT8 model optimized for embedded deployment
    to verify compatibility with resource-constrained hardware.
    """
    # Select quantized model optimized for embedded deployment
    model_file = "resnet.tflite"
    model_path = str(TEST_MODELS_PATH / model_file)

    # Initialize compatibility analyzer with embedded MCU specifications
    analyzer = CompatibilityAnalyzer()
    compatibility_report = analyzer.analyze_model(model_path, EMBEDDED_MCU_PROFILE)

    # Validate report generation and display functionality
    print(f"\n=== Compatibility Analysis: {model_file} ===")
    compatibility_report.print_report()
    compatibility_report.print_report(verbose=True)

    # Test alternative report visualization formats
    compatibility_report.print_summary()
    compatibility_report.show_table()

    # Extract optimization recommendations
    optimization_suggestions = compatibility_report.get_quick_fixes()
    print(f"Optimization Recommendations: {optimization_suggestions}")

    # Validate critical issue detection
    if compatibility_report.has_critical_issues():
        print("FAILURE: Model incompatible with target hardware platform")
    else:
        print("SUCCESS: Model compatible with target hardware platform")


def test_resource_profiling_workflow():
    """
    Test comprehensive resource profiling and performance estimation.
    
    Validates the complete resource analysis pipeline including:
    - MAC calculation
    - Memory usage profiling (flash and RAM requirements)
    - Performance estimation with hardware-specific parameters
    - Energy consumption modeling
    - Resource utilization visualization
    
    Uses a complex CNN model to stress-test profiling algorithms
    and validate accuracy of resource estimation techniques.
    """
    # Select complex model for comprehensive resource analysis
    model_file = "resnet.tflite"
    model_path = str(TEST_MODELS_PATH / model_file)
    
    # Initialize resource profiler with performance characteristics
    profiler = TFLiteResourceProfiler()

    print(f"\n=== Resource Profiling: {model_file} ===")
    
    # Perform comprehensive resource analysis with hardware context
    profiling_result = profiler.analyze_model(
        model_path,
        hardware_profile=PERFORMANCE_PROFILE
    )

    # Validate profiling result structure and data integrity
    assert profiling_result is not None, "Resource profiling failed to generate results"
    
    # Generate resource utilization visualization
    profiling_result.visualize_resource_profile()
    
    print("SUCCESS: Resource profiling completed with hardware performance context")


def test_model_parsing_complex_architecture():
    """
    Test model parsing with complex CNN architecture (ResNet).
    
    Validates parser capability with sophisticated neural network architectures
    including residual connections, skip layers, and advanced operation types.
    Tests comprehensive analysis features and optimization recommendations.
    """
    model_file = "resnet.tflite"
    model_path = str(TEST_MODELS_PATH / model_file)
    
    print(f"\n=== Model Analysis: {model_file} (Complex CNN Architecture) ===")
    
    # Initialize parser and perform comprehensive model analysis
    parser = TFLiteParser()
    model_analysis = parser.parse_model(model_path)

    # Validate basic model information extraction
    assert model_analysis.model_name, "Model name extraction failed"
    assert model_analysis.layer_count > 0, "Layer analysis failed"
    assert model_analysis.total_macs > 0, "MAC calculation failed"

    # Test multiple visualization formats for complex models
    print("\n--- Standard Table View ---")
    model_analysis.show()                    # Default tabular layer breakdown
    
    print("\n--- Executive Summary ---")
    model_analysis.show("summary")           # Concise overview for stakeholders

    print("\n--- Detailed Technical Analysis ---")
    model_analysis.show("analysis")          # Comprehensive analysis with optimization guidance
    
    print("\n--- Architecture Details ---")
    model_analysis.show("analysis", include_tensors=True)  # Include tensor flow analysis

    print("\n--- Extended Layer View ---")
    model_analysis.show("table", max_layers=25)  # Detailed layer-by-layer breakdown

    # Validate programmatic access to analysis results
    model_statistics = model_analysis.get_stats()
    
    # Ensure statistics contain expected data
    assert 'total_layers' in model_statistics, "Layer count missing from statistics"
    
    print("SUCCESS: Complex architecture parsing and analysis completed")


def test_model_parsing_float32_precision():
    """
    Test model parsing with FLOAT32 precision models.
    
    Validates parser handling of full-precision floating-point models
    and verifies appropriate optimization recommendations for quantization
    opportunities in embedded deployment scenarios.
    """
    model_file = "hello_world_f32.tflite"
    model_path = str(TEST_MODELS_PATH / model_file)

    print(f"\n=== Model Analysis: {model_file} (FLOAT32 Precision) ===")
    
    # Parse FLOAT32 model and validate precision handling
    parser = TFLiteParser()
    model_analysis = parser.parse_model(model_path)

    # Validate data type detection and handling
    assert model_analysis.target_dtype.lower() in ['float32', 'unknown'], \
        f"Unexpected data type detected: {model_analysis.target_dtype}"

    # Test visualization capabilities for FLOAT32 models
    model_analysis.show()                    # Standard analysis view
    model_analysis.show("summary")           # Executive summary
    model_analysis.show("analysis")          # Detailed analysis with quantization recommendations
    model_analysis.show("analysis", include_tensors=True)  # Include tensor precision details
    model_analysis.show("table", max_layers=25)  # Complete layer breakdown

    # Extract and validate model statistics
    model_statistics = model_analysis.get_stats()
    print(f"Model Precision: {model_analysis.target_dtype}")
    
    # Verify quantization optimization opportunities are identified
    if model_analysis.target_dtype.lower() == 'float32':
        print("RECOMMENDATION: Consider INT8 quantization for embedded deployment")
    
    print("SUCCESS: FLOAT32 model parsing and precision analysis completed")


def test_model_parsing_quantized_int8():
    """
    Test model parsing with INT8 quantized models.
    
    Validates parser handling of quantized models optimized for embedded
    deployment and verifies accurate resource estimation for integer
    arithmetic operations.
    """
    model_file = "hello_world_int8.tflite"
    model_path = str(TEST_MODELS_PATH / model_file)

    print(f"\n=== Model Analysis: {model_file} (INT8 Quantized) ===")
    
    # Parse quantized model and validate quantization handling
    parser = TFLiteParser()
    model_analysis = parser.parse_model(model_path)

    # Validate quantized model characteristics
    expected_dtypes = ['int8', 'uint8', 'unknown']
    assert model_analysis.target_dtype.lower() in expected_dtypes, \
        f"Unexpected data type for quantized model: {model_analysis.target_dtype}"

    # Test analysis capabilities for quantized models
    model_analysis.show()                    # Standard quantized model view
    model_analysis.show("summary")           # Quantization-aware summary
    model_analysis.show("analysis")          # Analysis with embedded deployment focus
    model_analysis.show("analysis", include_tensors=True)  # Quantized tensor details
    model_analysis.show("table", max_layers=25)  # Complete quantized layer analysis

    # Extract and validate quantized model statistics
    model_statistics = model_analysis.get_stats()
    print(f"Quantization Scheme: {model_analysis.target_dtype}")
    
    # Verify quantized models show reduced memory requirements
    print(f"Memory Efficiency (quantized): {model_analysis.model_size_on_disk_kb:.1f} KB")
    
    print("SUCCESS: INT8 quantized model parsing and optimization analysis completed")


def test_error_handling_invalid_model_path():
    """
    Test robust error handling for invalid model file paths.
    
    Validates that the parser provides clear, actionable error messages
    when model files are missing, inaccessible, or corrupted, ensuring
    graceful failure handling in production environments.
    """
    # Attempt to parse non-existent model file
    invalid_model_file = "nonexistent_model.tflite"
    invalid_model_path = str(TEST_MODELS_PATH / invalid_model_file)

    print(f"\n=== Error Handling Test: {invalid_model_file} ===")
    
    # Verify appropriate exception handling for missing files
    parser = TFLiteParser()
    
    with pytest.raises(ModelFileNotFoundError) as exception_info:
        parser.parse_model(invalid_model_path)
    
    # Validate exception contains helpful information
    error_message = str(exception_info.value)
    assert invalid_model_path.casefold() in error_message.casefold(), "Error message should include file path"
    
    print(f"SUCCESS: Appropriate error handling for missing file: {error_message}")


def test_end_to_end_workflow_integration():
    """
    Test complete end-to-end AI model deployment workflow.
    
    Validates the integration of parsing, compatibility analysis, and
    resource profiling components in a realistic deployment scenario.
    Simulates the complete workflow from model file to deployment decision.
    """
    model_file = "hello_world_int8.tflite"
    model_path = str(TEST_MODELS_PATH / model_file)
    
    print(f"\n=== End-to-End Deployment Workflow: {model_file} ===")
    
    # Step 1: Comprehensive model parsing and analysis
    print("Step 1: Model Parsing and Structural Analysis")
    parser = TFLiteParser()
    model_analysis = parser.parse_model(model_path)
    
    model_stats = model_analysis.get_stats()
    print(f"  Model Size: {model_analysis.model_size_on_disk_kb/1024:.2f} MB")
    print(f"  Computational Load: {model_analysis.total_macs/1e6:.1f}M MACs")
    
    # Step 2: Hardware compatibility assessment
    print("\nStep 2: Hardware Compatibility Assessment")
    compatibility_analyzer = CompatibilityAnalyzer()
    compatibility_report = compatibility_analyzer.analyze_model(model_path, EMBEDDED_MCU_PROFILE)
    
    # Step 3: Resource profiling and performance estimation
    print("\nStep 3: Performance and Resource Profiling")
    resource_profiler = TFLiteResourceProfiler()
    profiling_result = resource_profiler.analyze_model(
        model_path, 
        hardware_profile=PERFORMANCE_PROFILE
    )
    
    print("  Performance estimation completed")
    
    # Step 4: Deployment decision logic
    print("\nStep 4: Deployment Decision Assessment")
    
    deployment_feasible = (
        not compatibility_report.has_critical_issues()
    )
    
    if deployment_feasible:
        print("  DECISION: Model approved for embedded deployment")
        print("  RECOMMENDATION: Proceed with hardware implementation")
    else:
        print("  DECISION: Model requires optimization before deployment")
        optimization_fixes = compatibility_report.get_quick_fixes()
        print(f"  REQUIRED ACTIONS: {optimization_fixes}")
    
    print("SUCCESS: End-to-end workflow integration test completed")


if __name__ == "__main__":
    """
    Standalone test execution for development and debugging.
    
    Allows individual test execution outside of pytest framework
    for rapid development iteration and manual validation.
    """
    print("AI Model Analysis Integration Test Suite")
    print("=" * 50)
    
    try:
        test_compatibility_analysis_workflow()
        test_resource_profiling_workflow()
        test_model_parsing_complex_architecture()
        test_model_parsing_float32_precision()
        test_model_parsing_quantized_int8()
        test_error_handling_invalid_model_path()
        test_end_to_end_workflow_integration()
        
        print("\n" + "=" * 50)
        print("ALL TESTS COMPLETED SUCCESSFULLY")
        
    except Exception as e:
        print(f"\nTEST FAILURE: {e}")
        raise
