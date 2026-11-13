/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import {useMemo} from 'react';
import {useAssignedPins} from '../state/slices/pins/pins.selector';
import {getPeripheralErrorCount} from '../utils/peripheral-errors';
import type {PeripheralConfig} from '../types/peripherals';
import type {ControlCfg} from '../../../common/types/soc';
import {useScopes} from '../state/slices/scopes/scopes.selector';
import {CONTROL_SCOPES} from '../constants/scopes';

/**
 * Custom hook to get the total number of errors across multiple projects
 * if a signal, peripheral pair is required and not assigned to a pin then count it as an error
 * @param projectAllocations - Record of project peripheral allocations
 * @returns A map of project IDs to their respective error counts
 */
export function useProjectsPeripheralAssignmentsErrors(
	projectAllocations: Record<
		string,
		Record<string, PeripheralConfig>
	>,
	projectsControls: Record<string, Record<string, ControlCfg[]>>
): Record<string, number> {
	const assignedPins = useAssignedPins();
	const scopes = useScopes();

	const errorsByProject = useMemo(() => {
		const errorMap: Record<string, number> = {};

		// Process each project's allocations and sum up errors
		Object.entries(projectAllocations).forEach(
			([projectId, allocations]) => {
				const projectErrorCount = getPeripheralErrorCount(
					assignedPins,
					allocations,
					projectsControls[projectId],
					{
						projectId,
						scopeValidation: {
							scopes,
							controlScope: CONTROL_SCOPES.PERIPHERAL,
							projectId
						}
					}
				);
				errorMap[projectId] = projectErrorCount;
			}
		);

		return errorMap;
	}, [projectAllocations, assignedPins, projectsControls, scopes]);

	return errorsByProject;
}
