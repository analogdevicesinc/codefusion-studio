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
Compatibility Analysis Data Structures.

Comprehensive schema definitions for AI model hardware compatibility assessment.
This module provides structured data models for representing compatibility issues,
optimization opportunities, and deployment recommendations across different
hardware platforms and resource constraints.

Schema Categories:
- Issue Detection: Structured representation of compatibility problems
- Optimization Opportunities: performance improvement suggestions
- Compatibility Reporting: Comprehensive compatibility analysis results with
  visualization

Data Validation:
All schemas include Pydantic validation to ensure data integrity and provide
clear error messages for invalid compatibility analysis results.
"""
import json
import logging
import re
from enum import Enum
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field

# Optional dependency for enhanced table formatting
try:
    from rich.console import Console
    HAS_RICH = True
except ImportError:
    HAS_RICH = False

# Constants for report formatting and display
REPORT_SEPARATOR_LENGTH = 60
SUMMARY_SEPARATOR_LENGTH = 40
MAX_RECOMMENDATIONS_DISPLAYED = 3
MAX_OPTIMIZATION_OPPORTUNITIES_DISPLAYED = 3
MAX_OPERATOR_REPLACEMENTS_DISPLAYED = 3
DECIMAL_PLACES_SAVINGS = 1

# Table column widths for consistent formatting
TABLE_COLUMN_WIDTH_CATEGORY = 12
TABLE_COLUMN_WIDTH_LOCATION = 10
TABLE_COLUMN_WIDTH_DESCRIPTION = 30
TABLE_COLUMN_WIDTH_SEVERITY = 10

# Default values for schema fields
DEFAULT_SUGGESTED_ALTERNATIVE = "None"
DEFAULT_PRIORITY_LEVEL = "medium"

# Report status constants
STATUS_FULLY_COMPATIBLE = "FULLY COMPATIBLE"
STATUS_ISSUES_FOUND_PREFIX = "Status:"
LOCATION_MODEL_WIDE = "Model-wide"

# Rich text formatting constants
RICH_CRITICAL_COLOR = "[red]"
RICH_WARNING_COLOR = "[yellow]" 
RICH_SUCCESS_COLOR = "[green]"
RICH_INFO_COLOR = "[blue]"
RICH_HEADER_COLOR = "[bold magenta]"
RICH_END_TAG = "[/]"

logger = logging.getLogger(__name__)


class SeverityLevel(str, Enum):
    """
    Severity levels for compatibility issues.
    
    Defines the criticality of compatibility problems found during analysis.
    Used to prioritize fixes and determine deployment readiness.
    
    Values:
        critical: Issues that prevent deployment or cause system failure.
                 Must be resolved before deployment to target hardware.
        warning: Issues that may impact performance or require attention
                but do not prevent deployment. Can be addressed post-deployment.
    """
    critical = "critical"
    warning = "warning"

class OperatorIssue(BaseModel):
    """
    Represents an unsupported or problematic operator in the model.

    Identifies neural network operations that are not supported by the target
    hardware platform or may cause performance bottlenecks during deployment.

    Attributes:
        type: Classification of the operator issue (e.g., 'unsupported',
            'inefficient')
        operator: Name of the problematic operation (e.g., 'CUSTOM_OP',
            'COMPLEX_ACTIVATION')
        layer_index: Position of the layer containing this operator in the model
        suggested_alternative: Recommended replacement operator if available
    """
    
    type: str = Field(
        description="Issue classification (unsupported, inefficient, deprecated)"
    )
    operator: str = Field(
        description="Name of the problematic neural network operation"
    )
    layer_index: int = Field(
        ge=0, description="Zero-indexed position of the affected layer"
    )
    suggested_alternative: Optional[str] = Field(
        default=DEFAULT_SUGGESTED_ALTERNATIVE,
        description="Recommended replacement operator for hardware compatibility"
    )
    severity: SeverityLevel = Field(
        description="Severity level of the constraint violation, either 'critical' \
            or 'warning'"
    )

class MemoryRecommendation(BaseModel):
    """
    Specific recommendation for addressing memory constraint violations.

    Provides actionable guidance for reducing memory usage to meet hardware
    constraints, including techniques like quantization, pruning, or
    architectural changes.

    Attributes:
        method: Optimization technique name (e.g., 'INT8 Quantization',
            'Weight Pruning')
        reference: Optional documentation link or technical reference for
            implementation
    """
    
    method: str = Field(
        description="Memory optimization technique or approach"
    )
    reference: Optional[str] = Field(
        default=None,
        description="Technical documentation or implementation reference"
    )


class MemoryIssue(BaseModel):
    """
    Comprehensive memory constraint violation analysis.

    Identifies memory usage that exceeds hardware limitations and provides
    structured recommendations for achieving deployment compatibility.
    """
    
    type: str = Field(
        description="Memory constraint violation type"
    )
    memory_type: str = Field(
        description="Hardware memory system affected (flash/RAM/cache)"
    )
    detailed_info: str = Field(
        description="Technical details of the constraint violation"
    )
    severity: SeverityLevel = Field(
        description="Severity level of the constraint violation, either 'critical' \
            or 'warning'"
    )

    # Prioritized optimization recommendations
    primary_recommendation: MemoryRecommendation = Field(
        description="Primary optimization strategy"
    )
    secondary_recommendation: MemoryRecommendation = Field(
        description="Secondary optimization approach"
    )
    alternative_recommendation: MemoryRecommendation = Field(
        description="Alternative optimization technique"
    )
    
    # Direct list of optimization opportunities
    optimization_opportunities: list["OptimizationOpportunity"] = Field(
        default_factory=list,
        description="Specific layer optimization targets with detailed savings \
            estimates"
    )

class OptimizationOpportunity(BaseModel):
    """
    Identifies a specific optimization opportunity within a model layer.

    Represents potential memory or computational optimizations that can be
    applied to individual layers to improve hardware compatibility and
    performance.

    Attributes:
        layer_index: Position of the layer with optimization potential
        operation_type: Type of operation that can be optimized
        current_flash_kb: Current memory usage that could be reduced
        potential_savings_kb: Estimated memory savings from optimization
        optimization_method: Specific technique to achieve the optimization
        priority: Optimization priority (high, medium, low)
    """
    
    layer_index: int = Field(
        ge=0, description="Zero-indexed layer position in the model"
    )
    operation_type: str = Field(
        description="Operation type with optimization potential"
    )
    current_flash_kb: float = Field(
        ge=0, description="Current flash memory usage in kilobytes"
    )
    potential_savings_kb: float = Field(
        ge=0, description="Estimated memory savings from optimization"
    )
    optimization_method: str = Field(
        description="Specific optimization technique (e.g., 'quantization', 'pruning')"
    )
    priority: str = Field(
        default=DEFAULT_PRIORITY_LEVEL, description="Optimization priority level"
    )


class UnsupportedTypeIssue(BaseModel):
    """
    Data type compatibility issue within specific model layers.

    Identifies layers that use data types not supported by the target hardware
    platform, requiring quantization or type conversion for deployment.

    Attributes:
        layer_index: Position of the layer with unsupported data types
        operation_type: Operation using the incompatible data type
        data_type: Specific data type that requires conversion (e.g., 'FLOAT64',
            'COMPLEX128')
    """
    
    layer_index: int = Field(
        ge=0, description="Zero-indexed position of the affected layer"
    )
    operation_type: str = Field(
        description="Operation type using incompatible data representation"
    )
    data_type: str = Field(
        description="Unsupported data type requiring conversion"
    )
    severity: SeverityLevel = Field(
        description="Severity level of the constraint violation, either \
            'critical' or 'warning'"
    )

class CompatibilityReport(BaseModel):
    """
    Comprehensive hardware compatibility analysis report.

    Aggregates all compatibility assessment results into a structured report
    with visualization capabilities and actionable deployment guidance.
    Provides multiple presentation formats and automated scoring for
    deployment decision support.

    Attributes:
        memory_issues: Memory constraint violations and optimization
            recommendations
        operator_issues: Unsupported operations requiring alternative
            implementations
        unsupported_types: Data type compatibility issues requiring conversion
    """
    
    memory_issues: Optional[list[MemoryIssue]] = Field(
        default=None,
        description="Memory constraint violations and optimization strategies"
    )
    operator_issues: Optional[list[OperatorIssue]] = Field(
        default=None,
        description="Unsupported operations requiring hardware-compatible " \
        "alternatives"
    )
    unsupported_types: Optional[list[UnsupportedTypeIssue]] = Field(
        default=None,
        description="Data type compatibility issues requiring quantization or " \
        "conversion"
    )
    json_format: Optional[bool] = Field(
        default=False,
        description="Render console output in JSON format"
    )

    def set_json(self, json:bool) -> None:
        """Set console output as JSON."""
        self.json_format=json


    def _rich_print(self, text: str) -> None:
        """Print text with Rich formatting if available, otherwise plain text."""
        if HAS_RICH and not self.json_format:
            console = Console()
            console.print(text)
        else:
            # Strip Rich markup for plain text output
            plain_text = re.sub(r'\[/?[^\]]*\]', '', text)
            logger.info(plain_text)

    def print_report(self, verbose: bool = False) -> None:
        """
        Display comprehensive compatibility analysis results.

        Provides detailed technical reporting of all identified compatibility
        issues with optional verbose output for in-depth analysis and debugging.
        Uses Rich formatting when available for enhanced visual presentation.

        Args:
            verbose: Include detailed technical information and recommendations
                for each identified issue category
        """
        total_issues = self.count_issues()
        
        if total_issues == 0:
            success_msg = "  Model fully compatible with target hardware platform"
            self._rich_print(f"{RICH_SUCCESS_COLOR}{success_msg}{RICH_END_TAG}")
            deployment_msg = "  No compatibility issues detected - ready for deployment"
            self._rich_print(f"{RICH_SUCCESS_COLOR}{deployment_msg}{RICH_END_TAG}")
            return
        
        header_msg = f"Compatibility Analysis: {total_issues} issues identified"
        self._rich_print(f"{RICH_HEADER_COLOR}{header_msg}{RICH_END_TAG}")
        logger.info("=" * REPORT_SEPARATOR_LENGTH)
        
        # Report issues in order of severity impact
        if self.operator_issues:
            self._print_operator_issues(verbose)
        
        if self.memory_issues:
            self._print_memory_issues(verbose)
        
        if self.unsupported_types:
            self._print_type_issues(verbose)

    def _print_operator_issues(self, verbose: bool = False) -> None:
        """
        Display operator compatibility issues with hardware-specific context.

        Args:
            verbose: Include detailed alternative suggestions and implementation
                guidance
        """
        operator_count = len(self.operator_issues) if self.operator_issues else 0
        section_title = f"Operator Compatibility Issues ({operator_count}):"
        self._rich_print(f"\n{RICH_INFO_COLOR}{section_title}{RICH_END_TAG}")
        self._rich_print("   Operations not supported by target hardware platform")
        
        for issue in self.operator_issues:
            # Choose color based on severity
            severity_color = (RICH_CRITICAL_COLOR 
                            if issue.severity == SeverityLevel.critical 
                            else RICH_WARNING_COLOR)
            severity_indicator = issue.severity.value.upper()
            
            alternative_text = (
                f" may be swapped for {issue.suggested_alternative}"
                if issue.suggested_alternative != DEFAULT_SUGGESTED_ALTERNATIVE
                else " (no hardware-compatible alternative identified)"
            )
            
            issue_line = (f"   {severity_color}[{severity_indicator}]{RICH_END_TAG} "
                         f"Layer {issue.layer_index}: {issue.operator}"
                         f"{alternative_text}")
            self._rich_print(issue_line)
            
            if verbose and issue.type:
                self._rich_print(f"      Issue Type: {issue.type}")

    def _print_memory_issues(self, verbose: bool = False) -> None:
        """
        Display memory constraint violations with optimization strategies.

        Args:
            verbose: Include detailed optimization recommendations and
                layer-specific targets
        """
        memory_count = len(self.memory_issues) if self.memory_issues else 0
        section_title = f"Memory Constraint Issues ({memory_count}):"
        self._rich_print(f"\n{RICH_INFO_COLOR}{section_title}{RICH_END_TAG}")
        self._rich_print("   Memory requirements exceed hardware limitations")
        
        for issue in self.memory_issues:
            # Choose color based on severity
            severity_color = (RICH_CRITICAL_COLOR 
                            if issue.severity == SeverityLevel.critical 
                            else RICH_WARNING_COLOR)
            severity_indicator = issue.severity.value.upper()
            
            issue_line = (f"   {severity_color}[{severity_indicator}]{RICH_END_TAG} "
                         f"{issue.type} - {issue.memory_type} memory")
            self._rich_print(issue_line)
            
            if verbose:
                self._rich_print(f"      Technical Details: {issue.detailed_info}")
                self._rich_print("      Optimization Strategies:")
                self._rich_print(f"        1. {issue.primary_recommendation.method}")
                if issue.primary_recommendation.reference:
                    reference = issue.primary_recommendation.reference
                    ref_line = f"           Reference: {reference}"
                    self._rich_print(ref_line)
                self._rich_print(f"        2. {issue.secondary_recommendation.method}")
                alternative_method = issue.alternative_recommendation.method
                self._rich_print(f"        3. {alternative_method}")
                
                if issue.optimization_opportunities:
                    self._rich_print("      High-Impact Optimization Targets:")
                    max_opportunities = MAX_OPTIMIZATION_OPPORTUNITIES_DISPLAYED
                    for opp in issue.optimization_opportunities[:max_opportunities]:
                        savings_kb = opp.potential_savings_kb
                        formatted_savings = f"{savings_kb:.{DECIMAL_PLACES_SAVINGS}f}"
                        opp_line = (f"        Layer {opp.layer_index} "
                                   f"({opp.operation_type}): "
                                   f"{formatted_savings} KB potential savings")
                        self._rich_print(opp_line)

    def _print_type_issues(self, verbose: bool = False) -> None:
        """
        Display data type compatibility issues requiring conversion.

        Args:
            verbose: Include detailed type conversion recommendations
        """
        type_count = len(self.unsupported_types) if self.unsupported_types else 0
        section_title = f"Data Type Compatibility Issues ({type_count}):"
        self._rich_print(f"\n{RICH_INFO_COLOR}{section_title}{RICH_END_TAG}")
        self._rich_print("   Model uses data types not supported by target hardware")
        
        for issue in self.unsupported_types:
            # Choose color based on severity
            severity_color = (RICH_CRITICAL_COLOR 
                            if issue.severity == SeverityLevel.critical 
                            else RICH_WARNING_COLOR)
            severity_indicator = issue.severity.value.upper()
            
            issue_line = (f"   {severity_color}[{severity_indicator}]{RICH_END_TAG} "
                         f"Layer {issue.layer_index}: {issue.operation_type} operation "
                         f"uses {issue.data_type}")
            self._rich_print(issue_line)

    def show_table(self) -> None:
        """
        Display compatibility issues in structured table format using Rich.

        Provides a concise overview of all issues with severity indicators
        and location information for quick assessment and prioritization.
        """
        try:
            from rich.console import Console
            from rich.table import Table
        except ImportError:
            logger.error("Table format requires 'rich' package")
            logger.error("   Install with: pip install rich")
            logger.error("   Falling back to standard report format:\n")
            self.print_report()
            return
        
        total_issues = self.count_issues()
        if total_issues == 0:
            console = Console()
            console.print(
                "[green]No compatibility issues to display - "
                "model ready for deployment[/green]"
            )
            return
        
        console = Console()
        
        # Create table with Rich styling
        table = Table(
            title=f"Compatibility Issues Summary ({total_issues} total)",
            show_header=True,
            header_style="bold magenta"
        )
        
        table.add_column("Issue Category", style="cyan", 
                         width=TABLE_COLUMN_WIDTH_CATEGORY)
        table.add_column("Location", style="blue", 
                         width=TABLE_COLUMN_WIDTH_LOCATION)
        table.add_column("Description", style="white", 
                         width=TABLE_COLUMN_WIDTH_DESCRIPTION)
        table.add_column("Severity", style="bold", 
                         width=TABLE_COLUMN_WIDTH_SEVERITY)
        
        def _get_severity_display(severity: SeverityLevel) -> str:
            """Helper to format severity with Rich color coding."""
            return ("[red]CRITICAL[/red]" if severity == SeverityLevel.critical
                    else "[yellow]WARNING[/yellow]")
        
        # Add operator issues
        if self.operator_issues:
            for issue in self.operator_issues:
                severity_display = _get_severity_display(issue.severity)
                location = f"Layer {issue.layer_index}"
                description = f"{issue.operator} operation"
                table.add_row("Operator", location, description, severity_display)
        
        # Add memory constraint violations
        if self.memory_issues:
            for issue in self.memory_issues:
                severity_display = _get_severity_display(issue.severity)
                location = LOCATION_MODEL_WIDE
                description = f"{issue.type} ({issue.memory_type})"
                table.add_row("Memory", location, description, severity_display)
        
        # Add data type compatibility issues
        if self.unsupported_types:
            for issue in self.unsupported_types:
                severity_display = _get_severity_display(issue.severity)
                location = f"Layer {issue.layer_index}"
                description = f"{issue.operation_type} ({issue.data_type})"
                table.add_row("Data Type", location, description, severity_display)
        
        # Display the table
        console.print(table)

    def count_issues(self) -> int:
        """
        Calculate total number of identified compatibility issues.

        Returns:
            Total count of all compatibility issues across all categories
        """
        total_count = 0
        
        if self.memory_issues:
            total_count += len(self.memory_issues)
        if self.operator_issues:
            total_count += len(self.operator_issues)
        if self.unsupported_types:
            total_count += len(self.unsupported_types)
            
        return total_count

    def has_critical_issues(self) -> bool:
        """
        Determine if any issues would block successful deployment.

        Identifies critical compatibility problems that must be resolved
        before the model can be successfully deployed on the target hardware.

        Returns:
            True if deployment-blocking issues are present
        """
        # Check for operators without hardware-compatible alternatives
        if self.operator_issues:
            for issue in self.operator_issues:
                if issue.severity == SeverityLevel.critical:
                    return True
        
        # Check for severe memory constraint violations
        if self.memory_issues:
            for issue in self.memory_issues:
                if issue.severity == SeverityLevel.critical:
                    return True
         
        # Check for severe type constraint violations
        if self.unsupported_types:
            for issue in self.unsupported_types:
                if issue.severity == SeverityLevel.critical:
                    return True

        return False

    def get_quick_fixes(self) -> list[str]:
        """
        Generate actionable quick-fix recommendations for identified issues.

        Provides prioritized list of specific actions that can address
        compatibility issues with minimal model architecture changes.

        Returns:
            List of actionable fix recommendations ordered by implementation ease
        """
        quick_fixes = []
        
        # Operator replacement (if alternatives exist)
        if self.operator_issues:
            replaceable_ops = [
                issue for issue in self.operator_issues
                if issue.suggested_alternative != DEFAULT_SUGGESTED_ALTERNATIVE
            ]
            if replaceable_ops:
                max_replacements = MAX_OPERATOR_REPLACEMENTS_DISPLAYED
                op_replacements = [
                    f"{issue.operator} → {issue.suggested_alternative}"
                    for issue in replaceable_ops[:max_replacements]
                ]
                quick_fixes.append(
                    f"Replace operators: {'; '.join(op_replacements)}"
                )
        
        # Memory optimization (may require more effort)
        if self.memory_issues:
            quick_fixes.append(
                "Apply memory optimization techniques"
            )
        
        # Data type conversion
        if self.unsupported_types:
            unsupported_types = list(
                set(issue.data_type for issue in self.unsupported_types)
            )
            quick_fixes.append(
                f"Convert unsupported data types: {', '.join(unsupported_types)}"
            )
        
        return quick_fixes

    def print_summary(self) -> None:
        """
        Display executive summary of compatibility analysis results.

        Provides high-level assessment suitable for stakeholders and
        deployment decision-makers, focusing on deployment viability
        and required actions. Uses Rich formatting when available.
        """
        total_issues = self.count_issues()
        
        summary_title = "Compatibility Analysis Summary"
        self._rich_print(f"{RICH_HEADER_COLOR}{summary_title}{RICH_END_TAG}")
        logger.info("=" * SUMMARY_SEPARATOR_LENGTH)
        
        if total_issues == 0:
            status_msg = f"{STATUS_ISSUES_FOUND_PREFIX} {STATUS_FULLY_COMPATIBLE}"
            self._rich_print(f"{RICH_SUCCESS_COLOR}{status_msg}{RICH_END_TAG}")
            deployment_msg = "   Model ready for immediate deployment"
            self._rich_print(f"{RICH_SUCCESS_COLOR}{deployment_msg}{RICH_END_TAG}")
            no_issues_msg = "   No compatibility issues detected"
            self._rich_print(f"{RICH_SUCCESS_COLOR}{no_issues_msg}{RICH_END_TAG}")
            return
        
        issues_message = f"{total_issues} compatibility issues identified"
        status_line = f"{STATUS_ISSUES_FOUND_PREFIX} {issues_message}"
        
        # Color based on critical issues presence
        if self.has_critical_issues():
            self._rich_print(f"{RICH_CRITICAL_COLOR}{status_line}{RICH_END_TAG}")
            compatibility_msg = "Model incompatible with target hardware platform"
            self._rich_print(f"{RICH_CRITICAL_COLOR}{compatibility_msg}{RICH_END_TAG}")
        else:
            self._rich_print(f"{RICH_WARNING_COLOR}{status_line}{RICH_END_TAG}")
            compatibility_msg = "Model compatible with target hardware platform"
            self._rich_print(f"{RICH_SUCCESS_COLOR}{compatibility_msg}{RICH_END_TAG}")
        
        # Quick action items
        quick_fixes = self.get_quick_fixes()
        if quick_fixes:
            self._rich_print(f"\n{RICH_INFO_COLOR}Priority Actions:{RICH_END_TAG}")
            for i, fix in enumerate(quick_fixes, 1):
                self._rich_print(f"   {i}. {fix}")

    def save_as_json(self, filepath: str) -> bool:
        """
        Save the compatibility report as a JSON file.
        
        Args:
            filepath: Path where the JSON file should be saved
            
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(self.model_dump(), f, indent=2)
            logger.info(f"Compatibility report saved to {filepath}")
            return True
        except Exception as e:
            logger.info(f"Failed to save compatibility report to {filepath}: {e}")
            return False

