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

import {usePeripheralAllocations} from '../state/slices/peripherals/peripherals.selector';
import {useAssignedPins} from '../state/slices/pins/pins.selector';
import {getProjectInfoList} from '../utils/config';
import {getAssignedPinErrors} from '../utils/pin-error';

/**
 * Custom hook to get the pin erros for each core. Any usassigned errors will be added to the primary core.
 * @returns {Map<string, number>} A map of core IDs to the number of pin errors for that core.
 */
export const usePinErrors = (): Map<string, number> => {
	const errorMap = new Map<string, number>();
	const assignedPins = useAssignedPins();
	const projects = getProjectInfoList();
	const peripheralAllocations = usePeripheralAllocations();

	const {conflictsCount} = getAssignedPinErrors(assignedPins);
	let unassignedErrors = conflictsCount;

	projects?.forEach(project => {
		const peripheralsForProject = Object.values(
			peripheralAllocations[project.ProjectId]
		);

		const assignedPinsForProject = assignedPins.filter(pin =>
			peripheralsForProject.some(peripheral =>
				pin.appliedSignals.some(
					signal => signal.Peripheral === peripheral.name
				)
			)
		);

		const {conflictsCount, hasFunctionConfigErrors} =
			getAssignedPinErrors(assignedPinsForProject);

		errorMap.set(
			project.ProjectId,
			hasFunctionConfigErrors ? conflictsCount + 1 : conflictsCount
		);

		unassignedErrors -= conflictsCount;
	});

	const primaryProject = projects?.find(project => project.IsPrimary);
	const primaryProjectErrors = errorMap.get(
		primaryProject?.ProjectId ?? ''
	);

	if (
		primaryProjectErrors !== undefined &&
		primaryProject &&
		unassignedErrors > 0
	) {
		errorMap.set(
			primaryProject.ProjectId,
			primaryProjectErrors + unassignedErrors
		);
	}

	return errorMap;
};
