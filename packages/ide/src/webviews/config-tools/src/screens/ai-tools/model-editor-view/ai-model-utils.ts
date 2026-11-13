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
import {
	getLocalization,
	localizeMessage
} from '../../../../../common/utils/localization';
import {type AIModelWithId} from '../../../state/slices/ai-tools/aiModel.reducer';
import {type AISupportingCore} from '../../../utils/ai-tools';
import {getCfsConfigDict} from '../../../utils/config';
import type {SocControl} from 'cfs-types';
import type {ValidationData} from 'cfs-types/types/cfs-config';
import {getFormErrors} from '../../../utils/soc-controls';
import type {TLocaleContext} from '../../../../../common/types/l10n';
import {requiresCalibrationValidationLabels} from 'cfs-lib/dist/ai-tools/ai-tools-model-utils.js';
import {C_CPP_RESERVED_KEYWORDS} from 'cfs-lib/dist/utils/c-utils';
import {findModelIdentifierCollision} from 'cfs-lib/dist/ai-tools/ai-tools-model-utils';

const MAX_MODEL_NAME_LENGTH = 64;

function isValidCIdentifier(name: string): boolean {
	return (
		/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) &&
		!C_CPP_RESERVED_KEYWORDS.has(name)
	);
}

// Fields that are not supposed to be validated when going through the dynamic Fields
// (e.g. because they have their own dedicated validation logic)
const dynamicValidationExemptFields = new Set([
	'Symbol',
	'CalibrationSet',
	'ValidationSet',
	'Labels'
]);

/** Every entry needs an input plus exactly one of `label`/`expected`, all using the same one. */
function validateValidationSet(
	validationSet: ValidationData,
	l10n: TLocaleContext | undefined
): string | undefined {
	if (!validationSet.length) {
		return undefined;
	}

	if (validationSet.some(({input}) => !input?.trim())) {
		return l10n?.validationInputRequired as string;
	}

	const usesExpected = validationSet.map(entry => {
		const hasLabel = 'label' in entry && Boolean(entry.label?.trim());
		const hasExpected =
			'expected' in entry && Boolean(entry.expected?.trim());

		return hasLabel === hasExpected ? undefined : hasExpected;
	});

	if (usesExpected.some(mode => mode === undefined)) {
		return l10n?.validationLabelOrExpectedRequired as string;
	}

	if (usesExpected.some(mode => mode !== usesExpected[0])) {
		return l10n?.validationMixedLabelAndExpected as string;
	}

	return undefined;
}

export function validateModel(
	currentModel: AIModelWithId,
	models: AIModelWithId[],
	originalModel?: AIModelWithId,
	dynamicControls?: SocControl[]
): Record<string, string> {
	let errors: Record<string, string> = {};

	const l10n =
		getLocalization('cfgtools')?.aitools.modelConfig.errors;

	const modelName = currentModel.Name?.trim();

	if (modelName) {
		if (modelName.length > MAX_MODEL_NAME_LENGTH) {
			errors.Name = localizeMessage(
				l10n as TLocaleContext,
				'modelNameTooLong',
				{
					maxLength: String(MAX_MODEL_NAME_LENGTH)
				}
			);
		}

		if (/^[0-9]/.test(modelName)) {
			errors.Name = l10n?.invalidCIdentifier;
		}
	} else {
		errors.Name = l10n?.modelNameRequired;
	}

	// Target core
	if (!currentModel.Target.Core) {
		errors.Target = l10n?.targetRequired;
	}

	// Symbol name (and collision check)
	if (
		currentModel.Backend?.Extensions?.Symbol &&
		!isValidCIdentifier(
			String(currentModel.Backend.Extensions.Symbol)
		)
	) {
		errors.Symbol = l10n?.invalidCIdentifier;
	} else if (
		!errors.Name &&
		findModelIdentifierCollision(
			currentModel,
			models.filter(m => m !== originalModel)
		)
	) {
		const errorField = currentModel.Backend?.Extensions?.Symbol
			? 'Symbol'
			: 'Name';
		errors[errorField] = l10n?.identifierCollision;
	}

	// Model file
	if (!currentModel.Files.Model?.trim()) {
		errors.ModelFile = l10n?.modelFileRequired;
	}

	if (
		requiresCalibrationValidationLabels(
			currentModel.Backend?.Extensions
		)
	) {
		if (!currentModel.Backend?.CalibrationData?.length) {
			errors.CalibrationSet = l10n?.fieldRequired;
		}

		if (!currentModel.Backend?.ValidationData?.length) {
			errors.ValidationSet = l10n?.fieldRequired;
		}

		if (!currentModel.Backend?.Labels?.length) {
			errors.Labels = l10n?.fieldRequired;
		}
	}

	// Validate dynamic controls
	dynamicControls?.forEach(control => {
		if (dynamicValidationExemptFields.has(control.Id)) {
			return;
		}

		const value =
			control.Type === 'File'
				? currentModel.Files[control.Id]
				: currentModel.Backend?.Extensions?.[control.Id];

		if (value !== undefined && value !== null && value !== '') {
			errors = getFormErrors(
				errors,
				{
					...control,
					Type:
						control.Type.toLowerCase() === 'file' ||
						control.Type.toLowerCase() === 'string'
							? 'text'
							: control.Type.toLowerCase()
				},
				value
			);
		} else if (control.Pattern) {
			// If control is required (has a pattern) but value is empty, add error
			errors[control.Id] = l10n?.fieldRequired;
		}
	});

	const validationSetError = validateValidationSet(
		currentModel.Backend?.ValidationData ?? [],
		l10n as TLocaleContext
	);

	if (validationSetError) {
		errors.ValidationSet = validationSetError;
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
