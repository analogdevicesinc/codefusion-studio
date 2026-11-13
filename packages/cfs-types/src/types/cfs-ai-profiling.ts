/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type { ReportInfo } from "./cfs-ai.js";

export interface CfsAiProfilingData {
	Soc: string;
	Package: string;
	BoardName: string;
	Timestamp: string;
	Version: string;
	Debuggers: Record<string, string>;
	Output: {
		Interface: "UART" | "JTAG";
		Port?: string;
		Format: "CTF" | "TEXT";
	};
	Cores: string[];

	SelectedPort?: string;
	SelectedDebugger?: string;
}

export type CfsAiProfilingRamStatus = "CRITICAL" | "WARNING" | "OK";

export interface CfsAiProfilingLayerPerformance {
	layer_idx: number;
	layer_name: string | null;
	operator_type: string | null;
	cycles: number | null;
	latency_ms: number | null;
	energy_uj: number | null;
	power_mw: number | null;
	is_accelerated: boolean;
	macs: number | null;
	memory_kb: number | null;
}

export interface CfsAiProfilingOptimizationSuggestion {
	category: string;
	description: string;
	estimated_improvement: string | null;
	complexity: string | null;
	priority: string | null;
}

export interface CfsAiProfilingOptimizationOpportunity {
	layer_index: number;
	op_type: string;
	parameter_memory_kb: number;
	macs: number | null;
	/** Stringified `[input_shape, bias]` kernel tensor shapes. */
	kernel_info: string | null;
	suggestion: string | null;
}

export interface CfsAiProfilingOptimizationOpportunities {
	total_parameter_memory_kb: number;
	total_macs: number;
	layerwise_opportunities: CfsAiProfilingOptimizationOpportunity[];
	macs_opportunities: CfsAiProfilingOptimizationOpportunity[];
}

export interface CfsAiProfilingError {
	message: string;
	code: string | null;
	details: Record<string, unknown> | null;
}

export interface CfsAiProfilingModelSummary {
	model_name: string | null;
	model_path: string | null;
	model_hash?: string;
	framework: string | null;
	model_size_kb: number | null;
	target_dtype: string | null;
	layer_count: number | null;
	total_parameters: number | null;
}

export interface CfsAiProfilingHardwareMetrics {
	total_cycles: number | null;
	estimated_latency_ms: number | null;
	estimated_power_mw: number | null;
	peak_memory_kb: number | null;
	peak_memory_mb: number | null;
	available_ram_kb: number | null;
	accelerated_layers: number | null;
	cpu_only_layers: number | null;
}

export interface CfsAiProfilingMemoryAnalysis {
	model_peak_ram_kb: number;
	available_ram_kb: number | null;
	ram_utilization_percent: number | null;
	ram_status: CfsAiProfilingRamStatus;
	memory_issues: string[];
	memory_recommendations: string[];
}

export interface CfsAiProfilingReport {
	type: "profile";
	model_summary: CfsAiProfilingModelSummary | null;
	hardware_metrics: CfsAiProfilingHardwareMetrics | null;
	memory_analysis: CfsAiProfilingMemoryAnalysis | null;
	layer_performance: CfsAiProfilingLayerPerformance[] | null;
	optimization_suggestions:
		| CfsAiProfilingOptimizationSuggestion[]
		| null;
	optimization_opportunities: CfsAiProfilingOptimizationOpportunities | null;
	errors: CfsAiProfilingError[] | null;
	info: ReportInfo | null;
}
