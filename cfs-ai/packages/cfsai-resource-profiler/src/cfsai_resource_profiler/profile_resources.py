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
Resource Profiler for TensorFlow Lite Models.

This module provides comprehensive resource profiling and static analysis
for TensorFlow Lite models, including memory usage, computational complexity,
and hardware performance estimation.

Features:
- Layer-wise performance analysis
- Memory constraint validation
- Hardware-specific optimization recommendations
- Quantization and pruning suggestions
- Architecture-aware optimization strategies
"""

import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, Union

from cfsai_model_parser.exceptions import (
    ModelFileNotFoundError,
    ModelFormatNotSupportedError,
)
from cfsai_model_parser.parse_tflm import TFLiteParser
from cfsai_model_parser.schemas import LayerDetail, ModelDetails

from cfsai_resource_profiler.exceptions import (
    HardwareProfileError,
    ModelAnalysisError,
    ResourceProfilerError,
)
from cfsai_resource_profiler.schemas import (
    AnalysisNote,
    ErrorNote,
    HardwareMetrics,
    LayerPerformance,
    LayerwiseOptimizationOpportunity,
    MemoryAnalysis,
    ModelSummary,
    OptimizationOpportunities,
    OptimizationSuggestion,
    ResourceProfileReport,
)
from cfsai_types.hardware_profile import HardwareProfile

# Default Configuration
DEFAULT_MAX_OPTIMIZATION_LAYERS = 5

# Memory Analysis Thresholds (percentages of available RAM)
CRITICAL_MEMORY_THRESHOLD_PERCENT = 95.0
WARNING_MEMORY_THRESHOLD_PERCENT = 75.0
HIGH_MEMORY_VARIANCE_THRESHOLD = 0.5  # 50% of average memory usage

# Default values for missing RAM information
DEFAULT_MEMORY_UTILIZATION_FALLBACK_PERCENT = 80.0  # Fallback when RAM not specified

# Memory Status Classifications
MEMORY_STATUS_OK = "OK"
MEMORY_STATUS_WARNING = "WARNING"
MEMORY_STATUS_CRITICAL = "CRITICAL"

# Default Memory Reduction Expectations (reduction factors)
DEFAULT_MEMORY_REDUCTION_TARGETS = {
    "quantization": 0.75,  # 75% reduction from FP32 to INT8
    "pruning_low": 0.50,  # 50% reduction with conservative pruning
    "pruning_high": 0.90,  # 90% reduction with aggressive pruning
}

# Unit Conversion Factors
MILLISECONDS_PER_SECOND = 1000.0
MHZ_TO_HZ_CONVERSION = 1_000_000
NANOJOULES_TO_MICROJOULES = 1000.0
KILOBYTES_TO_BYTES = 1024
KILOBYTES_TO_MEGABYTES = 1024
PERCENTAGE_CONVERSION = 100.0

# Memory Overage Classification Thresholds (percentage above available RAM)
HIGH_MEMORY_OVERAGE_THRESHOLD_PERCENT = 200.0  # More than 3x memory needed
MODERATE_MEMORY_OVERAGE_THRESHOLD_PERCENT = 50.0  # 1.5-3x memory needed

# Model Size Classification Thresholds (MB)
SMALL_MODEL_SIZE_THRESHOLD_MB = 1.0  # Below this is considered small
LARGE_MODEL_SIZE_THRESHOLD_MB = 5.0  # Above this needs special handling

# Memory Performance Thresholds for Hardware Context Analysis (KB)
MINIMAL_MEMORY_THRESHOLD_KB = 10  # Minimum threshold for optimization
LOW_MEMORY_CONSTRAINT_THRESHOLD_KB = 25  # Very constrained environment
MEDIUM_MEMORY_CONSTRAINT_THRESHOLD_KB = 50  # Constrained environment
HIGH_MEMORY_AVAILABILITY_THRESHOLD_KB = 100  # Adequate memory
TIGHT_MEMORY_OPTIMIZATION_THRESHOLD_KB = 1024  # Requires optimization

# Computational Complexity Thresholds (MAC operations)
MODERATE_COMPUTATIONAL_COMPLEXITY_THRESHOLD = 100_000  # Moderate complexity
HIGH_COMPUTATIONAL_COMPLEXITY_THRESHOLD = 500_000  # High complexity
VERY_HIGH_COMPUTATIONAL_COMPLEXITY_THRESHOLD = 1_000_000  # Very high complexity

# MAC Layer Analysis Thresholds (percentage of total MACs)
HIGH_MAC_LAYER_THRESHOLD_PERCENT = 20.0  # Layers contributing >20% of total MACs

# CPU Performance Classification Thresholds (MHz)
LOW_POWER_CPU_FREQUENCY_MHZ = 100  # Low power embedded processors
EMBEDDED_CPU_FREQUENCY_MHZ = 500  # Typical embedded performance

# Memory Variance Analysis Multipliers
HIGH_VARIANCE_MULTIPLIER = 1.0  # 100% variance threshold
CRITICAL_FALLBACK_OVERAGE_PERCENT = 100.0  # Fallback for missing RAM info


class TFLiteResourceProfiler:
    """
    TensorFlow Lite Resource Profiler.

    A comprehensive tool for analyzing TensorFlow Lite models to provide:
    - Memory usage analysis
    - Computational complexity estimation
    - Hardware performance profiling
    - Optimization recommendations

    Example:
        >>> profiler = TFLiteResourceProfiler()
        >>> result = profiler.analyze_model("model.tflite", hardware_profile)
        >>> print(result.model_summary.model_name)
    """

    def __init__(self) -> None:
        """Initialize the resource profiler."""
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

        # Instance configuration
        self.max_optimization_layers = DEFAULT_MAX_OPTIMIZATION_LAYERS
        self.memory_reduction_targets = DEFAULT_MEMORY_REDUCTION_TARGETS.copy()

        self.logger.info("TFLite Resource Profiler initialized")

    def analyze_model(
        self,
        model_path: Union[str, Path],
        hardware_profile: dict[str, Any],
        output_file: Optional[str] = None,
    ) -> ResourceProfileReport:
        """
        Analyze a TensorFlow Lite model for resource usage and optimization.

        Args:
            model_path: Path to the TFLite model file
            hardware_profile: Hardware specifications for performance estimation
            output_file: Optional path to save analysis results as JSON

        Returns:
            ResourceProfileReport: Comprehensive analysis including memory analysis,
                optimization opportunities, and performance metrics

        Raises:
            ModelAnalysisError: If model analysis fails
            HardwareProfileError: If hardware profile is invalid
            FileNotFoundError: If model file doesn't exist
        """
        start_time = time.time()
        model_path = Path(model_path)
        errors: list[ErrorNote] = []
        notes: list[AnalysisNote] = []

        try:
            self.logger.info(f"Starting analysis of model: {model_path}")
            notes.append(
                AnalysisNote(
                    message=f"Analysis started for model: {model_path.name}",
                    category="info",
                )
            )

            # Validate hardware profile
            self._validate_hardware_profile(hardware_profile)

            # Parse and analyze model
            parsed_model = self._parse_model(model_path, notes)
            report = self._perform_analysis(
                model_path, parsed_model, hardware_profile, notes, errors
            )

            # Add timing and save results
            analysis_duration = time.time() - start_time
            self._finalize_analysis(report, analysis_duration, notes)

            self.logger.info(
                f"Model analysis completed successfully in {analysis_duration:.2f}s"
            )
            return report

        except (HardwareProfileError, ModelAnalysisError):
            raise
        except (FileNotFoundError, ModelFormatNotSupportedError):
            # Re-raise these exceptions as-is for proper test handling
            raise
        except Exception as e:
            duration = time.time() - start_time
            self._handle_unexpected_error(e, duration)

    def _validate_hardware_profile(self, hardware_profile: HardwareProfile) -> None:
        """
        Validate that the hardware profile contains required fields with appropriate
        values.

        Checks for required fields (cpi_mac, energy_nj_per_mac, cpu_clock_mhz) and
        ensures they contain positive numeric values. Also validates available_ram_kb
        if provided.

        Args:
            hardware_profile: validated HardwareProfile class containing 
            hardware specifications

        Raises:
            HardwareProfileError: If hardware_profile is None, missing required fields,
                or contains invalid values
        """
        # Handle missing hardware profile
        if hardware_profile is None:
            raise HardwareProfileError("Missing hardware profile")

        # Check we have the required operator info
        required_operators = ["MAC"]
        missing_operators = [
            op for op in required_operators \
                if not hardware_profile.get_operator_info(op)
        ]

        if missing_operators:
            raise HardwareProfileError(
                f"Hardware profile missing operator info: {missing_operators}",
                error_code="MISSING_HW_FIELDS"
            )


    def _parse_model(self, model_path: Path, notes: list[AnalysisNote]) -> ModelDetails:
        """
        Parse a TensorFlow Lite model file into structured model details.

        Uses the TFLiteParser to extract information about the model's architecture,
        layers, and computational requirements.

        Args:
            model_path: Path to the TFLite model file to parse
            notes: List to append analysis notes during processing

        Returns:
            ModelDetails: Structured representation of the parsed model

        Raises:
            ModelAnalysisError: If parsing fails or returns None
            FileNotFoundError: If the model file doesn't exist
        """
        self.logger.debug(f"Parsing TFLite model: {model_path}")
        parser = TFLiteParser()

        try:
            parsed_model = parser.parse_model(str(model_path))
        except ModelFileNotFoundError as e:
            # Convert to standard FileNotFoundError for consistency
            raise FileNotFoundError(f"Model file not found: {model_path}") from e
        except ModelFormatNotSupportedError:
            # Re-raise as-is for proper test handling
            raise

        if not parsed_model:
            raise ModelAnalysisError(
                "Model parsing failed - parser returned None", error_code="PARSE_FAILED"
            )

        notes.append(AnalysisNote(message="Model parsed successfully", category="info"))

        return parsed_model

    def _perform_analysis(
        self,
        model_path: Path,
        parsed_model: ModelDetails,
        hardware_profile: HardwareProfile,
        notes: list[AnalysisNote],
        errors: list[ErrorNote],
    ) -> ResourceProfileReport:
        """
        Perform comprehensive model analysis including performance, memory, and
        optimization analysis.

        This is the main analysis orchestrator that:
        1. Analyzes each layer's performance characteristics
        2. Calculates overall hardware metrics
        3. Performs memory requirement analysis
        4. Generates optimization opportunities
        5. Compiles comprehensive analysis report

        Args:
            model_path: Path to the model file being analyzed
            parsed_model: Structured model data from parser
            hardware_profile: Hardware specifications for performance estimation
            notes: List to collect analysis observations
            errors: List to collect analysis errors

        Returns:
            ResourceProfileReport: Complete analysis results with all metrics

        Raises:
            ModelAnalysisError: If critical analysis components fail
        """
        try:
            self.logger.debug("Starting model analysis")

            # Store hardware profile for layer-wise optimization suggestions
            self._current_hardware_profile = hardware_profile

            # Initialize tracking variables
            total_cycles = 0
            total_energy_uj = 0.0
            total_latency_ms = 0.0
            layer_performance: list[LayerPerformance] = []

            # Analyze each layer
            for i, layer in enumerate(getattr(parsed_model, "layer_details", [])):
                try:
                    layer_performance_metrics = self._analyze_layer_performance(
                        layer, hardware_profile
                    )

                    # Create LayerPerformance object
                    layer_perf = LayerPerformance(
                        layer_idx=i,
                        layer_name=getattr(layer, "name", None),
                        operator_type=getattr(layer, "operator_name", None),
                        cycles=layer_performance_metrics.get("cycles"),
                        latency_ms=layer_performance_metrics.get("latency_ms"),
                        energy_uj=layer_performance_metrics.get("energy_uj"),
                        power_mw=layer_performance_metrics.get("power_mw"),
                        power_w=layer_performance_metrics.get("power_w"),
                        is_accelerated=layer_performance_metrics.get(
                            "is_accelerated", False
                        ),
                        macs=getattr(layer, "macs", None),
                        memory_kb=getattr(layer, "flash_kb", None),
                    )
                    layer_performance.append(layer_perf)

                    # Accumulate totals
                    total_cycles += layer_performance_metrics.get("cycles", 0)
                    total_energy_uj += layer_performance_metrics.get("energy_uj", 0)
                    total_latency_ms += layer_performance_metrics.get("latency_ms", 0)

                except Exception as e:
                    error_msg = f"Error analyzing layer {i}: {e!s}"
                    self.logger.warning(error_msg)
                    errors.append(
                        ErrorNote(
                            message=error_msg,
                            code="LAYER_ANALYSIS_ERROR",
                            details={"layer_index": i},
                        )
                    )
                    # Add empty performance for failed layer
                    layer_performance.append(LayerPerformance(layer_idx=i))

            # Calculate overall hardware performance
            hardware_metrics = self._calculate_overall_performance(
                hardware_profile,
                total_cycles,
                total_energy_uj,
                total_latency_ms,
                parsed_model,
                layer_performance,
            )

            # Analyze memory requirements
            memory_analysis = self._analyze_memory_requirements(
                parsed_model, hardware_profile
            )

            # Generate optimization opportunities
            optimization_opportunities = self.generate_optimization_opportunities(
                parsed_model, model_path
            )

            # Optimization suggestions handled by existing smart recommendation systems
            optimization_suggestions: list[OptimizationSuggestion] = []

            # Create model summary
            model_summary = ModelSummary(
                model_name=model_path.name,
                model_path=str(model_path),
                framework="TensorFlow Lite",
                model_size_kb=optimization_opportunities.total_parameter_memory_kb,
                target_dtype=getattr(parsed_model, "target_dtype", None),
                layer_count=len(layer_performance),
                total_parameters=None,  # Could be calculated if needed
            )

            notes.append(
                AnalysisNote(
                    message="Model analysis completed successfully", category="info"
                )
            )

            # Log optimization analysis summary
            self.logger.info(
                "Optimization recommendations available through smart memory analysis "
                "and layerwise opportunities"
            )

            return ResourceProfileReport(
                model_summary=model_summary,
                hardware_metrics=hardware_metrics,
                memory_analysis=memory_analysis,
                layer_performance=layer_performance,
                optimization_suggestions=optimization_suggestions,
                optimization_opportunities=optimization_opportunities,
                analysis_notes=notes,
                errors=errors,
                timestamp=datetime.now().isoformat(),
                hardware_profile_used=hardware_profile,
            )

        except Exception as e:
            self.logger.error(f"Model analysis failed: {e}")
            raise ModelAnalysisError(
                f"Analysis failed: {e!s}", error_code="ANALYSIS_FAILED"
            ) from e

    def _analyze_layer_performance(
        self, layer: LayerDetail, hardware_profile: Optional[HardwareProfile]
    ) -> dict[str, Any]:
        """
        Analyze performance metrics for a single neural network layer.

        Calculates hardware-specific performance characteristics including timing,
        power consumption, and acceleration detection for individual layers.

        Args:
            layer: Layer details containing computational and structural information
            hardware_profile: Hardware specifications including:
                - cpi_mac: Cycles per multiply-accumulate operation
                - cpu_clock_mhz: CPU clock frequency in MHz
                - energy_nj_per_mac: Energy consumption per MAC in nanojoules
                - accelerator_ops: Optional list of accelerated operation types

        Returns:
            Dictionary containing calculated performance metrics:
                - cycles: Hardware execution cycles (int)
                - latency_ms: Execution time in milliseconds (float)
                - energy_uj: Energy consumption in microjoules (float)
                - power_mw: Power consumption in milliwatts (float)
                - power_w: Power consumption in watts (float)
                - is_accelerated: Hardware acceleration flag (bool)

        Raises:
            ModelAnalysisError: If critical calculation errors occur
        """
        performance_metrics: dict[str, Any] = {
            "cycles": 0,
            "latency_ms": 0.0,
            "energy_uj": 0.0,
            "power_mw": 0.0,
            "power_w": 0.0,
            "is_accelerated": False,
        }

        if not hardware_profile:
            return performance_metrics

        # Initialize layer attributes early for error handling
        layer_name = getattr(layer, "name", "unknown_layer")
        layer_operator = getattr(layer, "operator_name", "unknown_operator")
        layer_macs = getattr(layer, "macs", 0)

        try:
            # Check if layer can be accelerated based on operation type
            accelerator_ops = hardware_profile.accel_ops
            is_accelerated = (
                layer_operator in accelerator_ops or layer_name in accelerator_ops
            )
            performance_metrics["is_accelerated"] = is_accelerated

            # Calculate cycles - include base overhead even for zero MAC operations
            mac_info = hardware_profile.get_operator_info("MAC")
            cpi = mac_info.cycles
            if cpi is not None:
                # Use layer MACs or base overhead for non-MAC operations
                cycles = int(layer_macs * cpi) if layer_macs > 0 else int(cpi)
                performance_metrics["cycles"] = cycles

                # Calculate latency from cycles and clock frequency
                clock_mhz = getattr(hardware_profile, "core_clock", 0)
                if clock_mhz > 0:
                    # Convert MHz to Hz, then calculate latency in milliseconds
                    clock_hz = clock_mhz * MHZ_TO_HZ_CONVERSION
                    latency_ms = (cycles / clock_hz) * MILLISECONDS_PER_SECOND
                    performance_metrics["latency_ms"] = latency_ms

            # Calculate energy and power consumption
            energy_nj_per_mac = mac_info.energy
            if energy_nj_per_mac is not None:
                # Energy for MAC operations or base overhead (convert nJ to µJ)
                layer_energy_uj = (
                    (layer_macs * energy_nj_per_mac) / NANOJOULES_TO_MICROJOULES
                    if layer_macs > 0
                    else energy_nj_per_mac / NANOJOULES_TO_MICROJOULES
                )
                performance_metrics["energy_uj"] = layer_energy_uj

                # Calculate power if latency is available and non-zero
                latency_ms = performance_metrics.get("latency_ms", 0)
                if latency_ms > 0:
                    power_mw = layer_energy_uj / latency_ms
                    performance_metrics["power_mw"] = power_mw
                    performance_metrics["power_w"] = power_mw / MILLISECONDS_PER_SECOND

        except (KeyError, ValueError, ZeroDivisionError) as e:
            error_msg = f"Error calculating layer '{layer_name}' performance: {e}"
            self.logger.error(error_msg)
            raise ModelAnalysisError(
                error_msg,
                error_code="LAYER_PERFORMANCE_CALC_ERROR",
                details={
                    "layer_name": layer_name,
                    "layer_macs": getattr(layer, "macs", 0),
                    "error": str(e),
                },
            ) from e
        except Exception as e:
            # Log unexpected errors but don't fail the entire analysis
            self.logger.warning(
                f"Unexpected error calculating layer '{layer_name}' performance: {e}"
            )

        return performance_metrics

    def generate_optimization_opportunities(
        self, parsed_model: ModelDetails, model_path: Path
    ) -> OptimizationOpportunities:
        """
        Generate comprehensive optimization opportunities for the model.

        Args:
            parsed_model: Parsed model object containing layer details and metrics
            model_path: Path to the model file for consistent naming

        Returns:
            OptimizationOpportunities: Structured optimization recommendations
        """
        try:
            total_macs = getattr(parsed_model, "total_macs", 0)
            layer_details = getattr(parsed_model, "layer_details", [])
            model_total_param_memory_b = getattr(
                parsed_model, "model_total_param_memory_b", 0
            )

            # Store model analysis for recommendations
            self._last_model_analysis = self._analyze_model_characteristics(
                parsed_model
            )
            # Store hardware profile for layer suggestions (if available)
            self._last_hardware_profile = getattr(
                self, "_current_hardware_profile", None
            )

            if not layer_details:
                self.logger.warning("No layer details found in parsed model")

            # Generate layerwise opportunities
            layerwise_opportunities = self._generate_layerwise_opportunities(
                layer_details, "memory"
            )

            macs_opportunities = self._generate_layerwise_opportunities(
                layer_details, "macs"
            )

            return OptimizationOpportunities(
                total_parameter_memory_kb=(
                    model_total_param_memory_b / KILOBYTES_TO_BYTES
                ),
                total_macs=total_macs,
                layerwise_opportunities=layerwise_opportunities,
                macs_opportunities=macs_opportunities,
                notes=("None"),
            )

        except Exception as e:
            raise ResourceProfilerError(
                f"Error generating optimization opportunities: {e}"
            )

    def set_optimization_config(
        self,
        max_layers: Optional[int] = None,
        memory_targets: Optional[dict[str, float]] = None,
    ) -> None:
        """
        Configure optimization analysis parameters.

        Args:
            max_layers: Maximum number of layers to analyze for optimization.
                Must be positive integer if specified.
            memory_targets: Memory reduction targets for different techniques.
                Dictionary with optimization technique names as keys and
                reduction factors (0.0-1.0) as values.

        Raises:
            ValueError: If max_layers is not positive or memory targets
                contain invalid values
        """
        if max_layers is not None:
            if not isinstance(max_layers, int) or max_layers <= 0:
                raise ValueError(
                    f"max_layers must be a positive integer, got {max_layers}"
                )
            self.max_optimization_layers = max_layers
            self.logger.debug(f"Set max optimization layers to {max_layers}")

        if memory_targets is not None:
            if not isinstance(memory_targets, dict):
                raise ValueError("memory_targets must be a dictionary")

            # Validate memory target values
            for technique, reduction in memory_targets.items():
                is_valid_number = isinstance(reduction, (int, float))
                is_valid_range = 0.0 <= reduction <= 1.0 if is_valid_number else False

                if not is_valid_number or not is_valid_range:
                    raise ValueError(
                        f"Memory reduction target for '{technique}' must be "
                        f"between 0.0 and 1.0, got {reduction}"
                    )

            self.memory_reduction_targets.update(memory_targets)
            self.logger.debug(f"Updated memory reduction targets: {memory_targets}")

    def _analyze_memory_requirements(
        self, parsed_model: ModelDetails, hardware_profile: dict[str, Any]
    ) -> MemoryAnalysis:
        """
        Analyze memory requirements against hardware constraints and provide
        recommendations.

        Evaluates the model's peak memory usage against available system RAM,
        categorizes memory status, and provides optimization recommendations
        based on utilization levels and memory usage patterns.

        Args:
            parsed_model: Parsed model object containing memory metrics including:
                - model_peak_ram_kb: Maximum RAM usage during inference
                - execution_schedule: Optional timeline of memory usage per step
            hardware_profile: Hardware specifications including:
                - available_ram_kb: Total system RAM available (optional)

        Returns:
            MemoryAnalysis: Complete memory analysis including:
                - RAM utilization percentage (can exceed 100%)
                - Status assessment (CRITICAL/WARNING/OK)
                - Identified memory constraint violations
                - Optimization recommendations based on usage patterns

        Note:
            Status levels are based on configurable thresholds:
            - CRITICAL: Exceeds critical threshold or available RAM
            - WARNING: Between warning and critical thresholds
            - OK: Below warning threshold or no RAM limit specified
        """
        model_peak_ram_kb = getattr(parsed_model, "model_peak_ram_kb", 0)
        available_ram_kb = getattr(hardware_profile, "ram_size", 0)

        memory_issues: list[str] = []
        memory_recommendations: list[str] = []

        # Calculate RAM utilization and determine status
        ram_utilization_percent, ram_status = self._calculate_memory_status(
            model_peak_ram_kb=model_peak_ram_kb,
            available_ram_kb=available_ram_kb,
            critical_threshold=CRITICAL_MEMORY_THRESHOLD_PERCENT,
            warning_threshold=WARNING_MEMORY_THRESHOLD_PERCENT,
        )

        # Generate issues and recommendations based on status
        if ram_status == MEMORY_STATUS_CRITICAL:
            if available_ram_kb and model_peak_ram_kb > available_ram_kb:
                memory_issues.append(
                    f"Peak RAM usage ({model_peak_ram_kb:.1f} KB) exceeds "
                    f"available RAM ({available_ram_kb:.1f} KB)"
                )
            else:
                memory_issues.append(
                    f"Peak RAM usage ({model_peak_ram_kb:.1f} KB) exceeds "
                    f"{CRITICAL_MEMORY_THRESHOLD_PERCENT}% of available RAM "
                    f"({available_ram_kb:.1f} KB)"
                )
            memory_recommendations.extend(
                self._get_memory_recommendations(
                    model_peak_ram_kb, available_ram_kb, parsed_model, ram_status
                )
            )
        elif ram_status == MEMORY_STATUS_WARNING:
            memory_issues.append(
                f"Peak RAM usage ({model_peak_ram_kb:.1f} KB) exceeds "
                f"{WARNING_MEMORY_THRESHOLD_PERCENT}% of available RAM "
                f"({available_ram_kb:.1f} KB)"
            )
            memory_recommendations.extend(
                self._get_memory_recommendations(
                    model_peak_ram_kb, available_ram_kb, parsed_model, ram_status
                )
            )

        # Analyze memory usage patterns if execution schedule is available
        self._analyze_memory_patterns(
            parsed_model=parsed_model,
            memory_recommendations=memory_recommendations,
            high_variance_threshold=HIGH_MEMORY_VARIANCE_THRESHOLD,
        )

        # Log memory analysis results
        if ram_utilization_percent is not None:
            self.logger.info(
                f"Memory analysis: {model_peak_ram_kb:.1f} KB peak usage, "
                f"{ram_utilization_percent:.1f}% utilization, status: {ram_status}"
            )
        else:
            self.logger.info(
                f"Memory analysis: {model_peak_ram_kb:.1f} KB peak usage, "
                f"no RAM limit specified, status: {ram_status}"
            )

        return MemoryAnalysis(
            model_peak_ram_kb=model_peak_ram_kb,
            available_ram_kb=available_ram_kb,
            ram_utilization_percent=ram_utilization_percent,
            ram_status=ram_status,
            memory_issues=memory_issues,
            memory_recommendations=memory_recommendations,
        )

    def _calculate_memory_status(
        self,
        model_peak_ram_kb: float,
        available_ram_kb: Optional[float],
        critical_threshold: float,
        warning_threshold: float,
    ) -> tuple[Optional[float], str]:
        """
        Calculate memory utilization percentage and determine status level.

        Args:
            model_peak_ram_kb: Peak RAM usage of the model
            available_ram_kb: Available system RAM (None if not specified)
            critical_threshold: Threshold for critical status (e.g., 95.0)
            warning_threshold: Threshold for warning status (e.g., 80.0)

        Returns:
            Tuple of (utilization_percent, status_string)
        """
        # Use consistent status constants
        status_ok = MEMORY_STATUS_OK
        status_warning = MEMORY_STATUS_WARNING
        status_critical = MEMORY_STATUS_CRITICAL

        if available_ram_kb is None:
            self.logger.warning("No available RAM specified in hardware profile")
            return None, status_ok

        # Calculate utilization percentage (can exceed 100%)
        ram_utilization_percent = (
            model_peak_ram_kb / available_ram_kb
        ) * PERCENTAGE_CONVERSION

        # Determine status based on utilization
        if (
            model_peak_ram_kb > available_ram_kb
            or ram_utilization_percent > critical_threshold
        ):
            return ram_utilization_percent, status_critical
        elif ram_utilization_percent > warning_threshold:
            return ram_utilization_percent, status_warning
        else:
            return ram_utilization_percent, status_ok

    def _get_memory_recommendations(
        self,
        model_peak_ram_kb: float,
        available_ram_kb: Optional[float],
        parsed_model: ModelDetails,
        ram_status: str,
    ) -> list[str]:
        """
        Unified memory recommendations based on RAM status and model analysis.

        Provides context-aware optimization strategies based on memory usage severity,
        model characteristics, and available optimization opportunities.

        Args:
            model_peak_ram_kb: Peak model memory usage in kilobytes
            available_ram_kb: Available system RAM in kilobytes (optional)
            parsed_model: Model details for architecture-aware recommendations
            ram_status: Memory status ('CRITICAL', 'WARNING', 'OK')

        Returns:
            List of memory optimization recommendations prioritized by
            urgency and impact
        """
        recommendations = []
        model_analysis = self._analyze_model_characteristics(parsed_model)

        # Handle critical memory conditions (over available RAM)
        if ram_status == MEMORY_STATUS_CRITICAL:
            if available_ram_kb:
                overage_kb = model_peak_ram_kb - available_ram_kb
                overage_percent = (
                    overage_kb / available_ram_kb
                ) * PERCENTAGE_CONVERSION

                if overage_percent > HIGH_MEMORY_OVERAGE_THRESHOLD_PERCENT:
                    # More than 3x memory needed
                    recommendations.append(
                        f"URGENT: Model requires {overage_kb:.0f} KB "
                        f"({overage_percent:.0f}%) more RAM than available"
                    )
                    recommendations.extend(
                        self._get_context_aware_optimizations(
                            model_analysis, "critical", overage_percent, parsed_model
                        )
                    )
                elif overage_percent > MODERATE_MEMORY_OVERAGE_THRESHOLD_PERCENT:
                    # 1.5-3x memory needed
                    recommendations.append(
                        f"Model exceeds available RAM by {overage_kb:.0f} KB - "
                        "immediate optimization required"
                    )
                    recommendations.extend(
                        self._get_context_aware_optimizations(
                            model_analysis, "high", overage_percent, parsed_model
                        )
                    )
                else:  # 1-1.5x memory needed
                    recommendations.append(
                        f"Model slightly exceeds RAM by {overage_kb:.0f} KB"
                    )
                    recommendations.extend(
                        self._get_context_aware_optimizations(
                            model_analysis, "moderate", overage_percent, parsed_model
                        )
                    )
            else:
                recommendations.append(
                    "Critical memory usage detected - apply immediate optimizations:"
                )
                recommendations.extend(
                    self._get_context_aware_optimizations(
                        model_analysis,
                        "critical",
                        CRITICAL_FALLBACK_OVERAGE_PERCENT,
                        parsed_model,
                    )
                )

        # Handle warning conditions (high utilization but within limits)
        elif ram_status == MEMORY_STATUS_WARNING:
            if available_ram_kb:
                utilization_percent = (
                    model_peak_ram_kb / available_ram_kb
                ) * PERCENTAGE_CONVERSION
                recommendations.append(
                    f"High RAM utilization detected ({utilization_percent:.1f}%) - "
                    "consider optimization"
                )
            else:
                recommendations.append(
                    "High memory utilization detected - consider optimization"
                )

            # Add moderate optimization suggestions
            fallback_utilization = DEFAULT_MEMORY_UTILIZATION_FALLBACK_PERCENT
            recommendations.extend(
                self._get_context_aware_optimizations(
                    model_analysis,
                    "moderate",
                    utilization_percent if available_ram_kb else fallback_utilization,
                    parsed_model,
                )
            )

        # Handle OK status (preventive suggestions)
        elif ram_status == MEMORY_STATUS_OK and model_analysis.get(
            "has_quantization_potential"
        ):
            recommendations.append(
                "Memory usage is within limits - consider preventive optimizations:"
            )
            recommendations.extend(
                [
                    "Apply INT8 quantization to reduce memory by ~75%",
                    "Consider model pruning for additional size reduction",
                    "Profile on target device for hardware-specific optimizations",
                ]
            )

        return recommendations

    def _analyze_model_characteristics(
        self, parsed_model: ModelDetails
    ) -> dict[str, Any]:
        """
        Analyze model characteristics for smart optimization recommendations.

        Examines model architecture, data types, and layer compositions to
        generate intelligent optimization suggestions. Identifies architecture
        patterns, quantization opportunities, and optimization constraints.

        Args:
            parsed_model: Model details containing layer information, data types,
                and structural metadata

        Returns:
            Dictionary containing analyzed model characteristics:
                - data_types: Set of data types used in model
                - layer_types: Set of layer operation types
                - model_size_mb: Model size in megabytes
                - has_quantization_potential: Boolean indicating quantization viability
                - has_pruning_potential: Boolean indicating pruning viability
                - architecture_hints: List of detected architecture patterns
                - optimization_blockers: List of constraints limiting optimizations
        """
        analysis = {
            "data_types": set(),
            "layer_types": set(),
            "model_size_mb": 0.0,
            "has_quantization_potential": True,
            "has_pruning_potential": True,
            "architecture_hints": [],
            "optimization_blockers": [],
        }

        # Analyze data types
        if hasattr(parsed_model, "data_types") and parsed_model.data_types:
            analysis["data_types"] = set(parsed_model.data_types)

            # Check if already quantized
            if "INT8" in analysis["data_types"] or "UINT8" in analysis["data_types"]:
                analysis["has_quantization_potential"] = False
                analysis["optimization_blockers"].append(
                    "Model already uses INT8 quantization"
                )
            elif "INT16" in analysis["data_types"]:
                analysis["optimization_blockers"].append(
                    "Model uses INT16 - limited additional quantization benefit"
                )
            elif "FLOAT16" in analysis["data_types"]:
                analysis["optimization_blockers"].append(
                    "Model already uses FP16 - consider INT8 for further reduction"
                )

        # Analyze layer details
        if hasattr(parsed_model, "layer_details") and parsed_model.layer_details:
            for layer in parsed_model.layer_details:
                if hasattr(layer, "name") and layer.name:
                    analysis["layer_types"].add(layer.name.upper())

            # Architecture detection
            layer_names = " ".join(analysis["layer_types"])
            if "CONV" in layer_names:
                analysis["architecture_hints"].append("CNN")
                if "DEPTHWISE" in layer_names:
                    analysis["architecture_hints"].append("MobileNet-style")
                    analysis["optimization_blockers"].append(
                        "Already uses depthwise separable convolutions"
                    )
            if "FULLY_CONNECTED" in layer_names or "DENSE" in layer_names:
                analysis["architecture_hints"].append("Dense layers present")
            if "LSTM" in layer_names or "GRU" in layer_names:
                analysis["architecture_hints"].append("RNN")
            if "ATTENTION" in layer_names or "TRANSFORMER" in layer_names:
                analysis["architecture_hints"].append("Transformer")

        # Model size analysis
        if hasattr(parsed_model, "model_size_kb") and parsed_model.model_size_kb:
            analysis["model_size_mb"] = (
                parsed_model.model_size_kb / KILOBYTES_TO_MEGABYTES
            )

            if analysis["model_size_mb"] < SMALL_MODEL_SIZE_THRESHOLD_MB:
                analysis["optimization_blockers"].append(
                    f"Model already very small (<{SMALL_MODEL_SIZE_THRESHOLD_MB}MB) - "
                    f"limited optimization potential"
                )
            elif analysis["model_size_mb"] > LARGE_MODEL_SIZE_THRESHOLD_MB:
                analysis["architecture_hints"].append(
                    f"Big model (>{LARGE_MODEL_SIZE_THRESHOLD_MB}MB) - "
                    f"high optimization potential"
                )

        return analysis

    def _get_context_aware_optimizations(
        self,
        model_analysis: dict[str, Any],
        severity: str,
        overage_percent: float,
        parsed_model: Optional[ModelDetails] = None,
    ) -> list[str]:
        """
        Generate context-aware optimization recommendations.
        
        Produces intelligent optimization strategies tailored to specific model
        architectures, memory constraints, and severity levels. Combines
        quantization, pruning, and architectural optimizations based on analysis.
        
        Args:
            model_analysis: Dictionary containing model characteristics analysis
            severity: Optimization urgency level ('critical', 'high', 'moderate')
            overage_percent: Memory usage percentage over available RAM
            parsed_model: Optional parsed model for MAC-based recommendations

        Returns:
            List of prioritized, deduplicated optimization recommendations with
            expected impact estimates and implementation guidance
        """
        recommendations = []
        used_recommendations = set()  # Track to avoid duplicates

        # Analyze computational complexity for MAC-aware recommendations
        mac_analysis = self._analyze_mac_complexity(parsed_model)

        # Start with unified quantization recommendation (memory + computational)
        quantization_rec = self._get_unified_quantization_recommendation(
            model_analysis, mac_analysis, severity
        )
        if quantization_rec:
            recommendations.append(quantization_rec)
            used_recommendations.add("quantization")

        # Add unified pruning recommendations (memory + computational)
        pruning_rec = self._get_unified_pruning_recommendation(
            model_analysis, mac_analysis, severity
        )
        if pruning_rec:
            recommendations.append(pruning_rec)
            used_recommendations.add("pruning")

        # MAC-specific computational optimizations (non-overlapping)
        mac_specific_recs = self._get_mac_specific_optimizations(
            mac_analysis, severity, used_recommendations
        )
        recommendations.extend(mac_specific_recs)

        # Architecture-specific recommendations (excluding MAC overlaps)
        arch_recs = self._get_architecture_specific_recommendations_unified(
            model_analysis, severity, overage_percent, used_recommendations
        )
        recommendations.extend(arch_recs)

        # Add general optimization techniques based on severity
        if severity == "critical":
            recommendations.extend(
                [
                    "Consider model distillation to create a smaller student model",
                    "Split model into multiple stages with intermediate checkpoints",
                ]
            )
        elif severity == "high":
            recommendations.extend(
                [
                    "Implement gradient checkpointing to trade compute for memory",
                    "Consider using smaller input resolution or batch size of 1",
                ]
            )
        else:  # moderate
            recommendations.extend(
                [
                    "Use mixed precision inference with dynamic scaling",
                    "Implement in-place operations where possible",
                ]
            )

        # Add any optimization blockers as informational notes
        recommendations.extend(
            [
                f"Note: {blocker}"
                for blocker in model_analysis.get("optimization_blockers", [])
            ]
        )

        return recommendations

    def _analyze_mac_complexity(
        self, parsed_model: Optional[ModelDetails]
    ) -> dict[str, Any]:
        """
        Analyze MAC complexity and return structured analysis.

        Args:
            parsed_model: Model details containing MAC information

        Returns:
            Dictionary containing MAC analysis results
        """
        analysis = {
            "total_macs": 0,
            "complexity_level": "low",
            "high_mac_layers": [],
            "mac_distribution": [],
            "needs_acceleration": False,
        }

        if not parsed_model:
            return analysis

        total_macs = getattr(parsed_model, "total_macs", 0)
        analysis["total_macs"] = total_macs

        if total_macs == 0:
            return analysis

        # Classify computational complexity
        if total_macs >= VERY_HIGH_COMPUTATIONAL_COMPLEXITY_THRESHOLD:
            analysis["complexity_level"] = "very_high"
            analysis["needs_acceleration"] = True
        elif total_macs >= HIGH_COMPUTATIONAL_COMPLEXITY_THRESHOLD:
            analysis["complexity_level"] = "high"
            analysis["needs_acceleration"] = True
        elif total_macs >= MODERATE_COMPUTATIONAL_COMPLEXITY_THRESHOLD:
            analysis["complexity_level"] = "moderate"
        else:
            analysis["complexity_level"] = "low"

        # Analyze layer distribution
        layer_details = getattr(parsed_model, "layer_details", [])
        if layer_details and total_macs > 0:
            for i, layer in enumerate(layer_details):
                layer_macs = getattr(layer, "macs", 0)
                if layer_macs > 0:
                    mac_percentage = (layer_macs / total_macs) * 100
                    analysis["mac_distribution"].append(
                        {
                            "index": i,
                            "macs": layer_macs,
                            "percentage": mac_percentage,
                            "name": getattr(layer, "name", f"Layer_{i}"),
                            "type": getattr(layer, "operator_name", "Unknown"),
                        }
                    )

                    # Track high-MAC layers (>threshold% of total)
                    if mac_percentage > HIGH_MAC_LAYER_THRESHOLD_PERCENT:
                        analysis["high_mac_layers"].append(
                            {
                                "name": getattr(layer, "name", f"Layer_{i}"),
                                "type": getattr(layer, "operator_name", "Unknown"),
                                "percentage": mac_percentage,
                                "macs": layer_macs,
                            }
                        )

        return analysis

    def _get_unified_quantization_recommendation(
        self,
        model_analysis: dict[str, Any],
        mac_analysis: dict[str, Any],
        severity: str,
    ) -> Optional[str]:
        """
        Generate unified quantization recommendation considering both memory
        and MAC complexity.

        Args:
            model_analysis: Model characteristics analysis
            mac_analysis: MAC complexity analysis
            severity: Optimization urgency level

        Returns:
            Unified quantization recommendation or None
        """
        data_types = model_analysis.get("data_types", set())
        complexity_level = mac_analysis.get("complexity_level", "low")
        total_macs = mac_analysis.get("total_macs", 0)

        if not model_analysis.get("has_quantization_potential", True):
            if "INT8" in data_types:
                return None  # Already quantized
            elif "FLOAT16" in data_types:
                return "Consider INT8 quantization for additional 2x memory reduction"

        # Build unified recommendation based on both memory and computational benefits
        if "FLOAT32" in data_types:
            memory_benefit = "75% memory reduction"
            computational_benefit = ""

            if complexity_level in ["high", "very_high"]:
                computational_benefit = (
                    f" + significant computational speedup for {total_macs:,} MACs"
                )
            elif complexity_level == "moderate":
                computational_benefit = (
                    f" + moderate computational improvement for {total_macs:,} MACs"
                )

            if "CNN" in model_analysis.get("architecture_hints", []):
                return (
                    f"Priority: Apply INT8 post-training quantization - CNNs maintain "
                    f"accuracy well ({memory_benefit}{computational_benefit})"
                )
            elif "Transformer" in model_analysis.get("architecture_hints", []):
                return (
                    f"Use FP16 first (50% memory reduction), then evaluate INT8 "
                    f"quantization with calibration dataset "
                    f"({memory_benefit}{computational_benefit})"
                )
            else:
                return (
                    f"Apply FP32→INT8 quantization using post-training quantization "
                    f"({memory_benefit}{computational_benefit})"
                )
        elif "FLOAT16" in data_types:
            computational_note = ""
            if complexity_level in ["high", "very_high"]:
                computational_note = (
                    f" and reduce computational load for {total_macs:,} MACs"
                )
            return (
                f"Model uses FP16 - apply INT8 quantization for additional "
                f"2x memory reduction{computational_note}"
            )

        return "Evaluate quantization potential with representative dataset"

    def _get_unified_pruning_recommendation(
        self,
        model_analysis: dict[str, Any],
        mac_analysis: dict[str, Any],
        severity: str,
    ) -> Optional[str]:
        """
        Generate unified pruning recommendation considering both memory
        and computational benefits.

        Args:
            model_analysis: Model characteristics analysis
            mac_analysis: MAC complexity analysis
            severity: Optimization urgency level

        Returns:
            Unified pruning recommendation or None
        """
        if not model_analysis.get("has_pruning_potential", True):
            return None

        architecture_hints = model_analysis.get("architecture_hints", [])
        complexity_level = mac_analysis.get("complexity_level", "low")
        total_macs = mac_analysis.get("total_macs", 0)

        # Add computational benefit context to pruning recommendations
        computational_context = ""
        if complexity_level in ["high", "very_high"]:
            computational_context = (
                f" (will also reduce {total_macs:,} MAC computational load)"
            )
        elif complexity_level == "moderate":
            computational_context = (
                f" (moderate computational benefit for {total_macs:,} MACs)"
            )

        if "CNN" in architecture_hints:
            if severity == "critical":
                return (
                    f"Apply structured pruning to remove 50-90% of convolutional "
                    f"channels (maintains accuracy better than unstructured)"
                    f"{computational_context}"
                )
            else:
                return (
                    f"Use magnitude-based weight pruning for CNN layers "
                    f"(start with 50% sparsity){computational_context}"
                )
        elif "Dense layers present" in architecture_hints:
            return (
                f"Apply weight pruning to fully connected layers first "
                f"(typically more robust to pruning than conv layers)"
                f"{computational_context}"
            )
        elif "Transformer" in architecture_hints:
            return (
                f"Use attention head pruning and structured pruning for "
                f"transformer blocks{computational_context}"
            )
        elif "RNN" in architecture_hints:
            return (
                f"Apply magnitude pruning carefully to RNN weights "
                f"(may impact sequence modeling){computational_context}"
            )

        return (
            f"Apply magnitude-based weight pruning starting with 30-50% sparsity"
            f"{computational_context}"
        )

    def _get_mac_specific_optimizations(
        self,
        mac_analysis: dict[str, Any],
        severity: str,
        used_recommendations: set[str],
    ) -> list[str]:
        """
        Get MAC-specific optimizations that don't overlap with memory recommendations.

        Args:
            mac_analysis: MAC complexity analysis
            severity: Optimization urgency level
            used_recommendations: Set of already recommended optimizations

        Returns:
            List of MAC-specific optimization recommendations
        """
        recommendations = []
        complexity_level = mac_analysis.get("complexity_level", "low")
        total_macs = mac_analysis.get("total_macs", 0)
        high_mac_layers = mac_analysis.get("high_mac_layers", [])

        if total_macs == 0:
            return recommendations

        # Hardware acceleration recommendations (MAC-specific)
        if mac_analysis.get("needs_acceleration", False):
            recommendations.extend(
                [
                    f"High MAC count ({total_macs:,}) makes this model suitable "
                    f"for hardware acceleration",
                    "Consider targeting NPU/GPU acceleration for MAC-intensive "
                    "operations",
                    "Evaluate operator compatibility with available hardware "
                    "accelerators",
                ]
            )

        # Layer fusion and computational optimizations
        # (not covered by memory recommendations)
        if complexity_level == "very_high":
            if severity in ["critical", "high"]:
                recommendations.extend(
                    [
                        "Implement layer fusion to reduce intermediate computations",
                        "Consider replacing computationally expensive operations "
                        "with approximations",
                    ]
                )
        elif complexity_level == "high":
            if severity == "critical":
                recommendations.extend(
                    [
                        "Implement operator fusion to reduce computation overhead",
                        "Use approximate computing techniques for non-critical "
                        "operations",
                    ]
                )
        elif complexity_level == "moderate":
            recommendations.append(
                "Profile layer-wise MAC distribution for targeted optimization"
            )
        else:  # low complexity
            recommendations.append(
                f"Low computational complexity ({total_macs:,} MACs) - "
                "focus on memory optimization over computational reduction"
            )

        # Layer-specific computational hotspot analysis
        if high_mac_layers:
            recommendations.append(
                f"Found {len(high_mac_layers)} computationally intensive layers "
                f"(>{HIGH_MAC_LAYER_THRESHOLD_PERCENT}% of total MACs each) - "
                f"priority targets for optimization:"
            )

            for layer_info in high_mac_layers:
                layer_name = layer_info["name"]
                layer_type = layer_info["type"]
                percentage = layer_info["percentage"]

                specific_optimization = self._get_layer_specific_mac_optimization(
                    layer_type, severity
                )
                recommendations.append(
                    f"  • {layer_name} ({layer_type}): {percentage:.1f}% of "
                    f"total MACs - {specific_optimization}"
                )

        return recommendations

    def _get_architecture_specific_recommendations_unified(
        self,
        model_analysis: dict[str, Any],
        severity: str,
        overage_percent: float,
        used_recommendations: set[str],
    ) -> list[str]:
        """
        Generate architecture-specific recommendations excluding already
        covered optimizations.

        Args:
            model_analysis: Model characteristics analysis
            severity: Optimization urgency level
            overage_percent: Memory usage percentage over available RAM
            used_recommendations: Set of already recommended optimizations

        Returns:
            List of architecture-specific recommendations
        """
        recommendations = []
        architecture_hints = model_analysis.get("architecture_hints", [])

        if "CNN" in architecture_hints:
            if "MobileNet-style" not in architecture_hints:
                recommendations.append(
                    "Replace standard convolutions with depthwise separable "
                    "convolutions (3-8x memory reduction)"
                )

            if severity == "critical":
                recommendations.extend(
                    [
                        "Reduce number of filters in convolutional layers by 25-50%",
                        "Use grouped convolutions to reduce parameter count",
                        "Consider using EfficientNet-style compound scaling",
                    ]
                )

        if "Dense layers present" in architecture_hints:
            recommendations.append(
                "Apply low-rank factorization to large fully connected layers"
            )

        if "Transformer" in architecture_hints:
            recommendations.extend(
                [
                    "Enable memory-efficient attention mechanisms",
                    "Use gradient checkpointing for transformer blocks",
                    "Consider reducing attention head dimensions or count",
                ]
            )

        if "RNN" in architecture_hints:
            recommendations.extend(
                [
                    "Consider replacing LSTM/GRU with simpler RNN variants",
                    "Use truncated backpropagation to limit memory usage",
                ]
            )

        # Model size specific recommendations
        model_size_mb = model_analysis.get("model_size_mb", 0)
        if model_size_mb > 10:  # Large models
            recommendations.append(
                "Consider model distillation - train smaller student model "
                "to mimic behavior"
            )

        return recommendations

    def _get_layer_specific_mac_optimization(
        self, layer_type: str, severity: str
    ) -> str:
        """
        Get layer-type-specific MAC optimization recommendation.

        Args:
            layer_type: Type of neural network operation
            severity: Optimization urgency level

        Returns:
            Specific optimization recommendation for the layer type
        """
        layer_type_upper = layer_type.upper()

        if "CONV" in layer_type_upper:
            if severity == "critical":
                return (
                    "depthwise separable convolution replacement or "
                    "aggressive channel pruning"
                )
            else:
                return "quantization and moderate pruning"
        elif "FULLY_CONNECTED" in layer_type_upper or "DENSE" in layer_type_upper:
            if severity == "critical":
                return "low-rank decomposition or aggressive weight pruning"
            else:
                return "quantization and weight pruning"
        elif "ATTENTION" in layer_type_upper or "MATMUL" in layer_type_upper:
            return "attention head reduction or efficient attention mechanisms"
        elif "LSTM" in layer_type_upper or "GRU" in layer_type_upper:
            return "lightweight RNN variant replacement or quantization"
        else:
            return "quantization and targeted optimization"

    def _analyze_memory_patterns(
        self,
        parsed_model: ModelDetails,
        memory_recommendations: list[str],
        high_variance_threshold: float,
    ) -> None:
        """
        Analyze memory usage patterns from execution schedule for optimization insights.

        Args:
            parsed_model: Model containing execution schedule data
            memory_recommendations: List to append pattern-based recommendations
            high_variance_threshold: Threshold for detecting high memory variance
        """
        execution_schedule = getattr(parsed_model, "execution_schedule", [])
        if not execution_schedule:
            return

        try:
            # Extract memory usage timeline
            memory_timeline = [
                step.get("memory_b", 0)
                for step in execution_schedule
                if (
                    isinstance(step.get("memory_b"), (int, float))
                    and step.get("memory_b", 0) >= 0
                )
            ]

            if len(memory_timeline) < 2:
                return

            # Calculate memory usage statistics
            total_memory = sum(memory_timeline)
            avg_memory_b = total_memory / len(memory_timeline)
            min_memory_b = min(memory_timeline)
            max_memory_b = max(memory_timeline)
            memory_variance = max_memory_b - min_memory_b

            # Analyze memory variance patterns
            if avg_memory_b > 0 and memory_variance > (
                avg_memory_b * high_variance_threshold
            ):
                variance_percent = (memory_variance / avg_memory_b) * 100
                memory_recommendations.append(
                    f"High memory variance detected ({variance_percent:.1f}% of "
                    "average) - consider tensor lifecycle optimization and "
                    "memory pooling"
                )

                # Additional recommendation for very high variance
                if memory_variance > (avg_memory_b * HIGH_VARIANCE_MULTIPLIER):
                    memory_recommendations.append(
                        "Extremely high memory variance suggests potential for "
                        "significant memory optimization through tensor reuse"
                    )

        except (TypeError, ValueError, ZeroDivisionError) as e:
            self.logger.warning(f"Error analyzing memory patterns: {e}")
            # Don't fail the entire analysis for pattern analysis issues

    def _calculate_overall_performance(
        self,
        hardware_profile: HardwareProfile,
        total_cycles: int,
        total_energy_uj: float,
        total_latency_ms: float,
        parsed_model: ModelDetails,
        layer_performance: list[LayerPerformance],
    ) -> Optional[HardwareMetrics]:
        """
        Calculate overall hardware performance metrics for the entire model.

        Aggregates individual layer performance into model-wide metrics including
        timing, power consumption, memory usage, and hardware acceleration statistics.

        Args:
            hardware_profile: Hardware structure containing RamSize
            total_cycles: Sum of execution cycles across all layers
            total_energy_uj: Total energy consumption in microjoules
            total_latency_ms: Total inference latency in milliseconds
            parsed_model: Model details containing memory requirements
            layer_performance: List of individual layer performance metrics

        Returns:
            HardwareMetrics object with aggregated performance data, or None if
            hardware profile is missing or insufficient data available

        Note:
            RAM utilization percentage is calculated even when >100% to detect
            memory constraint violations.
        """
        if not hardware_profile:
            raise HardwareProfileError(
                "No hardware profile provided for performance calculation"
            )

        if not layer_performance:
            raise ModelAnalysisError("No layer performance data available")

        try:
            # Count acceleration usage
            accelerated_layers = sum(
                1 for layer in layer_performance if layer.is_accelerated
            )
            cpu_only_layers = len(layer_performance) - accelerated_layers

            # Extract memory information
            model_peak_ram_kb = getattr(parsed_model, "model_peak_ram_kb", None)
            available_ram_kb = hardware_profile.ram_size

            # Calculate power metrics
            estimated_power_mw = 0.0
            estimated_power_w = 0.0
            if total_latency_ms > 0 and total_energy_uj >= 0:
                estimated_power_mw = total_energy_uj / total_latency_ms
                estimated_power_w = estimated_power_mw / 1000

            # Convert peak memory to MB
            peak_memory_mb = (
                model_peak_ram_kb / KILOBYTES_TO_MEGABYTES 
                if model_peak_ram_kb else None
            )

            return HardwareMetrics(
                total_cycles=total_cycles,
                estimated_latency_ms=total_latency_ms,
                estimated_power_mw=estimated_power_mw,
                estimated_power_w=estimated_power_w,
                peak_memory_kb=model_peak_ram_kb,
                peak_memory_mb=peak_memory_mb,
                available_ram_kb=available_ram_kb,
                accelerated_layers=accelerated_layers,
                cpu_only_layers=cpu_only_layers,
            )

        except (ZeroDivisionError, ValueError) as e:
            error_msg = f"Error calculating overall performance metrics: {e}"
            self.logger.error(error_msg)
            return None
        except Exception as e:
            error_msg = f"Unexpected error in performance calculation: {e}"
            self.logger.warning(error_msg)
            return None

    def _finalize_analysis(
        self, report: ResourceProfileReport, duration: float, notes: list[AnalysisNote]
    ) -> None:
        """Finalize analysis with timing and save if requested."""
        notes.append(
            AnalysisNote(
                message=f"Analysis completed in {duration:.2f} seconds", category="info"
            )
        )

    def _handle_unexpected_error(self, error: Exception, duration: float) -> None:
        """Handle unexpected errors during analysis."""
        error_msg = f"Unexpected error during model analysis: {error!s}"
        self.logger.error(f"{error_msg} (after {duration:.2f}s)")

        raise ModelAnalysisError(
            error_msg,
            error_code="UNEXPECTED_ERROR",
            details={
                "duration_seconds": duration,
                "exception_type": type(error).__name__,
            },
        ) from error

    def _generate_layerwise_opportunities(
        self, layer_details: list[LayerDetail], sort_by: str
    ) -> list[LayerwiseOptimizationOpportunity]:
        """
        Generate layerwise optimization opportunities.

        Identifies and ranks individual layers by optimization potential,
        providing specific suggestions for the most resource-intensive layers.
        Enables targeted optimization by focusing on layers with highest impact.

        Args:
            layer_details: List of layer information from parsed model
            sort_by: Sorting criterion for prioritization ('memory' or 'macs')

        Returns:
            List of LayerwiseOptimizationOpportunity objects for the top
            resource-consuming layers, limited by max_optimization_layers
        """
        opportunities: list[LayerwiseOptimizationOpportunity] = []

        try:
            if sort_by == "memory":
                sorted_layers = sorted(
                    layer_details, key=lambda x: getattr(x, "flash_kb", 0), reverse=True
                )
            else:  # sort by MACs
                sorted_layers = sorted(
                    layer_details, key=lambda x: getattr(x, "macs", 0), reverse=True
                )

            for layer in sorted_layers[: self.max_optimization_layers]:
                flash_kb = getattr(layer, "flash_kb", 0)
                layer_macs = getattr(layer, "macs", 0)

                # Only include layers with significant resource usage
                if flash_kb >= 1 or layer_macs > 0:
                    opportunities.append(
                        LayerwiseOptimizationOpportunity(
                            layer_index=getattr(layer, "index", -1),
                            op_type=getattr(layer, "name", "Unknown"),
                            parameter_memory_kb=flash_kb,
                            macs=layer_macs,
                            kernel_info=str(getattr(layer, "kernel_tensors", "None")),
                            suggestion=self._generate_layer_suggestion(layer, 
                                       sort_by, None),
                        )
                    )

        except Exception as e:
            self.logger.error(f"Error generating layerwise opportunities: {e}")

        return opportunities

    def _generate_layer_suggestion(
        self,
        layer: LayerDetail,
        optimization_type: str,
        hardware_profile: HardwareProfile
    ) -> str:
        """
        Generate hardware-aware optimization suggestion for a specific layer.

        Combines memory and computational optimization strategies based on
        layer type, optimization focus, and available hardware acceleration.
        Leverages smart recommendation functions for context-aware suggestions.

        Args:
            layer: Layer details containing operation type, memory usage, and MACs
            optimization_type: Focus area ('memory' or 'macs') for optimization
            hardware_profile: hardware specifications for acceleration
                detection and performance hints

        Returns:
            Specific optimization recommendation string tailored to layer
            characteristics and hardware capabilities
        """
        # Get hardware context for intelligent suggestions
        # Use provided hardware_profile or fallback to stored profile
        hw_profile = hardware_profile or getattr(self, "_last_hardware_profile", None)
        hardware_context = self._get_layer_hardware_context(layer, hw_profile)

        # Use smart recommendation functions when model analysis available
        model_analysis = getattr(self, "_last_model_analysis", {})
        smart_suggestion = self._get_layer_smart_suggestion(
            layer, optimization_type, model_analysis, hardware_context
        )
        return smart_suggestion

    def _get_layer_hardware_context(
        self, layer: LayerDetail, hardware_profile: Optional[HardwareProfile]
    ) -> dict[str, Any]:
        """
        Extract hardware context for layer-specific optimization.

        Analyzes hardware capabilities and constraints to provide context
        for intelligent layer optimization decisions. Detects acceleration
        opportunities and performance characteristics.

        Args:
            layer: Layer details containing operation type and identifiers
            hardware_profile: Hardware specifications including accelerator
                operations, RAM constraints, and performance characteristics

        Returns:
            Dictionary containing hardware context:
                - is_accelerated: Whether layer can use hardware acceleration
                - accelerator_ops: List of supported accelerated operations
                - memory_constraints: Memory limitations and thresholds
                - performance_hints: Hardware performance characteristics
        """
        context = {
            "is_accelerated": False,
            "accelerator_ops": [],
            "has_custom_ops": False,
            "memory_constraints": {},
            "performance_hints": [],
        }

        if hardware_profile:
            layer_name = getattr(layer, "name", "")
            layer_operator = getattr(layer, "operator_name", "")

            # Check hardware acceleration
            accelerator_ops = getattr(hardware_profile, "accelerated_ops", [])
            context["accelerator_ops"] = accelerator_ops
            context["is_accelerated"] = (
                layer_operator in accelerator_ops or layer_name in accelerator_ops
            )

            # Memory constraints analysis
            available_ram_kb = getattr(hardware_profile, "ram_size", 0)
            if available_ram_kb:
                context["memory_constraints"] = {
                    "available_ram_kb": available_ram_kb,
                    "tight_memory": (
                        available_ram_kb < TIGHT_MEMORY_OPTIMIZATION_THRESHOLD_KB
                    ),
                }

            # Performance hints based on hardware specs
            cpu_clock_mhz = getattr(hardware_profile, "core_clock", 0)
            if cpu_clock_mhz:
                context["performance_hints"] = [
                    (
                        "low_power"
                        if cpu_clock_mhz < LOW_POWER_CPU_FREQUENCY_MHZ
                        else "high_performance"
                    ),
                    (
                        "embedded"
                        if cpu_clock_mhz < EMBEDDED_CPU_FREQUENCY_MHZ
                        else "desktop_class"
                    ),
                ]

        return context

    def _get_layer_smart_suggestion(
        self,
        layer: LayerDetail,
        optimization_type: str,
        model_analysis: dict[str, Any],
        hardware_context: dict[str, Any],
    ) -> Optional[str]:
        """
        Generate smart layer suggestion using model analysis and hardware context.

        Combines global model analysis with layer-specific characteristics and
        hardware capabilities to generate intelligent optimization recommendations.
        Considers acceleration compatibility and memory constraints.

        Args:
            layer: Layer details containing operation type, memory, and MACs
            optimization_type: Focus area ('memory' or 'macs') for optimization
            model_analysis: Global model characteristics and architecture hints
            hardware_context: Hardware capabilities and constraints

        Returns:
            Intelligent layer optimization suggestion considering both model
            context and hardware capabilities, or None for fallback handling
        """
        layer_name = getattr(layer, "name", "").upper()
        flash_kb = getattr(layer, "flash_kb", 0)
        layer_macs = getattr(layer, "macs", 0)

        # Hardware-aware suggestions
        if hardware_context["is_accelerated"]:
            if optimization_type == "memory":
                return (
                    f"Hardware-accelerated {layer_name.lower()} layer - "
                    "focus on data type optimization (FP16/INT8) while "
                    "preserving acceleration compatibility"
                )
            else:
                return (
                    "Layer uses hardware acceleration - "
                    "optimization may reduce acceleration benefits"
                )

        # Memory-constrained hardware suggestions
        if (
            hardware_context.get("memory_constraints", {}).get("tight_memory")
            and optimization_type == "memory"
            and flash_kb > MINIMAL_MEMORY_THRESHOLD_KB
        ):
            return self._get_aggressive_memory_suggestion(layer_name, model_analysis)

        # Use architecture-specific smart recommendations
        architecture_hints = model_analysis.get("architecture_hints", [])

        if "CONV" in layer_name:
            return self._get_smart_conv_suggestion(
                flash_kb,
                layer_macs,
                optimization_type,
                architecture_hints,
                hardware_context,
            )
        elif "FULLY_CONNECTED" in layer_name or "DENSE" in layer_name:
            return self._get_smart_dense_suggestion(
                flash_kb,
                layer_macs,
                optimization_type,
                architecture_hints,
                hardware_context,
            )

        return None  # Fall back to basic suggestions

    def _get_aggressive_memory_suggestion(
        self, layer_name: str, model_analysis: dict[str, Any]
    ) -> str:
        """
        Generate aggressive memory optimization for tight memory constraints.

        Provides aggressive memory reduction strategies for deployment on
        severely memory-constrained hardware platforms. Prioritizes maximum
        memory reduction over other considerations.

        Args:
            layer_name: Layer identifier for targeted recommendations
            model_analysis: Global model characteristics including data types

        Returns:
            Aggressive memory optimization recommendation with maximum
            reduction potential for constrained environments
        """
        data_types = model_analysis.get("data_types", set())

        if "FLOAT32" in data_types:
            return (
                f"{layer_name.lower()} layer in memory-constrained environment - "
                "apply aggressive INT8 quantization and consider layer fusion"
            )
        elif "FLOAT16" in data_types:
            return (
                f"{layer_name.lower()} layer - apply INT8 quantization for "
                "additional 2x memory reduction in constrained environment"
            )
        else:
            return (
                f"{layer_name.lower()} layer - apply tensor sharing and "
                "in-place operations for memory-constrained deployment"
            )

    def _get_smart_conv_suggestion(
        self,
        flash_kb: float,
        layer_macs: int,
        optimization_type: str,
        architecture_hints: list[str],
        hardware_context: dict[str, Any],
    ) -> str:
        """
        Smart convolution layer suggestions using existing recommendation logic.

        Generates optimization recommendations specifically for convolutional layers
        based on memory usage, computational load, and hardware characteristics.
        Considers architectural patterns like MobileNet optimizations.

        Args:
            flash_kb: Layer memory usage in kilobytes
            layer_macs: Layer multiply-accumulate operations count
            optimization_type: Focus area ('memory' or 'macs') for optimization
            architecture_hints: Detected model architecture patterns
            hardware_context: Hardware performance hints and capabilities

        Returns:
            Convolution-specific optimization recommendation tailored to
            layer characteristics and hardware target
        """
        # Reuse logic from smart architecture recommendations
        if "MobileNet-style" in architecture_hints:
            if optimization_type == "memory":
                return (
                    "Depthwise separable conv already used - apply channel pruning "
                    "or quantization for further optimization"
                )
            else:
                return (
                    "Optimize existing depthwise separable conv with kernel size "
                    "reduction or grouped convolutions"
                )

        # Use performance hints for hardware-specific suggestions
        performance_hints = hardware_context.get("performance_hints", [])

        if optimization_type == "memory":
            if "embedded" in performance_hints:
                if flash_kb > MEDIUM_MEMORY_CONSTRAINT_THRESHOLD_KB:
                    return (
                        "Embedded target: Replace with depthwise separable conv + "
                        "channel pruning (3-8x memory reduction)"
                    )
                else:
                    return "Embedded target: Apply aggressive INT8 quantization"
            else:
                if flash_kb > HIGH_MEMORY_AVAILABILITY_THRESHOLD_KB:
                    return "Consider depthwise separable convolution or channel pruning"
                else:
                    return "Apply INT8 quantization to reduce weight precision"
        else:  # macs optimization
            if "low_power" in performance_hints:
                return (
                    "Low-power target: Replace with grouped convolution to "
                    "reduce computational load"
                )
            elif layer_macs > VERY_HIGH_COMPUTATIONAL_COMPLEXITY_THRESHOLD:
                return "Replace with depthwise separable or grouped convolution"
            else:
                return "Optimize kernel size or apply channel pruning"

    def _get_smart_dense_suggestion(
        self,
        flash_kb: float,
        layer_macs: int,
        optimization_type: str,
        architecture_hints: list[str],
        hardware_context: dict[str, Any],
    ) -> str:
        """
        Smart dense layer suggestions leveraging recommendation functions.

        Generates optimization recommendations specifically for dense/fully-connected
        layers based on parameter count, computational requirements, and hardware
        target characteristics. Considers pruning and factorization opportunities.

        Args:
            flash_kb: Layer memory usage in kilobytes
            layer_macs: Layer multiply-accumulate operations count
            optimization_type: Focus area ('memory' or 'macs') for optimization
            architecture_hints: Detected model architecture patterns
            hardware_context: Hardware performance hints and capabilities

        Returns:
            Dense layer-specific optimization recommendation with techniques
            like pruning, factorization, or sparsity optimization
        """
        performance_hints = hardware_context.get("performance_hints", [])

        if optimization_type == "memory":
            if (
                "embedded" in performance_hints
                and flash_kb > LOW_MEMORY_CONSTRAINT_THRESHOLD_KB
            ):
                return (
                    "Embedded target: Apply structured pruning + low-rank "
                    "factorization for dense layer optimization"
                )
            elif flash_kb > MEDIUM_MEMORY_CONSTRAINT_THRESHOLD_KB:
                return "Apply structured pruning or low-rank factorization"
            else:
                return "Quantize weights and consider sparsity"
        else:  # macs optimization
            if (
                "low_power" in performance_hints
                and layer_macs > MODERATE_COMPUTATIONAL_COMPLEXITY_THRESHOLD
            ):
                return (
                    "Low-power target: Use sparse matrices with hardware-efficient "
                    "sparsity patterns"
                )
            elif layer_macs > HIGH_COMPUTATIONAL_COMPLEXITY_THRESHOLD:
                return "Apply structured pruning or low-rank decomposition"
            else:
                return "Use sparse matrices or reduce hidden dimensions"
