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

type RamStatus = "CRITICAL" | "WARNING" | "OK";

/** Thread that emitted the inference events in the trace. */
export interface CfsAiRuntimeThreadInfo {
	name: string;
	stack_base?: number;
	stack_size?: number;
}

export interface CfsAiRuntimeModelSummary {
	model_name: string;
	model_path: string;
	model_hash?: string;
	framework: string;
	layer_count: number;
}

/** Latency statistics over all measured inference runs. */
export interface CfsAiRuntimeInferenceSummary {
	iterations: number;
	total_latency_ms: number;
	avg_latency_ms: number;
	min_latency_ms: number;
	max_latency_ms: number;
	std_latency_ms: number;
	/** Inferences per second. */
	throughput_ips: number;
}

export interface CfsAiRuntimeHardwareMetrics {
	total_cycles: number;
	/** Measured average inference latency. */
	estimated_latency_ms: number;
	peak_memory_kb: number;
	peak_memory_mb: number;
	available_ram_kb: number;
	accelerated_layers: number;
	cpu_only_layers: number;
}

export interface CfsAiRuntimeMemoryAnalysis {
	model_peak_ram_kb: number;
	available_ram_kb: number;
	ram_utilization_percent: number;
	ram_status: RamStatus;
}

export interface CfsAiRuntimeLayerPerformance {
	layer_idx: number;
	layer_name: string;
	operator_type: string;
	cycles: number;
	is_accelerated: boolean;
	memory_kb: number;
	subgraph_idx: number;
	invocations: number;
	avg_latency_ms: number;
	min_latency_ms: number;
	max_latency_ms: number;
	total_latency_ms: number;
	latency_percent: number;
	arena_used_bytes: number;
}

/**
 * Report built from a runtime trace (TEF) captured on the target device.
 */
export interface CfsAiRuntimeProfilingReport {
	type: "runtime-profile";
	info: ReportInfo & {
		/** Always present; values are zero when no SoC data model was available. */
		hardware: NonNullable<ReportInfo["hardware"]>;
		thread?: CfsAiRuntimeThreadInfo;
	};
	model_summary: CfsAiRuntimeModelSummary;
	inference_summary: CfsAiRuntimeInferenceSummary;
	hardware_metrics: CfsAiRuntimeHardwareMetrics;
	memory_analysis: CfsAiRuntimeMemoryAnalysis;
	layer_performance: CfsAiRuntimeLayerPerformance[];
}
