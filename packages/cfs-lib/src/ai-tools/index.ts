/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
	AIModelBackend,
	AiBackend,
	AiTarget,
	CfsConfig,
	CfsSocDataModel,
	SocAi,
	SocControl
} from "cfs-types";
import * as path from "path";
import { spawn } from "child_process";
import { tmpdir } from "node:os";
import { glob } from "glob";
import temp from "temp";
import {
	getValidExtensions,
	resolveSource,
	sanitizeToCIdentifier
} from "./ai-tools-utils.js";
import { generateMot } from "./mot.js";
import { AuthConfig } from "../auth/session-manager.js";
import type {
	CalibrationData,
	Labels,
	ValidationData
} from "cfs-types/types/cfs-config";

export interface AiToolsData {
	properties: Record<string, SocControl[]>;
	SupportedBackends: Record<string, AiBackend>;
}

export interface CodeGenJsonMsg {
	level: "INFO" | "WARNING" | "ERROR";
	msg: string;
	event?: {
		status: "NA" | "OK" | "SKIPPED" | "FAILED";
		type: "FILE" | "MODEL";
		value: string;
	}; // for type file
}

export interface AiCommandResult {
	stdout: string[];
	stderr: string[];
	code: number | null;
	validCodes: number[];
}

export interface VerifiedConfig {
	name: string;
	prj_info: {
		name: string;
		workspace: string;
		out_dir: string;
	};
	files: Record<string, string>;
	target: AiTarget & {
		firmware_platform: string;
	};
	backend: AIModelBackend;
}

let instance: AIToolsPlugin | undefined;

export function getAiToolsPlugin(
	cfsaiPath: string,
	cfsVersion: string
): AIToolsPlugin {
	if (!instance) {
		instance = new AIToolsPlugin(cfsaiPath, cfsVersion);
	}
	return instance;
}

export default class AIToolsPlugin {
	private cachedData: AiToolsData | undefined;
	private jsonMode = true; // Assume to be in JSON mode unless set otherwise by the caller

	constructor(
		private cfsAiPath: string,
		private cfsVersion: string
	) {}

	/**
	 * Set JSON mode
	 * @param jsonMode - If true, tools will output JSON. If false, tools will output text. Default is true.
	 */
	public setJsonMode(jsonMode: boolean) {
		this.jsonMode = jsonMode;
	}

	/**
	 * Get AI Data from the data model for a given core or accelerator.
	 * @param dataModel - SoC data model
	 * @param SoC - SoC identifier
	 * @param packageId - Package identifier
	 * @param coreId - Core identifier
	 * @param accelId - Accelerator identifier
	 */
	public getAIDataFromSOCModel(
		dataModel: CfsSocDataModel,
		soc: string,
		packageId: string,
		coreId: string,
		accId?: string
	): SocAi {
		const core = dataModel.Cores.find(
			(c) => c.Id.toUpperCase() === coreId.toUpperCase()
		);
		if (!core) {
			const availableCores = dataModel.Cores.filter((c) => c.Ai).map(
				(c) => c.Id.toUpperCase()
			);

			throw new Error(
				`Core '${coreId}' is not found for '${dataModel.Name}'${availableCores.length > 0 ? `, try: ${availableCores.join(", ")}` : ""}`
			);
		}

		let AiData: SocAi;
		if (accId) {
			accId = accId.toUpperCase();
			// Look up accelerator
			const acc = dataModel.Peripherals.find((p) => p.Name === accId);
			if (!acc) {
				throw new Error(
					`Peripheral '${accId}' is not found for '${dataModel.Name}'.`
				);
			}

			if (!acc.Ai) {
				throw new Error(
					`Peripheral '${accId}' does not have AI support.`
				);
			}

			AiData = acc.Ai as SocAi;
		} else {
			// No accelerator, use core
			if (!core.Ai) {
				throw new Error(`Core '${coreId}' does not have AI support.`);
			}
			AiData = core.Ai as SocAi;
		}

		// Add the Target metadata fields to the AiData object for use by advanced AI tools
		// or save additional lookups later.

		AiData = {
			...AiData,
			Target: {
				Soc: soc,
				Core: coreId,
				Family: core.Family,
				Package: packageId,
				Accelerator: accId
			}
		};

		return AiData;
	}

	public async getBackendFromName(
		name: string
	): Promise<AiBackend | undefined> {
		const aiData: AiToolsData | undefined =
			await this.readBackendJson();
		if (!aiData) {
			throw new Error("Failed to read configuration JSON.");
		}

		if (name in aiData.SupportedBackends) {
			return aiData.SupportedBackends[name];
		}
		return undefined;
	}

	async getBackendFromTarget(
		target: AiTarget
	): Promise<AiBackend | undefined> {
		const aiData: AiToolsData | undefined =
			await this.readBackendJson();
		if (!aiData) {
			throw new Error("Failed to read configuration JSON.");
		}

		// Correct case for inputs
		target.Soc = target.Soc?.toLowerCase();
		target.Core = target.Core?.toUpperCase();
		if (target.Accelerator) {
			target.Accelerator = target.Accelerator.toUpperCase();
		}

		const explicitlySupportedBackends: AiBackend[] = Object.values(
			aiData.SupportedBackends
		).filter((b) =>
			b.Targets.find(
				(t) =>
					t.Hardware.Core === target.Core &&
					t.Hardware.Soc === target.Soc &&
					t.Hardware.Accelerator === target.Accelerator
			)
		);

		let backend =
			explicitlySupportedBackends.find((b) => b.Default) ??
			explicitlySupportedBackends.at(0);

		// Look for a generic family match if no exact match found
		// Not applicable to accelerators since they can vary even within the same family.
		if (!backend && !target.Accelerator) {
			const supportedFamilyBackends: AiBackend[] = Object.values(
				aiData.SupportedBackends
			).filter((b) =>
				b.Targets.find((t) => t.Hardware.Family === target.Family)
			);
			backend =
				supportedFamilyBackends.find((b) => b.Default) ??
				supportedFamilyBackends.at(0);
		}

		return backend;
	}

	public async getPropertiesFromName(
		name: string
	): Promise<SocControl[]> {
		const aiData: AiToolsData | undefined =
			await this.readBackendJson();
		if (!aiData) {
			throw new Error("Failed to read configuration JSON.");
		}

		let props: SocControl[] = [];

		if (name in aiData.properties) {
			props = aiData.properties[name];
			return props;
		}

		throw new Error(`No backend properties found for '${name}'`);
	}

	private async runPythonCommand(
		packageName: string,
		module: string,
		args: string[],
		validCodes?: number[],
		cwd?: string
	): Promise<AiCommandResult> {
		const pythonPath = await this.getPythonExecutable(packageName);
		const fullArgs = ["-m", module, ...args];

		return new Promise((resolve, reject) => {
			const stdout: string[] = [];
			const stderr: string[] = [];

			// Clear PYTHONHOME and PYTHONPATH to avoid conflicts with any existing settings
			const env = { ...process.env };
			delete env.PYTHONHOME;
			delete env.PYTHONPATH;

			const proc = spawn(pythonPath, fullArgs, { env, cwd });

			proc.stdout.on("data", (data: Buffer) => {
				stdout.push(data.toString());
			});

			proc.stderr.on("data", (data: Buffer) => {
				stderr.push(data.toString());
			});

			proc.on("close", (code) => {
				resolve({
					stdout,
					stderr,
					code,
					validCodes: validCodes ?? [0]
				});
			});

			proc.on("error", (error) => {
				reject(error);
			});
		});
	}

	async runCompat(
		ai: SocAi,
		model: string,
		options: {
			reportFile?: string;
			ignoreCache?: boolean;
			dataset?: string;
		},
		cwd = process.cwd()
	): Promise<AiCommandResult> {
		model = await resolveSource(
			this.cfsVersion,
			model,
			options.ignoreCache ?? false,
			cwd
		);

		if (options.dataset) {
			options.dataset = await resolveSource(
				this.cfsVersion,
				options.dataset,
				options.ignoreCache ?? false,
				cwd
			);
		}

		const tmpFile = temp.path({
			dir: tmpdir(),
			suffix: ".cfs_compatibility_analyzer"
		});

		await fs.writeFile(tmpFile, JSON.stringify(ai));

		try {
			const args: string[] = [
				"--file",
				tmpFile,
				"--model",
				model,
				...(options.reportFile
					? ["--json-file", options.reportFile]
					: []),
				...(options.dataset ? ["--dataset", options.dataset] : [])
			];

			return await this.runPythonCommand(
				"cfsai",
				"cfsai_compatibility_analyzer",
				args,
				[0, 10]
			);
		} finally {
			await fs.unlink(tmpFile);
		}
	}

	async runProfile(
		ai: SocAi,
		model: string,
		options: {
			reportFileFormat: "json" | "text";
			reportFilePath?: string;
			ignoreCache?: boolean;
		},
		cwd = process.cwd()
	): Promise<AiCommandResult> {
		model = await resolveSource(
			this.cfsVersion,
			model,
			options.ignoreCache ?? false,
			cwd
		);

		const tmpFile = temp.path({
			dir: tmpdir(),
			suffix: ".cfs_resource_profiler"
		});

		await fs.writeFile(tmpFile, JSON.stringify(ai));

		try {
			const args: string[] = [
				"--file",
				tmpFile,
				"--model",
				model,
				...(options.reportFilePath
					? [
							options.reportFileFormat === "json"
								? "--json-file"
								: "--text-file",
							options.reportFilePath
						]
					: [])
			];

			return await this.runPythonCommand(
				"cfsai",
				"cfsai_resource_profiler",
				args
			);
		} finally {
			await fs.unlink(tmpFile);
		}
	}

	private sanitizeBackend(backend: AIModelBackend): AIModelBackend {
		const calibrationSet: CalibrationData = [
			...(backend.CalibrationData ?? [])
		];
		const validationSet: ValidationData = [
			...(backend.ValidationData ?? [])
		];
		const labels: Labels = [...(backend.Labels ?? [])];

		// string checks handle extension setting via the CLI
		if (typeof backend.Extensions?.CalibrationSet === "string") {
			calibrationSet.push(
				...backend.Extensions.CalibrationSet.split(",")
			);
		}

		if (typeof backend.Extensions?.ValidationSet === "string") {
			const values = backend.Extensions.ValidationSet.split(",");

			if (values.length % 2 !== 0) {
				throw new Error(
					"Invalid 'ValidationSet' value, expected an even number of items separated by commas e.g. <input_path>,<label>"
				);
			}

			for (let i = 0; i < values.length; i += 2) {
				validationSet.push([values[i], values[i + 1]]);
			}
		}

		if (typeof backend.Extensions?.Labels === "string") {
			labels.push(...backend.Extensions.Labels.split(","));
		}

		// remove dataset, label values from extensions due to how they're passed in via CLI
		delete backend.Extensions?.CalibrationSet;
		delete backend.Extensions?.ValidationSet;
		delete backend.Extensions?.Labels;

		return {
			Name: backend.Name,
			Extensions: backend.Extensions,
			...(calibrationSet.length > 0 && {
				CalibrationData: calibrationSet
			}),
			...(validationSet.length > 0 && {
				ValidationData: validationSet
			}),
			...(labels.length > 0 && {
				Labels: labels
			})
		};
	}

	async generateFromConfig(
		cfsconfig: CfsConfig,
		dataModel: CfsSocDataModel,
		cwd: string,
		authConfig: AuthConfig,
		onlyCore?: string,
		ignoreCache = false
	): Promise<AiCommandResult> {
		const output: AiCommandResult = {
			stdout: [],
			stderr: [],
			code: null,
			validCodes: [0]
		};
		const configApiMap = new Map<
			string,
			{ items: VerifiedConfig[]; backend: AiBackend }
		>();

		let be: AiBackend | undefined;

		for (const project of cfsconfig.Projects) {
			if (onlyCore && project.CoreId !== onlyCore) {
				continue;
			}

			if (
				project.AIModels === undefined ||
				project.AIModels.length === 0
			) {
				continue;
			}

			for (const aiModel of project.AIModels ?? []) {
				const specifiedBackend = aiModel.Backend?.Name;
				let backendName: string;
				let backendPackage: string;

				if (String(aiModel.Enabled).toLowerCase() === "false") {
					continue;
				}

				for (const [key, value] of Object.entries(aiModel.Files)) {
					switch (key) {
						case "Model":
						case "Dataset":
						case "NetworkConfig": {
							aiModel.Files[key] = await resolveSource(
								this.cfsVersion,
								value,
								ignoreCache,
								cwd
							);
							break;
						}

						default: {
							break;
						}
					}
				}

				// allows us to verify core/acc values (needed for both paths below)
				const ai = this.getAIDataFromSOCModel(
					dataModel,
					cfsconfig.Soc,
					cfsconfig.Package,
					project.CoreId,
					aiModel.Target.Accelerator
				);

				if (specifiedBackend) {
					be = await this.getBackendFromName(specifiedBackend);
					if (!be) {
						throw new Error(
							`Specified backend '${specifiedBackend}' not found for '${aiModel.Name}' on Core '${project.CoreId}'.`
						);
					}

					backendName = be.Name;
					backendPackage = be.Package;
				} else {
					if (ai.Target) {
						be = await this.getBackendFromTarget(ai.Target);

						if (be) {
							backendName = be.Name;
							backendPackage = be.Package;
						} else {
							throw new Error(
								`No AI Backend found for model '${aiModel.Name}' on Core ${project.CoreId}.`
							);
						}
					} else {
						throw new Error(
							`No AI Target data found for model '${aiModel.Name}' on Core '${project.CoreId}'.`
						);
					}
				}

				const properties =
					await this.getPropertiesFromName(backendName);

				const defaultBeExtensions = getValidExtensions(
					[],
					properties
				);

				const backend: AIModelBackend = {
					Name: backendName,
					Extensions: {
						...defaultBeExtensions,
						...aiModel.Backend?.Extensions
					},
					...(aiModel.Backend?.CalibrationData && {
						CalibrationData: aiModel.Backend.CalibrationData
					}),
					...(aiModel.Backend?.ValidationData && {
						ValidationData: aiModel.Backend.ValidationData
					}),
					...(aiModel.Backend?.Labels && {
						Labels: aiModel.Backend.Labels
					})
				};

				const vcfg: VerifiedConfig = {
					name: sanitizeToCIdentifier(aiModel.Name),
					prj_info: {
						name: project.PlatformConfig.ProjectName,
						workspace: cwd,
						out_dir: aiModel.OutDir || "."
					},
					files: aiModel.Files,
					target: {
						Soc: cfsconfig.Soc,
						Core: project.CoreId,
						Accelerator: aiModel.Target.Accelerator,
						Package: cfsconfig.Package,
						firmware_platform: project.FirmwarePlatform
					},
					backend: this.sanitizeBackend(backend)
				};

				const key = `${backendPackage}.${backendName}.${project.CoreId}`;
				const entry = configApiMap.get(key);

				if (entry) {
					configApiMap.set(key, {
						items: [...entry.items, vcfg],
						backend: be
					});
				} else {
					configApiMap.set(key, { items: [vcfg], backend: be });
				}
			}
		}

		for (const vcfgs of configApiMap.values()) {
			const tmpFile = temp.path({
				dir: tmpdir()
			});

			if (vcfgs.backend.Mot) {
				const motResult = await generateMot(
					vcfgs.backend,
					vcfgs.items,
					this.jsonMode,
					authConfig,
					async (value) =>
						await resolveSource(
							this.cfsVersion,
							value,
							ignoreCache,
							cwd
						)
				);
				output.stdout.push(...motResult.stdout);
				output.stderr.push(...motResult.stderr);
				output.code = motResult.code ?? output.code;
				continue;
			} else {
				await fs.writeFile(
					tmpFile,
					JSON.stringify({ items: vcfgs.items })
				);

				try {
					const args: string[] = ["--file", tmpFile];
					const result = await this.runPythonCommand(
						vcfgs.backend.Package,
						vcfgs.backend.Module,
						args,
						undefined,
						cwd
					);
					output.stdout.push(...result.stdout);
					output.stderr.push(...result.stderr);
					output.code = result.code;
				} finally {
					await fs.unlink(tmpFile);
				}
			}
		}

		return output;
	}

	async getSupportedBackends<T>(): Promise<T> {
		return (await this.readBackendJson())?.SupportedBackends as T;
	}

	async getProperties(scope: string): Promise<SocControl[]> {
		return (await this.readBackendJson())?.properties[scope] ?? [];
	}

	/**
	 * reading from the backends/*.json files in the cfsai package.
	 * this is just temporary until we move this to a proper plugin where this data will be in the .cfsplugin file
	 */
	public async readBackendJson(): Promise<AiToolsData | undefined> {
		if (this.cachedData) {
			return this.cachedData;
		}

		const configPathPattern = path
			.join(this.cfsAiPath, "backends", "*")
			.replace(/\\/g, "/");

		const files = await glob(configPathPattern);
		if (files.length === 0) {
			console.error(
				`No backend JSON files found in path: ${configPathPattern}`
			);
			return undefined;
		}

		const parsedFiles: AiToolsData[] = await Promise.all(
			files.map(async (file) => {
				try {
					const fileContent = await fs.readFile(file, "utf-8");
					return JSON.parse(fileContent) as AiToolsData;
				} catch (error) {
					const message = `Failed to parse JSON file: ${file}`;
					console.error(message);
					throw new Error(message);
				}
			})
		);

		const combinedConfig: AiToolsData = parsedFiles.reduce(
			(combined, current) => ({
				properties: {
					...combined.properties,
					...current.properties
				},
				SupportedBackends: {
					...combined.SupportedBackends,
					...current.SupportedBackends
				}
			}),
			{ properties: {}, SupportedBackends: {} }
		);

		// Cache the contents for future lookups
		this.cachedData = combinedConfig;

		return combinedConfig;
	}

	private async fileExists(
		path: string,
		errorMessage: string
	): Promise<string> {
		try {
			await fs.stat(path);
			return path;
		} catch (error) {
			console.error(error);
			throw new Error(errorMessage);
		}
	}

	private async getPythonExecutable(
		packageName: string
	): Promise<string> {
		const isWindows = process.platform === "win32";
		const pythonPath = path.join(
			this.cfsAiPath,
			"..",
			packageName,
			"python",
			isWindows ? "python.exe" : "bin/python3"
		);

		return this.fileExists(pythonPath, "Python could not be found");
	}
}
