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
Parser for XNNC explore _report.txt output.

Extracts the optimized network table, per-layer cycle estimates,
filter lock info, and results summary from the text report produced
by ``xnnc.py --tflm --explore``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class ExploreLayer:
    """One row from the optimized-network table."""
    lyr_num: int
    op: str
    input_dtype: str
    coeff_dtype: str
    output_dtype: str
    eu: str
    ih: int
    iw: int
    ic: int
    strh: int
    strw: int
    rh: int
    rw: int
    oh: int
    ow: int
    oc: int
    lyr_name: str
    pclks: int = 0
    filter_locked: bool | None = None


@dataclass
class FilterLockSpec:
    """UMEM filter lock specification from the explore report."""

    reserved_bytes: int = 0
    per_layer: dict[int, int] = field(default_factory=dict)
    network_total_bytes: int = 0
    ubuf_scratch_start_offset: int = 0


@dataclass
class ResultsSummary:
    """Aggregated results from the explore report summary section."""

    total_clks: int = 0
    total_neo_clks: int = 0
    total_dsp_clks: int = 0
    fps: float = 0.0
    dram_read_bw_mbps: float = 0.0
    dram_write_bw_mbps: float = 0.0
    dram_activation_read_kb: float = 0.0
    dram_filter_read_kb: float = 0.0
    dram_write_kb: float = 0.0
    l0sram_kb: float = 0.0
    axi_sram_kb: float = 0.0
    dram_scratch_kb: float = 0.0


@dataclass
class ExploreReport:
    """Parsed XNNC explore report data."""

    layers: list[ExploreLayer] = field(default_factory=list)
    host_push_messages: list[str] = field(default_factory=list)
    filter_lock: FilterLockSpec = field(default_factory=FilterLockSpec)
    summary: ResultsSummary = field(default_factory=ResultsSummary)


def parse_explore_report(text: str) -> ExploreReport:
    """Parse an XNNC explore ``_report.txt`` into structured data."""
    report = ExploreReport()
    lines = text.splitlines()

    _parse_host_push_messages(lines, report)
    _parse_optimized_network(lines, report)
    _parse_pclks_tables(lines, report)
    _parse_filter_lock_spec(lines, report)
    _parse_results(lines, report)

    return report


# ---------------------------------------------------------------------------
# "pushed to Host" messages
# ---------------------------------------------------------------------------

_PUSH_RE = re.compile(
    r"^(.+?)\s+\(operator_id:\s*\d+\)\s+pushed to Host;?\s*(.*)",
    re.IGNORECASE,
)

def _parse_host_push_messages(lines: list[str], report: ExploreReport) -> None:
    for line in lines:
        m = _PUSH_RE.match(line.strip())
        if m:
            report.host_push_messages.append(line.strip())


# ---------------------------------------------------------------------------
# Optimized-network table
# ---------------------------------------------------------------------------

_NET_HEADER_RE = re.compile(
    r'^\s*LyrNum\s*,\s*OP\s*,\s*idT\s*,\s*CdT\s*,\s*odT\s*,\s*EU\s*,'
)

def _parse_optimized_network(lines: list[str], report: ExploreReport) -> None:
    idx = _find_line(lines, _NET_HEADER_RE)
    if idx is None:
        return

    for line in lines[idx + 1:]:
        stripped = line.strip()
        if not stripped or stripped.startswith(('UMEM', 'Filter lock', 'INFO')):
            break
        parts = [p.strip() for p in stripped.split(',')]
        if len(parts) < 17:
            continue
        try:
            layer = ExploreLayer(
                lyr_num=int(parts[0]),
                op=parts[1],
                input_dtype=parts[2],
                coeff_dtype=parts[3],
                output_dtype=parts[4],
                eu=parts[5],
                ih=int(parts[6]), iw=int(parts[7]), ic=int(parts[8]),
                strh=int(parts[9]), strw=int(parts[10]),
                rh=int(parts[11]), rw=int(parts[12]),
                oh=int(parts[13]), ow=int(parts[14]), oc=int(parts[15]),
                lyr_name=parts[16],
            )
            report.layers.append(layer)
        except (ValueError, IndexError):
            continue


# ---------------------------------------------------------------------------
# Per-group PClks / FLock tables
# ---------------------------------------------------------------------------

_PCLKS_HEADER_RE = re.compile(
    r"^\s*Lyr\s*,\s*OP\s*,\s*EU\s*,\s*PClks\s*,"
)

def _parse_pclks_tables(lines: list[str], report: ExploreReport) -> None:
    by_lyr = {ly.lyr_num: ly for ly in report.layers}
    start = 0
    while True:
        idx = _find_line(lines, _PCLKS_HEADER_RE, start)
        if idx is None:
            break
        # Parse header to find column indices
        header_parts = [
            h.strip() for h in lines[idx].strip().split(',')
        ]
        pclks_col = _col_index(header_parts, "PClks")
        flock_col = _col_index(header_parts, "FLock")

        for line in lines[idx + 1:]:
            stripped = line.strip()
            if not stripped or stripped.startswith(('CustomOP', 'Filter')):
                break
            parts = [p.strip() for p in stripped.split(',')]
            if len(parts) < 4:
                continue
            try:
                lyr_num = int(parts[0])
                pclks = int(parts[pclks_col]) if pclks_col >= 0 else 0
                flock = False
                if flock_col >= 0 and flock_col < len(parts):
                    flock = parts[flock_col].strip().lower() == 'true'
            except (ValueError, IndexError):
                continue
            if lyr_num in by_lyr:
                by_lyr[lyr_num].pclks = pclks
                by_lyr[lyr_num].filter_locked = flock
        start = idx + 1


# ---------------------------------------------------------------------------
# UMEM Filter lock Spec
# ---------------------------------------------------------------------------

def _parse_filter_lock_spec(lines: list[str], report: ExploreReport) -> None:
    idx = _find_line_startswith(lines, 'UMEM Filter lock Spec')
    if idx is None:
        idx = _find_line_startswith(lines, 'Filter lock Spec')
    if idx is None:
        return

    spec = report.filter_lock
    for line in lines[idx + 1:]:
        stripped = line.strip()
        if not stripped:
            break
        if stripped.startswith('Reserved'):
            parts = stripped.split(',')
            if len(parts) >= 2:
                spec.reserved_bytes = _int(parts[1])
        elif stripped.startswith('Lyr,'):
            parts = stripped.split(',')
            if len(parts) >= 3:
                spec.per_layer[_int(parts[1])] = _int(parts[2])
        elif stripped.startswith('Network locked filter size'):
            spec.network_total_bytes = _int(stripped.split(':')[-1])
        elif stripped.startswith('Total locked filter size'):
            pass
        elif stripped.startswith('UmemScratchStartOffset'):
            spec.ubuf_scratch_start_offset = _int(stripped.split(':')[-1])


# ---------------------------------------------------------------------------
# Results summary
# ---------------------------------------------------------------------------

_KV_RE = re.compile(r'^\s*(.+?)\s*:\s*([\d.,]+)')

def _parse_results(lines: list[str], report: ExploreReport) -> None:
    idx = _find_line_startswith(lines, 'Results')
    if idx is None:
        idx = _find_line_startswith(lines, '****')
        if idx is None:
            return
        results_idx = _find_line_startswith(lines, 'Results', idx)
        if results_idx is not None:
            idx = results_idx

    s = report.summary
    for line in lines[idx + 1:]:
        stripped = line.strip()
        if stripped.startswith(('****', '*')):
            if s.total_clks > 0:
                break
            continue
        m = _KV_RE.match(stripped)
        if not m:
            continue
        key = m.group(1).strip()
        val_str = m.group(2).replace(',', '')

        if 'TotalClks' in key and 'Neo' not in key and 'DSP' not in key:
            s.total_clks = _int(val_str)
        elif 'TotalNeoClks' in key:
            s.total_neo_clks = _int(val_str)
        elif 'TotalDSPClks' in key:
            s.total_dsp_clks = _int(val_str)
        elif key == 'FPS':
            s.fps = _float(val_str)
        elif 'Read BW' in key:
            s.dram_read_bw_mbps = _float(val_str)
        elif 'Write BW' in key:
            s.dram_write_bw_mbps = _float(val_str)
        elif 'DRAM Activation Read' in key:
            s.dram_activation_read_kb = _float(val_str)
        elif 'DRAM Filter Read' in key:
            s.dram_filter_read_kb = _float(val_str)
        elif 'DRAM Write Volume' in key or (
            key.startswith('DRAM Write') and 'BW' not in key
        ):
            s.dram_write_kb = _float(val_str)
        elif 'L0SRAM' in key:
            s.l0sram_kb = _float(val_str)
        elif 'AXI_SRAM' in key or 'AXI SRAM' in key:
            s.axi_sram_kb = _float(val_str)
        elif 'DRAM Scratch' in key:
            s.dram_scratch_kb = _float(val_str)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _col_index(header: list[str], name: str) -> int:
    """Find the index of a column by name in a header row."""
    for i, col in enumerate(header):
        if col.strip() == name:
            return i
    return -1


def _find_line(lines: list[str], pattern: re.Pattern, start: int = 0) -> int | None:
    for i in range(start, len(lines)):
        if pattern.search(lines[i]):
            return i
    return None


def _find_line_startswith(lines: list[str], prefix: str, start: int = 0) -> int | None:
    for i in range(start, len(lines)):
        if lines[i].strip().startswith(prefix):
            return i
    return None


def _int(s: str) -> int:
    try:
        return int(s.strip())
    except ValueError:
        return 0


def _float(s: str) -> float:
    try:
        return float(s.strip())
    except ValueError:
        return 0.0
