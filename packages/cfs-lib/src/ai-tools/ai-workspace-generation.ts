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
import path from "node:path";
import { AIModelCfsWorkspace } from "cfs-types";
import type { CfsConfig, CfsWorkspace } from "cfs-types";
import { CfsPluginManager } from "../managers/cfs-plugin-manager.js";
import type { CodeGenerationOptions } from "../managers/cfs-plugin-manager.js";
import { globFiles } from "../utils/file-glob.js";

export async function generateAIWorkspace(
	pluginManager: CfsPluginManager,
	workspaceConfig: AIModelCfsWorkspace,
	workspacePath: string,
	options?: CodeGenerationOptions
): Promise<void> {
	await pluginManager.generateWorkspace(workspaceConfig, options);
	await replaceGeneratedAiFiles(workspaceConfig, workspacePath);
}

export async function generateAIArtifacts(
	workspaceConfig: CfsWorkspace,
	generate: (
		config: CfsConfig,
		configPath: string,
		workspacePath: string
	) => Promise<void>
): Promise<void> {
	const workspacePath = path.join(
		workspaceConfig.location,
		workspaceConfig.workspaceName
	);
	const [configPath] = await globFiles([".cfs/*.cfsconfig"], {
		cwd: workspacePath,
		absolute: true
	});

	if (!configPath) return;

	const config = JSON.parse(
		await fs.readFile(configPath, "utf-8")
	) as CfsConfig;
	const hasEnabledAiModel = config.Projects.some((project) =>
		project.AIModels?.some(
			(model) => String(model.Enabled).toLowerCase() !== "false"
		)
	);

	if (hasEnabledAiModel) {
		await generate(config, configPath, workspacePath);
	}
}

async function replaceGeneratedAiFiles(
	workspaceConfig: AIModelCfsWorkspace,
	workspacePath: string
): Promise<void> {
	await updateCfsConfigsWithAiModelData(
		workspacePath,
		workspaceConfig.modelFile,
		workspaceConfig.sampleData
	);

	await deleteGeneratedAiAssetFiles(workspacePath);
}

async function updateCfsConfigsWithAiModelData(
	workspaceRoot: string,
	modelFile: string,
	sampleData?: string
): Promise<void> {
	const configFiles = await globFiles(["**/*.cfsconfig"], {
		cwd: workspaceRoot,
		deep: 20,
		absolute: true
	});

	for (const configPath of configFiles) {
		try {
			const configContent = await fs.readFile(configPath, "utf-8");
			const config = JSON.parse(configContent) as CfsConfig;

			let updated = false;
			for (const project of config.Projects) {
				if (project.AIModels && project.AIModels.length > 0) {
					const aiModel = project.AIModels[0];

					const trimmedModelFile = modelFile.trim();
					if (trimmedModelFile) {
						aiModel.Files.Model = resolveModelOrDatasetPath(
							trimmedModelFile,
							workspaceRoot
						);
					}

					const trimmedSampleData = sampleData?.trim();
					if (trimmedSampleData) {
						aiModel.Files.Dataset = resolveModelOrDatasetPath(
							trimmedSampleData,
							workspaceRoot
						);
					} else {
						delete aiModel.Files.Dataset;
					}

					updated = true;
					break;
				}
			}

			if (updated) {
				await fs.writeFile(
					configPath,
					JSON.stringify(config, null, 2)
				);
			}
		} catch (error) {
			console.warn(
				`Failed to update AI models in ${configPath}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}

function resolveModelOrDatasetPath(
	input: string,
	workspaceRoot: string
): string {
	// Keep URLs as-is
	if (input.includes("://")) {
		return input;
	}

	// Keep absolute paths as-is
	if (path.isAbsolute(input)) {
		return input;
	}

	// Resolve relative paths relative to workspace root
	return path.resolve(workspaceRoot, input);
}

async function deleteGeneratedAiAssetFiles(
	workspaceRoot: string
): Promise<void> {
	const modelFiles = await globFiles(["**/model.tflite"], {
		cwd: workspaceRoot,
		deep: 20,
		absolute: true
	});

	for (const modelFilePath of modelFiles) {
		try {
			await fs.unlink(modelFilePath);
		} catch (error) {
			console.warn(
				`Failed to delete generated model file ${modelFilePath}: ${error instanceof Error ? error.message : String(error)}`
			);
		}

		const datasetPath = path.join(
			path.dirname(modelFilePath),
			"dataset.bin"
		);
		try {
			await fs.unlink(datasetPath);
		} catch (error) {
			console.warn(
				`Failed to delete generated dataset file ${datasetPath}: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}
