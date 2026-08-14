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

import type {
	AiBackend,
	AIModelBackend,
	VerifiedConfig,
	AiCommandResult
} from "cfs-types";

import { spawn } from "child_process";
import { AiCommandError } from "./ai-command-error.js";
import fs, { constants } from "fs/promises";
import os from "node:os";
import path from "node:path";
import {
	containerImageExists,
	extractRegistryAndRepoName,
	getContainerUtility,
	pullImage,
	getCredentials,
	type SupportedUtils
} from "../utils/docker-utils.js";
import type { AuthConfig } from "../auth/session-manager.js";
import type {
	CalibrationData,
	Labels,
	ValidationData
} from "cfs-types/types/cfs-config";
import { randomUUID } from "node:crypto";
import { CfsApiClient } from "cfs-ccm-lib";

interface AiMotModel {
	path: string;
	arch: string;
	mode?: string;
	class?: string;
	dataset?: {
		calibration_set: CalibrationData;
		validation_set: ValidationData;
		labels: Labels;
	};
}

interface AiMotModelArtifacts {
	name: string;
	extensions: NonNullable<AIModelBackend["Extensions"]>;
	datasetPath?: string;
}

interface AiMotSubsystem {
	language: string;
	os: string;
	target: "xtsc";
	flextcm: string;
	compiler: string;
	models: AiMotModel[];
}

interface AiMotInput {
	soc: string;
	subsystem: Record<string, AiMotSubsystem>;
}

async function copyToTempDir(
	sourceFile: string,
	targetDir: string,
	resolveSource: (value: string) => Promise<string>,
	retry = 0
): Promise<string> {
	const resolvedSource = await resolveSource(sourceFile);

	try {
		let baseName = path.basename(resolvedSource);
		let targetPath = path.join(targetDir, baseName);

		if (retry > 0) {
			const newBaseName = baseName.split(".");
			newBaseName[0] += `_${randomUUID().slice(0, 4)}`;

			baseName = newBaseName.join(".");
			targetPath = path.join(targetDir, baseName);
		}

		await fs.copyFile(
			resolvedSource,
			targetPath,
			constants.COPYFILE_EXCL
		);
		return baseName;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
			throw error;
		}

		/* file exists, retry with a new name */
		return await copyToTempDir(
			sourceFile,
			targetDir,
			resolveSource,
			retry + 1
		);
	}
}

async function invokeContainer(
	container: SupportedUtils,
	image: string,
	dir: string,
	json: boolean,
	output: AiCommandResult
): Promise<AiCommandResult> {
	const args: string[] = ["run", "--rm"];

	if (
		process.platform !== "win32" &&
		process.getuid &&
		process.getgid
	) {
		container === "podman" && args.push("--userns=keep-id");
		args.push(
			"-u",
			`${process.getuid().toString()}:${process.getgid().toString()}`
		);
	}

	args.push(
		// @TODO: Workaround for mot image requiring HOME to be set for compiler-mode builds. Remove once the image is fixed.
		"-e",
		"HOME=/host_data",
		"-v",
		`${dir}:/host_data`,
		image,
		"build",
		"/host_data/input.json",
		"--input",
		"/host_data/",
		"--output",
		"/host_data",
		"--dataset",
		"/host_data"
	);

	return new Promise((resolve, reject) => {
		const fullOutput: string[] = [];

		const proc = spawn(container, args);

		proc.stderr.on("data", (data: Buffer) => {
			const lines = data.toString().split(/\r?\n/);
			for (const line of lines) {
				if (!json) {
					if (line.startsWith("[")) {
						console.log(line);
					}
				}
				if (
					line.trim().length > 0 &&
					!(line.startsWith("[") && !json)
				) {
					fullOutput.push(line);
				}
			}
		});

		proc.on("close", (code) => {
			if (code !== 0) {
				output.code = code ?? 1;
				// An error occurred, so report the full console output
				for (const line of fullOutput) {
					output.events.push({
						type: "ERROR",
						message: line
					});
				}
			}
			resolve(output);
		});

		proc.on("error", (error) => {
			reject(error);
		});
	});
}

async function unlinkSymlinks(dir: string): Promise<void> {
	const entries = await fs.readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);

		if (entry.isSymbolicLink()) {
			// Windows requires rmdir for directory symlinks
			try {
				await fs.rmdir(fullPath);
			} catch {
				// File symlink or fallback
				await fs.unlink(fullPath);
			}
		} else if (entry.isDirectory()) {
			await unlinkSymlinks(fullPath);
		}
	}
}

async function removeTempDir(dir: string): Promise<void> {
	// Unlink any symbolic links before removing the directory to avoid issues on some
	// filesystems and ensure all contents are removed properly.
	await unlinkSymlinks(dir);
	await fs.rm(dir, {
		recursive: true,
		force: true
	});
}

async function generateArray(
	inputPath: string,
	cols = 16
): Promise<{ size: number; outStr: string }> {
	const buffer = await fs.readFile(inputPath);
	const size = buffer.length;

	const hexValues = Array.from(buffer).map(
		(b) => `0x${b.toString(16).padStart(2, "0")}`
	);

	const lines: string[] = [];
	for (let i = 0; i < hexValues.length; i += cols) {
		lines.push(hexValues.slice(i, i + cols).join(","));
	}

	const outStr = lines.join(",\n");

	return { size, outStr };
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

async function generateAdditionalFiles(
	models: AiMotModelArtifacts[],
	outputDir: string,
	artifactName: string,
	output: AiCommandResult
) {
	let hasDatasets = false;

	let headerContent = `
#if !defined(${artifactName.toUpperCase()}_HPP)
#define ${artifactName.toUpperCase()}_HPP\n\n`;

	let datasetsContent = `
#include "${artifactName}.hpp"\n\n`;

	headerContent += `#define ADI_NN_COMPILER "${String(models[0]?.extensions?.Compiler)}"\n\n`;

	for (const model of models) {
		for (const [key, value] of Object.entries(model.extensions)) {
			const keysToSkip = [
				"Compiler",
				"CalibrationSet",
				"ValidationSet",
				"Labels"
			];

			if (keysToSkip.includes(key)) {
				continue;
			}
			headerContent += `#define ADI_NN_${model.name.toUpperCase()}_${key.toUpperCase()} "${String(value)}"\n`;
		}

		if (model.datasetPath) {
			const { size, outStr } = await generateArray(model.datasetPath);

			const name = `${model.name.toLowerCase()}_dataset`;

			headerContent += `\n#define ${name.toUpperCase()}_LEN (${size.toString()})\n`;
			headerContent += `extern const unsigned char ${name}[] __attribute__((aligned(16)));\n\n`;

			datasetsContent += `alignas(16) const unsigned char ${name}[] = {\n${outStr}\n};\n\n`;

			hasDatasets = true;
		}
	}

	if (!hasDatasets) {
		datasetsContent += `/* No datasets provided. */\n`;
		headerContent += `\n/* No datasets provided. */\n\n`;
	}

	headerContent += `#endif`;

	await fs.writeFile(
		path.join(outputDir, `${artifactName}.hpp`),
		headerContent
	);

	addFileCreatedEvent(output, outputDir, `${artifactName}.hpp`);

	await fs.writeFile(
		path.join(outputDir, "datasets.cpp"),
		datasetsContent
	);

	addFileCreatedEvent(output, outputDir, "datasets.cpp");
}

async function copyToBuild(src: string, dst: string) {
	await fs.cp(src, dst, {
		recursive: true,
		force: true,
		filter: async (src) => {
			try {
				const st = await fs.lstat(src);
				return !st.isSymbolicLink();
			} catch {
				return false;
			}
		}
	});
}

async function getValidationSet(
	tmpDir: string,
	resolveSource: (value: string) => Promise<string>,
	validationSet: ValidationData
): Promise<ValidationData> {
	const errors: string[] = [];

	await Promise.allSettled(
		validationSet.map(async ([s, label], i) => {
			const source = await copyToTempDir(s, tmpDir, resolveSource);
			validationSet[i] = [source, label];
		})
	).then((results) =>
		results.map((result) => {
			if (result.status === "rejected") {
				errors.push(String(result.reason));
			}
		})
	);

	if (errors.length) {
		throw new Error(errors.join("\n"));
	}

	return validationSet;
}

async function getCalibrationSet(
	tmpDir: string,
	resolveSource: (value: string) => Promise<string>,
	calibrationSet: CalibrationData
): Promise<CalibrationData> {
	const errors: string[] = [];

	await Promise.allSettled(
		calibrationSet.map(async (s, i) => {
			const source = await copyToTempDir(s, tmpDir, resolveSource);
			calibrationSet[i] = source;
		})
	).then((results) =>
		results.map((result) => {
			if (result.status === "rejected") {
				errors.push(String(result.reason));
			}
		})
	);

	if (errors.length) {
		throw new Error(errors.join("\n"));
	}

	return calibrationSet;
}

function validateExtensions(
	initialExtensions: NonNullable<AIModelBackend["Extensions"]>,
	extensions: NonNullable<AIModelBackend["Extensions"]>,
	modelName: string,
	output: AiCommandResult
) {
	const fieldsToValidate = [
		"FlexTCM",
		"Compiler",
		"Os",
		"Language"
	] as const;

	for (const field of fieldsToValidate) {
		if (extensions[field] !== initialExtensions[field]) {
			output.events.push({
				type: "ERROR",
				message: `Inconsistent ${field} value '${String(extensions[field])}' for model '${modelName}'. Expected '${String(initialExtensions[field])}'`
			});
			output.code = 1;
		}
	}
}

async function constructMotModelEntry(
	extensions: NonNullable<AIModelBackend["Extensions"]>,
	vcfg: VerifiedConfig,
	tmpDir: string,
	isWithDatasets: boolean,
	resolveSource: (value: string) => Promise<string>
): Promise<AiMotModel> {
	const baseModel: AiMotModel = {
		path: await copyToTempDir(
			vcfg.files.Model,
			tmpDir,
			resolveSource
		),
		arch: extensions.Arch as string,
		mode: extensions.Mode as string
	};

	if (isWithDatasets) {
		return {
			...baseModel,
			class: extensions.Class as string,
			dataset: {
				labels: vcfg.backend.Labels ?? [],
				calibration_set: await getCalibrationSet(
					tmpDir,
					resolveSource,
					vcfg.backend.CalibrationData ?? []
				),
				validation_set: await getValidationSet(
					tmpDir,
					resolveSource,
					vcfg.backend.ValidationData ?? []
				)
			}
		};
	}

	return baseModel;
}

export async function generateMot(
	backend: AiBackend,
	vcfgs: VerifiedConfig[],
	json: boolean,
	apiAccess: CfsApiClient | AuthConfig | undefined,
	resolveSource: (value: string) => Promise<string>
): Promise<AiCommandResult> {
	const output: AiCommandResult = {
		code: 0,
		validCodes: [0],
		events: [],
		artifacts: { files: [] }
	};

	const models: AiMotModelArtifacts[] = [];

	// Test that config inputs are valid
	if (!backend.Mot?.DockerImage) {
		output.code = 1;
		output.events.push({
			type: "ERROR",
			message: `Backend '${backend.Name}' contains no DockerImage field. Please verify backend is correct.`
		});
		throw new AiCommandError(output);
	}

	const initialConfig = vcfgs[0];

	if (!initialConfig.target.Soc || !initialConfig.target.Core) {
		output.code = 1;
		output.events.push({
			type: "ERROR",
			message: `SoC or Core is missing from target info. Please verify backend is correct.`
		});
		throw new AiCommandError(output);
	}

	const container = await getContainerUtility();

	if (
		!(await containerImageExists(container, backend.Mot.DockerImage))
	) {
		const { registry, repo } = extractRegistryAndRepoName(
			backend.Mot.DockerImage
		);

		const creds = await getCredentials(repo, apiAccess, json);

		await pullImage({
			image: backend.Mot.DockerImage,
			registry,
			utility: container,
			creds,
			quiet: json
		});
	}

	if (vcfgs.length > backend.MaxModels) {
		output.code = 1;
		output.events.push({
			type: "ERROR",
			message: `Too many models provided. Backend '${backend.Name}' supports a maximum of ${String(backend.MaxModels)} models.`
		});
		throw new AiCommandError(output);
	}

	const dirName = `mot-${initialConfig.target.Soc}-${String(Date.now())}`;
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), dirName));

	try {
		const ext = initialConfig.backend
			.Extensions as unknown as NonNullable<
			AIModelBackend["Extensions"]
		>;

		const subsystem =
			initialConfig.target.Core.split("-")[0].toLowerCase();

		const flexTcm = ext.FlexTCM as string;
		const compiler = ext.Compiler as string;

		const requiresDatasets = Boolean(ext.Class);

		if (requiresDatasets) {
			const errors: string[] = [];
			const requiredFields = [
				"CalibrationData",
				"ValidationData",
				"Labels"
			] as const;

			for (const field of requiredFields) {
				if (initialConfig.backend[field] === undefined) {
					errors.push(
						`Backend '${backend.Name}' requires '${field}' to be set.`
					);
				}
			}

			if (errors.length) {
				output.code = 1;
				for (const err of errors) {
					output.events.push({
						type: "ERROR",
						message: err
					});
				}
				throw new AiCommandError(output);
			}
		}

		const inputData: AiMotInput = {
			soc: backend.Mot.Soc,
			subsystem: {
				[subsystem]: {
					language: ext.Language as string,
					os: ext.Os as string,
					target: "xtsc",
					compiler: compiler,
					flextcm: flexTcm,
					models: []
				}
			}
		};

		let outDir = "";

		for (const vcfg of vcfgs) {
			if (vcfg.prj_info.out_dir != ".") {
				// Non default output directory, check for consistency across models
				if (outDir != "" && vcfg.prj_info.out_dir !== outDir) {
					output.code = 1;
					output.events.push({
						type: "ERROR",
						message: `Inconsistent output directories across models. Found '${vcfg.prj_info.out_dir}' for model '${vcfg.name}', but previously found '${outDir}'.`
					});
					throw new AiCommandError(output);
				} else {
					outDir = vcfg.prj_info.out_dir;
				}
			}

			const extensions = vcfg.backend
				.Extensions as unknown as NonNullable<
				AIModelBackend["Extensions"]
			>;

			const modelDetails = await constructMotModelEntry(
				extensions,
				vcfg,
				tmpDir,
				requiresDatasets,
				resolveSource
			);

			validateExtensions(ext, extensions, vcfg.name, output);

			if (output.code) {
				throw new AiCommandError(output);
			}

			inputData.subsystem[subsystem].models.push(modelDetails);

			models.push({
				name: vcfg.name,
				datasetPath: vcfg.files.Dataset,
				extensions: extensions
			});
		}

		const artifactName = `adi_${backend.DisplayName?.toLowerCase() ?? "nn"}`;

		if (output.code === 0) {
			if (outDir == "") {
				outDir = path.join(
					initialConfig.prj_info.name,
					"src",
					artifactName
				);
			}
			const buildDir = path.isAbsolute(outDir)
				? outDir
				: path.resolve(
						path.join(initialConfig.prj_info.workspace, outDir)
					);

			await fs.writeFile(
				path.join(tmpDir, "input.json"),
				JSON.stringify(inputData, null, 2)
			);

			if (!json) {
				console.log(
					"INFO: Invoking code generation may take several minutes. Please wait..."
				);
			}

			const result = await invokeContainer(
				container,
				backend.Mot.DockerImage,
				tmpDir,
				json,
				output
			);
			output.code = result.code;

			if (output.code !== 0) {
				output.events.push({
					type: "ERROR",
					message: `Container execution failed with code ${String(output.code)}.`
				});
				throw new AiCommandError(output);
			} else {
				const srcDir = path.join(tmpDir, subsystem);
				await fs.mkdir(buildDir, { recursive: true });

				if (backend.Mot.Copy) {
					for (const item of backend.Mot.Copy) {
						try {
							const srcPath = path.join(srcDir, item);
							const destPath = path.join(buildDir, item);

							const stat = await fs.lstat(srcPath);

							if (stat.isSymbolicLink()) {
								continue;
							} else if (stat.isDirectory()) {
								await copyToBuild(srcPath, destPath);
							} else {
								await fs.mkdir(path.dirname(destPath), {
									recursive: true
								});
								await fs.copyFile(srcPath, destPath);
							}
							addFileCreatedEvent(output, buildDir, item);
						} catch {
							output.events.push({
								type: "ERROR",
								message: `Failed to copy '${item}' to '${buildDir}'`
							});
							output.code = 1;
							throw new AiCommandError(output);
						}
					}
				} else {
					await copyToBuild(srcDir, buildDir);
				}
				await generateAdditionalFiles(
					models,
					buildDir,
					artifactName,
					output
				);
			}
		}
	} finally {
		await removeTempDir(tmpDir);
	}

	return output;
}
