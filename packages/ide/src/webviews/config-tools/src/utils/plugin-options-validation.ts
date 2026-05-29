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

export const validatePluginOptions = (
	config: Record<string, any>,
	pluginControls: ControlCfg[]
): Record<string, string> => {
	const errorsMessages: Record<string, string> = {};

	if (!config || !pluginControls) {
		return errorsMessages;
	}

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
			pattern: control.Pattern
		};

		// Validation against the provided rules, if any
		const errorType = generateValidationErrorType(inputData);

		if (errorType) {
			errorsMessages[control.Id] =
				generateControlErrorMessage(errorType);
		}
	}

	return errorsMessages;
};
