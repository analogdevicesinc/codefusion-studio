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
AI Model Compatibility Analyzer.

Comprehensive hardware compatibility assessment framework for AI model deployment
on resource-constrained embedded systems. This package provides automated analysis
of model characteristics against hardware constraints to ensure successful deployment
and optimal performance on target platforms.

Key Features:
- Hardware constraint validation and compatibility scoring
- Operator support verification across different hardware platforms
- Memory and computational resource requirement analysis
- Quantization compatibility assessment for embedded deployment
- Automated optimization recommendations and deployment guidance
- Detailed compatibility reporting with actionable insights

Primary Classes:
- CompatibilityAnalyzer: Main analyzer for comprehensive compatibility assessment

Usage:
    >>> from cfsai_compatibility_analyzer import CompatibilityAnalyzer
    >>> analyzer = CompatibilityAnalyzer(hardware_profile)
    >>> report = analyzer.analyze_model("model.tflite")

Supported Analysis Types:
- Memory constraint validation (flash storage and runtime RAM)
- Operator compatibility verification against hardware capabilities
- Data type and quantization scheme validation
- Performance bottleneck identification and optimization guidance
- Cross-platform deployment feasibility assessment
"""

from cfsai_compatibility_analyzer.analyze_compatibility import (
    CompatibilityAnalyzer,
)

# Public API surface
__all__ = [
    "CompatibilityAnalyzer",  # Primary compatibility analysis engine
]
