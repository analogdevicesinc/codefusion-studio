/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import {
	AIModel,
	CfsConfig,
	CfsPluginProperty,
	CfsSocDataModel
} from "cfs-plugins-api";
import * as path from "path";
import { spawn } from "child_process";
import { tmpdir } from "node:os";
import { CodeGenerationFailure } from "../types/code-generation.js";

export interface AiToolsUiData {
	properties: Record<string, CfsPluginProperty[]>;
	SupportedBackends: Record<string, unknown>;
}

export interface validationResult {
	isValid: boolean;
	reportPath?: string;
}

interface CodeGenJsonMsg {
	level: "INFO" | "WARNING" | "ERROR";
	msg: string;
	file_created_event?: {
		status: string;
		path: string;
	}; // for type file
}

let instance: AIToolsPlugin | undefined;

export function getAiToolsPlugin(cfsaiPath: string): AIToolsPlugin {
	if (!instance) {
		instance = new AIToolsPlugin(cfsaiPath);
	}
	return instance;
}

export default class AIToolsPlugin {
	private tmpCfsConfigPath = path.join(
		tmpdir(),
		".cfsconfig_temp.json"
	);

	private tmpModelValidationReportPath = path.join(
		tmpdir(),
		".cfs_model_validation_reports"
	);

	private cachedUiData: AiToolsUiData | undefined;

	constructor(private cfsAiPath: string) {}

	async generateCode(
		data: { cfsconfig: CfsConfig; datamodel: CfsSocDataModel },
		baseDir?: string
	): Promise<(string | CodeGenerationFailure)[]> {
		const projectsToGenerate = data.cfsconfig.Projects.filter(
			(project) => project.AIModels && project.AIModels.length > 0
		);

		if (projectsToGenerate.length === 0) {
			return [];
		}

		const cfsAiPath = await this.getCfsaiExecutable();

		const promises: Promise<void>[] = [];
		const generatedFiles: string[] = [];
		const errors: CodeGenerationFailure[] = [];

		await fs.writeFile(
			this.tmpCfsConfigPath,
			JSON.stringify(data.cfsconfig)
		);

		const projectsWithErrors = new Set<string>();

		const handleOutputData = (
			data: unknown,
			project: string,
			defaultLevel: "INFO" | "ERROR"
		) => {
			const outputs = this.parseOutputData(data, defaultLevel);
			for (const output of outputs) {
				const level =
					typeof output === "object" ? output.level : defaultLevel;
				if (typeof output === "object" && output.file_created_event) {
					const msg = `Created file "${output.file_created_event.path}  [${output.file_created_event.status}]"`;
					console.log(`[${project}] [${level}] ${msg}`);
					if (output.file_created_event.status === "OK") {
						generatedFiles.push(output.file_created_event.path);
					} else {
						errors.push({
							name: output.file_created_event.path,
							error: `Failed to create file: ${output.file_created_event.path}`
						});
					}
				} else if (
					typeof output === "object" &&
					output.level === "ERROR"
				) {
					if (!projectsWithErrors.has(project)) {
						projectsWithErrors.add(project);
						errors.push({
							name: `${project}/AI Model Generation`,
							error: output.msg
						});
					}
				}
				console.log(`[${project}] [${level}] ${output.msg}`);
			}
		};

		for (const project of projectsToGenerate) {
			const args = `--json build --config ${this.tmpCfsConfigPath} --no-path-checks --only-core ${project.CoreId}`;
			promises.push(
				new Promise<void>((resolve) => {
					const codeGenProcess = spawn(cfsAiPath, args.split(" "), {
						cwd: baseDir
					});
					codeGenProcess.stdout.on("data", (data) => {
						handleOutputData(data, project.ProjectId, "INFO");
					});
					codeGenProcess.stderr.on("data", (data) => {
						handleOutputData(data, project.ProjectId, "ERROR");
					});
					codeGenProcess.on("error", (error) => {
						console.error(
							`Error in cfsai process for project ${project.CoreId}:`,
							error
						);
						errors.push({
							name: `${project.ProjectId}/AI Model Generation`,
							error:
								error instanceof Error
									? error.message
									: "cfsai exited with error"
						});
					});
					codeGenProcess.on("close", (code) => {
						if (code) {
							console.log(
								`Process exited with code ${code.toString()}`
							);
						}
						resolve();
					});
				})
			);
		}

		await Promise.all(promises);

		return [...generatedFiles, ...errors];
	}

	async getSupportedBackends<T>(): Promise<T> {
		return (await this.readUiJson())?.SupportedBackends as T;
	}

	async getProperties(scope: string): Promise<CfsPluginProperty[]> {
		return (await this.readUiJson())?.properties[scope] ?? [];
	}

	async runModelAnalysis(
		aiModel: AIModel,
		soc: string,
		workspacePath?: string
	): Promise<string> {
		const cfsAiPath = await this.getCfsaiExecutable();

		const modelPath = path.resolve(
			workspacePath ?? "",
			aiModel.Files.Model
		);

		const reportPath = path.join(
			this.tmpModelValidationReportPath,
			`${aiModel.Name.replace(/\s+/g, "_")}_profiling_report.json`
		);

		return new Promise<string>((resolve, reject) => {
			const args = `profile --text-file ${reportPath} --model ${modelPath} --target ${soc}.${aiModel.Target.Core}${aiModel.Target.Accelerator ? `.${aiModel.Target.Accelerator}` : ""}`;
			const process = spawn(cfsAiPath, args.split(" "));
			process.stderr.on("data", (data) => {
				console.error(`AI Model analysis error: \n ${String(data)}`);
			});
			process.stdout.on("data", (data) => {
				console.error(`AI Model analysis: \n ${String(data)}`);
			});
			process.on("close", (code) => {
				if (code === 0) {
					resolve(reportPath);
				} else {
					reject(
						new Error(
							`AI Model analysis failed with exit code ${code?.toString() ?? "unknown"}.`
						)
					);
				}
			});
		});
	}

	async runModelValidation(
		aiModel: AIModel,
		soc: string,
		workspacePath?: string
	): Promise<validationResult> {
		const cfsAiPath = await this.getCfsaiExecutable();

		const modelPath = path.resolve(
			workspacePath ?? "",
			aiModel.Files.Model
		);

		const reportPath = path.join(
			this.tmpModelValidationReportPath,
			`${aiModel.Name.replace(/\s+/g, "_")}_compatibility_report.json`
		);
		return new Promise<validationResult>((resolve, reject) => {
			const args = `compat --json-file ${reportPath} --model ${modelPath} --target ${soc}.${aiModel.Target.Core}${aiModel.Target.Accelerator ? `.${aiModel.Target.Accelerator}` : ""}`;
			const process = spawn(cfsAiPath, args.split(" "));
			process.stderr.on("data", (data: Buffer) => {
				const decodedData = String(data);
				console.error(`AI Model Validation Error: \n ${decodedData}`);
			});
			process.stdout.on("data", (data: Buffer) => {
				const decodedData = String(data);
				console.error(
					`AI Model Validation Output: \n ${decodedData}`
				);
			});
			process.on("close", (code) => {
				if (code === 0) {
					resolve({ isValid: true });
				} else if (code === 10) {
					resolve({ isValid: false, reportPath });
				} else {
					reject(
						new Error(
							`AI Model analysis failed with exit code ${code?.toString() ?? "unknown"}.`
						)
					);
				}
			});
		});
	}

	/**
	 * reading from the ui.json file in the cfsai package.
	 * this is just temporary until we move this to a proper plugin where this data will be in the .cfsplugin file
	 */
	private async readUiJson(): Promise<AiToolsUiData | undefined> {
		if (this.cachedUiData) {
			return this.cachedUiData;
		}

		const uiJsonPath = path.join(this.cfsAiPath, "ui.json");

		const fileContent = await fs.readFile(uiJsonPath, "utf-8");
		this.cachedUiData = JSON.parse(fileContent) as AiToolsUiData;
		return this.cachedUiData;
	}

	private parseOutputData(
		data: unknown,
		defaultLevel: "INFO" | "ERROR"
	): CodeGenJsonMsg[] {
		const output: string =
			typeof data === "string"
				? data
				: Buffer.isBuffer(data)
					? data.toString()
					: "";
		return output
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.map((line) => {
				if (line.startsWith("{")) {
					return JSON.parse(line) as CodeGenJsonMsg;
				}
				return { msg: output, level: defaultLevel };
			});
	}

	private async getCfsaiExecutable(): Promise<string> {
		const isWindows = process.platform === "win32";
		const cfsAiPath = path.join(
			this.cfsAiPath,
			"bin",
			isWindows ? "cfsai.exe" : "cfsai"
		);

		try {
			await fs.stat(cfsAiPath);
		} catch (error) {
			const message =
				'CodeFusion Studio AI package "cfsai" could not be found';
			console.error(message);
			throw new Error(message);
		}
		return cfsAiPath;
	}
}
