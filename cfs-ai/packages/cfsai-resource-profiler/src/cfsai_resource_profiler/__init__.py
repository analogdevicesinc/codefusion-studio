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

"""
CFSAI Resource Profiler Package.

A comprehensive AI model resource profiling and performance analysis toolkit for 
embedded and edge computing deployments. This package provides detailed analysis 
of neural network models including memory usage, performance characteristics, 
hardware compatibility, and optimization opportunities.

Key Features:
- TensorFlow Lite model resource analysis
- Hardware-specific performance profiling
- Memory usage analysis and constraint validation
- Layer-wise performance breakdown
- Optimization opportunity identification
- Structured reporting with visualization capabilities

Primary Classes:
- TFLiteResourceProfiler: Main profiling engine for TensorFlow Lite models

Target Use Cases:
- Embedded AI deployment planning
- Edge computing resource optimization
- Model performance characterization
- Hardware compatibility assessment
- Optimization strategy development

Example Usage:
    from cfsai_resource_profiler import TFLiteResourceProfiler
    
    # Initialize profiler with hardware constraints
    profiler = TFLiteResourceProfiler(hardware_profile={
        "hw_ram_size_mb": 2,
        "hw_flash_size_mb": 512
    })
    
    # Profile a TensorFlow Lite model
    report = profiler.profile_model("model.tflite")
    
    # Generate human-readable analysis
    report.visualize_resource_profile()

Dependencies:
- TensorFlow Lite (tflite) for model parsing
- Pydantic for data validation and schema management
- NumPy for numerical computations
- Tabulate for report visualization (optional)

"""

# Core profiling functionality imports
from cfsai_resource_profiler.profile_resources import (
    TFLiteResourceProfiler,
)

# Public API definition for external package consumers
__all__ = [
    "TFLiteResourceProfiler",
]
