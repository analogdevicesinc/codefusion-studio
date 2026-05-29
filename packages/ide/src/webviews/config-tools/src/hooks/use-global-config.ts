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
import {useMemo} from 'react';
import type {GlobalConfig} from '../utils/rpn-expression-resolver';
import {useClockNodesConfig} from '../state/slices/clock-nodes/clockNodes.selector';
import {
	useAppliedSignals,
	useAssignedPins
} from '../state/slices/pins/pins.selector';
import {usePeripheralAllocations} from '../state/slices/peripherals/peripherals.selector';

/**
 * Composes the global configuration object from Redux state.
 * This combines clock nodes, pin signals, peripheral allocations,
 * and assigned pins into a single {@link GlobalConfig} object.
 */
export function useGlobalConfig(): GlobalConfig {
	const clockconfig = useClockNodesConfig();
	const pinconfig = useAppliedSignals();
	const peripheralconfig = usePeripheralAllocations();
	const assignedPins = useAssignedPins();

	return useMemo(
		() => ({
			clockconfig,
			pinconfig,
			peripheralconfig,
			assignedPins
		}),
		[clockconfig, pinconfig, peripheralconfig, assignedPins]
	);
}
