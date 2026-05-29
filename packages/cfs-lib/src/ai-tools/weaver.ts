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
	AiCommandResult,
	CodeGenJsonMsg,
	VerifiedConfig
} from "./index.js";
import type { AiBackend } from "cfs-types";

import { spawn } from "child_process";
import fs from "fs/promises";
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
import { AuthConfig } from "../auth/session-manager.js";

interface AiWeaverModel {
	path: string;
	arch: string;
	mode?: string;
}

type Extensions = Record<string, string | number | boolean>;

interface AiWeaverModelArtifacts {
	name: string;
	extensions: Extensions;
	datasetPath?: string;
}

interface AiWeaverSubsystem {
	language: "c++";
	os: "zephyr";
	target: "xtsc";
	flextcm: string;
	compiler: string;
	models: AiWeaverModel[];
}

interface AiWeaverInput {
	soc: string;
	subsystem: Record<string, AiWeaverSubsystem>;
}

async function copyToTempDir(
	sourceFile: string,
	targetDir: string
): Promise<string> {
	const baseName: string = path.basename(sourceFile);
	const targetPath = path.join(targetDir, baseName);
	await fs.copyFile(sourceFile, targetPath);
	return baseName;
}

async function invokeContainer(
	container: SupportedUtils,
	image: string,
	dir: string,
	json: boolean
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
		"-v",
		`${dir}:/host_data`,
		image,
		"build",
		"--input",
		"/host_data/",
		"--output",
		"/host_data",
		"/host_data/input.json"
	);

	return new Promise((resolve, reject) => {
		const stdout: string[] = [];
		const stderr: string[] = [];

		const proc = spawn(container, args);

		if (!json) {
			proc.stderr.on("data", (data: Buffer) => {
				const lines = data.toString().split(/\r?\n/);
				for (const line of lines) {
					if (line.startsWith("[")) {
						console.log(line);
					}
				}
			});
		}

		proc.on("close", (code) => {
			resolve({
				stdout,
				stderr,
				code,
				validCodes: [0]
			});
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

function logCodeGenMessage(msg: CodeGenJsonMsg): string {
	return JSON.stringify(msg);
}

function trace(json: boolean, msg: string): void {
	if (!json) {
		console.log(msg);
	}
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
	models: AiWeaverModelArtifacts[],
	outputDir: string
) {
	const generatedAt = new Date().toUTCString();
	let hasDatasets = false;

	let headerContent = `/*
 * Generated Weaver extensions/dataset declarations on ${generatedAt}. Do not modify.
*/

#if !defined(ADI_NN_HPP)
#define ADI_NN_HPP\n\n`;

	let datasetsContent = `/*
 * Generated C representation of model datasets on ${generatedAt}. Do not modify.
*/

#include "adi_nn.hpp"\n\n`;

	headerContent += `#define ADI_NN_COMPILER "${String(models[0]?.extensions?.Compiler)}"\n\n`;

	for (const model of models) {
		for (const [key, value] of Object.entries(model.extensions)) {
			if (key === "Compiler") {
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
		path.join(outputDir, "adi_nn.hpp"),
		headerContent
	);
	await fs.writeFile(
		path.join(outputDir, "datasets.cpp"),
		datasetsContent
	);
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

export async function generateWeaver(
	backend: AiBackend,
	vcfgs: VerifiedConfig[],
	json: boolean,
	authConfig: AuthConfig
): Promise<AiCommandResult> {
	const output: AiCommandResult = {
		stdout: [],
		stderr: [],
		code: 0, // Assume success unless we encounter errors during processing
		validCodes: [0]
	};

	const models: AiWeaverModelArtifacts[] = [];

	// Test that config inputs are valid
	if (!backend.Weaver?.DockerImage) {
		throw new Error(
			`Backend '${backend.Name}' contains no DockerImage field. Please verify backend is correct.`
		);
	}
	if (!backend.Weaver.Subsystem) {
		throw new Error(
			`Backend '${backend.Name}' contains no Subsystem field. Please verify backend is correct.`
		);
	}
	if (!vcfgs[0].target.Soc || !vcfgs[0].target.Core) {
		throw new Error(
			`SoC or Core is missing from target info. Please verify backend is correct.`
		);
	}

	const container = await getContainerUtility();

	if (
		!(await containerImageExists(
			container,
			backend.Weaver.DockerImage
		))
	) {
		const { registry, repo } = extractRegistryAndRepoName(
			backend.Weaver.DockerImage
		);

		const creds = await getCredentials(repo, authConfig, json);

		await pullImage({
			image: backend.Weaver.DockerImage,
			registry,
			utility: container,
			creds,
			quiet: json
		});
	}

	if (vcfgs.length > backend.MaxModels) {
		throw new Error(
			`Too many models provided. Backend '${backend.Name}' supports a maximum of ${String(backend.MaxModels)} models.`
		);
	}

	const dirName = `weaver-${vcfgs[0].target.Soc}-${String(Date.now())}`;
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), dirName));

	try {
		const subsystem = backend.Weaver.Subsystem.toLowerCase();
		const initialFlextcm = vcfgs[0].backend.Extensions
			?.FlexTCM as string;
		const initialCompiler = vcfgs[0].backend.Extensions
			?.Compiler as string;

		const inputData: AiWeaverInput = {
			soc: backend.Weaver.Soc,
			subsystem: {
				[subsystem]: {
					language: "c++",
					os: "zephyr",
					target: "xtsc",
					compiler: initialCompiler,
					flextcm: initialFlextcm,
					models: []
				}
			}
		};

		const errors: string[] = [];
		let outDir = "";

		for (const vcfg of vcfgs) {
			if (vcfg.prj_info.out_dir != ".") {
				// Non default output directory, check for consistency across models
				if (outDir != "" && vcfg.prj_info.out_dir !== outDir) {
					errors.push(
						logCodeGenMessage({
							level: "ERROR",
							msg: `Inconsistent output directories across models. Found '${vcfg.prj_info.out_dir}' for model '${vcfg.name}', but previously found '${outDir}'.`
						})
					);
				} else {
					outDir = vcfg.prj_info.out_dir;
				}
			}

			if (
				vcfg.backend.Extensions?.FlexTCM &&
				vcfg.backend.Extensions.FlexTCM !== initialFlextcm
			) {
				errors.push(
					logCodeGenMessage({
						level: "ERROR",
						msg: `Inconsistent FlexTCM value '${vcfg.backend.Extensions.FlexTCM as string}' for model '${vcfg.name}'. Expected '${initialFlextcm}'`
					})
				);
			}

			if (
				vcfg.backend.Extensions?.Compiler &&
				vcfg.backend.Extensions.Compiler !== initialCompiler
			) {
				errors.push(
					logCodeGenMessage({
						level: "ERROR",
						msg: `Inconsistent Compiler value '${vcfg.backend.Extensions.Compiler as string}' for model '${vcfg.name}'. Expected '${initialCompiler}'`
					})
				);
			}

			inputData.subsystem[subsystem].models.push({
				arch: vcfg.backend.Extensions?.Arch as string,
				path: await copyToTempDir(vcfg.files.Model, tmpDir),
				mode: vcfg.backend.Extensions?.Mode as string
			});

			models.push({
				name: vcfg.name,
				datasetPath: vcfg.files.Dataset,
				extensions: vcfg.backend.Extensions as Extensions
			});
		}

		if (errors.length > 0) {
			output.stderr.push(...errors);
			output.code = 1;
		} else {
			if (outDir == "") {
				outDir = path.join(vcfgs[0].prj_info.name, "src", "adi_nn");
			}
			const buildDir = path.isAbsolute(outDir)
				? outDir
				: path.resolve(
						path.join(vcfgs[0].prj_info.workspace, outDir)
					);

			// Report as relative posix path
			const reportDir = outDir.split(path.sep).join(path.posix.sep);

			await fs.writeFile(
				path.join(tmpDir, "input.json"),
				JSON.stringify(inputData, null, 2)
			);

			trace(
				json,
				`INFO: Invoking code generation may take several minutes. Please wait...`
			);

			const result: AiCommandResult = await invokeContainer(
				container,
				backend.Weaver.DockerImage,
				tmpDir,
				json
			);
			output.stdout.push(...result.stdout);
			output.stderr.push(...result.stderr);
			output.code = result.code;

			if (output.code) {
				output.stderr.push(
					logCodeGenMessage({
						level: "ERROR",
						msg: `Container execution failed with code ${String(output.code)}.`
					})
				);
			} else {
				const srcDir = path.join(tmpDir, subsystem);
				await fs.mkdir(buildDir, { recursive: true });

				if (backend.Weaver.Copy) {
					for (const item of backend.Weaver.Copy) {
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
						} catch {
							output.stderr.push(
								logCodeGenMessage({
									level: "ERROR",
									msg: `Failed to copy '${item}' to '${buildDir}'`
								})
							);
							output.code = 1;
						}
					}
				} else {
					await copyToBuild(srcDir, buildDir);
				}
				await generateAdditionalFiles(models, buildDir);
				output.stdout.push(
					logCodeGenMessage({
						level: "INFO",
						msg: `Created files at '${reportDir}'.`,
						event: {
							status: "OK",
							type: "FILE",
							value: reportDir
						}
					})
				);
			}
		}
	} finally {
		await removeTempDir(tmpDir);
	}

	return output;
}
