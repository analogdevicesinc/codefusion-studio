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

import * as fs from "node:fs";
import * as path from "node:path";
import type {
	CfsAiRuntimeHardwareMetrics,
	CfsAiRuntimeInferenceSummary,
	CfsAiRuntimeLayerPerformance,
	CfsAiRuntimeMemoryAnalysis,
	CfsAiRuntimeModelSummary,
	CfsAiRuntimeProfilingReport,
	CfsConfig,
	CfsSocDataModel,
	SocAi
} from "cfs-types";

interface TefEvent {
	name: string;
	ph: string;
	ts: number;
	pid: number;
	tid: number;
	args?: Record<string, unknown>;
}

export class InvalidTefError extends Error {
	public readonly name = "InvalidTefError";

	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, InvalidTefError.prototype);
	}
}

interface OpStats {
	subgraph_idx: number;
	op_idx: number;
	tag: string;
	runtime: string;
	durations_us: number[];
	arena_used_bytes: number;
}

function parseTefEvents(
	raw: string,
	tefFilePath: string
): TefEvent[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		throw new InvalidTefError(
			`Invalid TEF file ${tefFilePath}: not valid JSON (${(error as Error).message})`
		);
	}

	if (!Array.isArray(parsed)) {
		throw new InvalidTefError(
			`Invalid TEF file ${tefFilePath}: expected a JSON array of trace events`
		);
	}

	const invalidIndex = parsed.findIndex(
		(event) =>
			typeof event !== "object" ||
			event === null ||
			typeof event.name !== "string" ||
			typeof event.ph !== "string"
	);
	if (invalidIndex !== -1) {
		throw new InvalidTefError(
			`Invalid TEF file ${tefFilePath}: event ${invalidIndex} is missing a string "name" or "ph"`
		);
	}

	return parsed as TefEvent[];
}

function avg(values: number[]): number {
	return values.reduce((a, b) => a + b, 0) / values.length;
}

// Math.min/Math.max(...values) throws a RangeError once the array exceeds the engine's
// argument limit (~100k elements), which long captures can potentially reach. Reduce instead.
function min(values: number[]): number {
	return values.reduce((a, b) => (b < a ? b : a), Infinity);
}

function max(values: number[]): number {
	return values.reduce((a, b) => (b > a ? b : a), -Infinity);
}

function stdDev(values: number[], mean: number): number {
	return Math.sqrt(
		values.reduce((acc, v) => acc + (v - mean) ** 2, 0) /
			values.length
	);
}

// Case-insensitive, symbol-stripped op name for matching TEF tags against data model names.
// e.g. "FULLY_CONNECTED" and "FullyConnected" both normalize to "fullyconnected".
function normalizeOpName(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveAiHardware(
	datamodel: CfsSocDataModel,
	coreId: string,
	acceleratorName?: string | null
): SocAi | undefined {
	if (acceleratorName) {
		const peripheral = datamodel.Peripherals.find(
			(p) => p.Name === acceleratorName && p.Ai
		);
		if (peripheral?.Ai) return peripheral.Ai as SocAi;
	}
	const core = datamodel.Cores.find(
		(c) => c.Id === coreId || c.Name === coreId
	);
	return core?.Ai as SocAi | undefined;
}

function findEnabledAiModel(cfsconfig: CfsConfig) {
	for (const project of cfsconfig.Projects) {
		const model = project.AIModels?.find((m) => m.Enabled);
		if (model) return { model, project };
	}
	// No enabled model in any project - fall back to the first model found.
	for (const project of cfsconfig.Projects) {
		const model = project.AIModels?.[0];
		if (model) return { model, project };
	}
	return undefined;
}

/**
 * Parses a TEF file and builds the runtime profile report content in memory,
 * without writing anything to disk.
 * @param tefFilePath path to the tef file to convert
 * @param datamodel optional SoC data model for hardware enrichment (cycles, energy, accelerated ops)
 * @param cfsconfig optional CFS config for model name/path and target information
 * @returns the parsed runtime profile report
 */
export async function buildRuntimeReportFromTef(
	tefFilePath: string,
	datamodel?: CfsSocDataModel,
	cfsconfig?: CfsConfig
): Promise<CfsAiRuntimeProfilingReport> {
	const raw = await fs.promises.readFile(tefFilePath, "utf8");
	const events = parseTefEvents(raw, tefFilePath);

	// --- Parse events ---
	// Per-tid, per-name stacks of begin timestamps (LIFO, handles nested INFERENCE > MODEL::* events)
	const stacks = new Map<number, Map<string, number[]>>();
	const inferenceRuns_us: number[] = [];
	const opStatsMap = new Map<string, OpStats>(); // key: `${subgraph_idx}_${op_idx}`
	const threadNames = new Map<number, string>(); // tid -> name
	const threadMeta = new Map<
		number,
		{ stack_base?: number; stack_size?: number }
	>();
	let runtime = "";
	let modelId: number | undefined;
	let inferenceTid: number | undefined;

	for (const event of events) {
		if (event.ph === "M") {
			const name = event.args?.name as string | undefined;
			if (
				name &&
				(event.name === "THREAD" || event.name === "thread_name")
			) {
				threadNames.set(event.tid, name);
				threadMeta.set(event.tid, {
					stack_base: event.args?.stack_base as number | undefined,
					stack_size: event.args?.stack_size as number | undefined
				});
			}
			continue;
		}

		const isInference = event.name.startsWith("INFERENCE::");
		const isOp = /^MODEL\d*::/.test(event.name);

		if (event.ph === "B") {
			if (!stacks.has(event.tid)) stacks.set(event.tid, new Map());
			const tidStack = stacks.get(event.tid)!;
			if (!tidStack.has(event.name)) tidStack.set(event.name, []);
			tidStack.get(event.name)!.push(event.ts);

			if (isInference) {
				modelId ??= event.args?.model_id as number | undefined;
				inferenceTid ??= event.tid;
			}
			if (isOp && event.args?.runtime) {
				runtime = event.args.runtime as string;
			}
		} else if (event.ph === "E") {
			const beginTs = stacks.get(event.tid)?.get(event.name)?.pop();
			if (beginTs === undefined) continue;
			const duration_us = event.ts - beginTs;

			if (isInference) {
				inferenceRuns_us.push(duration_us);
			} else if (isOp && event.args?.op_idx !== undefined) {
				const subgraph_idx = (event.args.subgraph_idx as number) ?? 0;
				const op_idx = event.args.op_idx as number;
				const key = `${subgraph_idx}_${op_idx}`;

				if (!opStatsMap.has(key)) {
					opStatsMap.set(key, {
						subgraph_idx,
						op_idx,
						tag: (event.args.tag as string) ?? "UNKNOWN",
						runtime: (event.args.runtime as string) ?? runtime,
						durations_us: [],
						arena_used_bytes:
							(event.args.arena_used_bytes as number) ?? 0
					});
				}
				opStatsMap.get(key)!.durations_us.push(duration_us);
				if (event.args.runtime)
					runtime = event.args.runtime as string;
			}
		}
	}

	// --- Enrich with data model / config ---
	const aiModelInfo = cfsconfig
		? findEnabledAiModel(cfsconfig)
		: undefined;
	const aiModel = aiModelInfo?.model;

	let socAi: SocAi | undefined;
	if (datamodel && aiModel) {
		socAi = resolveAiHardware(
			datamodel,
			aiModel.Target.Core,
			aiModel.Target.Accelerator
		);
	}

	// --- Inference summary ---
	const runs_ms = inferenceRuns_us.map((d) => d / 1000);
	const iterations = runs_ms.length;
	const totalLatency_ms = runs_ms.reduce((a, b) => a + b, 0);
	const avgLatency_ms =
		iterations > 0 ? totalLatency_ms / iterations : 0;
	const inference_summary: CfsAiRuntimeInferenceSummary = {
		iterations,
		total_latency_ms: totalLatency_ms,
		avg_latency_ms: avgLatency_ms,
		min_latency_ms: iterations > 0 ? min(runs_ms) : 0,
		max_latency_ms: iterations > 0 ? max(runs_ms) : 0,
		std_latency_ms:
			iterations > 0 ? stdDev(runs_ms, avgLatency_ms) : 0,
		throughput_ips: avgLatency_ms > 0 ? 1000 / avgLatency_ms : 0
	};

	// --- Per-layer performance ---
	const coreClock = socAi?.CoreClock ?? 0;
	const accelOpsNorm = new Set(
		(socAi?.AccelOps ?? []).map(normalizeOpName)
	);

	const sortedOps = [...opStatsMap.values()].sort(
		(a, b) => a.subgraph_idx - b.subgraph_idx || a.op_idx - b.op_idx
	);

	// Use sum of per-layer averages as the denominator for latency_percent so percentages
	// reflect measured layer time, not the full inference duration (which includes overhead).
	const totalLayerTime_ms = sortedOps.reduce(
		(acc, op) => acc + avg(op.durations_us) / 1000,
		0
	);

	const layer_performance: CfsAiRuntimeLayerPerformance[] =
		sortedOps.map((op) => {
			const normTag = normalizeOpName(op.tag);
			const avgDur_us = avg(op.durations_us);
			const avgDur_ms = avgDur_us / 1000;
			const totalDur_ms =
				op.durations_us.reduce((a, b) => a + b, 0) / 1000;
			const minDur_ms = min(op.durations_us) / 1000;
			const maxDur_ms = max(op.durations_us) / 1000;

			const cycles =
				coreClock > 0 ? Math.round(avgDur_us * coreClock) : 0;
			const isAccelerated = accelOpsNorm.has(normTag);

			return {
				layer_idx: op.op_idx,
				layer_name: `${op.tag}_${op.subgraph_idx}_${op.op_idx}`,
				operator_type: op.tag,
				cycles,
				is_accelerated: isAccelerated,
				memory_kb: op.arena_used_bytes / 1024,
				subgraph_idx: op.subgraph_idx,
				invocations: op.durations_us.length,
				avg_latency_ms: avgDur_ms,
				min_latency_ms: minDur_ms,
				max_latency_ms: maxDur_ms,
				total_latency_ms: totalDur_ms,
				latency_percent:
					totalLayerTime_ms > 0
						? (avgDur_ms / totalLayerTime_ms) * 100
						: 0,
				arena_used_bytes: op.arena_used_bytes
			};
		});

	// --- Hardware metrics (reuse existing shape; estimated_latency_ms = measured avg) ---
	const peakArena_bytes = Math.max(
		0,
		max(sortedOps.map((op) => op.arena_used_bytes))
	);
	const peakMemory_kb = peakArena_bytes / 1024;
	const availableRam_kb = socAi ? socAi.RamSize : 0; // Ram size in the data model is in kB
	const acceleratedLayerCount = layer_performance.filter(
		(l) => l.is_accelerated
	).length;

	const hardware_metrics: CfsAiRuntimeHardwareMetrics = {
		total_cycles: layer_performance.reduce((a, l) => a + l.cycles, 0),
		estimated_latency_ms: avgLatency_ms,
		peak_memory_kb: peakMemory_kb,
		peak_memory_mb: peakArena_bytes / (1024 * 1024),
		available_ram_kb: availableRam_kb,
		accelerated_layers: acceleratedLayerCount,
		cpu_only_layers: layer_performance.length - acceleratedLayerCount
	};

	const ramUtilization =
		availableRam_kb > 0
			? Math.round((peakMemory_kb / availableRam_kb) * 100)
			: 0;
	const memory_analysis: CfsAiRuntimeMemoryAnalysis = {
		model_peak_ram_kb: peakMemory_kb,
		available_ram_kb: availableRam_kb,
		ram_utilization_percent: ramUtilization,
		ram_status:
			ramUtilization > 90
				? "CRITICAL"
				: ramUtilization > 70
					? "WARNING"
					: "OK"
	};

	// --- info.hardware (zeros when data model unavailable) ---
	const hardwareTarget = (() => {
		if (socAi?.Target) {
			return {
				Soc: socAi.Target.Soc ?? cfsconfig?.Soc ?? "",
				Core: socAi.Target.Core ?? aiModel?.Target.Core ?? "",
				Package: socAi.Target.Package ?? cfsconfig?.Package ?? null,
				Accelerator:
					socAi.Target.Accelerator ??
					aiModel?.Target.Accelerator ??
					null
			};
		}
		if (cfsconfig && aiModel) {
			return {
				Soc: cfsconfig.Soc,
				Core: aiModel.Target.Core,
				Package: cfsconfig.Package,
				Accelerator: aiModel.Target.Accelerator ?? null
			};
		}
		return null;
	})();

	const hardware = {
		FlashSize: socAi?.FlashSize ?? 0,
		RamSize: socAi?.RamSize ?? 0,
		CoreClock: socAi?.CoreClock ?? 0,
		SupportedOps: socAi?.SupportedOps ?? [],
		AccelOps: socAi?.AccelOps ?? [],
		SupportedDataTypes: socAi?.SupportedDataTypes ?? [],
		OperatorInfos: socAi?.OperatorInfos ?? [],
		Target: hardwareTarget
	};

	// --- model_summary ---
	const modelName = aiModel?.Name ?? `model_${modelId ?? "unknown"}`;
	const modelPath =
		Object.values(aiModel?.Files ?? {}).find(
			(v) => typeof v === "string"
		) ?? "";

	const model_summary: CfsAiRuntimeModelSummary = {
		model_name: modelName,
		model_path: modelPath,
		framework: runtime || aiModel?.Backend?.Name || "Unknown",
		layer_count: sortedOps.length
	};

	// --- Thread info ---
	// Only report the thread that emitted the inference events; other
	// threads in the trace are unrelated to the profiled model.
	const threadName =
		inferenceTid !== undefined
			? threadNames.get(inferenceTid)
			: undefined;
	const thread =
		inferenceTid !== undefined && threadName !== undefined
			? { name: threadName, ...threadMeta.get(inferenceTid) }
			: undefined;

	// --- Assemble report ---
	const report: CfsAiRuntimeProfilingReport = {
		type: "runtime-profile",
		info: {
			timestamp: new Date().toISOString(),
			version: "1.0.0",
			hardware,
			...(thread && { thread })
		},
		model_summary,
		inference_summary,
		hardware_metrics,
		memory_analysis,
		layer_performance
	};

	return report;
}

/**
 * Options for {@link convertTefToReport}.
 */
export interface TefToReportOptions {
	/** Optional SoC data model for hardware enrichment (cycles, energy, accelerated ops). */
	datamodel?: CfsSocDataModel;
	/** Optional CFS config for model name/path and target information. */
	cfsconfig?: CfsConfig;
	/** Output path. Defaults to `<tef name>_runtime_report.cfsreport` next to the TEF file. */
	outputPath?: string;
}

/**
 * Converts a TEF file to a report and writes it to a `.cfsreport` file,
 * for callers that need a real file on disk (e.g. to open it as an editor tab).
 * @param tefFilePath path to the tef file to convert
 * @param options optional enrichment inputs and output path
 * @returns path to the written .cfsreport file
 */
export async function convertTefToReport(
	tefFilePath: string,
	options: TefToReportOptions = {}
): Promise<string> {
	const report = await buildRuntimeReportFromTef(
		tefFilePath,
		options.datamodel,
		options.cfsconfig
	);

	const parsed = path.parse(tefFilePath);
	const outputPath =
		options.outputPath ??
		path.join(parsed.dir, `${parsed.name}_runtime_report.cfsreport`);
	await fs.promises.writeFile(
		outputPath,
		JSON.stringify(report, null, 2),
		"utf8"
	);

	return outputPath;
}
