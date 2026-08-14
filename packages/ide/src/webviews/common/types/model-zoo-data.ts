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

export type ModelCompilationOption = {
	readonly values: readonly string[];
	readonly default: string;
};

export type ModelHardwareParameter = {
	readonly id: string;
	readonly values?: ReadonlyArray<string | boolean | number>;
	readonly default: string | boolean | number;
};

export type ModelPlatformCompilation = {
	readonly hardwareParameters?: readonly ModelHardwareParameter[];
	readonly optimization?: ModelCompilationOption;
	readonly quantization?: ModelCompilationOption;
};

export type ModelSupportedPlatform = {
	readonly soc: string;
	readonly board: string;
	readonly core: string;
	readonly package?: string;
	readonly family?: string;
	readonly accelerator?: string;
	readonly sample_binary?: Record<string, string>;
	readonly compilation?: ModelPlatformCompilation;
	// Quantization ID (like int8, float32) to path mapping for a given model
	readonly modelPaths: Record<string, string>;
	// Quantization ID to size in KB mapping
	readonly sizeInKb?: Record<string, number>;
};

export type ModelNetworkTensor = {
	readonly name: string;
	readonly shape: string;
	readonly description?: string;
	readonly network?: string;
};

export type ModelMetric = {
	readonly name: string;
	readonly value: string | number;
};

export type ModelAccuracy = {
	readonly dataset?: string;
	readonly metrics?: readonly ModelMetric[];
};

export type ModelData = {
	readonly uniqueId: string;
	readonly name: string;
	readonly displayName?: string;
	readonly description: string;
	readonly task: string;
	readonly taskType: string;
	readonly framework: string;
	readonly license: string;
	readonly owner?: string;
	readonly supportedPlatforms: readonly ModelSupportedPlatform[];
	readonly networkInputs?: readonly ModelNetworkTensor[];
	readonly networkOutputs?: readonly ModelNetworkTensor[];
	readonly accuracy?: ModelAccuracy;
	readonly createdAt?: string;
	readonly updatedAt?: string;
	baseURL: string; // Set by the component when loaded
};

export type ModelZooData = {
	readonly $schema: string;
	readonly version: string;
	readonly lastUpdated: string;
	readonly models: ModelData[];
};
