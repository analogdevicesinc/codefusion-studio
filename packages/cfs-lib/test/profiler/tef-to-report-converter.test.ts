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

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect } from "chai";
import {
	buildRuntimeReportFromTef,
	convertTefToReport,
	InvalidTefError
} from "../../src/profiler/tef-to-report-converter.js";

interface TefEvent {
	name: string;
	ph: string;
	ts: number;
	pid: number;
	tid: number;
	args?: Record<string, unknown>;
}

const inference = (
	ph: "B" | "E",
	ts: number,
	args?: Record<string, unknown>
): TefEvent => ({
	name: "INFERENCE::run",
	ph,
	ts,
	pid: 1,
	tid: 1,
	args
});

const op = (
	ph: "B" | "E",
	ts: number,
	opIdx: number,
	tag: string
): TefEvent => ({
	name: "MODEL0::op",
	ph,
	ts,
	pid: 1,
	tid: 1,
	args: {
		subgraph_idx: 0,
		op_idx: opIdx,
		tag,
		runtime: "tflm",
		arena_used_bytes: 2048
	}
});

// Two inference runs (1000us and 2000us); op 0 takes 400us/600us, op 1 takes 1000us/1000us.
const SAMPLE_EVENTS: TefEvent[] = [
	{
		name: "THREAD",
		ph: "M",
		ts: 0,
		pid: 1,
		tid: 1,
		args: { name: "inference_thread", stack_size: 4096 }
	},
	inference("B", 0, { model_id: 7 }),
	op("B", 0, 0, "CONV_2D"),
	op("E", 400, 0, "CONV_2D"),
	op("B", 400, 1, "SOFTMAX"),
	op("E", 1400, 1, "SOFTMAX"),
	inference("E", 1000),
	inference("B", 2000, { model_id: 7 }),
	op("B", 2000, 0, "CONV_2D"),
	op("E", 2600, 0, "CONV_2D"),
	op("B", 2600, 1, "SOFTMAX"),
	op("E", 3600, 1, "SOFTMAX"),
	inference("E", 4000)
];

describe("tef-to-report-converter", () => {
	let tmpDir: string;
	let tefPath: string;

	before(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cfs-tef-"));
		tefPath = path.join(tmpDir, "sample.tef");
		await fs.writeFile(tefPath, JSON.stringify(SAMPLE_EVENTS));
	});

	after(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	describe("buildRuntimeReportFromTef", () => {
		it("aggregates the inference summary over all runs", async () => {
			const report = await buildRuntimeReportFromTef(tefPath);

			expect(report.type).to.equal("runtime-profile");
			expect(report.inference_summary.iterations).to.equal(2);
			expect(report.inference_summary.total_latency_ms).to.equal(3);
			expect(report.inference_summary.avg_latency_ms).to.equal(1.5);
			expect(report.inference_summary.min_latency_ms).to.equal(1);
			expect(report.inference_summary.max_latency_ms).to.equal(2);
			expect(report.inference_summary.std_latency_ms).to.equal(0.5);
		});

		it("aggregates per-layer statistics across invocations", async () => {
			const report = await buildRuntimeReportFromTef(tefPath);

			expect(report.layer_performance).to.have.length(2);
			const [conv, softmax] = report.layer_performance;
			expect(conv.operator_type).to.equal("CONV_2D");
			expect(conv.invocations).to.equal(2);
			expect(conv.avg_latency_ms).to.equal(0.5);
			expect(conv.min_latency_ms).to.equal(0.4);
			expect(conv.max_latency_ms).to.equal(0.6);
			expect(softmax.operator_type).to.equal("SOFTMAX");
			expect(softmax.avg_latency_ms).to.equal(1);
			expect(conv.memory_kb).to.equal(2);
		});

		it("takes the model id and thread info from the trace", async () => {
			const report = await buildRuntimeReportFromTef(tefPath);

			expect(report.model_summary.model_name).to.equal("model_7");
			expect(report.info.thread?.name).to.equal("inference_thread");
			expect(report.info.thread?.stack_size).to.equal(4096);
		});

		it("reports the thread that emitted the inference events, not the first metadata thread", async () => {
			const events: TefEvent[] = [
				{
					name: "THREAD",
					ph: "M",
					ts: 0,
					pid: 1,
					tid: 9,
					args: { name: "unrelated_thread", stack_size: 1024 }
				},
				{
					name: "THREAD",
					ph: "M",
					ts: 0,
					pid: 1,
					tid: 1,
					args: { name: "inference_thread", stack_size: 4096 }
				},
				inference("B", 0, { model_id: 7 }),
				inference("E", 1000)
			];
			const multiThreadPath = path.join(tmpDir, "multi-thread.tef");
			await fs.writeFile(multiThreadPath, JSON.stringify(events));

			const report = await buildRuntimeReportFromTef(multiThreadPath);

			expect(report.info.thread?.name).to.equal("inference_thread");
			expect(report.info.thread?.stack_size).to.equal(4096);
		});

		it("resolves the inference thread when its metadata follows the inference events", async () => {
			const events: TefEvent[] = [
				inference("B", 0, { model_id: 7 }),
				inference("E", 1000),
				{
					name: "THREAD",
					ph: "M",
					ts: 0,
					pid: 1,
					tid: 9,
					args: { name: "unrelated_thread" }
				},
				{
					name: "THREAD",
					ph: "M",
					ts: 0,
					pid: 1,
					tid: 1,
					args: { name: "inference_thread" }
				}
			];
			const lateMetaPath = path.join(tmpDir, "late-meta.tef");
			await fs.writeFile(lateMetaPath, JSON.stringify(events));

			const report = await buildRuntimeReportFromTef(lateMetaPath);

			expect(report.info.thread?.name).to.equal("inference_thread");
		});

		it("omits thread info when the inference thread has no metadata", async () => {
			const events: TefEvent[] = [
				{
					name: "THREAD",
					ph: "M",
					ts: 0,
					pid: 1,
					tid: 9,
					args: { name: "unrelated_thread", stack_size: 1024 }
				},
				inference("B", 0, { model_id: 7 }),
				inference("E", 1000)
			];
			const noMetaPath = path.join(tmpDir, "no-inference-meta.tef");
			await fs.writeFile(noMetaPath, JSON.stringify(events));

			const report = await buildRuntimeReportFromTef(noMetaPath);

			expect(report.info.thread).to.equal(undefined);
		});

		it("leaves hardware fields empty without a data model", async () => {
			const report = await buildRuntimeReportFromTef(tefPath);

			expect(report.info.hardware.Target).to.equal(null);
			expect(report.info.hardware.CoreClock).to.equal(0);
			expect(report.hardware_metrics.total_cycles).to.equal(0);
			expect(report.hardware_metrics.available_ram_kb).to.equal(0);
		});

		it("handles traces longer than the spread argument limit", async () => {
			// Math.min/max(...values) throws a RangeError above ~100k elements.
			const runs = 150_000;
			const events: TefEvent[] = [];
			for (let i = 0; i < runs; i++) {
				const start = i * 10_000;
				const duration = 1000 + (i % 10);
				events.push(
					inference("B", start),
					op("B", start, 0, "CONV_2D"),
					op("E", start + duration, 0, "CONV_2D"),
					inference("E", start + duration)
				);
			}
			const longTefPath = path.join(tmpDir, "long.tef");
			await fs.writeFile(longTefPath, JSON.stringify(events));

			const report = await buildRuntimeReportFromTef(longTefPath);

			expect(report.inference_summary.iterations).to.equal(runs);
			expect(report.inference_summary.min_latency_ms).to.equal(1);
			expect(report.inference_summary.max_latency_ms).to.equal(1.009);
			expect(report.layer_performance[0].invocations).to.equal(runs);
			expect(report.layer_performance[0].min_latency_ms).to.equal(1);
			expect(report.layer_performance[0].max_latency_ms).to.equal(
				1.009
			);
		});

		describe("invalid content", () => {
			const rejectsWithInvalidTef = async (
				fileName: string,
				content: string
			): Promise<Error> => {
				const filePath = path.join(tmpDir, fileName);
				await fs.writeFile(filePath, content);

				let error: unknown;
				try {
					await buildRuntimeReportFromTef(filePath);
				} catch (e) {
					error = e;
				}

				expect(error).to.be.instanceOf(InvalidTefError);
				return error as Error;
			};

			it("rejects content that is not valid JSON", async () => {
				const error = await rejectsWithInvalidTef(
					"not-json.tef",
					"not json {"
				);

				expect(error.message).to.include("not valid JSON");
			});

			it("rejects JSON that is not an array of events", async () => {
				const error = await rejectsWithInvalidTef(
					"object.tef",
					'{"a": 1}'
				);

				expect(error.message).to.include("JSON array");
			});

			it("rejects events without a string name and ph", async () => {
				const error = await rejectsWithInvalidTef(
					"bad-event.tef",
					JSON.stringify([SAMPLE_EVENTS[0], { ts: 1 }])
				);

				expect(error.message).to.include("event 1");
			});

			it("accepts an empty trace and reports no inferences", async () => {
				const emptyPath = path.join(tmpDir, "empty.tef");
				await fs.writeFile(emptyPath, "[]");

				const report = await buildRuntimeReportFromTef(emptyPath);

				expect(report.inference_summary.iterations).to.equal(0);
				expect(report.layer_performance).to.have.length(0);
				expect(report.info.thread).to.equal(undefined);
			});
		});

		it("rejects when the file does not exist", async () => {
			let error: unknown;
			try {
				await buildRuntimeReportFromTef(
					path.join(tmpDir, "missing.tef")
				);
			} catch (e) {
				error = e;
			}

			expect(error).to.be.instanceOf(Error);
		});
	});

	describe("convertTefToReport", () => {
		it("writes next to the input by default", async () => {
			const outputPath = await convertTefToReport(tefPath);

			expect(outputPath).to.equal(
				path.join(tmpDir, "sample_runtime_report.cfsreport")
			);
			const written = JSON.parse(
				await fs.readFile(outputPath, "utf8")
			);
			expect(written.type).to.equal("runtime-profile");
		});

		it("writes to an explicit output path", async () => {
			const explicit = path.join(tmpDir, "custom.cfsreport");

			const outputPath = await convertTefToReport(tefPath, {
				outputPath: explicit
			});

			expect(outputPath).to.equal(explicit);
			const written = JSON.parse(await fs.readFile(explicit, "utf8"));
			expect(written.inference_summary.iterations).to.equal(2);
		});
	});
});
