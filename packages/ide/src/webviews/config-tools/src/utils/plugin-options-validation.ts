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
	TControlTypes,
	TNumericBase
} from '@common/types/errorTypes';
import {generateControlErrorMessage} from '@common/utils/control-errors';
import {generateValidationErrorType} from '@common/utils/validate-inputs';
import type {ControlCfg} from '@common/types/soc';
import type {ControlScope} from '../constants/scopes';
import type {
	ScopeConflict,
	ScopesDictionary,
	ScopeValueUsage
} from '../state/slices/scopes/scopes.reducer';
import {resolveTemplateString} from './rpn-expression-resolver';

export type ScopeValidationOptions = Pick<
	ScopeValueUsage,
	'projectId' | 'itemId'
> & {
	scopes: ScopesDictionary;
	controlScope: ControlScope;
	getConfigPath?: (controlId: string) => string | undefined;
	formatConflictMessage: (
		params: Pick<ScopeConflict, 'value' | 'scopeKey'> & {
			conflictingItems: string;
			controlType: ControlCfg['Type'];
		}
	) => string;
};

function normalizeScopedValue(
	value: string | number | boolean,
	control: ControlCfg
): string | undefined {
	if (control.Type === 'boolean') {
		return String(value).toLowerCase() === 'true'
			? 'TRUE'
			: undefined;
	}

	return String(value).trim();
}

function stringifyConfig(
	config: Record<string, any>
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(config).map(([key, value]) => [key, String(value)])
	);
}

function validateScopedPluginOptions(
	config: Record<string, any>,
	pluginControls: ControlCfg[],
	scopeValidation: ScopeValidationOptions
): Record<string, string> {
	const errors: Record<string, string> = {};

	pluginControls.forEach(control => {
		if (!control.Scope) return;

		const value = config[control.Id];

		if (
			typeof value !== 'string' &&
			typeof value !== 'number' &&
			typeof value !== 'boolean'
		) {
			return;
		}

		if (String(value).trim() === '') {
			return;
		}

		const normalizedValue = normalizeScopedValue(value, control);

		if (!normalizedValue) return;

		const scopeKey = String(
			resolveTemplateString(control.Scope, {
				...stringifyConfig(config),
				projectId: scopeValidation.projectId
			})
		);

		const currentConfigPath = scopeValidation.getConfigPath?.(
			control.Id
		);

		const conflictingEntries = (
			scopeValidation.scopes[scopeKey]?.[normalizedValue] ?? []
		).filter(entry => {
			const isCurrentItem =
				entry.controlScope === scopeValidation.controlScope &&
				entry.controlId === control.Id &&
				// ProjectId uniquely identifies the project, so coreId is redundant.
				entry.projectId === scopeValidation.projectId &&
				entry.itemId === scopeValidation.itemId;
			const isCurrentConfigPath =
				currentConfigPath !== undefined &&
				entry.configPath === currentConfigPath;

			return !(isCurrentItem || isCurrentConfigPath);
		});

		if (conflictingEntries.length) {
			const conflictingItems = [
				...new Set(
					conflictingEntries
						.map(entry => entry.itemId ?? entry.groupId)
						.filter(Boolean)
				)
			].join(', ');

			errors[control.Id] = scopeValidation.formatConflictMessage({
				value: normalizedValue,
				scopeKey,
				conflictingItems,
				controlType: control.Type
			});
		}
	});

	return errors;
}

export const validatePluginOptions = (
	config: Record<string, any>,
	pluginControls: ControlCfg[],
	scopeValidation?: ScopeValidationOptions
): Record<string, string> => {
	if (!config || !pluginControls) {
		return {};
	}

	const errorsMessages = scopeValidation
		? validateScopedPluginOptions(
				config,
				pluginControls,
				scopeValidation
			)
		: {};

	for (const control of pluginControls) {
		if (!config[control.Id]) {
			continue;
		}

		const inputData = {
			content: config[control.Id],
			controlType: control.Type as TControlTypes,
			minVal: control.MinimumValue,
			maxVal: control.MaximumValue,
			base: control.NumericBase as TNumericBase,
			pattern: control.Pattern,
			persistenceSeparator: control.PersistenceSeparator
		};

		// Validation against the provided rules, if any
		const errorType = generateValidationErrorType(inputData);

		if (errorType) {
			errorsMessages[control.Id] = generateControlErrorMessage(
				errorType,
				control.MinimumValue,
				control.MaximumValue
			);
		}
	}

	return errorsMessages;
};
