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

import { promises as fs } from "node:fs";
import * as path from "path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import fg from "fast-glob";
import type {
	AiBackend,
	AiCommandResult,
	VerifiedConfig,
	VerifiedConfigTarget
} from "cfs-types";
import { AiCommandError } from "../ai-command-error.js";
import {
	getPythonExecutablePath,
	assertFileExists,
	cleanPythonEnv
} from "../python-utils.js";
import { runTflmCodegen } from "../ai-tools.js";
import type {
	TflmModelInput,
	TflmDeferredHeaders
} from "../tflm/tflm.js";
import { caseInsensitiveCompare } from "../../utils/string-utils.js";

interface SummaryField {
	key: string;
	unit?: string;
}

const SUMMARY_FIELDS: readonly SummaryField[] = [
	{ key: "sram_memory_used", unit: "KiB" },
	{ key: "inferences_per_second", unit: "inf/s" },
	{ key: "inference_time", unit: "s" },
	{ key: "nn_macs", unit: "MACs" },
	{ key: "cycles_total", unit: "cycles" }
];

interface VelaSummaryResult {
	text: string;
	sramUsedBytes?: number;
}

const PER_LAYER_FIELDS = [
	"Original Operator",
	"NNG Operator",
	"Target",
	"Op Cycles",
	"Network% (cycles)"
] as const;

export async function generateVela(
	backend: AiBackend,
	vcfgs: VerifiedConfig[],
	cfsAiPath: string,
	cwd: string,
	resolveConfigPath: (soc: string) => Promise<string>,
	deferred?: TflmDeferredHeaders
): Promise<AiCommandResult> {
	const output: AiCommandResult = {
		code: 0,
		validCodes: [0],
		events: [],
		artifacts: { files: [] }
	};

	if (vcfgs.length > backend.MaxModels) {
		output.code = 1;
		output.events.push({
			type: "ERROR",
			message: `Too many models provided. Backend '${backend.Name}' supports a maximum of ${String(backend.MaxModels)} models.`
		});
		throw new AiCommandError(output);
	}

	const velaPath = await assertFileExists(
		getPythonExecutablePath(cfsAiPath, "cfsai"),
		"Vela compiler not found"
	);

	const tmpRoot = await fs.mkdtemp(path.join(tmpdir(), "cfs-vela"));

	try {
		const modelInputs: TflmModelInput[] = [];

		for (const [index, cfg] of vcfgs.entries()) {
			const configPath = await resolveConfigPath(
				cfg.target.Soc ?? ""
			);
			const modelPath = cfg.files["Model"];
			const modelStem = path.basename(
				modelPath,
				path.extname(modelPath)
			);

			const tmpDir = path.join(tmpRoot, String(index));
			await fs.mkdir(tmpDir);

			const { acceleratorConfig, systemConfig, memoryMode } =
				resolveConfig(backend, cfg.target, output);

			const args: string[] = [
				"-m",
				"ethosu.vela",
				"--accelerator-config",
				acceleratorConfig,
				"--optimise",
				String(cfg.backend.Extensions?.["Optimise"] ?? "Performance"),
				"--verbose-performance",
				"--output-dir",
				tmpDir,
				"--config",
				configPath,
				"--system-config",
				systemConfig,
				"--memory-mode",
				memoryMode,
				modelPath
			];

			await runVelaCompiler(velaPath, args, cwd);

			const velaSummary = await buildVelaSummary(tmpDir, modelStem);

			modelInputs.push({
				modelPath: path.join(tmpDir, `${modelStem}_vela.tflite`),
				additionalSummary: velaSummary.text,
				arenaSize: velaSummary.sramUsedBytes
			});
		}

		await runTflmCodegen(vcfgs, output, modelInputs, deferred);
	} finally {
		await fs.rm(tmpRoot, { recursive: true, force: true });
	}

	return output;
}

function resolveConfig(
	backend: AiBackend,
	target: VerifiedConfigTarget,
	output: AiCommandResult
): {
	acceleratorConfig: string;
	systemConfig: string;
	memoryMode: string;
} {
	const config = backend.Targets.find(
		(t) =>
			caseInsensitiveCompare(t.Hardware.Soc, target.Soc) &&
			caseInsensitiveCompare(t.Hardware.Core, target.Core) &&
			caseInsensitiveCompare(
				t.Hardware.Accelerator,
				target.Accelerator
			)
	)?.Hardware?.Config;

	const requiredKeys = [
		"Version",
		"Width",
		"SystemConfiguration",
		"MemoryMode"
	] as const;

	for (const key of requiredKeys) {
		if (config?.[key] === undefined) {
			output.code = 1;
			output.events.push({
				type: "ERROR",
				message: `Unable to resolve "${key}" from backend configuration for SoC/core/acc combination.`
			});
			throw new AiCommandError(output);
		}
	}

	return {
		acceleratorConfig:
			`ethos-${config!.Version}-${config!.Width}`.toLowerCase(),
		systemConfig: String(config!.SystemConfiguration),
		memoryMode: String(config!.MemoryMode)
	};
}

function runVelaCompiler(
	velaPath: string,
	args: string[],
	cwd: string
): Promise<void> {
	return new Promise((resolve, reject) => {
		execFile(
			velaPath,
			args,
			{ env: cleanPythonEnv(), cwd },
			(error, _stdout, stderr) => {
				if (error) {
					reject(
						new AiCommandError({
							code: typeof error.code === "number" ? error.code : 1,
							validCodes: [0],
							events: [
								{
									type: "ERROR",
									message:
										stderr ||
										error.message ||
										"Vela compilation failed."
								}
							]
						})
					);
				} else {
					resolve();
				}
			}
		);
	});
}

function parseCsvRows(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let inQuote = false;
	let i = 0;

	while (i < text.length) {
		const ch = text[i];

		if (inQuote) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 2;
				} else {
					inQuote = false;
					i++;
				}
			} else {
				field += ch;
				i++;
			}
		} else if (ch === '"') {
			inQuote = true;
			i++;
		} else if (ch === ",") {
			row.push(field.trim());
			field = "";
			i++;
		} else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
			row.push(field.trim());
			field = "";
			if (row.some((c) => c.length > 0)) {
				rows.push(row);
			}
			row = [];
			i += ch === "\r" ? 2 : 1;
		} else {
			field += ch;
			i++;
		}
	}

	row.push(field.trim());
	if (row.some((c) => c.length > 0)) {
		rows.push(row);
	}

	return rows;
}

function parseCsv(text: string): Record<string, string>[] {
	const rows = parseCsvRows(text);
	if (rows.length < 2) return [];

	const headers = rows[0];

	return rows.slice(1).map((values) => {
		const row: Record<string, string> = {};
		for (let i = 0; i < headers.length; i++) {
			row[headers[i]] = values[i] ?? "";
		}
		return row;
	});
}

function trimNumeric(value: string): string {
	const num = parseFloat(value);
	if (isNaN(num)) return value;
	if (Number.isInteger(num)) return value;
	return String(parseFloat(num.toPrecision(2)));
}

function formatSummaryCsv(rows: Record<string, string>[]): string {
	if (rows.length === 0) return "";

	const lines: string[] = ["Vela summary:", "---------------------"];
	for (const row of rows) {
		for (const field of SUMMARY_FIELDS) {
			if (row[field.key] !== undefined) {
				const value = trimNumeric(row[field.key]);
				const suffix = field.unit ? ` ${field.unit}` : "";
				lines.push(`  ${field.key}: ${value}${suffix}`);
			}
		}
	}
	return lines.join("\n");
}

function formatPerLayerCsv(rows: Record<string, string>[]): string {
	if (rows.length === 0) return "";

	const allHeaders = Object.keys(rows[0]);
	const idCol = allHeaders[0];
	const wanted = new Set<string>(PER_LAYER_FIELDS);
	const headers = [
		idCol,
		...allHeaders.filter((h) => h !== idCol && wanted.has(h))
	];

	if (headers.length <= 1) return "";

	const trimmedRows = rows.map((row) => {
		const trimmed: Record<string, string> = {};
		for (const h of headers) {
			trimmed[h] = trimNumeric(row[h] ?? "");
		}
		return trimmed;
	});

	const colWidths = headers.map((h) =>
		Math.max(h.length, ...trimmedRows.map((r) => r[h].length))
	);

	const pad = (val: string, width: number) => val.padEnd(width);

	const headerLine = headers
		.map((h, i) => pad(h, colWidths[i]))
		.join(" | ");
	const separator = colWidths.map((w) => "-".repeat(w)).join("-+-");
	const dataLines = trimmedRows.map((row) =>
		headers.map((h, i) => pad(row[h], colWidths[i])).join(" | ")
	);

	return [
		"Vela per-layer performance:",
		headerLine,
		separator,
		...dataLines
	].join("\n");
}

async function buildVelaSummary(
	tmpDir: string,
	modelStem: string
): Promise<VelaSummaryResult> {
	const sections: string[] = [];
	const escapedDir = fg.escapePath(tmpDir.replace(/\\/g, "/"));
	const escapedStem = fg.escapePath(modelStem);
	let sramUsedBytes: number | undefined;

	const summaryFiles = await fg(
		`${escapedDir}/${escapedStem}_summary_*.csv`
	);
	for (const file of summaryFiles) {
		const text = await fs.readFile(file, "utf-8");
		const rows = parseCsv(text);

		if (
			sramUsedBytes === undefined &&
			rows[0]?.["sram_memory_used"]
		) {
			const kib = parseFloat(rows[0]["sram_memory_used"]);
			if (!isNaN(kib)) {
				// sram_memory_used isn't guaranteed to match arena size,
				// so estimate slightly larger with a min value of 4KB.
				// User should call interpreter->arena_size() for exact size.
				const size_bytes = Math.ceil(kib * 1024);
				sramUsedBytes = Math.max(
					Math.ceil(size_bytes * 1.25),
					size_bytes + 4 * 1024
				);
			}
		}

		const formatted = formatSummaryCsv(rows);
		if (formatted) sections.push(formatted);
	}

	const perLayerFiles = await fg(
		`${escapedDir}/${escapedStem}_per-layer.csv`
	);
	for (const file of perLayerFiles) {
		const text = await fs.readFile(file, "utf-8");
		const formatted = formatPerLayerCsv(parseCsv(text));
		if (formatted) sections.push(formatted);
	}

	if (sections.length === 0) {
		return { text: "", sramUsedBytes };
	}

	return {
		text: sections.join("\n\n"),
		sramUsedBytes
	};
}
