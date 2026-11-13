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
Adapters that convert an ExploreReport into the legacy report shapes
expected by the TypeScript consumer (``"profile"`` and ``"compat"``).
"""

from __future__ import annotations

from pathlib import Path

from cfsai_model_explorer.schemas import ExploreReport, LayerPerformance
from cfsai_model_explorer.xnnc_runner import DEFAULT_NNE_FREQ

_EXPLORE_DTYPE_TO_CANONICAL: dict[str, str] = {
    "I8": "INT8",
    "U8": "UINT8",
    "I16": "INT16",
    "I32": "INT32",
    "F16": "FLOAT16",
    "F32": "FLOAT32",
}


def adapt_explore_to_profile(report: ExploreReport) -> dict:
    """
    Convert an ExploreReport into the old ResourceProfileReport dict shape.

    Maps explore fields to legacy field names so the TypeScript consumer
    sees ``type: "profile"`` with the expected structure.
    """
    hw = report.hardware_metrics
    mem = report.memory_analysis
    lp = report.layer_performance or []
    info = report.info
    ms = report.model_summary

    peak_ram_kb = 0.0
    flock_per_layer: dict[int, int] = {}
    if mem:
        peak_ram_kb = (
            mem.dram_scratch_kb
            + mem.l0sram_kb
            + mem.axi_sram_kb
            + mem.filter_lock_total_bytes / 1024
        )
        flock_per_layer = mem.filter_lock_per_layer

    available_ram_kb = 0.0
    if info and info.hardware:
        available_ram_kb = info.hardware.ram_size or 0.0

    ram_utilization = 0.0
    ram_status = "OK"
    if available_ram_kb > 0 and peak_ram_kb > 0:
        ram_utilization = (peak_ram_kb / available_ram_kb) * 100
        if peak_ram_kb > available_ram_kb:
            ram_status = "CRITICAL"
        elif ram_utilization > 75:
            ram_status = "WARNING"

    return {
        "type": "profile",
        "model_summary": {
            "model_name": ms.model_name if ms else None,
            "model_path": ms.model_path if ms else None,
            "framework": "XNNC Explore",
            "model_size_kb": _model_size_kb(ms),
            "target_dtype": ms.target_dtype if ms else None,
            "layer_count": len(lp),
            "total_parameters": None,
        },
        "hardware_metrics": {
            "total_cycles": hw.total_clks if hw else 0,
            "estimated_latency_ms": hw.estimated_latency_ms if hw else 0,
            "estimated_power_mw": 0,
            "peak_memory_kb": peak_ram_kb,
            "peak_memory_mb": peak_ram_kb / 1024,
            "available_ram_kb": available_ram_kb,
            "accelerated_layers": hw.accelerated_layers if hw else 0,
            "cpu_only_layers": hw.cpu_only_layers if hw else 0,
        },
        "memory_analysis": {
            "model_peak_ram_kb": peak_ram_kb,
            "available_ram_kb": available_ram_kb,
            "ram_utilization_percent": ram_utilization,
            "ram_status": ram_status,
            "memory_issues": [],
            "memory_recommendations": [],
        },
        "layer_performance": [
            {
                "layer_idx": layer.layer_idx,
                "layer_name": layer.layer_name,
                "operator_type": layer.operator_type,
                "cycles": layer.cycles,
                "latency_ms": (
                    (layer.cycles / (DEFAULT_NNE_FREQ * 1_000_000)) * 1000
                    if layer.cycles else 0
                ),
                "energy_uj": 0,
                "power_mw": 0,
                "is_accelerated": layer.is_accelerated,
                "macs": layer.macs,
                "memory_kb": flock_per_layer.get(layer.layer_idx, 0) / 1024,
            }
            for layer in lp
        ],
        "optimization_suggestions": [],
        "optimization_opportunities": {
            "total_parameter_memory_kb": 0,
            "total_macs": sum(layer.macs for layer in lp),
            "layerwise_opportunities": [],
            "macs_opportunities": [],
        },
        "errors": [
            {"message": e.message, "code": e.code, "details": e.details}
            for e in (report.errors or [])
        ],
        "info": info.model_dump(mode="json") if info else None,
    }


def adapt_explore_to_compat(report: ExploreReport) -> dict:
    """
    Convert an ExploreReport into the old CompatibilityReport dict shape.

    Maps pushed-to-Host operator issues to the legacy ``operator_issues``
    format so the TypeScript consumer sees ``type: "compat"``.
    """
    info = report.info
    ms = report.model_summary
    issues = report.operator_issues or []

    layer_index_by_name = {
        lp.layer_name: lp.layer_idx
        for lp in (report.layer_performance or [])
    }

    operator_issues = [
        {
            "severity": "warning",
            "type": "pushed to host",
            "operator": oi.operator,
            "layers": (
                [layer_index_by_name[oi.layer_name]]
                if oi.layer_name in layer_index_by_name
                else []
            ),
            "suggested_alternative": "Switch to NPU friendly operator",
        }
        for oi in issues
    ] or None

    supported = set()
    if info and info.hardware:
        supported = {
            dt.upper()
            for dt in (info.hardware.supported_data_types or [])
        }
    unsupported_types = _extract_unsupported_types(
        report.layer_performance or [], supported,
    )

    return {
        "type": "compat",
        "memory_issues": None,
        "operator_issues": operator_issues,
        "unsupported_types": unsupported_types or None,
        "model_summary": {
            "model_name": ms.model_name if ms else None,
            "model_path": ms.model_path if ms else None,
        },
        "info": info.model_dump(mode="json") if info else None,
    }


def _extract_unsupported_types(
    layers: list[LayerPerformance],
    supported: set[str],
) -> list[dict]:
    """Build ``unsupported_types`` entries from per-layer dtypes.

    Compares each layer's input/output dtype against the hardware
    profile's ``SupportedDataTypes``.  Returns an empty list when
    the hardware profile declares no type constraints (empty set
    means all are supported).
    """
    if not supported:
        return []

    issues_map: dict[tuple[str, str], list[int]] = {}
    for layer in layers:
        for short_dt in (layer.input_dtype, layer.output_dtype):
            if not short_dt:
                continue
            canonical = _EXPLORE_DTYPE_TO_CANONICAL.get(
                short_dt, short_dt.upper(),
            )
            if canonical not in supported:
                key = (canonical, layer.operator_type)
                issues_map.setdefault(key, []).append(layer.layer_idx)

    return [
        {
            "data_type": dt,
            "operation_type": op,
            "layers": idxs,
            "severity": "critical",
        }
        for (dt, op), idxs in issues_map.items()
    ]


def _model_size_kb(ms: object) -> float:
    """Get model file size in KB, or 0 if unavailable."""
    model_path = getattr(ms, "model_path", None)
    if model_path:
        try:
            return Path(model_path).stat().st_size / 1024
        except OSError:
            pass
    return 0
