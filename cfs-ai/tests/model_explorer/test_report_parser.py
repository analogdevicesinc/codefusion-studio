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

"""Tests for the XNNC explore report parser."""

from pathlib import Path

import pytest

from cfsai_model_explorer.report_parser import parse_explore_report

FIXTURES = Path(__file__).parent.parent / "data" / "xnnc_reports"


class TestParseKwsNW210:
    """Tests against the NW-2.1.0 format (kws_ref_model)."""

    @pytest.fixture()
    def report(self):
        text = (FIXTURES / "kws_ref_model_nw210_report.txt").read_text()
        return parse_explore_report(text)

    def test_layers_parsed(self, report):
        assert len(report.layers) > 0

    def test_dmy_layers_present(self, report):
        dmy = [ly for ly in report.layers if ly.eu == "DMY"]
        assert len(dmy) >= 2  # INPUT0 and OUTPUT0

    def test_npu_layers(self, report):
        npu = [ly for ly in report.layers if ly.eu in ("3DEng", "2DEng")]
        assert len(npu) > 0

    def test_host_layer(self, report):
        host = [ly for ly in report.layers if ly.eu == "Host"]
        assert len(host) == 1
        assert "SOFTMAX" in host[0].lyr_name

    def test_pclks_populated(self, report):
        npu = [ly for ly in report.layers if ly.eu not in ("DMY",)]
        has_cycles = [ly for ly in npu if ly.pclks > 0]
        assert len(has_cycles) > 0

    def test_filter_lock_populated(self, report):
        locked = [ly for ly in report.layers if ly.filter_locked is True]
        assert len(locked) > 0

    def test_filter_lock_spec(self, report):
        assert report.filter_lock.network_total_bytes > 0
        assert report.filter_lock.reserved_bytes > 0
        assert len(report.filter_lock.per_layer) > 0

    def test_host_push_messages(self, report):
        assert len(report.host_push_messages) == 1
        assert "SOFTMAX" in report.host_push_messages[0]

    def test_summary_clocks(self, report):
        s = report.summary
        assert s.total_clks > 0
        assert s.total_neo_clks > 0
        assert s.total_dsp_clks > 0

    def test_summary_fps(self, report):
        assert report.summary.fps > 0

    def test_summary_bandwidth(self, report):
        assert report.summary.dram_read_bw_mbps > 0


class TestParseMnistNW210:
    """Tests against the NW-2.1.0 format (mnist)."""

    @pytest.fixture()
    def report(self):
        text = (FIXTURES / "mnist_int8act_int8wt_nw210_report.txt").read_text()
        return parse_explore_report(text)

    def test_layers_parsed(self, report):
        assert len(report.layers) > 0

    def test_dmy_layers_present(self, report):
        dmy = [ly for ly in report.layers if ly.eu == "DMY"]
        assert len(dmy) >= 2

    def test_npu_layers(self, report):
        npu = [ly for ly in report.layers if ly.eu in ("3DEng", "2DEng")]
        assert len(npu) > 0

    def test_all_layers_on_npu(self, report):
        host = [ly for ly in report.layers if ly.eu == "Host"]
        assert len(host) == 0

    def test_no_host_push_messages(self, report):
        assert len(report.host_push_messages) == 0

    def test_total_clocks(self, report):
        assert report.summary.total_clks == 72228

    def test_pclks_populated(self, report):
        npu = [ly for ly in report.layers if ly.eu not in ("DMY",)]
        has_cycles = [ly for ly in npu if ly.pclks > 0]
        assert len(has_cycles) > 0

    def test_filter_lock_populated(self, report):
        locked = [ly for ly in report.layers if ly.filter_locked is True]
        assert len(locked) > 0

    def test_filter_lock_spec(self, report):
        assert report.filter_lock.network_total_bytes > 0
        assert report.filter_lock.reserved_bytes > 0
        assert len(report.filter_lock.per_layer) > 0

    def test_summary_clocks(self, report):
        s = report.summary
        assert s.total_clks > 0
        assert s.total_neo_clks > 0

    def test_summary_fps(self, report):
        assert report.summary.fps > 0

    def test_summary_bandwidth(self, report):
        assert report.summary.dram_read_bw_mbps > 0


class TestParseEmptyReport:
    """Tests for malformed or empty reports."""

    def test_empty_string(self):
        report = parse_explore_report("")
        assert len(report.layers) == 0
        assert report.summary.total_clks == 0

    def test_garbage_text(self):
        report = parse_explore_report("not a report\nrandom text\n")
        assert len(report.layers) == 0
        assert report.summary.total_clks == 0
