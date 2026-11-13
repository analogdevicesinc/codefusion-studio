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
	CfsAiCompatibilityReport,
	CfsConfig,
	CfsSocDataModel,
	SocAi,
	SocControl,
	VerifiedConfig,
	CfsAiProfilingReport
} from "cfs-types";
import type { CfsApiClient } from "cfs-ccm-lib";
import * as path from "path";
import { tmpdir } from "node:os";
import { isDeepStrictEqual } from "node:util";
import fg from "fast-glob";
import temp from "temp";
import {
	getValidExtensions,
	resolveSource,
	getGeneratedFileComment,
	addFileCreatedEvent,
	generateProfilingReport
} from "./ai-tools-utils.js";
import { validateModelNameLength } from "./ai-tools-model-utils.js";
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
import {
	getPythonExecutablePath,
	assertFileExists,
	cleanPythonEnv
} from "./python-utils.js";
import {
	generateTflm,
	generateTflmSharedHeader,
	type TflmModelInput,
	type TflmDeferredHeaders
} from "./tflm/tflm.js";
import { generateVela } from "./vela/vela.js";
import type { CfsCancellationToken } from "../utils/cancellation.js";
import {
	assertValidFileExtension,
	hashFile
} from "../utils/file-utils.js";
import { sanitizeToCIdentifier } from "../utils/c-utils.js";
import { CfsPackageManagerProvider } from "cfs-package-manager";
export { AiCommandError } from "./ai-command-error.js";

type AiPlatformConfig = {
	ProjectName?: string;
};

export interface AiToolsData {
	properties: Record<string, SocControl[]>;
	SupportedBackends: Record<string, AiBackend>;
}

interface SocAiWithTarget extends SocAi {
	Target: Required<Omit<AiTarget, "Accelerator" | "Config">> & {
		Accelerator?: string;
		Config?: Record<string, string | number>;
	};
}

export async function runTflmCodegen(
	items: VerifiedConfig[],
	output: AiCommandResult,
	modelInputs?: ReadonlyArray<TflmModelInput | undefined>,
	deferred?: TflmDeferredHeaders
): Promise<void> {
	try {
		const tflmResult = await generateTflm(
			items,
			modelInputs,
			deferred
		);

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
}

let instance: AIToolsPlugin | undefined;

export function getAiToolsPlugin(
	cfsaiPath: string,
	cfsVersion: string,
	pkgManager?: CfsPackageManagerProvider
): AIToolsPlugin {
	if (!instance) {
		instance = new AIToolsPlugin(cfsaiPath, cfsVersion, pkgManager);
	}
	return instance;
}

export default class AIToolsPlugin {
	private cachedData: AiToolsData | undefined;
	private jsonMode = true; // Assume to be in JSON mode unless set otherwise by the caller
	private verboseMode = false;
	private quietMode = false;

	constructor(
		private cfsAiPath: string,
		private cfsVersion: string,
		private pkgManager?: CfsPackageManagerProvider
	) {}

	/**
	 * Set JSON mode
	 * @param jsonMode - If true, tools will output JSON. If false, tools will output text. Default is true.
	 */
	public setJsonMode(jsonMode: boolean) {
		this.jsonMode = jsonMode;
	}

	/**
	 * Set verbose mode
	 * @param verbose - If true, tools will output additional diagnostic information.
	 */
	public setVerbose(verbose: boolean) {
		this.verboseMode = verbose;
	}

	/**
	 * Set quiet mode
	 * @param quiet - If true, tools will suppress non-error output.
	 */
	public setQuiet(quiet: boolean) {
		this.quietMode = quiet;
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

	public async isBackendSlow(target: AiTarget): Promise<boolean> {
		const backend = await this.getBackendFromTarget(target);
		if (!backend) {
			return false;
		}
		return backend.Slow ?? false;
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

	private async runPythonCommand<T = unknown>(
		packageName: string,
		module: string,
		args: string[],
		validCodes?: number[],
		cwd?: string,
		cancelationToken?: CfsCancellationToken
	): Promise<AiCommandResult<T>> {
		const pythonPath = await assertFileExists(
			getPythonExecutablePath(this.cfsAiPath, packageName),
			"Python could not be found"
		);

		return new Promise((resolve, reject) => {
			const fullArgs = ["-m", module, ...args];

			const execution = execFile(
				pythonPath,
				fullArgs,
				{ env: cleanPythonEnv(), cwd, maxBuffer: 256 * 1024 * 1024 },
				(error, stdout, stderr) => {
					let code = 0;

					if (error) {
						code = typeof error.code === "number" ? error.code : 1;
					}

					const output: AiCommandResult<T> = {
						code: code,
						validCodes: validCodes ?? [0],
						events: [],
						artifacts: { files: [] }
					};

					try {
						const parsed = JSON.parse(
							stdout
						) as AiCommandResult["events"];

						// filter out DATA events
						output.events.push(
							...parsed.filter((event) => event.type !== "DATA")
						);

						const artifacts = parsed
							.filter((event) => event.type === "FILE")
							.filter((event) => typeof event.value === "string")
							.map((event) =>
								cwd ? path.resolve(cwd, event.value) : event.value
							);

						if (artifacts.length > 0) {
							output.artifacts?.files.push(...artifacts);
						} else {
							delete output.artifacts;
						}

						const data = parsed
							.filter((event) => event.type === "DATA")
							.filter((event) => typeof event.value === "string")
							.map((event) => event.value);

						if (data.length > 1) {
							output.events.push({
								type: "WARN",
								message: `Expected a single DATA event but received ${String(data.length)}. Only the first will be used.`
							});
						}

						if (data.length > 0) {
							try {
								output.data = JSON.parse(data[0]) as T;
							} catch {
								output.events.push({
									type: "ERROR",
									message: "Failed to parse DATA event value as JSON."
								});
							}
						}

						const validOutput = output.validCodes.includes(code);

						if (validOutput) {
							resolve(output);
						} else {
							reject(new AiCommandError(output));
						}
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

			cancelationToken?.onCancellationRequested(() => {
				execution.kill();
				reject(new Error("Python command execution cancelled."));
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
	): Promise<AiCommandResult<CfsAiCompatibilityReport>> {
		const originalModelPath = model;

		model = await resolveSource(
			this.cfsVersion,
			model,
			options.ignoreCache ?? false,
			cwd
		);

		const modelHash = await hashFile(model);
		const be = await this.getBackendFromTarget(ai.Target as AiTarget);

		assertValidFileExtension(model, be?.Formats ?? []);

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
				...(options.dataset ? ["--dataset", options.dataset] : [])
			];

			const result =
				await this.runPythonCommand<CfsAiCompatibilityReport>(
					"cfsai",
					"cfsai_compatibility_analyzer",
					args,
					[0, 10]
				);

			if (result.data === undefined) {
				result.events.push({
					type: "ERROR",
					message: "No data returned from compatibility analysis."
				});
			} else {
				if (result.data.model_summary) {
					result.data.model_summary.model_hash = modelHash;
					result.data.model_summary.model_path = originalModelPath;
				}

				if (options.reportFile) {
					try {
						await fs.mkdir(path.dirname(options.reportFile), {
							recursive: true
						});
						await fs.writeFile(
							options.reportFile,
							JSON.stringify(result.data, null, 2),
							"utf8"
						);
						addFileCreatedEvent(
							result,
							path.resolve(path.dirname(options.reportFile)),
							path.dirname(options.reportFile),
							path.basename(options.reportFile)
						);
					} catch {
						result.events.push({
							type: "WARN",
							message: `Failed to save compatibility report to: ${options.reportFile}.`
						});
					}
				}
			}

			return result;
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
	): Promise<AiCommandResult<CfsAiProfilingReport>> {
		const originalModelPath = model;

		model = await resolveSource(
			this.cfsVersion,
			model,
			options.ignoreCache ?? false,
			cwd
		);

		const modelHash = await hashFile(model);
		const be = await this.getBackendFromTarget(ai.Target as AiTarget);

		assertValidFileExtension(model, be?.Formats ?? []);

		const tmpFile = temp.path({
			dir: tmpdir(),
			suffix: ".cfs_resource_profiler"
		});

		await fs.writeFile(tmpFile, JSON.stringify(ai));

		try {
			const args: string[] = ["--file", tmpFile, "--model", model];

			const result =
				await this.runPythonCommand<CfsAiProfilingReport>(
					"cfsai",
					"cfsai_resource_profiler",
					args
				);

			if (result.data === undefined) {
				result.events.push({
					type: "ERROR",
					message: "No data returned from profiling analysis."
				});
			} else {
				if (result.data.model_summary) {
					result.data.model_summary.model_hash = modelHash;
					result.data.model_summary.model_path = originalModelPath;
				}

				if (options.reportFilePath) {
					try {
						await fs.mkdir(path.dirname(options.reportFilePath), {
							recursive: true
						});
						await fs.writeFile(
							options.reportFilePath,
							options.reportFileFormat === "json"
								? JSON.stringify(result.data, null, 2)
								: generateProfilingReport(result.data),
							"utf8"
						);
						addFileCreatedEvent(
							result,
							path.resolve(path.dirname(options.reportFilePath)),
							path.dirname(options.reportFilePath),
							path.basename(options.reportFilePath)
						);
					} catch {
						result.events.push({
							type: "WARN",
							message: `Failed to save profiling report to: ${options.reportFilePath}.`
						});
					}
				}
			}

			return result;
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
					`Invalid 'ValidationSet' value, expected a multiple of two items separated by commas e.g. <input_path>,<output_value>.\nGot ${values.length} items: "${values.join(",")}"`
				);
			}

			// ValidationSet value depends on the Metric: Either a label or an expected file.
			// Determine which from the Metric
			if (
				backend.Extensions?.MetricName === undefined &&
				backend.Extensions?.MetricName === null
			) {
				throw new Error(
					`Invalid 'Metric' value, expected a defined metric for 'ValidationSet'.`
				);
			}
			const metric = backend.Extensions?.MetricName as string;
			const metrics_with_expected = [
				"mse",
				"psnr",
				"l1",
				"l2",
				"ssim"
			];
			const has_expected = metrics_with_expected.includes(
				metric.toLowerCase()
			);

			// Validation set consists of a 2-part tuple, where each entry has an input and an expected output.
			// Track each entry to ensure that label and expected aren't mixed or missing.
			for (let i = 0; i < values.length; i += 2) {
				validationSet.push(
					has_expected
						? { input: values[i], expected: values[i + 1] }
						: { input: values[i], label: values[i + 1] }
				);
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
		cfsconfig: CfsConfig<AiPlatformConfig>,
		dataModel: CfsSocDataModel,
		cwd: string,
		apiAccess?: CfsApiClient | AuthConfig,
		onlyCore?: string,
		ignoreCache = false,
		cancellationToken?: CfsCancellationToken
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

				validateModelNameLength(aiModel.Name);

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

							if (key === "Model") {
								assertValidFileExtension(
									aiModel.Files[key],
									be.Formats
								);
							}

							break;
						}

						default: {
							break;
						}
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

				const name = backend.Extensions?.Symbol
					? String(backend.Extensions.Symbol)
					: aiModel.Name;

				const sanitizedName = sanitizeToCIdentifier(name);

				if (name !== sanitizedName) {
					output.events.push({
						type: "WARN",
						message: `${backend.Extensions?.Symbol ? "Symbol" : "Model"} '${name}' was changed to '${sanitizedName}' for C identifier compatibility.`
					});
				}

				const vcfg: VerifiedConfig = {
					name: sanitizedName,
					prj_info: {
						name: project.PlatformConfig?.ProjectName ?? "",
						workspace: cwd,
						out_dir: aiModel.OutDir ?? "."
					},
					files: aiModel.Files,
					target: {
						Soc: cfsconfig.Soc,
						Core: ai.Target.Core,
						Accelerator: aiModel.Target.Accelerator
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

		const deferredHeaders: TflmDeferredHeaders = {
			symbolsByDir: new Map(),
			reportDirByBuildDir: new Map()
		};

		for (const vcfgs of configApiMap.values()) {
			if (cancellationToken?.isCancellationRequested) {
				throw new Error("Code generation cancelled by user.");
			}

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
							),
						cancellationToken,
						this.verboseMode,
						this.quietMode
					);
					output.code = motResult.code;
					output.events.push(...motResult.events);
					output.artifacts?.files.push(
						...(motResult.artifacts?.files ?? [])
					);
				} else if (vcfgs.backend.Module === "tflm") {
					await runTflmCodegen(
						vcfgs.items,
						output,
						undefined,
						deferredHeaders
					);
				} else if (vcfgs.backend.Module === "vela") {
					const velaResult = await generateVela(
						vcfgs.backend,
						vcfgs.items,
						this.cfsAiPath,
						cwd,
						(soc) => this.getIniFromSoc(soc),
						deferredHeaders
					);
					output.code = velaResult.code;
					output.events.push(...velaResult.events);
					output.artifacts?.files.push(
						...(velaResult.artifacts?.files ?? [])
					);
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
					await fs.mkdir(cwd, { recursive: true });
					const args: string[] = ["--file", tmpFile];
					const result = await this.runPythonCommand(
						vcfgs.backend.Package,
						vcfgs.backend.Module,
						args,
						undefined,
						cwd,
						cancellationToken
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

		try {
			await generateTflmSharedHeader(deferredHeaders, output);
		} catch (error) {
			output.code = 1;
			output.events.push({
				type: "ERROR",
				message:
					error instanceof Error
						? error.message
						: "Build failed with unknown error."
			});
			throw new AiCommandError(output);
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

	private async getBackendPackageFiles(
		ext: "json" | "ini"
	): Promise<string[]> {
		const packages = await this.pkgManager?.getInstalledPackageInfo();

		const packageFiles = await fg(
			(packages ?? []).map((pkg) =>
				path
					.join(pkg.path, "**", "cfsai", "backends", `*.${ext}`)
					.replace(/\\/g, "/")
			)
		);

		return packageFiles;
	}

	/**
	 * reading from the backends/*.json files in the cfsai package.
	 * this is just temporary until we move this to a proper plugin where this data will be in the .cfsplugin file
	 */
	public async readBackendJson(): Promise<AiToolsData | undefined> {
		if (this.cachedData) {
			return this.cachedData;
		}

		const files: string[] = [];

		// Check sdk for backends
		const configPathPattern = path
			.join(this.cfsAiPath, "backends", "*")
			.replace(/\\/g, "/");

		files.push(...(await fg(configPathPattern)));

		// check installed
		const packageFiles = await this.getBackendPackageFiles("json");

		// SDK backends MUST be pushed first to ensure full AiBackend definition
		files.push(...packageFiles.flat());

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
				} catch {
					const message = `Failed to parse JSON file: ${file}`;
					console.error(message);
					throw new Error(message);
				}
			})
		);

		const combinedConfig: AiToolsData = parsedFiles.reduce(
			(combined, current) => {
				const supportedBackends = {
					...combined.SupportedBackends,
					...current.SupportedBackends
				};

				for (const [key, backend] of Object.entries(
					current.SupportedBackends ?? {}
				)) {
					const previous = combined.SupportedBackends[key];
					if (!previous) {
						continue;
					}

					// Concatenate targets and drop duplicates
					supportedBackends[key] = {
						...previous,
						Targets: [
							...(previous.Targets ?? []),
							...(backend.Targets ?? [])
						].filter(
							(target, index, targets) =>
								targets.findIndex((other) =>
									isDeepStrictEqual(other, target)
								) === index
						)
					};
				}

				return {
					properties: {
						...combined.properties,
						...current.properties
					},
					SupportedBackends: supportedBackends
				};
			},
			{ properties: {}, SupportedBackends: {} }
		);

		// Cache the contents for future lookups
		this.cachedData = combinedConfig;

		return combinedConfig;
	}

	public async getIniFromSoc(soc: string): Promise<string> {
		const configFile = (
			await this.getBackendPackageFiles("ini")
		).find((config) =>
			caseInsensitiveCompare(path.basename(config, ".ini"), soc)
		);

		if (!configFile) {
			throw new Error(`No backend config file found for SoC: ${soc}`);
		}

		return configFile;
	}
}
