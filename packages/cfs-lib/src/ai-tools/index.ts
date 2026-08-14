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
import type {
	AIModelBackend,
	AiBackend,
	AiCommandResult,
	AiTarget,
	CfsConfig,
	CfsSocDataModel,
	SocAi,
	SocControl,
	VerifiedConfig
} from "cfs-types";
import type { CfsApiClient } from "cfs-ccm-lib";
import * as path from "path";
import { tmpdir } from "node:os";
import fg from "fast-glob";
import temp from "temp";
import {
	getValidExtensions,
	resolveSource,
	sanitizeToCIdentifier,
	getGeneratedFileComment
} from "./ai-tools-utils.js";
import { MAX_MODEL_NAME_LENGTH } from "./ai-tools-model-utils.js";
import { generateMot } from "./mot.js";
import type { AuthConfig } from "../auth/session-manager.js";
import type {
	CalibrationData,
	Labels,
	ValidationData
} from "cfs-types/types/cfs-config";
import { caseInsensitiveCompare } from "../utils/string-utils.js";
import { execFile } from "node:child_process";
import { AiCommandError } from "./ai-command-error.js";
import { generateTflm } from "./tflm/tflm.js";
export { AiCommandError } from "./ai-command-error.js";

export interface AiToolsData {
	properties: Record<string, SocControl[]>;
	SupportedBackends: Record<string, AiBackend>;
}

interface SocAiWithTarget extends SocAi {
	Target: Required<Omit<AiTarget, "Accelerator">> & {
		Accelerator?: string;
	};
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
	): SocAiWithTarget {
		const core = dataModel.Cores.find((c) =>
			caseInsensitiveCompare(c.Id, coreId)
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
			// Look up accelerator
			const acc = dataModel.Peripherals.find((p) =>
				caseInsensitiveCompare(p.Name, accId)
			);
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

		return {
			...AiData,
			Target: {
				Soc: soc,
				Core: core.Id,
				Family: core.Family,
				Package: packageId,
				Accelerator: dataModel.Peripherals.find((p) =>
					caseInsensitiveCompare(p.Name, accId)
				)?.Name
			}
		};
	}

	public async getBackendFromName(
		name: string
	): Promise<AiBackend | undefined> {
		const aiData: AiToolsData | undefined =
			await this.readBackendJson();
		if (!aiData) {
			throw new Error("Failed to read configuration JSON.");
		}

		for (const [key, backend] of Object.entries(
			aiData.SupportedBackends
		)) {
			if (caseInsensitiveCompare(key, name)) {
				return backend;
			}
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

		const explicitlySupportedBackends: AiBackend[] = Object.values(
			aiData.SupportedBackends
		).filter((b) =>
			b.Targets.find(
				(t) =>
					caseInsensitiveCompare(t.Hardware.Core, target.Core) &&
					caseInsensitiveCompare(t.Hardware.Soc, target.Soc) &&
					caseInsensitiveCompare(
						t.Hardware.Accelerator,
						target.Accelerator
					)
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
				b.Targets.find((t) =>
					caseInsensitiveCompare(t.Hardware.Family, target.Family)
				)
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

		const entry = Object.entries(aiData.properties).find(([key]) =>
			caseInsensitiveCompare(key, name)
		);

		if (entry) {
			const [, props] = entry;
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

		return new Promise((resolve, reject) => {
			const fullArgs = ["-m", module, ...args];

			// Clear PYTHONHOME and PYTHONPATH to avoid conflicts with any existing settings
			const env = { ...process.env };
			delete env.PYTHONHOME;
			delete env.PYTHONPATH;

			execFile(
				pythonPath,
				fullArgs,
				{ env, cwd, maxBuffer: 256 * 1024 * 1024 },
				(error, stdout, stderr) => {
					let code = 0;

					if (error) {
						code = typeof error.code === "number" ? error.code : 1;
					}

					const output: AiCommandResult = {
						code: code,
						validCodes: validCodes ?? [0],
						events: [],
						artifacts: { files: [] }
					};

					try {
						const parsed = JSON.parse(
							stdout
						) as AiCommandResult["events"];

						output.events.push(...parsed);

						const artifacts = parsed
							.filter((event) => event.type === "FILE")
							.filter((event) => typeof event.value === "string")
							.map((event) => event.value);

						artifacts.length > 0
							? output.artifacts?.files.push(...artifacts)
							: delete output.artifacts;

						const validOutput = output.validCodes.includes(code);

						validOutput
							? resolve(output)
							: reject(new AiCommandError(output));
					} catch {
						reject(
							new AiCommandError({
								code: code ? code : 1,
								events: [
									{
										type: "ERROR",
										message:
											[
												stdout && `Failed to parse output: ${stdout}`,
												stderr,
												error?.message
											]
												.filter(Boolean)
												.join("\n") ||
											"AI command failed without output."
									}
								],
								validCodes: validCodes ?? [0]
							})
						);
					}
				}
			);
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
		apiAccess?: CfsApiClient | AuthConfig,
		onlyCore?: string,
		ignoreCache = false
	): Promise<AiCommandResult> {
		const output: AiCommandResult = {
			code: 0,
			validCodes: [0],
			events: [],
			artifacts: { files: [] }
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

				if (aiModel.Name.length > MAX_MODEL_NAME_LENGTH) {
					throw new Error(
						`Model name "${aiModel.Name}" exceeds the maximum length of ${String(MAX_MODEL_NAME_LENGTH)} characters.`
					);
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
							`Specified backend '${specifiedBackend}' not found for '${aiModel.Name}' on Core '${ai.Target.Core}'.`
						);
					}

					backendName = be.Name;
					backendPackage = be.Package;
				} else {
					be = await this.getBackendFromTarget(ai.Target);

					if (be) {
						backendName = be.Name;
						backendPackage = be.Package;
					} else {
						throw new Error(
							`No AI Backend found for model '${aiModel.Name}' on Core ${ai.Target.Core}.`
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
						Core: ai.Target.Core,
						Accelerator: ai.Target.Accelerator,
						Package: cfsconfig.Package,
						firmware_platform: project.FirmwarePlatform
					},
					backend: this.sanitizeBackend(backend)
				};

				const key = `${backendPackage}.${backendName}.${ai.Target.Core}`;
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

			if (vcfgs.backend.Package === "cfs-lib") {
				if (vcfgs.backend.Mot) {
					const motResult = await generateMot(
						vcfgs.backend,
						vcfgs.items,
						this.jsonMode,
						apiAccess,
						async (value) =>
							await resolveSource(
								this.cfsVersion,
								value,
								ignoreCache,
								cwd
							)
					);
					output.code = motResult.code;
					output.events.push(...motResult.events);
					output.artifacts?.files.push(
						...(motResult.artifacts?.files ?? [])
					);
				} else if (vcfgs.backend.Module === "tflm") {
					try {
						const tflmResult = await generateTflm(vcfgs.items);

						output.code = tflmResult.code;
						output.events.push(...tflmResult.events);
						output.artifacts?.files.push(
							...(tflmResult.artifacts?.files ?? [])
						);

						if (output.code !== 0) {
							throw new AiCommandError(output);
						}
					} catch (error) {
						if (error instanceof AiCommandError) {
							throw error;
						}

						throw new AiCommandError({
							code: 1,
							validCodes: [0],
							events: [
								...output.events,
								{
									type: "ERROR",
									message:
										error instanceof Error
											? error.message
											: "Build failed with unknown error."
								}
							]
						});
					}
				} else {
					throw new Error(
						`Unsupported backend "${vcfgs.backend.Module}" for "cfs-lib" Package.`
					);
				}
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
					output.code = result.code;
					output.events.push(...result.events);
					output.artifacts?.files.push(
						...(result.artifacts?.files ?? [])
					);
				} finally {
					await fs.unlink(tmpFile);
				}
			}
		}

		const comment = getGeneratedFileComment({
			soc: cfsconfig.Soc,
			Package: cfsconfig.Package
		});

		for (const file of output.artifacts?.files ?? []) {
			const stat = await fs.stat(file);
			if (stat.isFile()) {
				const content = await fs.readFile(file, "utf-8");
				await fs.writeFile(file, comment + content);
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

		const files = await fg(configPathPattern);
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
