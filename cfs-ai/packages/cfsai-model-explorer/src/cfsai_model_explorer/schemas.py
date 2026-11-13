# Copyright (c) 2026 Analog Devices, Inc.
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

Schema definitions for XNNC explore-based resource profiling. All cycle
estimates, layer mappings, and memory data come from the Neo NPU compiler's
approximately-timed cost model (xnnc.py --tflm --explore).
"""

import io
import json
import logging
from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field

from cfsai_types.logging import EventType, log_event
from cfsai_types.report import ReportInfo, ReportType

PROFILE_REPORT_VERSION = "2.4.0"

try:
    from rich import box
    from rich.console import Console
    from rich.table import Table
    HAS_RICH = True
except ImportError:
    HAS_RICH = False

logger = logging.getLogger(__name__)


class LayerPerformance(BaseModel):
    """Per-layer execution metrics from XNNC explore."""

    layer_idx: int = Field(ge=0)
    layer_name: str = Field(description="TFLite layer name from explore report")
    operator_type: str = Field(description="OP (Conv, DSC, FC, gblAvPool, etc.)")
    execution_unit: str = Field(description="EU (3DEng, 2DEng, Host, DMY)")
    cycles: int = Field(ge=0, description="PClks from explore")
    is_accelerated: bool = Field(description="True when EU is not Host/DMY")
    filter_locked: Optional[bool] = Field(
        default=None, description="Whether filters are locked in UBUF"
    )
    input_dtype: Optional[str] = Field(default=None, description="idT (e.g. I8)")
    output_dtype: Optional[str] = Field(default=None, description="odT (e.g. I8)")
    macs: int = Field(default=0, ge=0, description="MACs from TFLite model parser")


class ModelSummary(BaseModel):
    """High-level model metadata."""

    model_name: Optional[str] = Field(default=None)
    model_path: Optional[str] = Field(default=None)
    target_dtype: Optional[str] = Field(default=None)


class HardwareMetrics(BaseModel):
    """Performance metrics from XNNC explore results summary."""

    total_clks: int = Field(ge=0, description="TotalClks")
    total_neo_clks: int = Field(ge=0, description="TotalNeoClks (NPU cycles)")
    total_dsp_clks: int = Field(ge=0, description="TotalDSPClks (host placeholder)")
    fps: float = Field(ge=0, description="Frames per second at configured frequency")
    estimated_latency_ms: Optional[float] = Field(
        default=None, ge=0, description="TotalClks / freq, in milliseconds"
    )
    dram_read_bw_mbps: float = Field(ge=0, description="DRAM Read BW (MB/sec)")
    dram_write_bw_mbps: float = Field(ge=0, description="DRAM Write BW (MB/sec)")
    accelerated_layers: int = Field(ge=0, description="Layers on NPU (3DEng/2DEng)")
    cpu_only_layers: int = Field(ge=0, description="Layers on Host DSP")


class MemoryAnalysis(BaseModel):
    """NPU memory analysis from XNNC explore."""

    filter_lock_total_bytes: int = Field(
        ge=0, description="Network locked filter size in bytes"
    )
    filter_lock_reserved_bytes: int = Field(
        ge=0, description="Reserved UBUF offset in bytes"
    )
    ubuf_scratch_start_offset: int = Field(
        ge=0, description="UmemScratchStartOffset in bytes"
    )
    filter_lock_per_layer: dict[int, int] = Field(
        default_factory=dict,
        description="Per-layer filter lock size in bytes, keyed by layer number",
    )
    dram_activation_read_kb: float = Field(
        ge=0, description="DRAM Activation Read Volume (KB)"
    )
    dram_filter_read_kb: float = Field(
        ge=0, description="DRAM Filter Read Volume (KB)"
    )
    dram_write_kb: float = Field(ge=0, description="DRAM Write Volume (KB)")
    dram_scratch_kb: float = Field(ge=0, description="DRAM Scratch used (KB)")
    l0sram_kb: float = Field(ge=0, description="L0SRAM used (KB)")
    axi_sram_kb: float = Field(ge=0, description="AXI_SRAM used (KB)")


class OperatorIssue(BaseModel):
    """An operator that was pushed to host DSP instead of NPU."""

    operator: str = Field(description="TFLite op name (e.g. SOFTMAX0_Op12)")
    layer_name: str = Field(description="Full layer name from explore report")
    reason: str = Field(description="Why the op was pushed to Host")


class ErrorNote(BaseModel):
    """Error details from profiling."""

    message: str = Field(description="Error description")
    code: Optional[str] = Field(default=None)
    details: Optional[dict[str, Any]] = Field(default=None)


class ExploreReport(BaseModel):
    """Unified XNNC explore report — profiling + compatibility in one."""

    type: ReportType = Field(default=ReportType.EXPLORE)
    model_summary: Optional[ModelSummary] = Field(default=None)
    hardware_metrics: Optional[HardwareMetrics] = Field(default=None)
    memory_analysis: Optional[MemoryAnalysis] = Field(default=None)
    layer_performance: Optional[list[LayerPerformance]] = Field(default=None)
    operator_issues: Optional[list[OperatorIssue]] = Field(
        default=None, description="Operators pushed to Host DSP instead of NPU"
    )
    errors: Optional[list[ErrorNote]] = Field(default=None)
    info: Optional[ReportInfo] = Field(default=None)

    def visualize_resource_profile(self, to_buffer: bool = False) -> str | None:
        """Generate human-readable visualization of the explore report."""
        if not HAS_RICH:
            print("Please install 'rich' to visualize results: pip install rich")
            return None

        if to_buffer:
            buffer = io.StringIO()
            console = Console(
                file=buffer, force_terminal=False, no_color=True, width=320
            )
        else:
            console = Console()

        console.print("=== XNNC EXPLORE PROFILING REPORT ===")

        if self.model_summary:
            console.print("\n=== MODEL SUMMARY ===")
            table = Table(show_header=True, box=box.ASCII)
            table.add_column("Metric")
            table.add_column("Value")
            m = self.model_summary
            if m.model_name:
                table.add_row("Model Name", m.model_name)
            if m.model_path:
                table.add_row("Model Path", m.model_path)
            console.print(table)

        if self.hardware_metrics:
            console.print("\n=== HARDWARE PERFORMANCE ===")
            table = Table(show_header=True, box=box.ASCII)
            table.add_column("Metric")
            table.add_column("Value")
            hw = self.hardware_metrics
            table.add_row("Total Clocks", f"{hw.total_clks:,}")
            table.add_row("NPU Clocks (Neo)", f"{hw.total_neo_clks:,}")
            table.add_row("DSP Clocks (placeholder)", f"{hw.total_dsp_clks:,}")
            table.add_row("FPS", f"{hw.fps:,.2f}")
            if hw.estimated_latency_ms is not None:
                table.add_row("Latency", f"{hw.estimated_latency_ms:.3f} ms")
            table.add_row("DRAM Read BW", f"{hw.dram_read_bw_mbps:.2f} MB/sec")
            table.add_row("DRAM Write BW", f"{hw.dram_write_bw_mbps:.2f} MB/sec")
            table.add_row("Accelerated Layers (NPU)", str(hw.accelerated_layers))
            table.add_row("CPU-Only Layers (Host)", str(hw.cpu_only_layers))
            console.print(table)

        if self.memory_analysis:
            console.print("\n=== NPU MEMORY ===")
            table = Table(show_header=True, box=box.ASCII)
            table.add_column("Metric")
            table.add_column("Value")
            mem = self.memory_analysis
            table.add_row(
                "Filter Lock (network)",
                f"{mem.filter_lock_total_bytes:,} bytes"
            )
            table.add_row(
                "Filter Lock (reserved)",
                f"{mem.filter_lock_reserved_bytes:,} bytes"
            )
            table.add_row(
                "UBUF Scratch Offset",
                f"{mem.ubuf_scratch_start_offset:,} bytes"
            )
            table.add_row(
                "DRAM Activation Read", f"{mem.dram_activation_read_kb:.2f} KB"
            )
            table.add_row(
                "DRAM Filter Read", f"{mem.dram_filter_read_kb:.2f} KB"
            )
            table.add_row("DRAM Write", f"{mem.dram_write_kb:.2f} KB")
            table.add_row("DRAM Scratch", f"{mem.dram_scratch_kb:.2f} KB")
            table.add_row("L0SRAM", f"{mem.l0sram_kb:.2f} KB")
            table.add_row("AXI SRAM", f"{mem.axi_sram_kb:.2f} KB")
            console.print(table)

        if self.layer_performance:
            console.print("\n=== PER-LAYER PERFORMANCE ===")
            table = Table(show_header=True, box=box.ASCII)
            table.add_column("Lyr", justify="right")
            table.add_column("Name")
            table.add_column("OP")
            table.add_column("EU")
            table.add_column("Cycles", justify="right")
            table.add_column("FLock", justify="center")
            table.add_column("idT")
            table.add_column("odT")

            for lp in self.layer_performance:
                flock = "-"
                if lp.filter_locked is not None:
                    flock = "Y" if lp.filter_locked else "N"
                table.add_row(
                    str(lp.layer_idx),
                    lp.layer_name,
                    lp.operator_type,
                    lp.execution_unit,
                    f"{lp.cycles:,}",
                    flock,
                    lp.input_dtype or "-",
                    lp.output_dtype or "-",
                )
            console.print(table)

        if self.operator_issues:
            console.print("\n=== OPERATOR ISSUES (pushed to Host) ===")
            table = Table(show_header=True, box=box.ASCII)
            table.add_column("Operator")
            table.add_column("Layer")
            table.add_column("Reason")
            for issue in self.operator_issues:
                table.add_row(issue.operator, issue.layer_name, issue.reason)
            console.print(table)

        if self.errors:
            console.print("\n=== ERRORS ===")
            for error in self.errors:
                code = f" (Code: {error.code})" if error.code else ""
                console.print(f"  * {error.message}{code}")

        if to_buffer:
            return buffer.getvalue()
        return None

    def save_as_json(self, filepath: str) -> bool:
        """Save report as JSON."""
        try:
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(self.model_dump(mode="json"), f, indent=2, default=str)
            log_event(logger, EventType.FILE, filepath)
            return True
        except Exception as e:
            logger.error(f"Failed to save JSON report to {filepath}: {e}")
            return False

    def save_as_text(self, filepath: str) -> bool:
        """Save report as formatted text."""
        try:
            text = self.visualize_resource_profile(to_buffer=True)
            if not text:
                logger.error("Cannot save text report: rich is not installed")
                return False
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(text)
            log_event(logger, EventType.FILE, filepath)
            return True
        except Exception as e:
            logger.error(f"Failed to save text report to {filepath}: {e}")
            return False
