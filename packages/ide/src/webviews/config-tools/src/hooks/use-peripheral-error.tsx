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
import {getPeripheralError} from '../utils/peripheral-errors';
import type {ControlCfg} from '../../../common/types/soc';

/**
 * Custom hook to check if there are errors in Peripheral Allocations view
 * if a signal, peripheral pair is required and not assigned to a pin then it counts as an error
 * @returns - boolean
 */
export default function usePeripheralError(
	projectControls: Record<string, Record<string, ControlCfg[]>>,
	projectIds: string[]
): boolean {
	const allocations = usePeripheralAllocations();
	const assignedPins = useAssignedPins();

	const hasError = projectIds?.some(
		projId =>
			getPeripheralError(
				assignedPins,
				allocations[projId],
				projectControls[projId]
			) > 0
	);

	return Boolean(hasError);
}
