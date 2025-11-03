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
Model Compatibility Analyzer.

This module provides comprehensive compatibility analysis for TensorFlow Lite models
against hardware constraints and target specifications. It validates operator support,
memory constraints, and data type compatibility.
"""

import logging
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional, Union

from cfsai_model_parser import TFLiteParser
from cfsai_model_parser.schemas import LayerDetail, ModelDetails

from cfsai_compatibility_analyzer.exceptions import (
    CompatibilityAnalysisError,
    InvalidHardwareMetadataError,
    ModelParsingError,
)
from cfsai_compatibility_analyzer.schemas import (
    CompatibilityReport,
    MemoryIssue,
    MemoryRecommendation,
    OperatorIssue,
    OptimizationOpportunity,
    UnsupportedTypeIssue,
)

# Analysis Configuration Constants
MAX_OPTIMIZATION_LAYERS = 10

# Memory conversion constants
MB_TO_KB_MULTIPLIER = 1024
MS_PER_SECOND = 1000

# Quantization savings ratios (conservative estimates)
FLOAT64_TO_INT8_SAVINGS_RATIO = 0.875  # 8 bytes → 1 byte = 87.5% reduction
FLOAT32_TO_INT8_SAVINGS_RATIO = 0.75   # 4 bytes → 1 byte = 75% reduction  
FLOAT16_TO_INT8_SAVINGS_RATIO = 0.50   # 2 bytes → 1 byte = 50% reduction

# Layer compression effectiveness multipliers
HIGH_COMPRESSION_EFFECTIVENESS = 0.9   # 90% of theoretical savings
MODERATE_COMPRESSION_EFFECTIVENESS = 0.7  # 70% of theoretical savings
LIMITED_COMPRESSION_EFFECTIVENESS = 0.3   # 30% of theoretical savings
DEFAULT_COMPRESSION_EFFECTIVENESS = 0.6   # 60% for unknown types
FALLBACK_COMPRESSION_EFFECTIVENESS = 0.8  # 80% conservative default

# Analysis thresholds
MIN_SAVINGS_THRESHOLD_KB = 1.0         # Minimum meaningful savings in KB
MIN_SAVINGS_THRESHOLD_PERCENT = 0.10   # Minimum meaningful savings as % of layer
HIGH_PRIORITY_LAYER_SIZE_KB = 100      # Size threshold for high priority optimization

@dataclass(frozen=True)
class AnalysisMetrics:
    """Metrics collected during compatibility analysis."""
    total_layers: int
    unsupported_operators: int
    memory_violations: int
    data_type_issues: int
    analysis_duration_ms: float

class CompatibilityAnalyzer:
    """
    Comprehensive hardware compatibility analyzer for AI model deployment.
    
    Analyzes TensorFlow Lite models against hardware constraints to identify
    compatibility issues and provide optimization recommendations for successful
    embedded deployment.
    """

    def __init__(self) -> None:
        """
        Initialize the compatibility analyzer.
                
        Raises:
            InvalidHardwareMetadataError: If hw_meta is invalid or malformed
        """
        self.logger = logging.getLogger(
            f"{__name__}.{self.__class__.__name__}"
        )

        self.logger.info(f"Initialized analyzer: {self.__class__.__name__}")

    def analyze_model(self, model_path: Union[str, Path], 
                      hw_metadata: dict[str, str | dict]) -> CompatibilityReport:
        """
        Perform comprehensive compatibility analysis on a TensorFlow Lite model.
        
        Args:
            model_path: Path to the model file to analyze
            hw_metadata: Hardware metadata dictionary containing:
                - supported_operations: List of supported operator names
                - compatibility_constraints: Dict with size and memory limits  
                - supported_data_types: List of supported data type strings
                
        Returns:
            CompatibilityReport containing detailed analysis results
            
        Raises:
            ModelParsingError: If model parsing fails
            CompatibilityAnalysisError: If analysis encounters an error
            InvalidHardwareMetadataError: If hardware metadata is invalid
        """
        if not model_path:
            raise CompatibilityAnalysisError(
                "Model path cannot be empty",
                error_code="EMPTY_MODEL_PATH"
            )
            
        analysis_start_time = time.time()
        
        try:
            # Validation of hardware profile done with pydantic class
            # So we just need to validate that an instance is provided
            if not hw_metadata:
                raise InvalidHardwareMetadataError(
                    "Hardware metadata cannot be empty",
                    error_code="EMPTY_METADATA"
                )
            
            # Store hardware metadata for analysis phases
            self.hw_metadata = hw_metadata
            self.supported_operations = getattr(hw_metadata, "supported_ops", [])
            self.supported_data_types = getattr(hw_metadata, "supported_data_types", [])
            
            # Normalize data types to uppercase for case-insensitive comparison
            self.normalized_supported_data_types = [
                dtype.upper() for dtype in self.supported_data_types
            ]

            self.logger.info(f"Starting compatibility analysis for: {model_path}")
            
            # Parse model with validation
            parsed_model = self._parse_model_safely(model_path)
            self._validate_parsed_model(parsed_model)
            
            # Perform comprehensive analysis
            analysis_results = self._perform_analyses(parsed_model)
            
            # Build structured report
            compatibility_report = self._build_compatibility_report(analysis_results)
            
            # Calculate and log analysis metrics
            analysis_duration_ms = (time.time() - analysis_start_time) * MS_PER_SECOND
            analysis_metrics = self._calculate_metrics(
                analysis_results, 
                analysis_duration_ms,
                parsed_model.layer_details
            )
            self._log_analysis_metrics(analysis_metrics)
            
            self.logger.info("Compatibility analysis completed successfully")
            return compatibility_report
            
        except (ModelParsingError, CompatibilityAnalysisError, 
                InvalidHardwareMetadataError):
            raise
        except Exception as e:
            error_duration_ms = (time.time() - analysis_start_time) * MS_PER_SECOND
            self.logger.error(
                f"Unexpected error during compatibility analysis after "
                f"{error_duration_ms:.1f}ms: {e}"
            )
            raise CompatibilityAnalysisError(
                f"Analysis failed unexpectedly: {e}",
                error_code="UNEXPECTED_ERROR",
                details={"duration_ms": error_duration_ms}
            ) from e

    def _parse_model_safely(self, model_path: Path) -> ModelDetails:
        """Parse model with comprehensive error handling."""
        try:
            parser = TFLiteParser()
            return parser.parse_model(str(model_path))
        except Exception as e:
            raise ModelParsingError(
                f"Failed to parse model '{model_path}': {e}",
                error_code="MODEL_PARSE_FAILED",
                details={"model_path": str(model_path), "parser_error": str(e)}
            ) from e

    def _validate_parsed_model(self, parsed_model: ModelDetails) -> None:
        """Validate parsed model has required attributes."""
        required_attributes = \
        ["layer_details", "total_macs", "model_total_param_memory_b"]
        
        for attr in required_attributes:
            if not hasattr(parsed_model, attr):
                raise ModelParsingError(
                    f"Parsed model missing required attribute: {attr}",
                    error_code="INVALID_PARSED_MODEL",
                    details={"missing_attribute": attr}
                )

    def _perform_analyses(self, parsed_model: ModelDetails) -> dict[str, Any]:
        """
        Perform all compatibility analyses and return results.
        
        Args:
            parsed_model: Parsed model object
            
        Returns:
            Dictionary containing analysis results
            
        Raises:
            CompatibilityAnalysisError: If any analysis phase fails
        """
        results = {}
        
        try:
            self.logger.debug("Analyzing operator compatibility")
            results['operator_issues'] = self._analyze_operators(
                parsed_model.layer_details)
            
            self.logger.debug("Analyzing memory compatibility")
            results['memory_issues'] = self._analyze_memory(parsed_model)
            
            self.logger.debug("Analyzing data type compatibility")
            results['type_issues'] = self._analyze_data_types(
                parsed_model.layer_details, 
                parsed_model
            )
            
        except Exception as e:
            raise CompatibilityAnalysisError(
                f"Analysis phase failed: {e}",
                error_code="ANALYSIS_PHASE_ERROR"
            ) from e
        
        return results

    def _analyze_operators(self, layer_details: list[LayerDetail]) -> \
        Optional[list[OperatorIssue]]:
        """
        Analyze operator compatibility against hardware support.
        
        Args:
            layer_details: List of layer detail objects to analyze
            
        Returns:
            List of operator compatibility issues, or None if no issues found
            
        Raises:
            CompatibilityAnalysisError: If analysis encounters unexpected errors
        """
        if not layer_details:
            self.logger.debug("No layer details provided for operator analysis")
            return None
        
        issues = []
        processed_layers = 0
        
        try:
            # Normalize supported operations for case-insensitive comparison
            normalized_supported_ops = {op.upper() for op in self.supported_operations}
            
            for layer in layer_details:
                # Validate layer object has required attributes
                if not hasattr(layer, 'name') or not hasattr(layer, 'index'):
                    self.logger.warning(
                        f"Skipping layer with missing attributes: {layer}"
                    )
                    continue
                
                layer_name = getattr(layer, 'name', 'UNKNOWN').upper()
                layer_index = getattr(layer, 'index', processed_layers)
                processed_layers += 1
               
                # If we have a list of supported data types, verify that only those
                # listed are used by the model. Empty list means all are supported.
                if normalized_supported_ops \
                    and (layer_name not in normalized_supported_ops \
                        and layer_name != 'UNKNOWN'):
                    # Check for close matches or alternatives
                    suggested_alternative = \
                        self._find_operator_alternative(layer_name)
                    
                    # Ensure suggested alternative is actually supported
                    if (suggested_alternative != "None" and 
                        suggested_alternative.upper() \
                            not in normalized_supported_ops):
                        suggested_alternative = "None"

                    issues.append(OperatorIssue(
                        type="unsupported operator",
                        operator=layer_name,
                        layer_index=layer_index,
                        suggested_alternative=suggested_alternative,
                        severity="critical"
                        )
                    )
                    
            self.logger.debug(
                f"Processed {processed_layers} layers, "
                f"found {len(issues)} operator issues"
            )
            
        except Exception as e:
            raise CompatibilityAnalysisError(
                f"Operator analysis failed: {e}",
                error_code="OPERATOR_ANALYSIS_ERROR",
                details={"processed_layers": processed_layers}
            ) from e
        
        return issues if issues else None

    def _find_operator_alternative(self, operator_name: str) -> str:
        """
        Find hardware-compatible alternative for unsupported operator.
        
        Args:
            operator_name: The unsupported operator name (normalized to uppercase)
            
        Returns:
            Suggested alternative operator name, or "None" if no alternative found
        """
        if not operator_name or not isinstance(operator_name, str):
            return "None"
            
        # Normalize input for case-insensitive matching
        normalized_name = operator_name.upper().strip()
        
        # Mapping of common alternatives (all uppercase)
        alternatives = {                        
            # Advanced activations - TFLM has limited activation support
            "GELU": "TANH",  # GELU can be approximated with TANH
            "SWISH": "None",  # Not natively supported
            "ELU": "RELU",  # Replace with basic RELU
            "SELU": "RELU",  # Replace with basic RELU
            "LEAKY_RELU": "RELU",  # Basic RELU alternative
            "COMPLEX_ACTIVATION": "RELU",  # Generic complex activation alternative
            
            # Convolution variants
            "ADVANCED_CONV": "CONV_2D",
            "SEPARABLE_CONV": "DEPTHWISE_CONV_2D",
            "DILATED_CONV": "CONV_2D",  # Standard conv as alternative
            
            # Math operations alternatives
            "MATRIX_MUL": "FULLY_CONNECTED",
            "BATCH_MATMUL": "FULLY_CONNECTED",
            
            # Pooling alternatives
            "ADAPTIVE_POOL": "AVERAGE_POOL_2D",
            "GLOBAL_POOL": "AVERAGE_POOL_2D",
        }
        
        return alternatives.get(normalized_name, "None")

    def _analyze_data_types(self, layer_details: list[LayerDetail], 
                            parsed_model: ModelDetails) -> \
                                Optional[list[UnsupportedTypeIssue]]:
        """
        Analyze data type compatibility for each layer against hardware constraints.
        
        Args:
            layer_details: List of layer detail objects to analyze
            parsed_model: Parsed model containing metadata
            
        Returns:
            List of data type compatibility issues, or None if no issues found
            
        Raises:
            CompatibilityAnalysisError: If data type analysis encounters errors
        """
        if not layer_details:
            self.logger.debug("No layer details provided for data type analysis")
            return None
        
        # Validate required attributes exist
        if not hasattr(self, 'normalized_supported_data_types'):
            raise CompatibilityAnalysisError(
                "Normalized supported data types not available for analysis",
                error_code="MISSING_SUPPORTED_TYPES"
            )
        
        issues = []
        processed_layers = 0
        
        try:
            for layer in layer_details:
                # Validate layer object has required attributes
                if not hasattr(layer, 'index') or not hasattr(layer, 'name'):
                    self.logger.warning(
                        f"Skipping layer with missing attributes at index "
                        f"{processed_layers}"
                    )
                    processed_layers += 1
                    continue
                
                layer_index = getattr(layer, 'index', processed_layers)
                operation_type = getattr(layer, 'name', 'UNKNOWN')
                processed_layers += 1
                
                # Get layer-specific data types
                try:
                    layer_data_types = self._get_layer_data_types(layer)
                except Exception as e:
                    self.logger.warning(
                        f"Failed to get data types for layer {layer_index}: {e}"
                    )
                    layer_data_types = []
                
                # Fall back to model-level data type if no layer-specific info
                if not layer_data_types and parsed_model:
                    model_dtype = getattr(parsed_model, 'target_dtype', 'UNKNOWN')
                    if model_dtype and model_dtype != 'UNKNOWN':
                        layer_data_types = [model_dtype.upper()]
                
                # Check each unique data type found in this layer
                unique_data_types = set(layer_data_types) if layer_data_types else set()
                
                # If we have a list of supported data types, verify that only those
                # listed are used by the model. Empty list means all are supported.
                if self.normalized_supported_data_types:
                    for data_type in unique_data_types:
                        # Skip empty, None, or unknown data types
                        if not data_type or data_type == 'UNKNOWN' \
                            or data_type == 'NONE':
                            continue
                    
                        # Normalize data type for comparison
                        normalized_dtype = data_type.upper().strip()
                    
                        # Check if data type is supported
                        if normalized_dtype not in self.normalized_supported_data_types:
                            # Determine severity based on data type
                            severity = self._determine_dtype_severity(normalized_dtype)
                        
                            issue = UnsupportedTypeIssue(
                                layer_index=layer_index,
                                operation_type=operation_type,
                                data_type=normalized_dtype,
                                severity=severity
                            )
                            issues.append(issue)

            self.logger.debug(
                f"Processed {processed_layers} layers for data type analysis, "
                f"found {len(issues)} type issues"
            )
            
        except Exception as e:
            raise CompatibilityAnalysisError(
                f"Data type analysis failed: {e}",
                error_code="DTYPE_ANALYSIS_ERROR",
                details={"processed_layers": processed_layers}
            ) from e
        
        return issues if issues else None
    
    def _determine_dtype_severity(self, data_type: str) -> str:
        """
        Determine the severity of unsupported data type issues.
        
        Args:
            data_type: The unsupported data type (normalized to uppercase)
            
        Returns:
            Severity level as string: "critical", "warning"
        """
        if not data_type or not isinstance(data_type, str):
            return "warning"
        
        dtype_upper = data_type.upper()
        
        # Critical: Complex or double precision types that can't be easily converted
        critical_types = {
            'FLOAT64', 'DOUBLE', 'COMPLEX64', 'COMPLEX128', 
            'STRING', 'RESOURCE', 'VARIANT'
        }
        
        # Warning: Types that can be converted but may lose precision
        warning_types = {
            'FLOAT16', 'BFLOAT16', 'INT64', 'UINT64'
        }
        
        # Context-dependent: FLOAT32 can be critical if no float support at all
        if dtype_upper == 'FLOAT32':
            # Check if hardware supports any float types
            has_float_support = any(
                'FLOAT' in supported_type.upper() 
                for supported_type in self.normalized_supported_data_types
            )
            return "warning" if has_float_support else "critical"
        
        if dtype_upper in critical_types:
            return "critical"
        elif dtype_upper in warning_types:
            return "warning"
        else:
            # Default to critical for unknown types
            return "critical"

    def _analyze_memory(self, parsed_model: ModelDetails) -> \
        Optional[list[MemoryIssue]]:
        """
        Analyze memory constraint compliance against hardware limitations.
        
        Args:
            parsed_model: Parsed model containing size and memory information
            
        Returns:
            List of memory compatibility issues, or None if no issues found
            
        Raises:
            CompatibilityAnalysisError: If memory analysis encounters errors
        """
        if not parsed_model:
            self.logger.debug("No parsed model provided for memory analysis")
            return None
        
        detected_memory_issues: list[MemoryIssue] = []
        
        try:
            # Get memory sizes (KB)
            hw_flash_limit_kb = self.hw_metadata.flash_size
            hw_ram_limit_kb = self.hw_metadata.ram_size
            
            # Extract model memory requirements with validation
            model_disk_size_kb = getattr(parsed_model, 'model_size_on_disk_kb', 0)
            model_ram_kb = getattr(parsed_model, 'model_peak_ram_kb', 0)
            
            # Validate model memory values
            if (not isinstance(model_disk_size_kb, (int, float)) or 
                model_disk_size_kb < 0):
                self.logger.warning(f"Invalid model disk size: {model_disk_size_kb}")
                model_disk_size_kb = 0
                
            if not isinstance(model_ram_kb, (int, float)) or model_ram_kb < 0:
                self.logger.warning(f"Invalid model RAM size: {model_ram_kb}")
                model_ram_kb = 0
            
            # Get layer details for optimization opportunities
            layer_details = getattr(parsed_model, 'layer_details', [])
            optimization_opps = []
            
            try:
                if layer_details:
                    optimization_opps = self._get_optimization_opportunities(
                        layer_details
                    )
            except Exception as e:
                self.logger.warning(f"Failed to get optimization opportunities: {e}")
            
            # Analyze different memory constraint scenarios
            self._check_combined_memory_overflow(
                model_disk_size_kb, model_ram_kb, hw_flash_limit_kb, hw_ram_limit_kb,
                optimization_opps, detected_memory_issues
            )
            
            self._check_flash_memory_overflow(
                model_disk_size_kb, hw_flash_limit_kb, optimization_opps, 
                detected_memory_issues
            )
            
            self._check_ram_memory_overflow(
                model_disk_size_kb, model_ram_kb, hw_ram_limit_kb, 
                optimization_opps, detected_memory_issues
            )
            
            self._check_runtime_memory_overflow(
                model_ram_kb, hw_ram_limit_kb, detected_memory_issues
            )
            
            self.logger.debug(
                f"Memory analysis completed, found {len(detected_memory_issues)} issues"
            )
            
        except Exception as e:
            raise CompatibilityAnalysisError(
                f"Memory analysis failed: {e}",
                error_code="MEMORY_ANALYSIS_ERROR"
            ) from e
        
        return detected_memory_issues if detected_memory_issues else None
    
    def _determine_memory_recommendations(self, optimization_opps: list) -> \
        tuple[MemoryRecommendation, MemoryRecommendation, MemoryRecommendation]:
        """
        Determine memory optimization recommendations based on model data types.
        
        Args:
            optimization_opps: List of optimization opportunities from model analysis
            
        Returns:
            Tuple of (primary, secondary, alternative) memory recommendations
        """
        # Check if model has floating point layers that can be quantized
        has_quantizable_layers = bool(optimization_opps)
        
        if has_quantizable_layers:
            # Model has floating point weights - quantization is beneficial
            primary = MemoryRecommendation(
                method="INT8 Quantization",
                reference="https://tensorflow.org/lite/performance/post_training_quantization"
            )
            secondary = MemoryRecommendation(
                method="Weight Pruning",
                reference="https://tensorflow.org/model_optimization"
            )
            alternative = MemoryRecommendation(
                method="Model Architecture Optimization",
                reference=None
            )
        else:
            # Model is likely already quantized or has no quantizable layers
            primary = MemoryRecommendation(
                method="Weight Pruning",
                reference="https://tensorflow.org/model_optimization"
            )
            secondary = MemoryRecommendation(
                method="Model Architecture Optimization", 
                reference=None
            )
            alternative = MemoryRecommendation(
                method="Reduce Model Complexity",
                reference="https://tensorflow.org/lite/performance/model_optimization"
            )
        
        return primary, secondary, alternative
    
    def _check_combined_memory_overflow(self, model_size_kb: float, model_ram_kb: float,
                                        hw_flash_kb: float, hw_ram_kb: float,
                                        optimization_opps: list, 
                                        memory_issues: list[MemoryIssue]) -> None:
        """Check for combined flash and RAM memory overflow."""
        total_model_memory = model_size_kb + model_ram_kb
        
        if (total_model_memory > hw_ram_kb and model_size_kb > hw_flash_kb):
            # Get recommendations based on model data types
            primary_rec, secondary_rec, alternative_rec = \
                self._determine_memory_recommendations(optimization_opps)
            
            memory_issues.append(
                MemoryIssue(
                    type="model_storage_memory_overflow",
                    memory_type="flash_and_ram",
                    detailed_info=(
                        f"Model requires {model_size_kb:.1f} KB + "
                        f"{model_ram_kb:.1f} KB RAM = "
                        f"{total_model_memory:.1f} KB total. "
                        f"Hardware limits: Flash {hw_flash_kb:.1f} KB, "
                        f"RAM {hw_ram_kb:.1f} KB"
                    ),
                    severity="critical",
                    primary_recommendation=primary_rec,
                    secondary_recommendation=secondary_rec,
                    alternative_recommendation=alternative_rec,
                    optimization_opportunities=optimization_opps
                )
            )
    
    def _check_flash_memory_overflow(self, model_size_kb: float, hw_flash_kb: float,
                                     optimization_opps: list, 
                                     memory_issues: list[MemoryIssue]) -> None:
        """
        Check for flash memory overflow.
        Ignore if there is no flash.
        """
        if hw_flash_kb and model_size_kb > hw_flash_kb:
            # Get recommendations based on model data types
            primary_rec, secondary_rec, alternative_rec = \
                self._determine_memory_recommendations(optimization_opps)
            
            memory_issues.append(
                MemoryIssue(
                    type="model_storage_flash_overflow",
                    memory_type="flash",
                    detailed_info=(
                        f"Model requires {model_size_kb:.1f} KB, "
                        f"hardware flash limit is {hw_flash_kb:.1f} KB"
                    ),
                    severity="warning",
                    primary_recommendation=primary_rec,
                    secondary_recommendation=secondary_rec,
                    alternative_recommendation=alternative_rec,
                    optimization_opportunities=optimization_opps
                )
            )
    
    def _check_ram_memory_overflow(self, model_size_kb: float, model_ram_kb: float,
                                   hw_ram_kb: float, optimization_opps: list,
                                   memory_issues: list[MemoryIssue]) -> None:
        """Check for RAM memory overflow (model + runtime)."""
        total_ram_needed = model_size_kb + model_ram_kb
        
        if total_ram_needed > hw_ram_kb:
            # Get recommendations based on model data types
            primary_rec, secondary_rec, alternative_rec = \
                self._determine_memory_recommendations(optimization_opps)
            
            memory_issues.append(
                MemoryIssue(
                    type="model_storage_ram_overflow",
                    memory_type="ram",
                    detailed_info=(
                        f"Model requires {model_size_kb:.1f} KB + "
                        f"{model_ram_kb:.1f} KB runtime = {total_ram_needed:.1f} KB "
                        f"total RAM, hardware RAM limit is {hw_ram_kb:.1f} KB"
                    ),
                    severity="warning",
                    primary_recommendation=primary_rec,
                    secondary_recommendation=secondary_rec,
                    alternative_recommendation=alternative_rec,
                    optimization_opportunities=optimization_opps
                )
            )
    
    def _check_runtime_memory_overflow(self, model_ram_kb: float, hw_ram_kb: float,
                                       memory_issues: list[MemoryIssue]) -> None:
        """Check for runtime RAM memory overflow."""
        if model_ram_kb > 0 and model_ram_kb > hw_ram_kb:
            memory_issues.append(
                MemoryIssue(
                    type="ram_memory_overflow", 
                    memory_type="ram",
                    detailed_info=(
                        f"Model requires {model_ram_kb:.1f} KB runtime RAM, "
                        f"hardware RAM limit is {hw_ram_kb:.1f} KB"
                    ),
                    severity="warning",
                    primary_recommendation=MemoryRecommendation(
                        method="Reduce batch size",
                        reference=None
                    ),
                    secondary_recommendation=MemoryRecommendation(
                        method="Layer fusion optimization",
                        reference=None
                    ),
                    alternative_recommendation=MemoryRecommendation(
                        method="Tensor lifecycle optimization",
                        reference=None
                    ),
                    optimization_opportunities=[]
                )
            )

    def _get_layer_data_types(self, layer: LayerDetail) -> list[str]:
        """
        Extract and normalize data types from layer tensors and weights.
        
        Args:
            layer: Layer detail object to extract data types from
            
        Returns:
            List of unique, normalized data type strings found in the layer.
            Empty list if no valid data types found or extraction fails.
            
        Note:
            Data types are normalized to uppercase and filtered for validity.
            Duplicates are removed while preserving order of first occurrence.
        """
        if not layer:
            return []
        
        # Use set for efficient duplicate checking during collection
        seen_dtypes = set()
        unique_dtypes = []
        
        try:
            # Helper function to safely extract and normalize dtype
            def _extract_dtype(dtype_obj: Any) -> Optional[str]:
                """Extract and validate data type string."""
                if not dtype_obj:
                    return None
                    
                try:
                    dtype_str = str(dtype_obj).upper().strip()
                    # Filter out invalid/empty data types
                    if (dtype_str and 
                        dtype_str not in {'NONE', 'NULL', 'UNKNOWN', ''} and
                        len(dtype_str) > 0):
                        return dtype_str
                except (AttributeError, ValueError):
                    return None
                return None
            
            # Helper to add unique dtype to results
            def _add_unique_dtype(dtype_str: str) -> None:
                """Add data type if not already seen."""
                if dtype_str and dtype_str not in seen_dtypes:
                    seen_dtypes.add(dtype_str)
                    unique_dtypes.append(dtype_str)
            
            # Extract input tensor data types
            if hasattr(layer, 'input_tensors') and layer.input_tensors:
                try:
                    for tensor in layer.input_tensors:
                        if hasattr(tensor, 'dtype'):
                            dtype_str = _extract_dtype(tensor.dtype)
                            if dtype_str:
                                _add_unique_dtype(dtype_str)
                except (TypeError, AttributeError) as e:
                    self.logger.debug(f"Error processing input tensors: {e}")

            # Extract output tensor data types  
            if hasattr(layer, 'output_tensors') and layer.output_tensors:
                try:
                    for tensor in layer.output_tensors:
                        if hasattr(tensor, 'dtype'):
                            dtype_str = _extract_dtype(tensor.dtype)
                            if dtype_str:
                                _add_unique_dtype(dtype_str)
                except (TypeError, AttributeError) as e:
                    self.logger.debug(f"Error processing output tensors: {e}")
            
            # Extract weight data types
            if hasattr(layer, 'weights_dtype'):
                try:
                    dtype_str = _extract_dtype(layer.weights_dtype)
                    if dtype_str:
                        _add_unique_dtype(dtype_str)
                except (TypeError, AttributeError) as e:
                    self.logger.debug(f"Error processing weight dtype: {e}")
            
            # Also check for bias data types if available
            if hasattr(layer, 'bias_dtype'):
                try:
                    dtype_str = _extract_dtype(layer.bias_dtype)
                    if dtype_str:
                        _add_unique_dtype(dtype_str)
                except (TypeError, AttributeError) as e:
                    self.logger.debug(f"Error processing bias dtype: {e}")
            
            return unique_dtypes
            
        except Exception as e:
            # Log error but don't fail completely - return empty list
            if hasattr(self, 'logger'):
                self.logger.debug(f"Error extracting data types from layer: {e}")
            return []

    def _get_optimization_opportunities(self, layer_details: list[LayerDetail]) -> \
        list[OptimizationOpportunity]:
        """
        Identify optimization opportunities in model layers based on data types 
        and memory usage.
        
        Args:
            layer_details: List of layer detail objects to analyze for optimization
            
        Returns:
            List of optimization opportunities sorted by potential savings.
            Empty list if no opportunities found or analysis fails.
            
        Note:
            Only analyzes layers with floating point data types that can benefit
            from quantization. Estimates savings based on data type precision reduction.
        """
        if not layer_details:
            self.logger.debug("No layer details provided for optimization analysis")
            return []
        
        opportunities = []
        processed_layers = 0
        
        try:
            for layer in layer_details:
                # Validate layer has required attributes
                if not hasattr(layer, 'index') or not hasattr(layer, 'name'):
                    self.logger.debug(
                        f"Skipping layer {processed_layers} - missing attributes"
                    )
                    processed_layers += 1
                    continue
                
                layer_index = getattr(layer, 'index', processed_layers)
                operation_type = getattr(layer, 'name', 'UNKNOWN')
                flash_kb = getattr(layer, 'flash_kb', 0)
                processed_layers += 1
                
                # Skip layers with no memory footprint
                if not isinstance(flash_kb, (int, float)) or flash_kb <= 0:
                    continue
                
                # Get layer-specific data types safely
                try:
                    layer_datatypes = self._get_layer_data_types(layer)
                except Exception as e:
                    self.logger.debug(
                        f"Failed to get data types for layer {layer_index}: {e}"
                    )
                    continue
                
                # Analyze quantization opportunities
                optimization_info = self._analyze_quantization_opportunity(
                    layer_datatypes, flash_kb, operation_type
                )
                
                if optimization_info:
                    opportunity = OptimizationOpportunity(
                        layer_index=layer_index,
                        operation_type=operation_type,
                        current_flash_kb=flash_kb,
                        potential_savings_kb=optimization_info['savings'],
                        optimization_method=optimization_info['method'],
                        priority=optimization_info['priority']
                    )
                    opportunities.append(opportunity)
            
            # Sort by potential savings (highest first) and limit results
            opportunities.sort(key=lambda x: x.potential_savings_kb, reverse=True)
            
            self.logger.debug(
                f"Found {len(opportunities)} optimization opportunities "
                f"from {processed_layers} layers analyzed"
            )
            
            return opportunities[:MAX_OPTIMIZATION_LAYERS]
            
        except Exception as e:
            self.logger.warning(f"Error during optimization analysis: {e}")
            return []
    
    def _analyze_quantization_opportunity(self, layer_datatypes: list[str], 
                                          flash_kb: float, 
                                          operation_type: str) -> \
                                              Optional[dict[str, Any]]:
        """
        Analyze potential quantization benefits for a layer.
        
        Args:
            layer_datatypes: List of data types found in the layer
            flash_kb: Current memory usage in KB
            operation_type: Type of operation (layer name)
            
        Returns:
            Dictionary with optimization details if opportunity exists, None otherwise.
            Contains 'savings', 'method', and 'priority' keys.
        """
        if not layer_datatypes or flash_kb <= 0:
            return None
        
        # Check for quantizable data types
        quantizable_types = []
        for dtype in layer_datatypes:
            dtype_upper = dtype.upper()
            if any(float_type in dtype_upper for float_type in ['FLOAT', 'DOUBLE']):
                quantizable_types.append(dtype_upper)
        
        if not quantizable_types:
            return None
        
        # Determine optimization method and potential savings
        optimization_method = "quantization"
        priority = "medium"
        
        # Calculate potential savings based on data type precision
        max_savings_ratio = 0.0
        
        for dtype in quantizable_types:
            if 'FLOAT64' in dtype or 'DOUBLE' in dtype:
                # 64-bit to 8-bit: ~87.5% reduction
                max_savings_ratio = max(
                    max_savings_ratio, FLOAT64_TO_INT8_SAVINGS_RATIO
                )
                priority = "high"
            elif 'FLOAT32' in dtype:
                # 32-bit to 8-bit: ~75% reduction  
                max_savings_ratio = max(
                    max_savings_ratio, FLOAT32_TO_INT8_SAVINGS_RATIO
                )
                priority = ("high" if flash_kb > HIGH_PRIORITY_LAYER_SIZE_KB 
                           else "medium")
            elif 'FLOAT16' in dtype or 'BFLOAT16' in dtype:
                # 16-bit to 8-bit: ~50% reduction
                max_savings_ratio = max(
                    max_savings_ratio, FLOAT16_TO_INT8_SAVINGS_RATIO
                )
                priority = "medium"
        
        # Adjust savings based on layer type - some layers compress better
        layer_compression_multiplier = self._get_layer_compression_multiplier(
            operation_type
        )
        conservative_savings_ratio = max_savings_ratio * layer_compression_multiplier
        
        # Calculate conservative potential savings
        potential_savings_kb = flash_kb * conservative_savings_ratio
        
        # Only recommend if savings are meaningful (>1KB or >10% of layer size)
        min_meaningful_savings_kb = max(
            MIN_SAVINGS_THRESHOLD_KB, 
            flash_kb * MIN_SAVINGS_THRESHOLD_PERCENT
        )
        
        if potential_savings_kb < min_meaningful_savings_kb:
            return None
        
        return {
            'savings': potential_savings_kb,
            'method': optimization_method,
            'priority': priority
        }
    
    def _get_layer_compression_multiplier(self, operation_type: str) -> float:
        """
        Get compression effectiveness multiplier based on layer type.
        
        Args:
            operation_type: The type/name of the operation
            
        Returns:
            Multiplier factor (0.0 to 1.0) indicating compression effectiveness
        """
        if not operation_type:
            return FALLBACK_COMPRESSION_EFFECTIVENESS  # Default conservative estimate
        
        normalized_operation_type = operation_type.upper()
        
        # Layer types that compress very well with quantization
        high_compression_operations = {
            'CONV_2D', 'DEPTHWISE_CONV_2D', 'FULLY_CONNECTED', 
            'DENSE', 'LINEAR', 'MATMUL'
        }
        
        # Layer types with moderate compression potential
        moderate_compression_operations = {
            'BATCH_NORMALIZATION', 'LAYER_NORMALIZATION',
            'EMBEDDING', 'LSTM', 'GRU'
        }
        
        # Layer types with limited compression potential
        limited_compression_operations = {
            'ACTIVATION', 'RELU', 'SOFTMAX', 'RESHAPE', 
            'TRANSPOSE', 'CONCAT', 'SPLIT'
        }
        
        if any(op in normalized_operation_type for op in high_compression_operations):
            return HIGH_COMPRESSION_EFFECTIVENESS  # 90% of theoretical savings
        elif any(op in normalized_operation_type 
                for op in moderate_compression_operations):
            return MODERATE_COMPRESSION_EFFECTIVENESS  # 70% of theoretical savings
        elif any(op in normalized_operation_type 
                for op in limited_compression_operations):
            return LIMITED_COMPRESSION_EFFECTIVENESS  # 30% of theoretical savings
        else:
            return DEFAULT_COMPRESSION_EFFECTIVENESS  # 60% for unknown layer types

    def _build_compatibility_report(self, analysis_results: dict[str, Any]) -> \
         CompatibilityReport:
        """
        Build comprehensive compatibility report from analysis results.
        
        Args:
            analysis_results: Dictionary containing analysis results:
                - 'memory_issues': Memory compatibility issues (list or None)
                - 'operator_issues': Operator compatibility issues (list or None)  
                - 'type_issues': Data type compatibility issues (list or None)
                
        Returns:
            CompatibilityReport with normalized issue lists
            
        Raises:
            CompatibilityAnalysisError: If results validation fails
        """
        if not isinstance(analysis_results, dict):
            raise CompatibilityAnalysisError(
                "Analysis results must be a dictionary",
                error_code="INVALID_RESULTS_FORMAT"
            )
        
        try:
            # Normalize memory issues to list format
            memory_issues = self._normalize_issue_list(
                analysis_results.get('memory_issues'),
                'memory_issues',
                MemoryIssue
            )
            
            # Normalize operator issues to list format
            operator_issues = self._normalize_issue_list(
                analysis_results.get('operator_issues'),
                'operator_issues', 
                OperatorIssue
            )
            
            # Normalize type issues to list format
            type_issues = self._normalize_issue_list(
                analysis_results.get('type_issues'),
                'type_issues',
                UnsupportedTypeIssue
            )
            
            # Create and return the compatibility report
            report = CompatibilityReport(
                memory_issues=memory_issues,
                operator_issues=operator_issues,
                unsupported_types=type_issues
            )
            
            # Log summary of report contents
            self.logger.debug(
                f"Built compatibility report: "
                f"{len(memory_issues) if memory_issues else 0} memory issues, "
                f"{len(operator_issues) if operator_issues else 0} operator issues, "
                f"{len(type_issues) if type_issues else 0} type issues"
            )
            
            return report
            
        except Exception as e:
            raise CompatibilityAnalysisError(
                f"Failed to build compatibility report: {e}",
                error_code="REPORT_BUILD_ERROR"
            ) from e
    
    def _normalize_issue_list(self, issues: Any, issue_type: str, 
                              expected_class: type) -> Optional[list]:
        """
        Normalize issue data to consistent list format with validation.
        
        Args:
            issues: Issue data (None, single issue, or list of issues)
            issue_type: Type name for logging/debugging
            expected_class: Expected class type for validation
            
        Returns:
            Normalized list of issues, or None if no valid issues found
            
        Raises:
            CompatibilityAnalysisError: If issues format is invalid
        """
        if issues is None:
            return None
        
        # Handle single issue - wrap in list
        if not isinstance(issues, list):
            # Validate it's the expected type
            if not isinstance(issues, expected_class):
                raise CompatibilityAnalysisError(
                    f"Invalid {issue_type} format: expected {expected_class.__name__}, "
                    f"got {type(issues).__name__}",
                    error_code="INVALID_ISSUE_TYPE",
                    details={"expected": expected_class.__name__, 
                            "received": type(issues).__name__}
                )
            return [issues]
        
        # Handle list of issues - validate each item
        if not issues:  # Empty list
            return None
            
        validated_issues = []
        for i, issue in enumerate(issues):
            if not isinstance(issue, expected_class):
                self.logger.warning(
                    f"Skipping invalid {issue_type} at index {i}: "
                    f"expected {expected_class.__name__}, got {type(issue).__name__}"
                )
                continue
            validated_issues.append(issue)
        
        return validated_issues if validated_issues else None

    def _calculate_metrics(self, analysis_results: dict[str, Any], 
                           duration_ms: float, layer_details: list) -> \
                            AnalysisMetrics:
        """Calculate analysis metrics for logging."""
        return AnalysisMetrics(
            total_layers=len(layer_details) if layer_details else 0,
            unsupported_operators=len(analysis_results.get('operator_issues') or []),
            memory_violations=1 if analysis_results.get('memory_issues') else 0,
            data_type_issues=len(analysis_results.get('type_issues') or []),
            analysis_duration_ms=duration_ms
        )

    def _log_analysis_metrics(self, metrics: AnalysisMetrics) -> None:
        """Log analysis metrics for monitoring."""
        self.logger.info(
            f"Analysis completed in {metrics.analysis_duration_ms:.1f}ms: "
            f"{metrics.total_layers} layers, "
            f"{metrics.unsupported_operators} operator issues, "
            f"{metrics.memory_violations} memory violations, "
            f"{metrics.data_type_issues} type issues, "
        )
