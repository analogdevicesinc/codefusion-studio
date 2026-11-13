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

import {usePeripheralAllocations} from '../state/slices/peripherals/peripherals.selector';
import {useAssignedPins} from '../state/slices/pins/pins.selector';
import {getPeripheralErrorCount} from '../utils/peripheral-errors';
import type {ControlCfg} from '../../../common/types/soc';
import {useScopes} from '../state/slices/scopes/scopes.selector';
import {CONTROL_SCOPES} from '../constants/scopes';

/**
 * Custom hook to check if there are errors in Peripheral Allocations view
 * if a signal, peripheral pair is required and not assigned to a pin then it counts as an error
 * @returns - boolean
 */
export default function useHasPeripheralError(
	projectControls: Record<string, Record<string, ControlCfg[]>>,
	projectIds: string[]
): boolean {
	const allocations = usePeripheralAllocations();
	const assignedPins = useAssignedPins();
	const scopes = useScopes();

	const hasError = projectIds?.some(
		projId =>
			getPeripheralErrorCount(
				assignedPins,
				allocations[projId],
				projectControls[projId],
				{
					projectId: projId,
					scopeValidation: {
						scopes,
						controlScope: CONTROL_SCOPES.PERIPHERAL,
						projectId: projId
					}
				}
			) > 0
	);

	return Boolean(hasError);
}
