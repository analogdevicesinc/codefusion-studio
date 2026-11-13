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

import { createHash } from "node:crypto";
import { createWriteStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { URL } from "node:url";

import Table from "cli-table3";

import { checkIfFileExists } from "../utils/file-utils.js";
import type {
	AiCommandResult,
	AIModelBackend,
	CfsAiProfilingReport,
	SocControl
} from "cfs-types";

/**
 * Escapes `star-slash` sequences so a value can be safely embedded inside a
 * C-style block comment (`/* ... *\/`) without prematurely closing it.
 */
export function escapeBlockComment(text: string): string {
	return text.replace(/\*\//g, "*\\/");
}

export function getCFSCachePath(cfsVersion: string): string {
	return path.resolve(
		os.homedir(),
		"cfs",
		cfsVersion,
		".cache",
		"ai"
	);
}

function convertToHttpUrl(input: string): URL | undefined {
	try {
		const url = new URL(input);
		return url.protocol === "http:" || url.protocol === "https:"
			? url
			: undefined;
	} catch {
		return undefined;
	}
}

export async function resolveSource(
	cfsVersion: string,
	input: string,
	ignoreCache: boolean,
	cwd: string = process.cwd()
): Promise<string> {
	const url: URL | undefined = convertToHttpUrl(input);

	if (!url) {
		// If the input is not a valid URL, resolve path relative to cwd (if provided)
		let filePath = input;

		if (cwd && !path.isAbsolute(input)) {
			filePath = path.resolve(cwd, input);
		}

		if (checkIfFileExists(filePath)) {
			return filePath;
		}

		throw new Error(`FILE NOT FOUND: ${filePath}`);
	}

	const cacheDir = getCFSCachePath(cfsVersion);
	const dir = createHash("sha256").update(input).digest("hex");
	const filename = path.basename(url.pathname);
	const fileDestination = path.join(cacheDir, dir, filename);

	if (ignoreCache || !checkIfFileExists(fileDestination)) {
		return downloadToCache(input, fileDestination);
	}

	return fileDestination;
}

async function downloadToCache(
	url: string,
	destination: string
): Promise<string> {
	const dir = path.dirname(destination);
	await fs.mkdir(dir, { recursive: true });

	const res = await fetch(url);

	if (!res.ok) {
		switch (res.status) {
			case 403: {
				throw new Error(`Failed to download, access denied: ${url}`);
			}

			case 404: {
				throw new Error(`Failed to download, not found: ${url}`);
			}

			default: {
				throw new Error(`Failed to download, server error: ${url}`);
			}
		}
	}

	if (!res.body) {
		throw new Error(
			`Failed to download, empty response body: ${url}`
		);
	}

	await pipeline(res.body, createWriteStream(destination));
	return destination;
}

export function getValidExtensions(
	extensions: string[],
	validProperties: SocControl[],
	includeDefaults = true
): NonNullable<AIModelBackend["Extensions"]> {
	const validExtensions: NonNullable<AIModelBackend["Extensions"]> =
		{};
	const errors: string[] = [];

	const propertyMap = new Map(
		validProperties.map((property) => {
			if (property.Default !== undefined && includeDefaults) {
				// pre-populate with "Default" from backend
				validExtensions[property.Id] = property.Default;
			}
			return [property.Id.toLowerCase(), property];
		})
	);

	for (const ext of extensions) {
		const separatorIndex = ext.indexOf("=");
		let key =
			separatorIndex === -1 ? ext : ext.slice(0, separatorIndex);
		let value =
			separatorIndex === -1
				? undefined
				: ext.slice(separatorIndex + 1);

		key = key.toLowerCase();

		if (!value) {
			errors.push(
				`Invalid extension format: ${ext}. Expected format is key=value.`
			);
			continue;
		}

		const property = propertyMap.get(key);

		if (!property) {
			errors.push(
				`Invalid extension "${key}", valid options: ${validProperties.map((property) => property.Id).join(", ")}`
			);
			continue;
		}

		switch (property.Type) {
			case "boolean":
				value = String(value).toLowerCase();
				if (value !== "true" && value !== "false") {
					errors.push(
						`Invalid value for '${key}', expected one of: true, false`
					);
				} else {
					validExtensions[property.Id] = value === "true";
				}
				break;
			case "enum":
				const validValue = property.EnumValues?.find(
					(e) => e.Id === value
				);

				if (!validValue) {
					errors.push(
						`Invalid value for '${key}', expected one of: ${property.EnumValues ? property.EnumValues.map((p) => p.Id).join(", ") : "[]"} ${property.Default !== undefined ? `(default: ${String(property.Default)})` : ""}`
					);
					break;
				}

				validExtensions[property.Id] = value;
				break;
			case "integer":
				const trimmed = String(value).trim();
				if (trimmed.length === 0) {
					errors.push(
						`Invalid value for '${key}', expected an integer.`
					);
					break;
				}
				const numValue = Number(trimmed);

				if (isNaN(numValue) || !Number.isInteger(numValue)) {
					errors.push(
						`Invalid value for '${key}', expected an integer.`
					);
					break;
				}

				if (
					(property.MinimumValue !== undefined &&
						numValue < Number(property.MinimumValue)) ||
					(property.MaximumValue !== undefined &&
						numValue > Number(property.MaximumValue))
				) {
					errors.push(
						`Invalid value for '${key}', expected a value between ${
							property.MinimumValue !== undefined
								? String(property.MinimumValue)
								: "-∞"
						} and ${
							property.MaximumValue !== undefined
								? String(property.MaximumValue)
								: "∞"
						}.`
					);
					break;
				}

				validExtensions[property.Id] = numValue;
				break;
			// Trust user input & file path checks
			case "string":
			case "File":
				validExtensions[property.Id] = value;
				break;
			case "array":
				const array = value
					.split(",")
					.map((v) => v.trim())
					.filter((v) => v.length > 0);

				if (array.length === 0) {
					errors.push(
						`Invalid value for '${key}', expected format: key=value,value,...`
					);
					break;
				}

				validExtensions[property.Id] = array.toString();
				break;
			default:
				errors.push(
					`Unsupported property type for '${key}': ${property.Type}`
				);
				break;
		}
	}

	if (errors.length > 0) {
		throw new Error(errors.join("\n"));
	}

	return validExtensions;
}

export function getGeneratedFileComment({
	soc,
	Package
}: {
	soc: string;
	Package: string;
}): string {
	const date = new Date();
	const target =
		Package.length > 0
			? `${soc.toUpperCase()}-${Package.toUpperCase()}`
			: soc.toUpperCase();
	return `/**
 * Generated for ${target}.
 *
 * This file was generated using Analog Devices CodeFusion Studio.
 * https://github.com/analogdevicesinc/codefusion-studio
 *
 * Generated at: ${date.toISOString()}
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) ${String(date.getFullYear())} Analog Devices, Inc.
 */\n
`;
}

export function addFileCreatedEvent(
	output: AiCommandResult,
	outputDir: string,
	reportDir: string,
	file: string
) {
	const outputPath = path.join(outputDir, file).replace(/\\/g, "/");
	const reportPath = path.join(reportDir, file).replace(/\\/g, "/");
	output.events.push({
		type: "FILE",
		message: `Created file: ${reportPath}`,
		value: outputPath
	});
	output.artifacts?.files.push(outputPath);
}

const PLAIN_TABLE_STYLE = {
	chars: {
		top: "-",
		"top-mid": "+",
		"top-left": "+",
		"top-right": "+",
		bottom: "-",
		"bottom-mid": "+",
		"bottom-left": "+",
		"bottom-right": "+",
		left: "|",
		"left-mid": "+",
		mid: "-",
		"mid-mid": "+",
		right: "|",
		"right-mid": "+",
		middle: "|"
	},
	wordWrap: true,
	style: { border: [] as string[], head: [] as string[] }
};

export function generateProfilingReport(
	data: CfsAiProfilingReport
): string {
	const sections: string[] = ["RESOURCE PROFILING REPORT"];

	// Model Summary
	if (data.model_summary) {
		const model = data.model_summary;
		const table = new Table({
			head: ["Metric", "Value"],
			...PLAIN_TABLE_STYLE
		});
		if (model.model_name)
			table.push(["Model Name", model.model_name]);
		if (model.model_path)
			table.push(["Model Path", model.model_path]);
		if (model.model_hash)
			table.push(["Model Hash", model.model_hash]);
		if (model.framework) table.push(["Framework", model.framework]);
		if (model.model_size_kb)
			table.push([
				"Model Size",
				`${model.model_size_kb.toFixed(2)} KB`
			]);
		if (model.target_dtype)
			table.push(["Data Type", model.target_dtype]);
		if (model.layer_count)
			table.push(["Layer Count", String(model.layer_count)]);
		if (model.total_parameters)
			table.push([
				"Total Parameters",
				model.total_parameters.toLocaleString()
			]);
		sections.push(`\nMODEL SUMMARY\n${table.toString()}`);
	}

	// Memory Analysis
	if (data.memory_analysis) {
		const mem = data.memory_analysis;
		const table = new Table({
			head: ["Memory Metric", "Value"],
			...PLAIN_TABLE_STYLE
		});
		table.push(
			[
				"Peak RAM Required",
				`${mem.model_peak_ram_kb.toFixed(2)} KB` +
					` (${(mem.model_peak_ram_kb / 1024).toFixed(2)} MB)`
			],
			["RAM Status", mem.ram_status]
		);
		if (mem.available_ram_kb) {
			table.push([
				"Available RAM",
				`${mem.available_ram_kb.toFixed(2)} KB` +
					` (${(mem.available_ram_kb / 1024).toFixed(2)} MB)`
			]);
		}

		if (mem.ram_utilization_percent) {
			table.push([
				"RAM Utilization",
				`${mem.ram_utilization_percent.toFixed(1)}%`
			]);
		}

		let section = `\nMEMORY ANALYSIS\n${table.toString()}`;
		if (mem.memory_issues.length > 0) {
			section += "\n\n  Memory Issues:";
			for (const issue of mem.memory_issues) {
				section += `\n    - ${issue}`;
			}
		}

		if (mem.memory_recommendations.length > 0) {
			section += "\n\n  Memory Recommendations:";
			for (const rec of mem.memory_recommendations) {
				section += `\n    - ${rec}`;
			}
		}

		sections.push(section);
	}

	// Hardware Performance
	if (data.hardware_metrics) {
		const hw = data.hardware_metrics;
		const table = new Table({
			head: ["Metric", "Value"],
			...PLAIN_TABLE_STYLE
		});
		if (hw.total_cycles)
			table.push(["Total Cycles", hw.total_cycles.toLocaleString()]);
		if (hw.estimated_latency_ms)
			table.push([
				"Estimated Latency",
				`${hw.estimated_latency_ms.toFixed(2)} ms`
			]);
		if (hw.estimated_power_mw)
			table.push([
				"Estimated Power",
				`${hw.estimated_power_mw.toFixed(2)} mW`
			]);
		if (hw.peak_memory_kb)
			table.push([
				"Peak Memory",
				`${hw.peak_memory_kb.toFixed(2)} KB`
			]);
		if (hw.accelerated_layers !== null)
			table.push([
				"Accelerated Layers",
				String(hw.accelerated_layers)
			]);
		if (hw.cpu_only_layers !== null)
			table.push(["CPU-Only Layers", String(hw.cpu_only_layers)]);
		sections.push(`\nHARDWARE PERFORMANCE\n${table.toString()}`);
	}

	// Per-Layer Performance
	if (data.layer_performance && data.layer_performance.length > 0) {
		const table = new Table({
			head: [
				"Layer",
				"Operator",
				"Cycles",
				"Latency (ms)",
				"Energy (uJ)",
				"Power (mW)",
				"MACs",
				"Memory (KB)",
				"Accel"
			],
			...PLAIN_TABLE_STYLE
		});
		for (const layer of data.layer_performance) {
			table.push([
				String(layer.layer_idx),
				layer.layer_name ?? "-",
				layer.cycles ? layer.cycles.toLocaleString() : "-",
				layer.latency_ms ? layer.latency_ms.toFixed(2) : "-",
				layer.energy_uj ? layer.energy_uj.toFixed(2) : "-",
				layer.power_mw ? layer.power_mw.toFixed(2) : "-",
				layer.macs ? layer.macs.toLocaleString() : "-",
				layer.memory_kb ? layer.memory_kb.toFixed(2) : "-",
				layer.is_accelerated ? "Yes" : "No"
			]);
		}

		sections.push(`\nPER-LAYER PERFORMANCE\n${table.toString()}`);
	}

	// Optimization Suggestions
	if (
		data.optimization_suggestions &&
		data.optimization_suggestions.length > 0
	) {
		const table = new Table({
			head: [
				"Category",
				"Description",
				"Est. Improvement",
				"Complexity"
			],
			...PLAIN_TABLE_STYLE
		});
		for (const s of data.optimization_suggestions) {
			table.push([
				s.category.charAt(0).toUpperCase() + s.category.slice(1),
				s.description,
				s.estimated_improvement ?? "-",
				s.complexity ?? "-"
			]);
		}

		sections.push(`\nOPTIMIZATION SUGGESTIONS\n${table.toString()}`);
	}

	// Optimization Opportunities
	if (data.optimization_opportunities) {
		const opp = data.optimization_opportunities;
		const summaryTable = new Table({
			head: ["Metric", "Value"],
			...PLAIN_TABLE_STYLE
		});
		summaryTable.push(
			[
				"Total Parameter Memory",
				`${opp.total_parameter_memory_kb.toFixed(2)} KB`
			],
			["Total MACs", opp.total_macs.toLocaleString()]
		);
		sections.push(
			`\nOPTIMIZATION OPPORTUNITIES\n${summaryTable.toString()}`
		);

		if (opp.layerwise_opportunities.length > 0) {
			const table = new Table({
				head: [
					"Layer",
					"Op Type",
					"Param Mem (KB)",
					"MACs",
					"Kernel Info",
					"Suggestion"
				],
				...PLAIN_TABLE_STYLE
			});
			for (const o of opp.layerwise_opportunities) {
				table.push([
					String(o.layer_index),
					o.op_type,
					o.parameter_memory_kb.toFixed(2),
					o.macs ? o.macs.toLocaleString() : "-",
					o.kernel_info ?? "-",
					o.suggestion ?? "-"
				]);
			}

			sections.push(
				`\nLAYERWISE MEMORY OPTIMIZATION OPPORTUNITIES\n${table.toString()}`
			);
		}

		if (opp.macs_opportunities.length > 0) {
			const table = new Table({
				head: [
					"Layer",
					"Op Type",
					"Param Mem (KB)",
					"MACs",
					"Kernel Info",
					"Suggestion"
				],
				...PLAIN_TABLE_STYLE
			});
			for (const o of opp.macs_opportunities) {
				table.push([
					String(o.layer_index),
					o.op_type,
					o.parameter_memory_kb.toFixed(2),
					o.macs ? o.macs.toLocaleString() : "-",
					o.kernel_info ?? "-",
					o.suggestion ?? "-"
				]);
			}

			sections.push(
				`\nLAYERWISE MAC OPTIMIZATION OPPORTUNITIES\n${table.toString()}`
			);
		}
	}

	// Errors
	if (data.errors && data.errors.length > 0) {
		let errorSection = "\nERRORS";
		for (const e of data.errors) {
			const code = e.code ? ` (Code: ${e.code})` : "";
			errorSection += `\n  - ${e.message}${code}`;
		}

		sections.push(errorSection);
	}

	return sections.join("\n");
}
