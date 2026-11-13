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
import {CONTROL_SCOPES} from '../constants/scopes';
import {getControlsFromCache} from '../utils/api';
import useIsPinAssignmentMissing from './useIsPinAssignmentMissing';
import {useProjectsPeripheralAssignmentsErrors} from './use-projects-peripheral-assignments-errors-count';
import {useHasScopeConflictForItem} from '../state/slices/scopes/scopes.selector';

/**
 * Custom hook to count the peripheral config and missing pin assignment errors for a peripheral in a project
 * @param projectId - project to check for errors
 * @param peripheralName - Name of specifc peripheral to check
 * @param signalName - (Optional) Signal to check for missing pin assignment
 * @returns The number of errors this peripheral/signal group has in this project
 */
export default function useProjectPeripheralErrorCount(
	projectId: string,
	peripheralName: string,
	signalName?: string
) {
	const allocations = usePeripheralAllocations();
	const controls = getControlsFromCache(
		CONTROL_SCOPES.PERIPHERAL,
		projectId
	);
	const hasScopeConflict = useHasScopeConflictForItem({
		controlScope: CONTROL_SCOPES.PERIPHERAL,
		itemId: peripheralName,
		projectIds: [projectId]
	});
	const peripheralToValidate =
		allocations[projectId]?.[peripheralName] ?? {};
	const peripheralErrorMap = useProjectsPeripheralAssignmentsErrors(
		{
			[projectId]: {
				[peripheralName]: peripheralToValidate
			}
		},
		{[projectId]: controls ?? {}}
	);

	const isPinAssignmentMissing = useIsPinAssignmentMissing(
		signalName ?? '',
		peripheralName
	);

	// If checking a specific signal, the only error possible is missing pin assignment
	if (signalName) {
		return isPinAssignmentMissing ? 1 : 0;
	}

	return Math.max(
		peripheralErrorMap[projectId] ?? 0,
		hasScopeConflict ? 1 : 0
	);
}
