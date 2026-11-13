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

"""Tests for the explore-to-legacy report adapters."""

from pathlib import Path

import pytest

from cfsai_model_explorer.adapters import (
    adapt_explore_to_compat,
    adapt_explore_to_profile,
)
from cfsai_model_explorer.report_parser import parse_explore_report
from cfsai_model_explorer.schemas import (
    ExploreReport,
    HardwareMetrics,
    LayerPerformance,
    MemoryAnalysis,
    ModelSummary,
    OperatorIssue,
)
from cfsai_types.hardware_profile import HardwareProfile
from cfsai_types.report import ReportInfo, ReportType

FIXTURES = Path(__file__).parent.parent / "data" / "xnnc_reports"


def _make_explore_report(fixture_name: str) -> ExploreReport:
    """Build an ExploreReport from a parsed fixture."""
    text = (FIXTURES / fixture_name).read_text()
    parsed = parse_explore_report(text)
    s = parsed.summary
    flock = parsed.filter_lock

    layers = [
        LayerPerformance(
            layer_idx=ly.lyr_num,
            layer_name=ly.lyr_name,
            operator_type=ly.op,
            execution_unit=ly.eu,
            cycles=ly.pclks,
            is_accelerated=ly.eu not in ("Host", "DMY"),
            filter_locked=ly.filter_locked,
            input_dtype=ly.input_dtype,
            output_dtype=ly.output_dtype,
            macs=0,
        )
        for ly in parsed.layers
        if ly.eu != "DMY"
    ]

    issues = []
    for msg in parsed.host_push_messages:
        issues.append(
            OperatorIssue(operator=msg.split()[0], layer_name=msg.split()[0], reason=msg)
        )

    return ExploreReport(
        type=ReportType.EXPLORE,
        model_summary=ModelSummary(
            model_name="test.tflite",
            model_path="/tmp/test.tflite",
            target_dtype="int8",
        ),
        hardware_metrics=HardwareMetrics(
            total_clks=s.total_clks,
            total_neo_clks=s.total_neo_clks,
            total_dsp_clks=s.total_dsp_clks,
            fps=s.fps,
            estimated_latency_ms=0.05,
            dram_read_bw_mbps=s.dram_read_bw_mbps,
            dram_write_bw_mbps=s.dram_write_bw_mbps,
            accelerated_layers=len([ly for ly in layers if ly.is_accelerated]),
            cpu_only_layers=len([ly for ly in layers if not ly.is_accelerated]),
        ),
        memory_analysis=MemoryAnalysis(
            filter_lock_total_bytes=flock.network_total_bytes,
            filter_lock_reserved_bytes=flock.reserved_bytes,
            filter_lock_per_layer=flock.per_layer,
            ubuf_scratch_start_offset=flock.ubuf_scratch_start_offset,
            dram_activation_read_kb=s.dram_activation_read_kb,
            dram_filter_read_kb=s.dram_filter_read_kb,
            dram_write_kb=s.dram_write_kb,
            dram_scratch_kb=s.dram_scratch_kb,
            l0sram_kb=s.l0sram_kb,
            axi_sram_kb=s.axi_sram_kb,
        ),
        layer_performance=layers,
        operator_issues=issues or None,
        info=ReportInfo(version="2.4.0", hardware=None),
    )


class TestAdaptToProfile:
    """Test adapt_explore_to_profile."""

    @pytest.fixture()
    def kws_report(self):
        return _make_explore_report("kws_ref_model_nw210_report.txt")

    @pytest.fixture()
    def profile(self, kws_report):
        return adapt_explore_to_profile(kws_report)

    def test_type_is_profile(self, profile):
        assert profile["type"] == "profile"

    def test_total_cycles(self, profile):
        assert profile["hardware_metrics"]["total_cycles"] > 0

    def test_layer_count(self, profile):
        assert len(profile["layer_performance"]) > 0

    def test_per_layer_cycles(self, profile):
        has_cycles = [lp for lp in profile["layer_performance"] if lp["cycles"] > 0]
        assert len(has_cycles) > 0

    def test_per_layer_latency(self, profile):
        has_latency = [lp for lp in profile["layer_performance"] if lp["latency_ms"] > 0]
        assert len(has_latency) > 0

    def test_per_layer_memory(self, profile):
        has_mem = [lp for lp in profile["layer_performance"] if lp["memory_kb"] > 0]
        assert len(has_mem) > 0

    def test_model_size_kb(self, profile):
        # model_path is /tmp/test.tflite which doesn't exist, so 0
        assert profile["model_summary"]["model_size_kb"] == 0

    def test_target_dtype(self, profile):
        assert profile["model_summary"]["target_dtype"] == "int8"

    def test_target_dtype_from_model(self, kws_report):
        """target_dtype reflects the actual model dtype, not a hardcoded value."""
        kws_report.model_summary.target_dtype = "float32"
        profile = adapt_explore_to_profile(kws_report)
        assert profile["model_summary"]["target_dtype"] == "float32"

    def test_framework(self, profile):
        assert profile["model_summary"]["framework"] == "XNNC Explore"

    def test_optimization_opportunities(self, profile):
        assert "total_macs" in profile["optimization_opportunities"]

    def test_memory_analysis_present(self, profile):
        assert "model_peak_ram_kb" in profile["memory_analysis"]
        assert "ram_status" in profile["memory_analysis"]


class TestAdaptToCompat:
    """Test adapt_explore_to_compat."""

    def test_type_is_compat(self):
        report = _make_explore_report("kws_ref_model_nw210_report.txt")
        compat = adapt_explore_to_compat(report)
        assert compat["type"] == "compat"

    def test_operator_issues_for_softmax(self):
        report = _make_explore_report("kws_ref_model_nw210_report.txt")
        compat = adapt_explore_to_compat(report)
        assert compat["operator_issues"] is not None
        assert len(compat["operator_issues"]) == 1
        assert "SOFTMAX" in compat["operator_issues"][0]["operator"]

    def test_pushed_to_host_operator_metadata(self):
        """Pushed-to-Host ops are warnings, typed and labelled as such."""
        report = _make_explore_report("kws_ref_model_nw210_report.txt")
        compat = adapt_explore_to_compat(report)
        issue = compat["operator_issues"][0]
        assert issue["type"] == "pushed to host"
        assert issue["severity"] == "warning"
        assert issue["suggested_alternative"] == "Switch to NPU friendly operator"

    def test_no_operator_issues_for_mnist(self):
        report = _make_explore_report("mnist_int8act_int8wt_nw210_report.txt")
        compat = adapt_explore_to_compat(report)
        assert compat["operator_issues"] is None

    def test_memory_and_types_null(self):
        report = _make_explore_report("kws_ref_model_nw210_report.txt")
        compat = adapt_explore_to_compat(report)
        assert compat["memory_issues"] is None
        assert compat["unsupported_types"] is None

    def test_unsupported_types_when_hw_constrains(self):
        """Layers with dtypes outside SupportedDataTypes are flagged."""
        report = _make_explore_report("kws_ref_model_nw210_report.txt")
        # Set a hardware profile that only supports INT8
        report.info = ReportInfo(
            version="2.4.0",
            hardware=HardwareProfile.model_validate({
                "SoC": "MySoC",
                "Core": "MyNPU",
                "CoreClock": 500,
                "FlashSize": 0,
                "RamSize": 3072,
                "SupportedOps": [],
                "AccelOps": [],
                "SupportedDataTypes": ["INT8"],
                "OperatorInfos": [],
            }),
        )
        # Fixture layers all have I8 dtypes, so no issues expected
        compat = adapt_explore_to_compat(report)
        assert compat["unsupported_types"] is None

    def test_unsupported_types_flags_float32(self):
        """A layer with a non-supported dtype produces an unsupported_types entry."""
        report = _make_explore_report("kws_ref_model_nw210_report.txt")
        report.info = ReportInfo(
            version="2.4.0",
            hardware=HardwareProfile.model_validate({
                "SoC": "MySoC",
                "Core": "MyNPU",
                "CoreClock": 500,
                "FlashSize": 0,
                "RamSize": 3072,
                "SupportedOps": [],
                "AccelOps": [],
                "SupportedDataTypes": ["INT8"],
                "OperatorInfos": [],
            }),
        )
        # Mutate one layer to have a FLOAT32 input
        report.layer_performance[0].input_dtype = "F32"
        compat = adapt_explore_to_compat(report)
        assert compat["unsupported_types"] is not None
        assert any(
            ut["data_type"] == "FLOAT32" for ut in compat["unsupported_types"]
        )

    def test_model_summary(self):
        report = _make_explore_report("kws_ref_model_nw210_report.txt")
        compat = adapt_explore_to_compat(report)
        assert compat["model_summary"]["model_name"] == "test.tflite"
