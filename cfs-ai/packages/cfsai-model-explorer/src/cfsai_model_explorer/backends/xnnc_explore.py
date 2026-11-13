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

"""XNNC explore backend for NNE targets.

Runs ``mot neuroweave explore`` inside a Docker container and returns
an ``ExploreReport`` that covers both profiling and compatibility in
one report.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

from cfsai_model_parser import TFLiteParser

from cfsai_model_explorer.exceptions import ModelAnalysisError
from cfsai_model_explorer.report_parser import (
    ExploreReport as ParsedExplore,
)
from cfsai_model_explorer.report_parser import (
    parse_explore_report,
)
from cfsai_model_explorer.schemas import (
    PROFILE_REPORT_VERSION,
    ExploreReport,
    HardwareMetrics,
    LayerPerformance,
    MemoryAnalysis,
    ModelSummary,
    OperatorIssue,
)
from cfsai_model_explorer.xnnc_runner import (
    DEFAULT_DSP_FREQ,
    DEFAULT_NNE_FREQ,
    XnncRunner,
)
from cfsai_types.hardware_profile import HardwareProfile
from cfsai_types.report import ReportInfo, ReportType

logger = logging.getLogger(__name__)

_OP_INDEX_RE = re.compile(r"_Op(\d+)")

_PUSH_MSG_RE = re.compile(
    r"^(.+?)\s+\(operator_id:\s*\d+\)\s+pushed to Host;?\s*(.*)",
)


def _extract_macs(
    lyr_name: str, macs: dict[str, int], claimed: set[str]
) -> int:
    """Look up MACs by extracting the Op index from the explore layer name.

    When explore splits one TFLite op into multiple passes (e.g.
    transP1 / transP2), only the first pass claims the MACs.
    """
    match = _OP_INDEX_RE.search(lyr_name)
    if match:
        op_id = match.group(1)
        if op_id not in claimed:
            claimed.add(op_id)
            return macs.get(op_id, 0)
    return 0


class XnncExploreBackend:
    """Backend using the XNNC NPU compiler's explore mode."""

    def __init__(
        self,
        docker_image: Optional[str] = None,
        soc: Optional[str] = None,
        subsystem: Optional[str] = None,
        **_kwargs: object,
    ) -> None:
        """Initialize with Docker image, SoC, and subsystem."""
        self._runner = XnncRunner(
            docker_image=docker_image,
            soc=soc,
            subsystem=subsystem,
        )

    def profile(
        self, model_path: Path, hw: HardwareProfile
    ) -> ExploreReport:
        """Run explore and return profiling + compatibility report."""
        return self._run_explore(model_path, hw)

    def check_compat(
        self,
        model_path: Path,
        hw: HardwareProfile,
        dataset_path: Path | None = None,
    ) -> ExploreReport:
        """Run explore and return profiling + compatibility report."""
        return self._run_explore(model_path, hw)

    def _run_explore(
        self, model_path: Path, hw: HardwareProfile
    ) -> ExploreReport:
        dsp_freq = DEFAULT_DSP_FREQ
        if hw and hw.core_clock:
            dsp_freq = int(hw.core_clock)

        try:
            report_text = self._runner.run_explore(
                model_path,
                dsp_freq=dsp_freq,
                nne_freq=DEFAULT_NNE_FREQ,
            )
            parsed = parse_explore_report(report_text)
            if not parsed.layers or parsed.summary.total_clks == 0:
                raise ModelAnalysisError(
                    "XNNC explore produced no layers or clock data. "
                    "The report may be truncated or in an unexpected format.",
                    error_code="EXPLORE_EMPTY_REPORT",
                )
            macs_by_op, target_dtype = self._parse_model_info(model_path)
            return self._build_report(
                model_path, parsed, hw, macs_by_op, target_dtype,
            )
        except ModelAnalysisError:
            raise
        except Exception as exc:
            raise ModelAnalysisError(
                f"Explore analysis failed: {exc}",
                error_code="EXPLORE_FAILED",
            ) from exc

    @staticmethod
    def _parse_model_info(
        model_path: Path,
    ) -> tuple[dict[str, int], str | None]:
        """Parse MACs and dtype from the TFLite model.

        Returns ``(macs_by_op_index, target_dtype)``.
        """
        try:
            parser = TFLiteParser()
            parsed_model = parser.parse_model(str(model_path))
            macs = {
                str(layer.index): getattr(layer, "macs", 0) or 0
                for layer in (parsed_model.layer_details or [])
            }
            target_dtype = getattr(parsed_model, "target_dtype", None)
            return macs, target_dtype
        except Exception:
            return {}, None

    def _build_report(
        self,
        model_path: Path,
        parsed: ParsedExplore,
        hw: Optional[HardwareProfile],
        macs_by_op: Optional[dict[str, int]] = None,
        target_dtype: str | None = None,
    ) -> ExploreReport:
        summary = parsed.summary
        macs = macs_by_op or {}

        latency_ms = None
        if DEFAULT_NNE_FREQ > 0 and summary.total_clks > 0:
            latency_ms = (
                summary.total_clks / (DEFAULT_NNE_FREQ * 1_000_000)
            ) * 1000

        npu_layers = [
            ly for ly in parsed.layers if ly.eu not in ("Host", "DMY")
        ]
        host_layers = [
            ly for ly in parsed.layers if ly.eu == "Host"
        ]

        claimed_ops: set[str] = set()
        layer_performance = [
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
                macs=_extract_macs(ly.lyr_name, macs, claimed_ops),
            )
            for ly in parsed.layers
            if ly.eu != "DMY"
        ]

        flock = parsed.filter_lock

        return ExploreReport(
            type=ReportType.EXPLORE,
            model_summary=ModelSummary(
                model_name=model_path.name,
                model_path=str(model_path),
                target_dtype=target_dtype,
            ),
            hardware_metrics=HardwareMetrics(
                total_clks=summary.total_clks,
                total_neo_clks=summary.total_neo_clks,
                total_dsp_clks=summary.total_dsp_clks,
                fps=summary.fps,
                estimated_latency_ms=latency_ms,
                dram_read_bw_mbps=summary.dram_read_bw_mbps,
                dram_write_bw_mbps=summary.dram_write_bw_mbps,
                accelerated_layers=len(npu_layers),
                cpu_only_layers=len(host_layers),
            ),
            memory_analysis=MemoryAnalysis(
                filter_lock_total_bytes=flock.network_total_bytes,
                filter_lock_reserved_bytes=flock.reserved_bytes,
                filter_lock_per_layer=flock.per_layer,
                ubuf_scratch_start_offset=flock.ubuf_scratch_start_offset,
                dram_activation_read_kb=summary.dram_activation_read_kb,
                dram_filter_read_kb=summary.dram_filter_read_kb,
                dram_write_kb=summary.dram_write_kb,
                dram_scratch_kb=summary.dram_scratch_kb,
                l0sram_kb=summary.l0sram_kb,
                axi_sram_kb=summary.axi_sram_kb,
            ),
            layer_performance=layer_performance,
            operator_issues=self._extract_operator_issues(parsed) or None,
            info=ReportInfo(
                version=PROFILE_REPORT_VERSION,
                hardware=hw,
            ),
        )

    def _extract_operator_issues(
        self, parsed: ParsedExplore
    ) -> list[OperatorIssue]:
        """Extract operator issues from pushed-to-Host messages."""
        issues = []
        for msg in parsed.host_push_messages:
            match = _PUSH_MSG_RE.match(msg)
            if match:
                op_name = match.group(1).strip()
                reason = (
                    match.group(2).strip().rstrip(";")
                    or "Pushed to Host"
                )
                issues.append(
                    OperatorIssue(
                        operator=op_name,
                        layer_name=op_name,
                        reason=reason,
                    )
                )
            else:
                issues.append(
                    OperatorIssue(
                        operator="unknown",
                        layer_name=msg,
                        reason=msg,
                    )
                )
        return issues
