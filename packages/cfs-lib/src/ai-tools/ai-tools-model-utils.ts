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
/**
 * Should be usable in both browser and CLI. So no usage of Node-specific APIs here.
 * If you need to use Node APIs, put those in ai-tools-utils.ts
 */

import type { AiBackend, AIModel } from "cfs-types";

import { sanitizeToCIdentifier } from "../utils/c-utils.js";
import { caseInsensitiveCompare } from "../utils/string-utils.js";

export const MAX_MODEL_NAME_LENGTH = 64;

export function validateModelNameLength(name: string): void {
	if (name.length > MAX_MODEL_NAME_LENGTH) {
		throw new Error(
			`Model name must not exceed ${MAX_MODEL_NAME_LENGTH} characters.`
		);
	}
}

export function enforceMaxActiveModels(
	models: AIModel[],
	changedModel: AIModel,
	maxModels: number,
	jsonOutput = false
): AIModel[] {
	const disabledModels: string[] = [];

	const relevantModels = models.filter(
		(m) =>
			m.Target.Core.toUpperCase() ===
				changedModel.Target.Core.toUpperCase() &&
			(m.Backend?.Name ?? "").toUpperCase() ===
				(changedModel.Backend?.Name ?? "").toUpperCase()
	);

	const enabledModels = relevantModels.filter((m) => m.Enabled);

	if (enabledModels.length > maxModels) {
		const modelsToDisable = enabledModels.length - maxModels;
		enabledModels
			.filter((m) => m.Name !== changedModel.Name)
			.slice(0, modelsToDisable)
			.forEach((m) => {
				disabledModels.push(m.Name);
				m.Enabled = false;
			});
	}

	if (!jsonOutput) {
		if (disabledModels.length > 0)
			console.warn(
				`Maximum number of models exceeded. The following model ${disabledModels.length > 1 ? "s have" : "has"} been disabled: ${disabledModels.map((name) => name).join(", ")}`
			);
	}

	return models;
}

export function requiresCalibrationValidationLabels(
	extensions?: Record<string, string | number | boolean>
): boolean {
	return Boolean(extensions?.Class);
}

/** Which field a validation set entry uses: a class label or an expected output file. */
export type ValidationMode = "label" | "expected";

/** Quantization metrics that compare against an expected output instead of a label. */
const EXPECTED_OUTPUT_METRICS = new Set([
	"mse",
	"psnr",
	"l1",
	"l2",
	"ssim"
]);

/**
 * Derives which validation field the selected quantization metric
 * (`MetricName` extension) uses.
 * Returns undefined when the backend has no metric set.
 */
export function getValidationMode(
	extensions?: Record<string, string | number | boolean>
): ValidationMode | undefined {
	const metric = extensions?.MetricName;

	if (metric === undefined || metric === "") {
		return undefined;
	}

	return EXPECTED_OUTPUT_METRICS.has(String(metric))
		? "expected"
		: "label";
}

export function enforceOneActiveBackendPerTarget(
	backends: Record<string, AiBackend>,
	models: AIModel[],
	changedModel?: AIModel
): AIModel[] {
	// Only proceed if the changedModel is enabled
	if (!changedModel?.Enabled) {
		return models;
	}

	if (!changedModel.Backend?.Name) {
		console.warn(
			`Changed model ${changedModel.Name} does not have a backend specified.
			Skipping backend compatibility enforcement.`
		);
		return models;
	}

	const changedModelBackend = backends[changedModel.Backend.Name];

	const backendsToDisable = Object.values(backends).filter(
		(backend) =>
			backend.Name !== changedModelBackend.Name &&
			backend.Targets.some((target) =>
				changedModelBackend.Targets.some(
					(changedTarget) =>
						target.Hardware.Soc?.toUpperCase() ===
							changedTarget.Hardware.Soc?.toUpperCase() &&
						target.Hardware.Core?.toUpperCase() ===
							changedTarget.Hardware.Core?.toUpperCase() &&
						target.Hardware.Accelerator?.toUpperCase() ===
							changedTarget.Hardware.Accelerator?.toUpperCase()
				)
			)
	);

	return models.map((model) => {
		if (
			model.Enabled &&
			model.Target.Core.toUpperCase() ===
				changedModel.Target.Core.toUpperCase() &&
			(model.Target.Accelerator ?? "").toUpperCase() ===
				(changedModel.Target.Accelerator ?? "").toUpperCase() &&
			backendsToDisable.some(
				(backend) =>
					model.Backend?.Name.toUpperCase() ===
					backend.Name.toUpperCase()
			)
		) {
			model.Enabled = false;
		}
		return model;
	});
}

function getModelIdentifiers(model: AIModel): string[] {
	const symbol = model.Backend?.Extensions?.Symbol
		? String(model.Backend.Extensions.Symbol)
		: undefined;

	return symbol
		? [
				sanitizeToCIdentifier(symbol),
				sanitizeToCIdentifier(model.Name)
			]
		: [sanitizeToCIdentifier(model.Name)];
}

export function findModelIdentifierCollision(
	current: AIModel,
	others: AIModel[]
): AIModel | undefined {
	const currentIdentifiers = getModelIdentifiers(current);

	for (const model of others) {
		if (model === current) {
			continue;
		}

		let modelIdentifiers: string[] = [];

		try {
			modelIdentifiers = getModelIdentifiers(model);
		} catch {
			continue;
		}

		if (
			currentIdentifiers.some((id) =>
				modelIdentifiers.some((otherId) =>
					caseInsensitiveCompare(id, otherId)
				)
			)
		) {
			return model;
		}
	}

	return undefined;
}
