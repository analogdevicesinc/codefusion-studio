"""
AI Model Details and Analysis Framework Schema.

Comprehensive data structures and visualization tools for AI model analysis.
This module provides structured representations of model characteristics,
performance metrics, and resource requirements to support hardware deployment
decisions and optimization workflows.

Data Structures:
- TensorLifecycle: Tracks tensor creation, usage, and destruction patterns
- LayerDetail: Comprehensive layer analysis including MACs, memory, and tensors
- ModelDetails: Complete model analysis with validation and visualization

Usage Examples:
    >>> # Display model summary
    >>> model_details.show('summary')
    
    >>> # Export detailed analysis
    >>> model_details.save_to_json('analysis.json')

Copyright (c) 2025 Analog Devices, Inc. All Rights Reserved.
Released under the terms of the "LICENSE.md" file in the root directory.
"""

import json
from pathlib import Path
from typing import Any, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Optional dependency for enhanced table formatting
try:
    from rich.console import Console
    from rich.table import Table
    from rich.text import Text
    HAS_RICH = True
except ImportError:
    HAS_RICH = False


class TensorLifecycle(BaseModel):
    """
    Tracks tensor lifecycle during model execution for memory optimization.
    
    Represents the creation, active usage, and destruction of tensors at each
    execution step. This information is crucial for understanding peak memory
    requirements and identifying memory optimization opportunities.
    
    Attributes:
        new: Number of tensors created at this execution step
        live: Total number of active tensors requiring memory allocation
        terminated: Number of tensors deallocated and freed from memory
    """
    
    model_config = ConfigDict(
        validate_assignment=True,  # Validate on attribute assignment
        extra='forbid',           # Reject unexpected fields
        str_strip_whitespace=True # Auto-trim string values
    )
    
    new: int = Field(
        ge=0, 
        description="Number of new tensors created at this execution step"
    )
    live: int = Field(
        ge=0, 
        description="Total number of active tensors requiring memory allocation"
    )
    terminated: int = Field(
        ge=0, 
        description="Number of tensors freed from memory at this step"
    )


class LayerDetail(BaseModel):
    """
    Comprehensive analysis of a single neural network layer.
    
    Contains detailed performance metrics, resource requirements, and structural
    information for one layer in the model. This granular analysis enables
    layer-specific optimization and hardware resource planning.
    
    Attributes:
        index: Sequential layer position in the model execution order
        name: Operation type identifier (e.g., 'CONV_2D', 'FULLY_CONNECTED')
        macs: Computational complexity in multiply-accumulate operations
        flash_kb: Non-volatile storage requirements for layer parameters
        kernel_tensors: Dimensional specifications for weight tensors
        ram_kb: Runtime memory requirements for layer outputs
        input_tensors: Indices of input tensors consumed by this layer
        output_tensors: Indices of output tensors produced by this layer
        lifecycle: Tensor memory management statistics for this execution step
    """
    
    model_config = ConfigDict(
        validate_assignment=True,
        extra='forbid',
        str_strip_whitespace=True
    )
    
    index: int = Field(
        ge=0, 
        description="Sequential layer position in model execution order"
    )
    name: str = Field(
        min_length=1, 
        description="Operation type identifier (e.g., 'CONV_2D', 'RELU')"
    )
    macs: int = Field(
        ge=0, 
        description="Computational complexity in multiply-accumulate operations"
    )
    flash_kb: float = Field(
        ge=0.0, 
        description="Non-volatile storage requirements for layer parameters (KB)"
    )
    kernel_tensors: list[list[int]] = Field(
        default_factory=list, 
        description="Dimensional specifications for weight and bias tensors"
    )
    ram_kb: float = Field(
        ge=0.0, 
        description="Runtime memory requirements for layer outputs (KB)"
    )
    input_tensors: list[int] = Field(
        default_factory=list, 
        description="Indices of input tensors consumed by this layer"
    )
    output_tensors: list[int] = Field(
        default_factory=list, 
        description="Indices of output tensors produced by this layer"
    )
    lifecycle: TensorLifecycle = Field(
        description="Tensor memory management statistics at this execution step"
    )


class ModelDetails(BaseModel):
    """
    Comprehensive analysis results for a complete neural network model.
    
    Aggregates detailed performance metrics, resource requirements, and 
    structural information for an entire model. Provides multiple visualization 
    formats and optimization recommendations to support hardware deployment 
    planning.
    
    This class serves as the primary interface for model analysis results,
    offering structured data access, validation, and presentation capabilities
    for production AI deployment workflows.
    """
    
    model_config = ConfigDict(
        validate_assignment=True,    # Validate field assignments
        extra='forbid',             # Reject unknown fields
        str_strip_whitespace=True,  # Auto-trim string values
        arbitrary_types_allowed=True # Allow complex nested structures
    )
    
    # === Model Identity and Source Information ===
    model_path: str = Field(
        min_length=1, 
        description="Filesystem path to the original model file"
    )
    model_name: str = Field(
        min_length=1, 
        description="Human-readable model identifier (extracted or derived)"
    )
    model_size_on_disk_kb: float = Field(
        ge=0.0, 
        description="Physical file size on storage device (KB)"
    )
    target_dtype: str = Field(
        min_length=1, 
        description="Primary data type used for model weights and activations"
    )
    framework: str = Field(
        default="TensorFlow Lite", 
        description="Machine learning framework used to create this model"
    )
    
    # === Memory and Storage Requirements ===
    model_peak_ram_kb: float = Field(
        ge=0.0, 
        description="Maximum runtime memory usage during inference (KB)"
    )
    model_total_param_memory_b: float = Field(
        ge=0.0, 
        description="Total parameter storage requirements (bytes, precise)"
    )
    
    # === Performance and Computational Characteristics ===
    total_macs: int = Field(
        ge=0, 
        description="Total multiply-accumulate operations for one inference pass"
    )
    layer_count: int = Field(
        ge=0, 
        description="Number of computational layers in the model"
    )
    layer_details: list[LayerDetail] = Field(
        description="Detailed analysis for each layer in execution order"
    )
    execution_schedule: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Memory usage timeline during model execution"
    )
    
    # === Analysis Metadata and Error Reporting ===
    errors: str = Field(
        default="", 
        description="Any parsing errors or analysis warnings encountered"
    )

    @field_validator('layer_details')
    @classmethod
    def validate_layer_details_consistency(
        cls, v: list[LayerDetail]
    ) -> list[LayerDetail]:
        """
        Validate layer details for structural consistency and completeness.
        
        Ensures that layer indices are sequential starting from 0 and that
        no duplicate indices exist. This validation prevents analysis errors
        and ensures predictable layer ordering for visualization and 
        optimization.
        
        Args:
            v: List of layer detail objects to validate
            
        Returns:
            Validated list of layer details
            
        Raises:
            ValueError: If layer indices are duplicated or non-sequential
        """
        if not v:
            return v
        
        # Verify unique layer indices
        indices = [layer.index for layer in v]
        if len(indices) != len(set(indices)):
            duplicates = [idx for idx in set(indices) if indices.count(idx) > 1]
            raise ValueError(f"Duplicate layer indices detected: {duplicates}")
        
        # Verify sequential indexing starting from 0
        expected_indices = list(range(len(v)))
        actual_indices = sorted(indices)
        if actual_indices != expected_indices:
            raise ValueError(
                f"Layer indices must be sequential starting from 0. "
                f"Expected: {expected_indices}, Found: {actual_indices}"
            )
        
        return v

    def model_post_init(self, context: Any, /) -> None:
        """
        Perform comprehensive validation after model initialization.
        
        Validates cross-field consistency that cannot be checked during
        individual field validation. This includes ensuring that layer_count
        matches the actual number of layer details provided and performing
        comprehensive data integrity validation.
        
        Args:
            context: Pydantic validation context (unused)
            
        Raises:
            ValueError: If cross-field validation or data integrity checks fail
        """
        if len(self.layer_details) != self.layer_count:
            raise ValueError(
                f"Layer count inconsistency detected: "
                f"layer_count={self.layer_count}, "
                f"actual layer_details={len(self.layer_details)}"
            )
        
        # Perform comprehensive data integrity validation
        integrity_issues = self.validate_analysis_integrity()
        if integrity_issues:
            issues_summary = '; '.join(integrity_issues)
            raise ValueError(
                f"Model analysis integrity validation failed: {issues_summary}"
            )

    # Display configuration constants
    _DEFAULT_MAX_LAYERS_DISPLAY: int = 15
    _DEFAULT_MAX_HOTSPOTS: int = 5
    _MAX_OPERATION_NAME_LENGTH: int = 17
    _MAX_TEXT_TRUNCATION_LENGTH: int = 25
    
    # Validation configuration constants
    _MIN_TOLERANCE_KB: float = 5.0  # Minimum tolerance for flash memory validation
    _TOLERANCE_PERCENTAGE: float = 0.01  # 1% tolerance for flash memory validation
    _BYTES_TO_KB_DIVISOR: int = 1024
    
    # Display thresholds for layer highlighting
    _FLASH_THRESHOLD_HIGH: float = 100.0     # > 100KB flash
    _FLASH_THRESHOLD_MEDIUM: float = 10.0    # > 10KB flash
    _RAM_THRESHOLD_HIGH: float = 50.0        # > 50KB RAM
    _RAM_THRESHOLD_MEDIUM: float = 10.0      # > 10KB RAM
    _MACS_THRESHOLD_HIGH: int = 1000000      # > 1M MACs
    _MACS_THRESHOLD_MEDIUM: int = 100000     # > 100K MACs
    
    # Table formatting constants
    _TABLE_OPERATION_COLUMN_WIDTH: int = 18
    _TABLE_TENSORS_COLUMN_WIDTH: int = 10
    _CONSOLE_LAYER_COLUMN_WIDTH: int = 6
    _CONSOLE_OPERATION_COLUMN_WIDTH: int = 20
    _CONSOLE_MAC_COLUMN_WIDTH: int = 8
    _CONSOLE_FLASH_COLUMN_WIDTH: int = 8
    _CONSOLE_RAM_COLUMN_WIDTH: int = 8
    _CONSOLE_DIVIDER_LENGTH: int = 60
    _SUMMARY_DIVIDER_LENGTH: int = 30
    _CONSOLE_OPERATION_TRUNCATE_LENGTH: int = 19

    def show(
        self, 
        view: str = "table", 
        max_layers: int = _DEFAULT_MAX_LAYERS_DISPLAY, 
        include_tensors: bool = False
    ) -> None:
        """
        Display model analysis in multiple presentation formats.
        
        Provides flexible visualization options suitable for different use cases:
        - 'summary': Quick overview with key metrics
        - 'table': Layer-by-layer breakdown in tabular format
        - 'json': Complete data export for programmatic processing
        - 'analysis': Detailed analysis with optimization recommendations
        
        Args:
            view: Presentation format selection
            max_layers: Maximum layers to display in table view (prevents 
                overflow)
            include_tensors: Include detailed tensor information in analysis view
            
        Raises:
            ValueError: If specified view format is not supported
        """
        view = view.lower().strip()
        
        if view == "table":
            self._show_table_view(max_layers)
        elif view == "summary":
            self._show_summary_view()
        elif view == "json":
            self._show_json_export()
        elif view == "analysis":
            self._show_detailed_analysis(include_tensors)
        else:
            available_views = ["table", "summary", "json", "analysis"]
            raise ValueError(
                f"Unsupported view format '{view}'. "
                f"Available options: {available_views}"
            )

    def _show_summary_view(self) -> None:
        """
        Display concise model overview with essential metrics.
        
        Provides a quick assessment of model characteristics suitable for
        initial evaluation and comparison between different models.
        """
        print(f"\n{self.model_name}")
        print("=" * len(self.model_name))
        print(f"Framework: {self.framework}")
        size_mb = self.model_size_on_disk_kb / self._BYTES_TO_KB_DIVISOR
        print(f"File size: {size_mb:.1f} MB")
        print(f"Peak RAM usage: {self.model_peak_ram_kb:.0f} KB")
        print(f"Computational load: {self.total_macs/1e6:.1f}M MACs")
        print(f"Architecture: {self.layer_count} layers")
        print(f"Data precision: {self.target_dtype}")
        
        if self.errors:
            print(f"Analysis warnings: {self.errors}")

    def _show_table_view(self, max_layers: int | None = None) -> None:
        """
        Display layer-by-layer analysis in structured table format.
        
        Provides detailed breakdown of each layer's resource requirements
        and computational characteristics. Useful for identifying optimization
        targets and understanding model architecture.
        
        Args:
            max_layers: Maximum number of layers to display (prevents output 
                overflow). If None, 0, or negative, defaults to 
                _DEFAULT_MAX_LAYERS_DISPLAY.
        """
        if max_layers is None or max_layers <= 0:
            max_layers = self._DEFAULT_MAX_LAYERS_DISPLAY
        
        # Display model header with key metrics
        print(f"\nModel Analysis: {self.model_name} ({self.layer_count} layers)")
        print(
            f"Size: {self.model_size_on_disk_kb/self._BYTES_TO_KB_DIVISOR:.1f} MB | "
            f"Computation: {self.total_macs/1e6:.1f}M MACs | "
            f"Peak RAM: {self.model_peak_ram_kb:.0f} KB"
        )
        
        # Choose table format based on available libraries
        if HAS_RICH:
            self._render_rich_table(max_layers)
        else:
            self._render_simple_table(max_layers)
        
        # Indicate if layers were truncated
        if len(self.layer_details) > max_layers:
            remaining = len(self.layer_details) - max_layers
            print(f"... {remaining} additional layers not shown")
        
        # Add resource breakdown summary
        self._show_resource_breakdown_summary()

    def _render_rich_table(self, max_layers: int) -> None:
        """
        Render professional table using Rich library.
        
        Creates a well-formatted table with proper alignment, styling,
        and color-coding for enhanced readability in reports and documentation.
        
        Args:
            max_layers: Number of layers to include in the table
        """
        console = Console()
        
        # Create Rich table with styling
        table = Table(
            title=(
                f"Layer Analysis ({max_layers} of {len(self.layer_details)} "
                f"layers)"
            ),
            show_header=True,
            header_style="bold magenta"
        )
        
        table.add_column("Layer", style="cyan", width=6, justify="right")
        table.add_column(
            "Operation", style="blue", width=self._TABLE_OPERATION_COLUMN_WIDTH
        )
        table.add_column("MACs", style="green", width=8, justify="right")
        table.add_column("Flash", style="yellow", width=8, justify="right")
        table.add_column("RAM", style="red", width=8, justify="right")
        table.add_column(
            "Tensors", style="white", 
            width=self._TABLE_TENSORS_COLUMN_WIDTH, justify="center"
        )
        
        for layer in self.layer_details[:max_layers]:
            # Format computational complexity for readability
            mac_display = self._format_large_numbers(layer.macs, '')
            
            # Truncate operation names to prevent table overflow
            operation_name = self._truncate_text(
                layer.name, self._MAX_OPERATION_NAME_LENGTH
            )
            
            # Summarize tensor connectivity
            tensor_summary = (
                f"I:{len(layer.input_tensors)} O:{len(layer.output_tensors)}"
            )
            
            # Add color coding based on resource usage
            flash_text = Text(f"{layer.flash_kb:.1f}K")
            if layer.flash_kb > self._FLASH_THRESHOLD_HIGH:
                flash_text.stylize("bold red")
            elif layer.flash_kb > self._FLASH_THRESHOLD_MEDIUM:
                flash_text.stylize("bold yellow")
            
            ram_text = Text(f"{layer.ram_kb:.1f}K")
            if layer.ram_kb > self._RAM_THRESHOLD_HIGH:
                ram_text.stylize("bold red")
            elif layer.ram_kb > self._RAM_THRESHOLD_MEDIUM:
                ram_text.stylize("bold yellow")
            
            mac_text = Text(mac_display)
            if layer.macs > self._MACS_THRESHOLD_HIGH:  # > 1M MACs
                mac_text.stylize("bold red")
            elif layer.macs > self._MACS_THRESHOLD_MEDIUM:  # > 100K MACs
                mac_text.stylize("bold yellow")
            
            table.add_row(
                str(layer.index),
                operation_name,
                mac_text,
                flash_text,
                ram_text,
                tensor_summary
            )
        
        console.print(table)

    def _render_simple_table(self, max_layers: int) -> None:
        """
        Render basic table without external dependencies.
        
        Provides fallback table formatting when Rich library is not
        available, ensuring consistent functionality across environments.
        
        Args:
            max_layers: Number of layers to include in the table
        """
        # Define column layout
        header_format = (
            f"{'Layer':<{self._CONSOLE_LAYER_COLUMN_WIDTH}} "
            f"{'Operation':<{self._CONSOLE_OPERATION_COLUMN_WIDTH}} "
            f"{'MACs':<{self._CONSOLE_MAC_COLUMN_WIDTH}} "
            f"{'Flash':<{self._CONSOLE_FLASH_COLUMN_WIDTH}} "
            f"{'RAM':<{self._CONSOLE_RAM_COLUMN_WIDTH}}"
        )
        print(f"\n{header_format}")
        print("-" * self._CONSOLE_DIVIDER_LENGTH)
        
        for layer in self.layer_details[:max_layers]:
            mac_display = self._format_large_numbers(layer.macs, '')
            operation_name = self._truncate_text(
                layer.name, self._CONSOLE_OPERATION_TRUNCATE_LENGTH
            )
            
            print(
                f"{layer.index:<{self._CONSOLE_LAYER_COLUMN_WIDTH}} "
                f"{operation_name:<{self._CONSOLE_OPERATION_COLUMN_WIDTH}} "
                f"{mac_display:<{self._CONSOLE_MAC_COLUMN_WIDTH}} "
                f"{layer.flash_kb:<7.1f}K {layer.ram_kb:<7.1f}K"
            )

    def _show_detailed_analysis(self, include_tensors: bool = False) -> None:
        """
        Display comprehensive analysis with optimization recommendations.
        
        Provides in-depth analysis including resource hotspots, optimization
        opportunities, and detailed architecture insights. Suitable for
        detailed optimization planning and hardware deployment decisions.
        
        Args:
            include_tensors: Whether to include detailed tensor shape information
        """
        # Start with summary overview
        self._show_summary_view()
        
        print("\nDetailed Resource Analysis")
        print("-" * self._SUMMARY_DIVIDER_LENGTH)
        
        # Analyze resource distribution patterns
        memory_sorted_layers = sorted(
            self.layer_details, 
            key=lambda x: x.flash_kb, 
            reverse=True
        )
        compute_sorted_layers = sorted(
            self.layer_details, 
            key=lambda x: x.macs, 
            reverse=True
        )
        
        self._analyze_memory_hotspots(memory_sorted_layers)
        self._analyze_computational_hotspots(compute_sorted_layers)
        
        # Include tensor details if requested
        if include_tensors:
            self._show_tensor_architecture_details()

    def _analyze_memory_hotspots(
        self, sorted_layers: list[LayerDetail]
    ) -> None:
        """
        Identify and report layers with highest memory consumption.
        
        Highlights layers that consume the most flash storage, helping
        identify primary targets for memory optimization efforts.
        
        Args:
            sorted_layers: Layers sorted by memory usage (descending)
        """
        print("\nMemory Usage Hotspots:")
        
        for i, layer in enumerate(sorted_layers[:self._DEFAULT_MAX_HOTSPOTS]):
            if self.model_total_param_memory_b > 0:
                model_total_kb = (
                    self.model_total_param_memory_b / self._BYTES_TO_KB_DIVISOR
                )
                memory_percentage = (layer.flash_kb / model_total_kb) * 100
            else:
                memory_percentage = 0.0
            
            layer_name = self._truncate_text(
                layer.name, self._MAX_TEXT_TRUNCATION_LENGTH
            )
            print(
                f"  {i+1}. Layer {layer.index:2d} ({layer_name}): "
                f"{layer.flash_kb:6.1f} KB ({memory_percentage:4.1f}% of total)"
            )

    def _analyze_computational_hotspots(
        self, sorted_layers: list[LayerDetail]
    ) -> None:
        """
        Identify and report layers with highest computational requirements.
        
        Highlights layers that perform the most operations, helping identify
        primary targets for computational optimization efforts.
        
        Args:
            sorted_layers: Layers sorted by MAC count (descending)
        """
        print("\nComputational Complexity Hotspots:")
        
        for i, layer in enumerate(sorted_layers[:self._DEFAULT_MAX_HOTSPOTS]):
            if self.total_macs > 0:
                compute_percentage = (layer.macs / self.total_macs) * 100
            else:
                compute_percentage = 0.0
            
            mac_display = self._format_large_numbers(layer.macs, '')
            layer_name = self._truncate_text(layer.name, 25)
            print(
                f"  {i+1}. Layer {layer.index:2d} ({layer_name}): "
                f"{mac_display:>8} ({compute_percentage:4.1f}% of total)"
            )

    def _show_json_export(self) -> None:
        """
        Export complete model analysis as structured JSON data.
        
        Provides machine-readable format suitable for programmatic processing,
        API responses, and integration with other analysis tools.
        """
        print(f"\nJSON Export: {self.model_name}")
        print("-" * 40)
        
        try:
            # Use Pydantic v2 model serialization
            model_data = self.model_dump()
            formatted_json = json.dumps(model_data, indent=2, default=str)
            print(formatted_json)
        except Exception as e:
            print(f"Error during JSON serialization: {e}")
            print(
                "This may indicate data validation issues or unsupported "
                "data types."
            )

    def _show_resource_breakdown_summary(self) -> None:
        """
        Display memory usage breakdown by operation type using Rich if available.
        
        Groups layers by operation type to show resource distribution
        patterns across different types of neural network operations.
        """
        if not self.layer_details:
            return
        
        # Aggregate statistics by operation type
        operation_stats: dict[str, dict[str, float]] = {}
        
        for layer in self.layer_details:
            # Extract base operation type (remove version suffixes)
            base_operation = self._extract_base_operation_type(layer.name)
            
            if base_operation not in operation_stats:
                operation_stats[base_operation] = {
                    'flash_kb': 0.0, 
                    'layer_count': 0,
                    'total_macs': 0
                }
            
            operation_stats[base_operation]['flash_kb'] += layer.flash_kb
            operation_stats[base_operation]['layer_count'] += 1
            operation_stats[base_operation]['total_macs'] += layer.macs
        
        total_flash = sum(
            stats['flash_kb'] for stats in operation_stats.values()
        )
        
        if HAS_RICH:
            self._render_rich_breakdown_table(operation_stats, total_flash)
        else:
            self._render_simple_breakdown_table(operation_stats, total_flash)

    def _render_rich_breakdown_table(
        self, 
        operation_stats: dict[str, dict[str, float]], 
        total_flash: float
    ) -> None:
        """Render resource breakdown using Rich table."""
        console = Console()
        
        table = Table(
            title="Resource Distribution by Operation Type",
            show_header=True,
            header_style="bold magenta"
        )
        
        table.add_column("Operation", style="cyan", width=15)
        table.add_column("Memory", style="yellow", width=10, justify="right")
        table.add_column("% Total", style="green", width=8, justify="right")
        table.add_column("MACs", style="blue", width=10, justify="right")
        table.add_column("Layers", style="white", width=8, justify="right")
        
        # Sort by memory usage for prioritized display
        sorted_operations = sorted(
            operation_stats.items(), 
            key=lambda x: x[1]['flash_kb'], 
            reverse=True
        )
        
        for op_type, stats in sorted_operations:
            memory_percentage = (
                (stats['flash_kb'] / total_flash) * 100 
                if total_flash > 0 else 0.0
            )
            layer_count = int(stats['layer_count'])
            mac_display = self._format_large_numbers(stats['total_macs'], '')
            
            # Color code based on resource usage
            memory_text = Text(f"{stats['flash_kb']:.1f} KB")
            if memory_percentage > 30:
                memory_text.stylize("bold red")
            elif memory_percentage > 10:
                memory_text.stylize("bold yellow")
            
            percentage_text = Text(f"{memory_percentage:.1f}%")
            if memory_percentage > 30:
                percentage_text.stylize("bold red")
            elif memory_percentage > 10:
                percentage_text.stylize("bold yellow")
            
            table.add_row(
                op_type,
                memory_text,
                percentage_text,
                mac_display,
                str(layer_count)
            )
        
        console.print(table)

    def _render_simple_breakdown_table(
        self, 
        operation_stats: dict[str, dict[str, float]], 
        total_flash: float
    ) -> None:
        """Render simple resource breakdown without Rich."""
        print("\nResource Distribution by Operation Type:")
        
        # Sort by memory usage for prioritized display
        sorted_operations = sorted(
            operation_stats.items(), 
            key=lambda x: x[1]['flash_kb'], 
            reverse=True
        )
        
        for op_type, stats in sorted_operations:
            memory_percentage = (
                (stats['flash_kb'] / total_flash) * 100 
                if total_flash > 0 else 0.0
            )
            layer_count = int(stats['layer_count'])
            mac_display = self._format_large_numbers(stats['total_macs'], '')
            
            print(
                f"  {op_type:<15}: {stats['flash_kb']:>7.1f} KB "
                f"({memory_percentage:>4.1f}%) | {mac_display:>8} | "
                f"{layer_count:>2} layers"
            )

    def _show_tensor_architecture_details(self) -> None:
        """
        Display detailed tensor connectivity and shape information.
        
        Shows tensor flow patterns and dimensional characteristics for
        the first several layers to provide architectural insights.
        """
        print("\nTensor Architecture Details (first 5 layers):")
        
        for layer in self.layer_details[:5]:
            print(f"\nLayer {layer.index}: {layer.name}")
            print(f"  Input tensors:  {layer.input_tensors}")
            print(f"  Output tensors: {layer.output_tensors}")
            
            if layer.kernel_tensors:
                # Format kernel tensor shapes for readability
                shape_descriptions = []
                for tensor_shape in layer.kernel_tensors[:3]:  # Show first 3
                    shape_str = f"[{','.join(map(str, tensor_shape))}]"
                    shape_descriptions.append(shape_str)
                
                display_shapes = ", ".join(shape_descriptions)
                
                if len(layer.kernel_tensors) > 3:
                    additional_count = len(layer.kernel_tensors) - 3
                    display_shapes += f" + {additional_count} more"
                
                print(f"  Parameter shapes: {display_shapes}")

    def get_performance_summary(self) -> dict[str, Any]:
        """
        Extract key performance metrics as structured data.
        
        Provides standardized performance indicators suitable for automated
        decision-making, comparison analysis, and reporting workflows.
        
        Returns:
            Dictionary containing essential performance metrics
        """
        # Calculate derived metrics
        largest_layer_memory = 0.0
        if self.layer_details:
            largest_layer_memory = max(
                layer.flash_kb for layer in self.layer_details
            )
        
        return {
            'model_identity': {
                'name': self.model_name,
                'framework': self.framework,
                'data_type': self.target_dtype
            },
            'file_characteristics': {
                'size_mb': round(self.model_size_on_disk_kb / 1024, 2),
            },
            'memory_requirements': {
                'flash_kb': round(self.model_total_param_memory_b/1024, 1),
                'model_peak_ram_kb': round(self.model_peak_ram_kb, 1),
                'largest_layer_kb': round(largest_layer_memory, 1),
            },
            'computational_profile': {
                'total_macs': self.total_macs,
                'macs_millions': round(self.total_macs / 1e6, 2),
            },
            'architecture_summary': {
                'total_layers': self.layer_count,
                'convolution_layers': self._count_layers_by_type('CONV'),
                'dense_layers': self._count_layers_by_type('FULLY_CONNECTED')
            }
        }

    def validate_analysis_integrity(self) -> list[str]:
        """
        Comprehensive validation of analysis data integrity.
        
        Performs detailed consistency checks across all model data to identify
        potential parsing errors, data corruption, or analysis inconsistencies.
        
        Returns:
            List of validation issues (empty list indicates no problems)
        """
        validation_issues = []
        
        # Basic structural validation
        if len(self.layer_details) != self.layer_count:
            validation_issues.append(
                f"Layer count mismatch: declared={self.layer_count}, "
                f"actual={len(self.layer_details)}"
            )
        
        # Numeric range validation
        if self.total_macs < 0:
            validation_issues.append("Invalid negative MAC count detected")
        
        if self.model_total_param_memory_b < 0:
            validation_issues.append("Invalid negative parameter memory value")
        
        if self.model_peak_ram_kb < 0:
            validation_issues.append("Invalid negative RAM usage value")
        
        # Layer sequence validation
        for i, layer in enumerate(self.layer_details):
            if layer.index != i:
                validation_issues.append(
                    f"Layer sequence error at position {i}: "
                    f"expected index {i}, found {layer.index}"
                )
            
            # Individual layer validation
            if layer.macs < 0:
                validation_issues.append(f"Layer {i}: negative MAC count")
            
            if layer.flash_kb < 0:
                validation_issues.append(f"Layer {i}: negative flash usage")
            
            if layer.ram_kb < 0:
                validation_issues.append(f"Layer {i}: negative RAM usage")
        
        # Cross-validation checks
        calculated_total_flash = sum(
            layer.flash_kb for layer in self.layer_details
        )
        flash_discrepancy = abs(
            calculated_total_flash - (self.model_total_param_memory_b/1024)
        )
        
        # Allow tolerance for floating-point precision and shared parameters
        tolerance_kb = max(
            self._MIN_TOLERANCE_KB, 
            self._TOLERANCE_PERCENTAGE * calculated_total_flash
        )
        if flash_discrepancy > tolerance_kb:
            total_reported = self.model_total_param_memory_b / self._BYTES_TO_KB_DIVISOR
            validation_issues.append(
                f"Flash memory calculation inconsistency exceeds tolerance "
                f"({tolerance_kb:.1f}KB): "
                f"sum of layers={calculated_total_flash:.1f}KB, "
                f"reported total={total_reported:.1f}KB"
            )
        
        return validation_issues

    def export_to_dict(self) -> dict[str, Any]:
        """
        Export model details as a dictionary for serialization.
        
        Returns:
            Complete model data as a dictionary structure
        """
        return self.model_dump()

    @classmethod
    def import_from_dict(cls, data: dict[str, Any]) -> 'ModelDetails':
        """
        Create ModelDetails instance from dictionary data.
        
        Args:
            data: Dictionary containing model details data
            
        Returns:
            Validated ModelDetails instance
            
        Raises:
            ValidationError: If data format is invalid
        """
        return cls.model_validate(data)

    def save_analysis(self, file_path: Union[str, Path]) -> None:
        """
        Save complete analysis to JSON file for persistence.
        
        Args:
            file_path: Destination file path for saved analysis
            
        Raises:
            IOError: If file cannot be written
        """
        file_path = Path(file_path)
        try:
            with file_path.open('w', encoding='utf-8') as f:
                json.dump(self.export_to_dict(), f, indent=2, default=str)
        except Exception as e:
            raise OSError(
                f"Failed to save analysis to {file_path}: {e}"
            ) from e

    @classmethod
    def load_analysis(cls, file_path: Union[str, Path]) -> 'ModelDetails':
        """
        Load previously saved analysis from JSON file.
        
        Args:
            file_path: Path to saved analysis file
            
        Returns:
            ModelDetails instance with loaded data
            
        Raises:
            IOError: If file cannot be read or is invalid
        """
        file_path = Path(file_path)
        try:
            with file_path.open('r', encoding='utf-8') as f:
                data = json.load(f)
            return cls.import_from_dict(data)
        except Exception as e:
            raise OSError(
                f"Failed to load analysis from {file_path}: {e}"
            ) from e

    # === Utility Methods for Data Processing ===

    @staticmethod
    def _format_large_numbers(value: int, unit: str = "") -> str:
        """
        Format large numbers with appropriate scale suffixes.
        
        Args:
            value: Numeric value to format
            unit: Optional unit suffix (e.g., 'MACs', 'ops')
            
        Returns:
            Formatted string with scale indicator
        """
        if value >= 1e9:
            return f"{value/1e9:.1f}G{unit}"
        elif value >= 1e6:
            return f"{value/1e6:.1f}M{unit}"
        elif value >= 1e3:
            return f"{value/1e3:.0f}K{unit}"
        else:
            return f"{value}{unit}" if value > 0 else f"0{unit}"

    @staticmethod
    def _truncate_text(text: str, max_length: int) -> str:
        """
        Truncate text with ellipsis for display formatting.
        
        Args:
            text: Text to potentially truncate
            max_length: Maximum allowed length
            
        Returns:
            Truncated text with ellipsis if needed
        """
        if len(text) <= max_length:
            return text
        return text[:max_length-2] + ".."

    @staticmethod
    def _extract_base_operation_type(operation_name: str) -> str:
        """
        Extract base operation type from detailed operation name.
        
        Args:
            operation_name: Full operation name (e.g., 'CONV_2D_V2')
            
        Returns:
            Base operation type (e.g., 'CONV')
        """
        # Remove version suffixes and extract primary operation
        base_operation = (
            operation_name.split('_')[0] 
            if '_' in operation_name else operation_name
        )
        return base_operation.upper()

    def _count_layers_by_type(self, operation_type: str) -> int:
        """Count layers of a specific operation type."""
        return sum(
            1 for layer in self.layer_details 
            if operation_type.upper() in layer.name.upper()
        )

    def get_stats(self) -> dict[str, Any]:
        """
        Get basic model statistics as a dictionary.
        
        Returns:
            Dictionary containing key model statistics including complexity 
            classification
        """
        layer_details = getattr(self, 'layer_details', [])
        
        return {
            'total_layers': len(layer_details),
            'total_macs': getattr(self, 'total_macs', 0),
            'total_memory_kb': (
                getattr(self, 'model_total_param_memory_b', 0) 
                / self._BYTES_TO_KB_DIVISOR
            ),
            'model_peak_ram_kb': getattr(self, 'model_peak_ram_kb', 0),
            'target_dtype': getattr(self, 'target_dtype', 'Unknown'),
            'model_size_on_disk_kb': getattr(self, 'model_size_on_disk_kb', 0),
            'layer_types': list(set(
                getattr(layer, 'name', 'Unknown') for layer in layer_details
            )),
        }


def display_model_analysis(
    model_details: Union[ModelDetails, Any], 
    format_type: str = "summary", 
    max_layers: int = 20,
    include_tensors: bool = False
) -> None:
    """
    Convenience function for displaying model analysis results.
    
    Provides a simple interface for visualizing ModelDetails objects
    without requiring direct method calls on the object.
    
    Args:
        model_details: ModelDetails instance or compatible analysis object
        format_type: Display format ('summary', 'table', 'analysis', 'json')
        max_layers: Maximum layers to show in tabular displays
        include_tensors: Include detailed tensor information in analysis
        
    Raises:
        TypeError: If model_details is not a ModelDetails instance
        
    Example:
        >>> model_analysis = parser.parse_model("model.tflite")
        >>> display_model_analysis(model_analysis, "table")
    """
    if isinstance(model_details, ModelDetails):
        model_details.show(format_type, max_layers, include_tensors)
    else:
        raise TypeError(
            f"Expected ModelDetails instance, received {type(model_details)}. "
            f"Ensure you're passing a valid model analysis result."
        )


def compare_models(*model_details: ModelDetails) -> None:
    """
    Compare multiple model analyses side-by-side using Rich if available.
    
    Displays key metrics for multiple models in a comparative format
    to facilitate model selection and optimization decisions.
    
    Args:
        *model_details: Variable number of ModelDetails instances to compare
        
    Example:
        >>> model1 = parser.parse_model("model_v1.tflite")
        >>> model2 = parser.parse_model("model_v2.tflite")
        >>> compare_models(model1, model2)
    """
    if not model_details:
        print("No models provided for comparison")
        return
    
    print("\nModel Comparison Summary")
    print("=" * 50)
    
    metrics = [
        ("File Size (MB)", [
            f"{model.model_size_on_disk_kb/1024:.1f}" for model in model_details
        ]),
        ("Flash (KB)", [
            f"{model.model_total_param_memory_b/1024:.0f}" for model in model_details
        ]),
        ("Peak RAM (KB)", [
            f"{model.model_peak_ram_kb:.0f}" for model in model_details
        ]),
        ("MACs (M)", [
            f"{model.total_macs/1e6:.1f}" for model in model_details
        ]),
        ("Layers", [str(model.layer_count) for model in model_details]),
        ("Data Type", [model.target_dtype for model in model_details])
    ]
    
    if HAS_RICH:
        console = Console()
        
        table = Table(
            title="Model Comparison",
            show_header=True,
            header_style="bold magenta"
        )
        
        table.add_column("Metric", style="cyan", width=15)
        for model in model_details:
            table.add_column(
                model.model_name, 
                style="white", 
                width=12, 
                justify="right"
            )
        
        for metric, values in metrics:
            table.add_row(metric, *values)
        
        console.print(table)
    else:
        # Simple format without Rich
        for metric, values in metrics:
            formatted_values = [f'{v:>10}' for v in values]
            print(f"{metric:<15}: {' | '.join(formatted_values)}")           

