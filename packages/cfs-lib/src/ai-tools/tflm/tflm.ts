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

import path from "node:path";
import fs from "node:fs/promises";

import type { VerifiedConfig, AiCommandResult } from "cfs-types";
import TfliteInfo from "./info.js";
import { sanitizeToCIdentifier } from "../ai-tools-utils.js";

interface FileInfo {
	symbol: string;
	section: string;
	size: number;
	sourceFile: string;
}

interface GenInfo {
	files: FileInfo[];
	arenaSize: string;
	arenaSection: string;
	arenaEstimated: boolean;
}

async function writeByteArray(
	fh: fs.FileHandle,
	fName: string,
	cols: number
): Promise<number> {
	const buffer = await fs.readFile(path.resolve(fName));

	let pending = "";
	let firstLine = true;
	for (let i = 0; i < buffer.length; i += cols) {
		const line = Array.from(
			buffer.subarray(i, i + cols),
			(b) => `0x${b.toString(16).padStart(2, "0")}`
		).join(",");
		pending += `${firstLine ? "" : ", \n"}${line}`;
		firstLine = false;
		if (pending.length >= 64 * 1024) {
			await fh.write(pending);
			pending = "";
		}
	}
	if (pending.length > 0) {
		await fh.write(pending);
	}

	return buffer.length;
}

async function generateCFile(
	outFilename: string,
	model: string,
	gen: GenInfo,
	info: TfliteInfo
) {
	const fh = await fs.open(outFilename, "w");

	try {
		await fh.write(
			`/*\n * Generated C representation of ${model} on ${new Date().toString()}. Do not modify.\n */\n
#include "${model}.hpp"\n
alignas(16) unsigned char ${model}_arena[${gen.arenaSize}];\n`
		);

		for (const file of gen.files) {
			await fh.write(
				`alignas(16) const unsigned char ${file.symbol}[] = {\n`
			);
			await writeByteArray(fh, file.sourceFile, 16);
			await fh.write(`\n};\n\n`);
		}

		await fh.write(info.getResolverCode(model));
		await fh.write(
			`const unsigned int ${model}_len = ${model.toUpperCase()}_LEN;\n`
		);
	} finally {
		await fh.close();
	}
}

async function generateHFile(params: {
	outFilename: string;
	model: string;
	gen: GenInfo;
	info: TfliteInfo;
	result: AiCommandResult;
}) {
	const { outFilename, model, gen, info, result } = params;

	const upper = model.toUpperCase();

	let filesText = "";
	let macrosText = "";

	for (const file of gen.files) {
		macrosText += `#define ${file.symbol.toUpperCase()}_LEN (${String(file.size)})\n`;
		filesText += `extern const unsigned char ${file.symbol}[] __attribute__((${file.section}aligned(16)));\n\n`;
	}

	const arenaStatus = gen.arenaEstimated ? "estimated" : "provided";
	macrosText += `/* Arena size for ${model} (${arenaStatus})*/
#define ${upper}_ARENA_SIZE (${gen.arenaSize})\n`;

	if (info.inputWidth.length !== info.inputLen.length) {
		throw new Error(
			`Model input width and length lists must be of the same length. Got ${String(info.inputWidth)} widths and ${String(info.inputLen)} lengths.`
		);
	}

	if (info.outputWidth.length !== info.outputLen.length) {
		throw new Error(
			`Model output width and length lists must be of the same length. Got ${String(info.outputWidth)} widths and ${String(info.outputLen)} lengths.`
		);
	}

	if (info.inputWidth.length === 0) {
		throw new Error("Model has no inputs.");
	}

	if (info.outputWidth.length === 0) {
		throw new Error("Model has no outputs.");
	}

	if (info.inputWidth.length > 1) {
		result.events.push({
			type: "WARN",
			message:
				"Model has multiple inputs. Macros will be generated for all but APIs will only use input 0."
		});
	}

	if (info.outputWidth.length > 1) {
		result.events.push({
			type: "WARN",
			message:
				"Model has multiple outputs. Macros will be generated for all but APIs will only use output 0."
		});
	}

	for (let i = 0; i < info.inputWidth.length; i++) {
		macrosText += `#define ${upper}_INPUT_${String(i)}_WIDTH (${String(info.inputWidth[i])})
#define ${upper}_INPUT_${String(i)}_LEN (${String(info.inputLen[i])})\n`;
	}

	for (let i = 0; i < info.outputWidth.length; i++) {
		macrosText += `#define ${upper}_OUTPUT_${String(i)}_WIDTH (${String(info.outputWidth[i])})
#define ${upper}_OUTPUT_${String(i)}_LEN (${String(info.outputLen[i])})\n`;
	}

	macrosText += `#define ${upper}_NUM_OPERATORS (${String(info.numOps)})`;

	const text = `/*\n * Generated C representation of ${model} on ${new Date().toString()}. Do not modify.\n
Model summary:\n--------------\n${info.summary}\n
Model graph:\n------------\n${info.graph}*/\n\n${macrosText}\n\n
#if defined(__cplusplus)
#pragma GCC diagnostic push
// TFLM library mixes float/double literals which produces warnings
#pragma GCC diagnostic ignored "-Wdouble-promotion"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#pragma GCC diagnostic pop\n
${info.getResolverPrototype(model)}
#else /* __cplusplus */
#warning TensorFlow Lite Micro sources require C++ for full functionality
#endif /* __cplusplus */\n
extern unsigned char ${model}_arena[] __attribute__((${gen.arenaSection}aligned(16)));\n
${filesText}`;

	await fs.writeFile(outFilename, text);
}

async function generateTopLevelHeader(
	modelSymbols: Set<string>,
	buildDir: string
) {
	const includeText = `// Standard TfLM includes
#pragma GCC diagnostic push
// TFLM library mixes float/double literals which produces warnings
#pragma GCC diagnostic ignored "-Wdouble-promotion"
#include "tensorflow/lite/core/c/common.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/micro_log.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/micro/micro_profiler.h"
#include "tensorflow/lite/micro/recording_micro_interpreter.h"
#include "tensorflow/lite/micro/system_setup.h"
#include "tensorflow/lite/schema/schema_generated.h"
#pragma GCC diagnostic pop\n`;

	let text = `/*\n * Generated C representation of enabled models on ${new Date().toString()}. Do not modify.\n */\n
${includeText}
// TFLM Model includes\n`;

	for (const symbol of Array.from(modelSymbols).sort()) {
		text += `#include "${symbol}.hpp"\n`;
	}

	await fs.writeFile(path.join(buildDir, "adi_tflm.hpp"), text);
}

function addFileCreatedEvent(
	output: AiCommandResult,
	outputDir: string,
	file: string
) {
	const outputPath = path.join(outputDir, file).replace(/\\/g, "/");
	output.events.push({
		type: "FILE",
		message: `Created file: ${outputPath}`,
		value: outputPath
	});
	output.artifacts?.files.push(outputPath);
}

export async function generateTflm(
	vcfgs: VerifiedConfig[]
): Promise<AiCommandResult> {
	const result: AiCommandResult = {
		code: 0,
		validCodes: [0],
		events: [],
		artifacts: { files: [] }
	};

	if (vcfgs.length === 0) {
		throw new Error("No config provided.");
	}

	const symbolsByDir = new Map<string, Set<string>>();

	for (const cfg of vcfgs) {
		const { workspace, name, out_dir: outDir } = cfg.prj_info;

		let buildDir = path.isAbsolute(outDir)
			? outDir
			: path.join(workspace, name, outDir);

		const modelFile = cfg.files.Model;

		// If no out_dir has been specified, use adi_tflm
		if (outDir === ".") {
			buildDir = path.join(buildDir, "src", "adi_tflm");
		}

		await fs.mkdir(buildDir, { recursive: true });

		if (!symbolsByDir.has(buildDir)) {
			symbolsByDir.set(buildDir, new Set<string>());
		}
		const dirSymbols =
			symbolsByDir.get(buildDir) ?? new Set<string>();

		let info: TfliteInfo;

		try {
			info = new TfliteInfo(modelFile);
		} catch (error) {
			result.code = 1;
			result.events.push({
				type: "ERROR",
				message: (error as Error).message
			});

			return result;
		}

		const modelName = sanitizeToCIdentifier(
			cfg.backend.Extensions?.Symbol
				? (cfg.backend.Extensions.Symbol as string)
				: cfg.name
		);

		if (dirSymbols.has(modelName)) {
			result.code = 1;
			result.events.push({
				type: "ERROR",
				message: `Model "${cfg.name}" generates symbol "${modelName}" which conflicts with an already-registered symbol.`
			});
			return result;
		}

		dirSymbols.add(modelName);

		const genInfo: GenInfo = {
			files: [],
			arenaSize: "0",
			arenaSection: "",
			arenaEstimated: false
		};

		const modelSize = (await fs.stat(path.resolve(modelFile))).size;

		genInfo.files.push({
			symbol: modelName,
			section: cfg.backend.Extensions?.Section
				? `section("${String(cfg.backend.Extensions.Section)}"), `
				: "",
			size: modelSize,
			sourceFile: modelFile
		});

		if (cfg.files.Dataset) {
			const datasetSymbol = `${modelName}_dataset`;

			const dataSize = (
				await fs.stat(path.resolve(cfg.files.Dataset))
			).size;

			genInfo.files.push({
				symbol: datasetSymbol,
				section: cfg.backend.Extensions?.DatasetSection
					? `section("${String(cfg.backend.Extensions.DatasetSection)}"), `
					: "",
				size: dataSize,
				sourceFile: cfg.files.Dataset
			});
		}

		// Arena details
		if (cfg.backend.Extensions?.ArenaSize !== undefined) {
			genInfo.arenaSize = String(cfg.backend.Extensions.ArenaSize);
		} else {
			const arenaSize = info.arenaSize();

			result.events.push({
				type: "INFO",
				message: `No arena size provided. Estimated to be ${String(arenaSize)} bytes`
			});

			genInfo.arenaSize = String(arenaSize);
			genInfo.arenaEstimated = true;
		}

		genInfo.arenaSection = cfg.backend.Extensions?.ArenaSection
			? `section("${String(cfg.backend.Extensions.ArenaSection)}"), `
			: "";

		await generateCFile(
			path.join(buildDir, `${modelName}.cpp`),
			modelName,
			genInfo,
			info
		);

		addFileCreatedEvent(result, buildDir, `${modelName}.cpp`);

		try {
			await generateHFile({
				outFilename: path.join(buildDir, `${modelName}.hpp`),
				model: modelName,
				gen: genInfo,
				info,
				result
			});
		} catch (error) {
			result.code = 1;
			result.events.push({
				type: "ERROR",
				message: (error as Error).message
			});

			return result;
		}

		addFileCreatedEvent(result, buildDir, `${modelName}.hpp`);
	}

	for (const [dir, symbols] of symbolsByDir) {
		await generateTopLevelHeader(symbols, dir);
		addFileCreatedEvent(result, dir, "adi_tflm.hpp");
	}

	return result;
}
