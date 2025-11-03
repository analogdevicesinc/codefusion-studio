"""
AI Model Parser Package.

Comprehensive TensorFlow Lite model analysis framework for hardware deployment
optimization and performance profiling. This package provides advanced parsing
capabilities to extract detailed performance metrics, memory usage patterns,
and computational requirements from AI models.

Key Features:
- TensorFlow Lite model parsing and comprehensive analysis
- Layer-wise MAC (Multiply-Accumulate) operation counting
- Memory footprint analysis for flash storage and runtime RAM
- Tensor lifecycle tracking for memory optimization opportunities
- Hardware performance estimation and resource planning
- Cross-platform compatibility with standard TFLite schema

Primary Classes:
- TFLiteParser: Main parser for TensorFlow Lite model analysis

Usage:
    >>> from cfsai_model_parser import TFLiteParser
    >>> parser = TFLiteParser()
    >>> model_details = parser.parse_model("model.tflite")
    >>> print(f"Model requires {model_details.model_peak_ram_kb:.1f} KB RAM")
    >>> print(f"Total MACs: {model_details.total_macs:,}")

Supported Model Formats:
- TensorFlow Lite (.tflite) models
- Quantized models (INT8, FLOAT16, BFLOAT16)
- Models with custom operators (with fallback estimation)

Copyright (c) 2025 Analog Devices, Inc. All Rights Reserved.
Released under the terms of the "LICENSE.md" file in the root directory.
"""

from cfsai_model_parser.parse_tflm import TFLiteParser

# Public API surface
__all__ = [
    "TFLiteParser",  # Primary TensorFlow Lite model parser
]




