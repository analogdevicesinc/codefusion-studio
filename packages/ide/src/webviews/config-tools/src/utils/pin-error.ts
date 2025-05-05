/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {type AssignedPin} from '../../../common/types/soc';

export function getAssignedPinErrors(
	assignedPins: AssignedPin[],
	errorCounter = 0
): {conflictsCount: number; hasFunctionConfigErrors: boolean} {
	let hasFunctionConfigErrors = false;

	for (const pin of assignedPins) {
		if (pin.appliedSignals.length > 1) {
			errorCounter++;
		}

		// Check other errors in function config
		if (
			pin.appliedSignals.some(
				item => Object.keys(item?.Errors ?? {}).length
			)
		) {
			hasFunctionConfigErrors = true;
		}
	}

	return {conflictsCount: errorCounter, hasFunctionConfigErrors};
}
