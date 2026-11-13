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
import type { CfsCancellationToken } from "../utils/cancellation.js";
import {
	addFileCreatedEvent,
	escapeBlockComment
} from "./ai-tools-utils.js";
import { hashFile } from "../utils/file-utils.js";
import { requiresCalibrationValidationLabels } from "./ai-tools-model-utils.js";

interface AiMotMetric {
	name: string;
	decision?: {
		threshold?: number;
		max_fpr?: number;
	};
	direction?: "positive" | "negative";
}

interface AiMotModel {
	path: string;
	arch: string;
	mode?: string;
	class?: string;
	metric?: AiMotMetric;
	input_quantize?: boolean;
	search?: { time_limit: number };
	dataset?: {
		calibration_set: CalibrationData;
		validation_set: ValidationData;
		labels: Labels;
	};
}

interface AiMotModelArtifacts {
	name: string;
	extensions: NonNullable<AIModelBackend["Extensions"]>;
	modelPath: string;
	modelHash: string;
	datasetPath?: string;
	datasetHash?: string;
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
	output: AiCommandResult,
	token?: CfsCancellationToken,
	quiet = false,
	verbose = false
): Promise<AiCommandResult> {
	if (token?.isCancellationRequested) {
		output.code = 1;
		output.events.push({
			type: "ERROR",
			message: "Operation cancelled."
		});
		throw new AiCommandError(output);
	}

	const args: string[] = ["run", "--rm"];

	if (
		process.platform !== "win32" &&
		process.getuid &&
		process.getgid
	) {
		if (container === "podman") args.push("--userns=keep-id");
		args.push(
			"-u",
			`${process.getuid().toString()}:${process.getgid().toString()}`
		);
	}

	args.push(
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

	if (verbose && !json) {
		console.log(
			`Invoking container with: ${[container, ...args].join(" ")}`
		);
	}

	return new Promise((resolve, reject) => {
		const fullOutput: string[] = [];

		const proc = spawn(container, args);

		// docker/podman run proxies signals to the container by default,
		// so killing this client process stops the underlying build.
		const cancellationListener = token?.onCancellationRequested(
			() => {
				proc.kill();
				reject(new Error("Container execution cancelled."));
			}
		);

		proc.stderr.on("data", (data: Buffer) => {
			const lines = data.toString().split(/\r?\n/);
			for (const line of lines) {
				const testIfProgressIndicator = /^\[\d/.test(line);
				if (!json && !quiet) {
					if (testIfProgressIndicator) {
						console.log(line);
					}
				}
				if (
					line.trim().length > 0 &&
					!(testIfProgressIndicator && !json)
				) {
					fullOutput.push(line);
				}
			}
		});

		proc.on("close", (code) => {
			cancellationListener?.dispose();
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
			cancellationListener?.dispose();
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

async function generateAdditionalFiles(
	models: AiMotModelArtifacts[],
	outputDir: string,
	reportDir: string,
	artifactName: string,
	output: AiCommandResult
) {
	let hasDatasets = false;

	let sourceFilesText = "";
	for (const model of models) {
		sourceFilesText += ` * ${escapeBlockComment(model.modelPath)} (sha256: ${model.modelHash})\n`;
		if (model.datasetPath) {
			sourceFilesText += ` * ${escapeBlockComment(model.datasetPath)} (sha256: ${String(model.datasetHash)})\n`;
		}
	}

	let headerContent = `/*
 * Generated ADI NN header for ${artifactName} on ${new Date().toString()}. Do not modify.
 *
 * Generated from:
${sourceFilesText} */

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

	addFileCreatedEvent(
		output,
		outputDir,
		reportDir,
		`${artifactName}.hpp`
	);

	await fs.writeFile(
		path.join(outputDir, "datasets.cpp"),
		datasetsContent
	);

	addFileCreatedEvent(output, outputDir, reportDir, "datasets.cpp");
}

async function copyToBuild(
	src: string,
	dst: string,
	isExcluded: (candidate: string) => boolean = () => false
) {
	await fs.cp(src, dst, {
		recursive: true,
		force: true,
		filter: async (src) => {
			if (isExcluded(src)) {
				return false;
			}

			try {
				const st = await fs.lstat(src);
				return !st.isSymbolicLink();
			} catch {
				return false;
			}
		}
	});
}

/**
 * Top level directories under `buildDir` that `copy` writes into.
 *
 * Entries resolving to `buildDir` itself or outside it are dropped, so an
 * unexpected `OutDir` cannot turn the cleanup into a wider delete.
 */
function getCopyRoots(buildDir: string, copy: string[]): string[] {
	const roots = new Set<string>();

	for (const item of copy) {
		const relative = path.relative(
			buildDir,
			path.resolve(buildDir, item)
		);

		if (path.isAbsolute(relative)) {
			continue;
		}

		const [first] = relative.split(path.sep);

		if (!first || first === "..") {
			continue;
		}

		roots.add(path.join(buildDir, first));
	}

	return [...roots];
}

async function getValidationSet(
	tmpDir: string,
	resolveSource: (value: string) => Promise<string>,
	validationSet: ValidationData
): Promise<ValidationData> {
	const errors: string[] = [];

	await Promise.allSettled(
		validationSet.map(async (entry, i) => {
			const source = await copyToTempDir(
				entry.input,
				tmpDir,
				resolveSource
			);
			validationSet[i] = { ...entry, input: source };

			if ("expected" in entry) {
				const expected = await copyToTempDir(
					entry.expected,
					tmpDir,
					resolveSource
				);
				validationSet[i] = { ...validationSet[i], expected };
			}
		})
	).then((results) =>
		results.map((r) => {
			if (r.status === "rejected") {
				errors.push(String(r.reason));
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

function constructMotMetricEntry(
	extensions: NonNullable<AIModelBackend["Extensions"]>
): AiMotMetric | undefined {
	// Metric at least needs a name. Omit entirely if not provided
	if (
		extensions.MetricName == undefined ||
		extensions.MetricName == ""
	) {
		return undefined;
	}

	const metric: AiMotMetric = { name: String(extensions.MetricName) };
	if (extensions.MetricDirection !== undefined) {
		if (
			extensions.MetricDirection != "positive" &&
			extensions.MetricDirection != "negative"
		) {
			throw new Error(
				`Unsupported MetricDirection: ${extensions.MetricDirection}`
			);
		}
		metric.direction = String(extensions.MetricDirection) as
			| "positive"
			| "negative";
	}

	// Decision needs to be "threshold" or "max_fpr" and have a value
	if (
		extensions.MetricDecision !== undefined &&
		extensions.MetricValue !== undefined
	) {
		if (extensions.MetricDecision === "threshold") {
			metric.decision = { threshold: Number(extensions.MetricValue) };
		} else if (extensions.MetricDecision === "max_fpr") {
			metric.decision = { max_fpr: Number(extensions.MetricValue) };
		} else {
			throw new Error(
				`Unsupported MetricDecision: ${extensions.MetricDecision}`
			);
		}
	}

	return metric;
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

	const tmp_metric: AiMotMetric | undefined =
		constructMotMetricEntry(extensions);

	if (tmp_metric !== undefined) {
		baseModel.metric = tmp_metric;
	}

	if (extensions.InputQuantize !== undefined) {
		baseModel.input_quantize = Boolean(extensions.InputQuantize);
	}

	if (extensions.SearchTimeLimit !== undefined) {
		baseModel.search = {
			time_limit: Number(extensions.SearchTimeLimit)
		};
	}

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
	resolveSource: (value: string) => Promise<string>,
	token?: CfsCancellationToken,
	verbose = false,
	quiet = false
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

		const creds = await getCredentials(
			repo,
			apiAccess,
			json || quiet
		);

		await pullImage({
			image: backend.Mot.DockerImage,
			registry,
			utility: container,
			creds,
			quiet: json || quiet
		});
	}

	if (token?.isCancellationRequested) {
		output.code = 1;
		output.events.push({
			type: "ERROR",
			message: "Operation cancelled."
		});
		throw new AiCommandError(output);
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

		const requiresDatasets = requiresCalibrationValidationLabels(ext);

		if (requiresDatasets) {
			const errors: string[] = [];
			const requiredFields = new Map([
				["CalibrationData", "CalibrationSet"],
				["ValidationData", "ValidationSet"],
				["Labels", "Labels"]
			] as const);

			for (const [field, jsonId] of requiredFields) {
				if (initialConfig.backend[field] === undefined) {
					errors.push(`'${jsonId}'`);
				}
			}

			if (errors.length) {
				output.code = 1;
				output.events.push({
					type: "ERROR",
					message: `Backend '${backend.Name}' requires ${errors.join(", ")} to be set.`
				});
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

			const modelHash = await hashFile(
				await resolveSource(vcfg.files.Model)
			);
			const datasetHash = vcfg.files.Dataset
				? await hashFile(vcfg.files.Dataset)
				: undefined;

			models.push({
				name: vcfg.name,
				modelPath: vcfg.files.Model,
				modelHash,
				datasetPath: vcfg.files.Dataset,
				datasetHash,
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
			const reportDir = outDir;
			const buildDir = path.isAbsolute(outDir)
				? outDir
				: path.resolve(
						path.join(initialConfig.prj_info.workspace, outDir)
					);

			await fs.writeFile(
				path.join(tmpDir, "input.json"),
				JSON.stringify(inputData, null, 2)
			);

			try {
				const result = await invokeContainer(
					container,
					backend.Mot.DockerImage,
					tmpDir,
					json,
					output,
					token,
					quiet,
					verbose
				);
				output.code = result.code;

				if (output.code !== 0) {
					output.events.push({
						type: "ERROR",
						message: `Container execution failed with code ${String(output.code)}.`
					});
					if (verbose && !json) {
						console.log(
							"input.json:\n" + JSON.stringify(inputData, null, 2)
						);
					}
					throw new AiCommandError(output);
				}
			} catch (error) {
				// Dump input on rejection for error diagnostics in verbose mode
				if (verbose && !json && !(error instanceof AiCommandError)) {
					console.log(
						"input.json:\n" + JSON.stringify(inputData, null, 2)
					);
				}
				throw error;
			}

			{
				const srcDir = path.join(tmpDir, subsystem);
				await fs.mkdir(buildDir, { recursive: true });

				if (backend.Mot.Copy) {
					const excluded = new Set(
						(backend.Mot.Exclude ?? []).map((item) =>
							path.resolve(srcDir, item)
						)
					);
					const isExcluded = (candidate: string) =>
						excluded.has(path.resolve(candidate));

					// fs.cp only overwrites, so output from an earlier run would survive.
					for (const root of getCopyRoots(
						buildDir,
						backend.Mot.Copy
					)) {
						try {
							await fs.rm(root, { recursive: true, force: true });
						} catch {
							output.events.push({
								type: "ERROR",
								message: `Failed to remove '${root}' before copying`
							});
							output.code = 1;
							throw new AiCommandError(output);
						}
					}

					for (const item of backend.Mot.Copy) {
						const srcPath = path.join(srcDir, item);
						const destPath = path.join(buildDir, item);

						try {
							// Some entries only exist for certain architectures.
							const stat = await fs
								.lstat(srcPath)
								.catch((error: unknown) => {
									if (
										(error as NodeJS.ErrnoException).code === "ENOENT"
									) {
										return undefined;
									}

									throw error;
								});

							if (!stat || stat.isSymbolicLink()) {
								continue;
							}

							if (stat.isDirectory()) {
								await copyToBuild(srcPath, destPath, isExcluded);
							} else {
								await fs.mkdir(path.dirname(destPath), {
									recursive: true
								});
								await fs.copyFile(srcPath, destPath);
							}
							addFileCreatedEvent(output, buildDir, reportDir, item);
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
					reportDir,
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
