/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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
import {getPeripheralError} from '../utils/peripheral-errors';

import type {PeripheralConfig} from '../types/peripherals';
import type {ControlCfg} from '../../../common/types/soc';

/**
 * Custom hook to get the number of errors in Peripheral Allocations view
 * if a signal, peripheral pair is required and not assigned to a pin then count it as an error
 * @param allocations - Peripheral allocations
 * @returns - the number of errors found
 */
export default function useArePinAssignmentsMissingRequired(
	allocations: Record<string, PeripheralConfig>,
	controls: Record<string, ControlCfg[]>
): number {
	const assignedPins = useAssignedPins();

	const counter = useMemo(
		() => getPeripheralError(assignedPins, allocations, controls),
		[allocations, assignedPins, controls]
	);

	return counter;
}
