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
Resource Profiler Data Structures.

Comprehensive schema definitions for AI model resource profiling and
performance analysis. This module provides structured data models for
representing performance metrics, memory usage, optimization opportunities,
and hardware-specific analysis results for neural network models.

Schema Categories:
- Performance Metrics: Layer-wise and model-wide performance measurements
- Hardware Metrics: Platform-specific execution characteristics
- Memory Analysis: RAM usage, constraints, and optimization guidance
- Optimization Analysis: Structured recommendations for model improvement
- Reporting: Comprehensive profiling results with visualization capabilities

Data Validation:
All schemas include Pydantic validation to ensure data integrity and provide
clear error messages for invalid profiling data.

Visualization Support:
The ResourceProfileReport includes built-in tabular visualization capabilities
for human-readable performance analysis and optimization guidance.
"""
import io
import json
import logging
from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field

from cfsai_types.hardware_profile import HardwareProfile

# Visualization Constants for Report Formatting
REPORT_HEADER_WIDTH = 180                    # Console width for report headers
CRITICAL_RAM_UTILIZATION_THRESHOLD = 95.0  # Threshold for critical RAM status
WARNING_RAM_UTILIZATION_THRESHOLD = 80.0   # Threshold for warning RAM status
HIGH_CYCLE_COUNT_THRESHOLD = 1_000_000     # Threshold for high computation layers
MODERATE_CYCLE_COUNT_THRESHOLD = 100_000   # Threshold for moderate computation layers

# Optional dependency for enhanced table formatting
try:
    from rich.console import Console
    from rich.table import Table
    from rich.text import Text
    HAS_RICH = True
except ImportError:
    HAS_RICH = False

logger = logging.getLogger(__name__)


class LayerPerformance(BaseModel):
    """
    Performance metrics for individual neural network layers.

    Captures comprehensive execution characteristics including timing,
    power consumption, and memory usage for each layer in the model.

    Attributes:
        layer_idx: Zero-indexed position of the layer in the model
        layer_name: Human-readable layer identifier (e.g., 'conv2d_1')
        operator_type: Neural network operation type (e.g., 'CONV_2D',
            'FULLY_CONNECTED')
        cycles: Hardware execution cycles required for this layer
        latency_ms: Execution time in milliseconds
        energy_uj: Energy consumption in microjoules
        power_mw: Power consumption in milliwatts
        power_w: Power consumption in watts (derived from power_mw)
        is_accelerated: Whether layer execution uses hardware acceleration
        macs: Multiply-accumulate operations count
        memory_kb: Memory footprint in kilobytes
    """

    layer_idx: int = Field(
        ge=0, description="Zero-indexed layer position in the model"
    )
    layer_name: Optional[str] = Field(
        default=None, description="Human-readable layer identifier"
    )
    operator_type: Optional[str] = Field(
        default=None, description="Neural network operation type"
    )
    cycles: Optional[int] = Field(
        default=None, ge=0, description="Hardware execution cycles"
    )
    latency_ms: Optional[float] = Field(
        default=None, ge=0, description="Execution time in milliseconds"
    )
    energy_uj: Optional[float] = Field(
        default=None, ge=0, description="Energy consumption in microjoules"
    )
    power_mw: Optional[float] = Field(
        default=None, ge=0, description="Power consumption in milliwatts"
    )
    power_w: Optional[float] = Field(
        default=None, ge=0, description="Power consumption in watts"
    )
    is_accelerated: bool = Field(
        default=False, description="Hardware acceleration utilization flag"
    )
    macs: Optional[int] = Field(
        default=None, ge=0, description="Multiply-accumulate operations count"
    )
    memory_kb: Optional[float] = Field(
        default=None, ge=0, description="Memory footprint in kilobytes"
    )


class ModelSummary(BaseModel):
    """
    High-level model characteristics and metadata.

    Provides essential information about the neural network model including
    architecture details, data types, and structural properties.

    Attributes:
        model_name: Descriptive name or identifier for the model
        model_path: File system path to the model file
        framework: ML framework used (e.g., 'TensorFlow Lite', 'ONNX')
        model_size_kb: Total model size including weights and metadata
        target_dtype: Primary data type used in the model (e.g., 'FLOAT32',
            'INT8')
        layer_count: Total number of layers in the model
        total_parameters: Total number of trainable parameters
    """

    model_name: Optional[str] = Field(
        default=None, description="Model identifier or name"
    )
    model_path: Optional[str] = Field(
        default=None, description="File system path to model"
    )
    framework: Optional[str] = Field(
        default=None, description="ML framework (e.g., TensorFlow Lite)"
    )
    model_size_kb: Optional[float] = Field(
        default=None, ge=0, description="Total model size in kilobytes"
    )
    target_dtype: Optional[str] = Field(
        default=None, description="Primary model data type"
    )
    layer_count: Optional[int] = Field(
        default=None, ge=0, description="Total number of layers"
    )
    total_parameters: Optional[int] = Field(
        default=None, ge=0, description="Total trainable parameters"
    )


class HardwareMetrics(BaseModel):
    """
    Hardware-specific performance and resource utilization metrics.

    Captures platform-dependent execution characteristics including timing,
    power consumption, memory usage, and acceleration utilization across
    the entire model inference process.

    Attributes:
        total_cycles: Total hardware execution cycles for model inference
        estimated_latency_ms: End-to-end inference latency in milliseconds
        estimated_power_mw: Average power consumption during inference
            (milliwatts)
        estimated_power_w: Average power consumption during inference (watts)
        peak_memory_kb: Maximum memory usage during inference (kilobytes)
        peak_memory_mb: Maximum memory usage during inference (megabytes)
        available_ram_kb: Total available system RAM (kilobytes)
        accelerated_layers: Number of layers using hardware acceleration
        cpu_only_layers: Number of layers executed on CPU without acceleration
    """

    total_cycles: Optional[int] = Field(
        default=None, ge=0, description="Total execution cycles"
    )
    estimated_latency_ms: Optional[float] = Field(
        default=None, ge=0, description="End-to-end latency in milliseconds"
    )
    estimated_power_mw: Optional[float] = Field(
        default=None, ge=0, description="Power consumption in milliwatts"
    )
    estimated_power_w: Optional[float] = Field(
        default=None, ge=0, description="Power consumption in watts"
    )
    peak_memory_kb: Optional[float] = Field(
        default=None, ge=0, description="Peak memory usage in kilobytes"
    )
    peak_memory_mb: Optional[float] = Field(
        default=None, ge=0, description="Peak memory usage in megabytes"
    )
    available_ram_kb: Optional[float] = Field(
        default=None, ge=0, description="Available system RAM in kilobytes"
    )
    accelerated_layers: Optional[int] = Field(
        default=None, ge=0, description="Count of hardware-accelerated layers"
    )
    cpu_only_layers: Optional[int] = Field(
        default=None, ge=0, description="Count of CPU-only layers"
    )


class OptimizationSuggestion(BaseModel):
    """
    Individual optimization recommendation with impact assessment.

    Represents a specific technique or modification that could improve
    model performance, reduce resource usage, or enhance deployment viability.

    Attributes:
        category: Optimization type (e.g., 'quantization', 'pruning',
            'architecture')
        description: Detailed explanation of the optimization technique
        estimated_improvement: Expected performance or efficiency gain
        complexity: Implementation difficulty level ('low', 'medium', 'high')
        priority: Urgency or importance level ('critical', 'high', 'medium',
            'low')
    """

    category: str = Field(
        description="Optimization category (quantization, pruning, etc.)"
    )
    description: str = Field(
        description="Detailed optimization recommendation"
    )
    estimated_improvement: Optional[str] = Field(
        default=None, description="Expected performance improvement"
    )
    complexity: Optional[str] = Field(
        default=None, description="Implementation complexity level"
    )
    priority: Optional[str] = Field(
        default=None, description="Optimization priority level"
    )


class LayerwiseOptimizationOpportunity(BaseModel):
    """
    Layer-specific optimization opportunity with detailed metrics.

    Identifies specific layers that offer significant optimization potential
    with quantitative assessments of memory usage, computational load,
    and specific improvement recommendations.

    Attributes:
        layer_index: Zero-indexed position of the optimization target layer
        op_type: Neural network operation type for this layer
        parameter_memory_kb: Memory consumed by layer parameters (weights/biases)
        macs: Multiply-accumulate operations count for this layer
        kernel_info: Convolution kernel dimensions or operation specifics
        suggestion: Specific optimization recommendation for this layer
    """

    layer_index: int = Field(
        ge=0, description="Target layer position in model"
    )
    op_type: str = Field(
        description="Neural network operation type"
    )
    parameter_memory_kb: float = Field(
        ge=0, description="Parameter memory usage in kilobytes"
    )
    macs: Optional[int] = Field(
        default=None, ge=0, description="Multiply-accumulate operations count"
    )
    kernel_info: Optional[str] = Field(
        default=None, description="Kernel dimensions or operation details"
    )
    suggestion: Optional[str] = Field(
        default=None, description="Layer-specific optimization recommendation"
    )


class OptimizationOpportunities(BaseModel):
    """
    Comprehensive optimization analysis with structured recommendations.

    Provides a complete assessment of model optimization potential including
    global metrics, strategic recommendations, and layer-specific opportunities
    for both memory reduction and computational efficiency improvements.

    Attributes:
        total_parameter_memory_kb: Total memory consumed by all model parameters
        total_macs: Total multiply-accumulate operations across the model
        layerwise_opportunities: Layer-specific memory optimization targets
        macs_opportunities: Layer-specific computational optimization targets
        notes: Additional context or implementation guidance
    """

    total_parameter_memory_kb: float = Field(
        ge=0, description="Total parameter memory across model"
    )
    total_macs: int = Field(
        ge=0, description="Total multiply-accumulate operations"
    )
    layerwise_opportunities: list[LayerwiseOptimizationOpportunity] = Field(
        default_factory=list,
        description="Layer-specific memory optimization opportunities"
    )
    macs_opportunities: list[LayerwiseOptimizationOpportunity] = Field(
        default_factory=list,
        description="Layer-specific computational optimization opportunities"
    )
    notes: Optional[str] = Field(
        default=None, description="Additional optimization context or guidance"
    )


class AnalysisNote(BaseModel):
    """
    Informational note or observation from the profiling analysis.

    Captures non-critical information, warnings, or insights discovered
    during the resource profiling process that may be relevant for
    optimization decisions or deployment planning.

    Attributes:
        message: The informational content or observation
        category: Note classification (e.g., 'info', 'warning', 'optimization')
    """

    message: str = Field(
        description="Analysis observation or informational message"
    )
    category: Optional[str] = Field(
        default=None, description="Note category or classification"
    )


class ErrorNote(BaseModel):
    """
    Error or exception details encountered during profiling analysis.

    Documents issues that occurred during the resource profiling process,
    providing context for debugging and understanding analysis limitations.

    Attributes:
        message: Error description or exception message
        code: Error code or classification identifier
        details: Additional structured error context
    """

    message: str = Field(
        description="Error description or exception message"
    )
    code: Optional[str] = Field(
        default=None, description="Error code or identifier"
    )
    details: Optional[dict[str, Any]] = Field(
        default=None, description="Additional error context"
    )


class MemoryAnalysis(BaseModel):
    """
    Comprehensive memory usage analysis and constraint validation.

    Evaluates memory requirements against hardware constraints and provides
    status assessment with specific recommendations for memory optimization
    when constraints are exceeded.

    Attributes:
        model_peak_ram_kb: Maximum RAM usage during model inference
        available_ram_kb: Total available system RAM
        ram_utilization_percent: Percentage of available RAM utilized
        ram_status: Memory constraint status ('CRITICAL', 'WARNING', 'OK')
        memory_issues: List of identified memory constraint violations
        memory_recommendations: List of memory optimization suggestions
    """

    model_peak_ram_kb: float = Field(
        ge=0, description="Peak RAM requirement in kilobytes"
    )
    available_ram_kb: Optional[float] = Field(
        default=None, ge=0, description="Available system RAM in kilobytes"
    )
    ram_utilization_percent: Optional[float] = Field(
        default=None, 
        ge=0, 
        description=(
            "RAM utilization percentage (can exceed 100% if memory "
            "requirements exceed available RAM)"
        )
    )
    ram_status: str = Field(
        description="Memory status assessment (CRITICAL/WARNING/OK)"
    )
    memory_issues: list[str] = Field(
        default_factory=list,
        description="Identified memory constraint violations"
    )
    memory_recommendations: list[str] = Field(
        default_factory=list,
        description="Memory optimization recommendations"
    )

class ResourceProfileReport(BaseModel):
    """
    Comprehensive resource profiling report with visualization capabilities.

    Aggregates all resource profiling analysis results into a structured report
    suitable for both programmatic processing and human-readable presentation.
    Includes built-in visualization methods for generating formatted output.

    Key Capabilities:
    - Complete performance and resource analysis aggregation
    - Tabular visualization for human-readable reports
    - JSON serialization for programmatic integration
    - Error tracking and analysis note management
    - Hardware-specific optimization recommendations

    Attributes:
        model_summary: High-level model characteristics and metadata
        hardware_metrics: Platform-specific performance measurements
        memory_analysis: Memory usage analysis and constraint validation
        layer_performance: Per-layer performance metrics
        optimization_suggestions: High-level optimization recommendations
        optimization_opportunities: Detailed layer-specific optimization analysis
        analysis_notes: Informational observations from profiling process
        errors: Error details encountered during analysis
        timestamp: Analysis execution timestamp
        hardware_profile_used: Hardware configuration used for profiling
    """

    model_summary: Optional[ModelSummary] = Field(
        default=None, description="Model characteristics and metadata"
    )
    hardware_metrics: Optional[HardwareMetrics] = Field(
        default=None, description="Hardware performance metrics"
    )
    memory_analysis: Optional[MemoryAnalysis] = Field(
        default=None, description="Memory usage analysis"
    )
    layer_performance: Optional[list[LayerPerformance]] = Field(
        default=None, description="Per-layer performance data"
    )
    optimization_suggestions: Optional[list[OptimizationSuggestion]] = Field(
        default=None, description="High-level optimization recommendations"
    )
    optimization_opportunities: Optional[OptimizationOpportunities] = Field(
        default=None, description="Detailed optimization analysis"
    )
    analysis_notes: Optional[list[AnalysisNote]] = Field(
        default=None, description="Analysis observations and notes"
    )
    errors: Optional[list[ErrorNote]] = Field(
        default=None, description="Errors encountered during analysis"
    )
    timestamp: Optional[str] = Field(
        default=None, description="Analysis execution timestamp"
    )
    hardware_profile_used: Optional[HardwareProfile] = Field(
        default=None, description="Hardware configuration used"
    )
    

    def visualize_resource_profile(self, to_buffer:bool=False) -> str | None:
        """
        Generate human-readable tabular visualization of resource profiling report.

        Creates comprehensive formatted output including model summary, memory
        analysis, hardware performance metrics, per-layer performance data,
        and optimization recommendations. Uses Rich library for professional
        table formatting.

        Output Sections:
        - Model Summary: Basic model characteristics and metadata
        - Memory Analysis: RAM usage, status, and constraint validation
        - Hardware Performance: Timing, power, and acceleration metrics
        - Per-Layer Performance: Detailed layer-wise execution characteristics
        - Optimization Suggestions: High-level improvement recommendations
        - Optimization Opportunities: Layer-specific optimization targets
        - Detailed Optimization Roadmap: Structured implementation plan
        - Analysis Notes: Informational observations and insights
        - Error Reports: Issues encountered during profiling

        Raises:
            ImportError: If Rich library is not installed
        """
        if not HAS_RICH:
            print("Please install 'rich' to visualize results: pip install rich")
            return

        if to_buffer:
            buffer = io.StringIO()
            console = Console(file=buffer, force_terminal=False, no_color=True)
        else:
            console = Console()

        # Main header
        console.print("=" * REPORT_HEADER_WIDTH, style="bold blue")
        console.print(
            "RESOURCE PROFILING REPORT", style="bold blue", justify="center"
        )
        console.print("=" * REPORT_HEADER_WIDTH, style="bold blue")

        # Model Summary Section
        if self.model_summary:
            console.print("\n=== MODEL SUMMARY ===", style="bold green")

            table = Table(show_header=True, header_style="bold magenta")
            table.add_column("Metric", style="cyan", width=20)
            table.add_column("Value", style="white", width=40)

            model = self.model_summary
            if model.model_name:
                table.add_row("Model Name", model.model_name)
            if model.model_path:
                table.add_row("Model Path", model.model_path)
            if model.framework:
                table.add_row("Framework", model.framework)
            if model.model_size_kb:
                table.add_row("Model Size", f"{model.model_size_kb:.2f} KB")
            if model.target_dtype:
                table.add_row("Data Type", model.target_dtype)
            if model.layer_count:
                table.add_row("Layer Count", str(model.layer_count))
            if model.total_parameters:
                table.add_row(
                    "Total Parameters", f"{model.total_parameters:,}"
                )

            console.print(table)

        # Memory Analysis Section
        if self.memory_analysis:
            console.print("\n=== MEMORY ANALYSIS ===", style="bold green")
            mem = self.memory_analysis

            table = Table(show_header=True, header_style="bold magenta")
            table.add_column("Memory Metric", style="cyan", width=25)
            table.add_column("Value", style="white", width=35)

            # Peak RAM with color coding
            peak_ram_text = Text(
                f"{mem.model_peak_ram_kb:.2f} KB ({mem.model_peak_ram_kb/1024:.2f} MB)"
            )
            table.add_row("Peak RAM Required", peak_ram_text)

            # Status with color coding
            status_text = Text(mem.ram_status)
            if mem.ram_status == "CRITICAL":
                status_text.stylize("bold red")
            elif mem.ram_status == "WARNING":
                status_text.stylize("bold yellow")
            else:
                status_text.stylize("bold green")
            table.add_row("RAM Status", status_text)

            if mem.available_ram_kb:
                table.add_row(
                    "Available RAM",
                    f"{mem.available_ram_kb:.2f} KB "
                    f"({mem.available_ram_kb/1024:.2f} MB)"
                )

            if mem.ram_utilization_percent:
                util_text = Text(f"{mem.ram_utilization_percent:.1f}%")
                if mem.ram_utilization_percent > CRITICAL_RAM_UTILIZATION_THRESHOLD:
                    util_text.stylize("bold red")
                elif mem.ram_utilization_percent > WARNING_RAM_UTILIZATION_THRESHOLD:
                    util_text.stylize("bold yellow")
                table.add_row("RAM Utilization", util_text)

            console.print(table)

            # Memory issues and recommendations
            if mem.memory_issues:
                console.print("\n  Memory Issues:", style="bold red")
                for issue in mem.memory_issues:
                    console.print(f"    • {issue}", style="red")

            if mem.memory_recommendations:
                console.print("\n  Memory Recommendations:", style="bold blue")
                for rec in mem.memory_recommendations:
                    console.print(f"    • {rec}", style="blue")

        # Hardware Performance Section
        if self.hardware_metrics:
            console.print("\n=== HARDWARE PERFORMANCE ===", style="bold green")

            table = Table(show_header=True, header_style="bold magenta")
            table.add_column("Metric", style="cyan", width=20)
            table.add_column("Value", style="white", width=35)

            hw = self.hardware_metrics
            if hw.total_cycles:
                table.add_row("Total Cycles", f"{hw.total_cycles:,}")
            if hw.estimated_latency_ms:
                table.add_row(
                    "Estimated Latency", f"{hw.estimated_latency_ms:.2f} ms"
                )
            if hw.estimated_power_mw:
                table.add_row(
                    "Estimated Power",
                    f"{hw.estimated_power_mw:.2f} mW "
                    f"({hw.estimated_power_w:.4f} W)"
                )
            if hw.peak_memory_kb:
                table.add_row("Peak Memory", f"{hw.peak_memory_kb:.2f} KB")
            if hw.accelerated_layers is not None:
                table.add_row("Accelerated Layers", str(hw.accelerated_layers))
            if hw.cpu_only_layers is not None:
                table.add_row("CPU-Only Layers", str(hw.cpu_only_layers))

            console.print(table)

        # Layer Performance Section
        if self.layer_performance:
            console.print(
                "\n=== PER-LAYER PERFORMANCE ===", style="bold green"
            )

            table = Table(show_header=True, header_style="bold magenta")
            table.add_column("Layer", style="cyan", width=8)
            table.add_column("Operator", style="blue", width=15)
            table.add_column("Cycles", style="green", width=10, justify="right")
            table.add_column(
                "Latency (ms)", style="yellow", width=12, justify="right"
            )
            table.add_column(
                "Energy (uJ)", style="magenta", width=11, justify="right"
            )
            table.add_column(
                "Power (mW)", style="red", width=11, justify="right"
            )
            table.add_column("MACs", style="white", width=10, justify="right")
            table.add_column(
                "Memory (KB)", style="cyan", width=12, justify="right"
            )
            table.add_column("Accel", style="green", width=6, justify="center")

            for layer in self.layer_performance:
                layer_name_display = f"{layer.layer_idx}"

                # Color code based on performance characteristics
                cycles_text = Text(f"{layer.cycles:,}" if layer.cycles else "-")
                if layer.cycles and layer.cycles > HIGH_CYCLE_COUNT_THRESHOLD:
                    cycles_text.stylize("bold red")
                elif layer.cycles and layer.cycles > MODERATE_CYCLE_COUNT_THRESHOLD:
                    cycles_text.stylize("bold yellow")

                accel_text = Text("Yes" if layer.is_accelerated else "No")
                if layer.is_accelerated:
                    accel_text.stylize("bold green")

                table.add_row(
                    layer_name_display,
                    layer.layer_name or "-",
                    cycles_text,
                    f"{layer.latency_ms:.4f}" if layer.latency_ms else "-",
                    f"{layer.energy_uj:.2f}" if layer.energy_uj else "-",
                    f"{layer.power_mw:.2f}" if layer.power_mw else "-",
                    f"{layer.macs:,}" if layer.macs else "-",
                    f"{layer.memory_kb:.2f}" if layer.memory_kb else "-",
                    accel_text
                )

            console.print(table)

        # Optimization Suggestions Section
        if self.optimization_suggestions:
            console.print(
                "\n=== OPTIMIZATION SUGGESTIONS ===", style="bold green"
            )

            table = Table(show_header=True, header_style="bold magenta")
            table.add_column("Category", style="cyan", width=15)
            table.add_column("Description", style="white", width=40)
            table.add_column("Est. Improvement", style="green", width=15)
            table.add_column("Complexity", style="yellow", width=10)

            for suggestion in self.optimization_suggestions:
                # Color code priority/complexity
                complexity_text = Text(suggestion.complexity or "-")
                if suggestion.complexity == "high":
                    complexity_text.stylize("bold red")
                elif suggestion.complexity == "medium":
                    complexity_text.stylize("bold yellow")
                else:
                    complexity_text.stylize("bold green")

                table.add_row(
                    suggestion.category.title(),
                    suggestion.description,
                    suggestion.estimated_improvement or "-",
                    complexity_text
                )

            console.print(table)

        # Optimization Opportunities Section
        if self.optimization_opportunities:
            console.print(
                "\n=== OPTIMIZATION OPPORTUNITIES ===", style="bold green"
            )
            opp = self.optimization_opportunities

            # Summary table
            summary_table = Table(show_header=True, header_style="bold magenta")
            summary_table.add_column("Metric", style="cyan", width=25)
            summary_table.add_column("Value", style="white", width=30)

            summary_table.add_row(
                "Total Parameter Memory",
                f"{opp.total_parameter_memory_kb:.2f} KB"
            )
            summary_table.add_row("Total MACs", f"{opp.total_macs:,}")

            console.print(summary_table)

            # Layer-wise memory optimization opportunities
            if opp.layerwise_opportunities:
                console.print(
                    "\n  Layerwise Memory Optimization Opportunities:",
                    style="bold blue"
                )

                mem_table = Table(
                    show_header=True, header_style="bold magenta"
                )
                mem_table.add_column("Layer", style="cyan", width=8)
                mem_table.add_column("Op Type", style="blue", width=15)
                mem_table.add_column(
                    "Param Mem (KB)", style="yellow", width=13, justify="right"
                )
                mem_table.add_column(
                    "MACs", style="green", width=10, justify="right"
                )
                mem_table.add_column("Kernel Info", style="white", width=12)
                mem_table.add_column("Suggestion", style="magenta", width=20)

                for layer_opp in opp.layerwise_opportunities:
                    # Color code based on memory usage
                    mem_text = Text(f"{layer_opp.parameter_memory_kb:.2f}")
                    if layer_opp.parameter_memory_kb > 100:
                        mem_text.stylize("bold red")
                    elif layer_opp.parameter_memory_kb > 10:
                        mem_text.stylize("bold yellow")

                    mem_table.add_row(
                        str(layer_opp.layer_index),
                        layer_opp.op_type,
                        mem_text,
                        f"{layer_opp.macs:,}"
                        if layer_opp.macs is not None else "-",
                        layer_opp.kernel_info or "-",
                        layer_opp.suggestion or "-"
                    )

                console.print(mem_table)

            # Layer-wise computational optimization opportunities
            if opp.macs_opportunities:
                console.print(
                    "\n  Layerwise MAC Optimization Opportunities:",
                    style="bold blue"
                )

                mac_table = Table(
                    show_header=True, header_style="bold magenta"
                )
                mac_table.add_column("Layer", style="cyan", width=8)
                mac_table.add_column("Op Type", style="blue", width=15)
                mac_table.add_column(
                    "Param Mem (KB)", style="yellow", width=13, justify="right"
                )
                mac_table.add_column(
                    "MACs", style="green", width=10, justify="right"
                )
                mac_table.add_column("Kernel Info", style="white", width=12)
                mac_table.add_column("Suggestion", style="magenta", width=20)

                for layer_opp in opp.macs_opportunities:
                    # Color code based on MAC count
                    mac_text = Text(
                        f"{layer_opp.macs:,}"
                        if layer_opp.macs is not None else "-"
                    )
                    if layer_opp.macs and layer_opp.macs > HIGH_CYCLE_COUNT_THRESHOLD:
                        mac_text.stylize("bold red")
                    elif (layer_opp.macs and 
                          layer_opp.macs > MODERATE_CYCLE_COUNT_THRESHOLD):
                        mac_text.stylize("bold yellow")

                    mac_table.add_row(
                        str(layer_opp.layer_index),
                        layer_opp.op_type,
                        f"{layer_opp.parameter_memory_kb:.2f}",
                        mac_text,
                        layer_opp.kernel_info or "-",
                        layer_opp.suggestion or "-"
                    )

                console.print(mac_table)

            if opp.notes:
                console.print(
                    f"\n  Optimization Notes: {opp.notes}", style="italic blue"
                )

        # Analysis Notes Section
        if self.analysis_notes:
            console.print("\n=== ANALYSIS NOTES ===", style="bold green")
            for note in self.analysis_notes:
                category_tag = f"[{note.category}] " if note.category else ""
                if note.category == "warning":
                    console.print(
                        f"  {category_tag}{note.message}", style="yellow"
                    )
                elif note.category == "error":
                    console.print(
                        f"  {category_tag}{note.message}", style="red"
                    )
                else:
                    console.print(
                        f"  {category_tag}{note.message}", style="white"
                    )

        # Error Notes Section
        if self.errors:
            console.print("\n=== ERRORS ===", style="bold red")
            for error in self.errors:
                error_code = f" (Code: {error.code})" if error.code else ""
                console.print(
                    f"  • {error.message}{error_code}", style="red"
                )
                if error.details:
                    console.print(
                        f"    Details: {error.details}", style="dim red"
                    )

        console.print("\n" + "=" * REPORT_HEADER_WIDTH, style="bold blue")

        if to_buffer:
            return buffer.getvalue()
        return None

    def save_as_json(self, filepath: str) -> bool:
        """
        Save the resource profiler report as a JSON file.
        
        Args:
            filepath: Path where the JSON file should be saved
            
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(self.model_dump(), f, indent=2)
            logger.info(f"Resource Profiler JSON report saved to {filepath}")
            return True
        except Exception:
            logger.info(f"Failed to save resource profiler JSON report to {filepath}: "\
                         "{e}")
            return False

    def save_as_text(self, filepath: str) -> bool:
        """
        Save the resource profiler report as a text file.
        
        Args:
            filepath: Path where the text file should be saved
            
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(self.visualize_resource_profile(to_buffer=True))
            logger.info(f"Resource Profiler text report saved to {filepath}")
            return True
        except Exception:
            logger.info(f"Failed to save resource profiler text report to {filepath}: "\
                         "{e}")
            return False
