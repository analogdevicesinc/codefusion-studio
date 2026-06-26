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

import {
	type Target,
	type AiSupportingBackend
} from '../../../../../common/types/ai-fusion-data-model';
import {getLocalization} from '../../../../../common/utils/localization';
import {type AIModelWithId} from '../../../state/slices/ai-tools/aiModel.reducer';
import {type AISupportingCore} from '../../../utils/ai-tools';
import {getCfsConfigDict} from '../../../utils/config';

function isValidCIdentifier(name: string): boolean {
	return /^[a-zA-Z0-9_]+$/.test(name);
}

export function validateModel(
	currentModel: AIModelWithId,
	models: AIModelWithId[],
	originalModel?: AIModelWithId
): Record<string, string> {
	const errors: Record<string, string> = {};

	const l10n =
		getLocalization('cfgtools')?.aitools.modelConfig.errors;

	// Fail if model name is empty
	if (!currentModel.Name) {
		errors.Name = l10n?.modelNameRequired;
	}

	// Fail if model name already exists (and is not the original name when editing)
	if (
		models.some(
			model =>
				model.Name === currentModel.Name && model !== originalModel
		)
	) {
		errors.Name = l10n?.modelNameExists;
	}

	// Target core
	if (!currentModel.Target.Core) {
		errors.Target = l10n?.targetRequired;
	}

	// Symbol name
	if (
		currentModel.Backend?.Extensions?.Symbol &&
		!isValidCIdentifier(
			String(currentModel.Backend.Extensions.Symbol)
		)
	) {
		errors.Symbol = l10n?.invalidCIdentifier;
	}

	if (!currentModel.Files.Model) {
		errors.ModelFile = l10n?.modelFileRequired;
	}

	return errors;
}

export function findSupportedAiBackendsForCore(
	backends: Record<string, AiSupportingBackend>,
	aiCore: Omit<AISupportingCore, 'Backend'>
): string[] {
	const socConfig = getCfsConfigDict();

	return (
		Object.entries(backends)
			.filter(([_, backend]) =>
				backend.Targets.some(target =>
					checkBackendSupported(aiCore, socConfig, target)
				)
			)
			.map(([backendName, _]) => backendName) ?? []
	);
}

function checkBackendSupported(
	aiCore: Omit<AISupportingCore, 'Backend'>,
	socConfig: ReturnType<typeof getCfsConfigDict>,
	target: Target
): boolean {
	const hardware = target.Hardware;

	if (target.FirmwarePlatform) {
		const project = socConfig?.projects.find(
			project => project.CoreId === aiCore.Id
		);

		if (
			!project ||
			!caseInsensitiveCompare(
				project.FirmwarePlatform,
				target.FirmwarePlatform
			)
		) {
			return false;
		}
	}

	if (
		hardware.Soc &&
		!caseInsensitiveCompare(hardware.Soc, socConfig?.Soc)
	) {
		return false;
	}

	if (
		hardware.Core &&
		!caseInsensitiveCompare(hardware.Core, aiCore.Id)
	) {
		return false;
	}

	if (
		hardware.Family &&
		!caseInsensitiveCompare(hardware.Family, aiCore.Family)
	) {
		return false;
	}

	if (
		(hardware.Accelerator &&
			!caseInsensitiveCompare(
				hardware.Accelerator,
				aiCore.Accelerator
			)) ??
		(hardware.Accelerator === null && aiCore.Accelerator)
	) {
		return false;
	}

	return true;
}

function caseInsensitiveCompare(a?: string, b?: string): boolean {
	return a?.toUpperCase() === b?.toUpperCase();
}
