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

import {useAppSelector} from '../state/store';
import {getProjectInfoList} from '../utils/config';
import {
	getMaxCpuLoadInterval,
	getMaxProfilingMemoryInterval,
	getMinCpuLoadInterval,
	getMinProfilingMemoryInterval
} from '../state/slices/profiling/profilingPeripherals';

/**
 * Custom hook to get the profiling (Zephelin) errors for each project. This
 * mirrors the validity check used by the Profiling tab's conflict icon: an
 * unresolved baud rate when a UART interface is selected, plus an
 * out-of-range memory usage/CPU load interval.
 *
 * The interval checks are derived directly from the current `zephelin`
 * config rather than read from `profilingReducer.errors`, since that
 * record is only populated once a profiling action is dispatched
 * (`getProfilingPersistenceListenerMiddleware`) — a preloaded/persisted
 * config with an out-of-range interval would otherwise go unflagged until
 * the user edits the Profiling tab.
 * @returns {Map<string, number>} A map of project IDs to the number of profiling errors for that project.
 */
export const useProfilingErrors = (): Map<string, number> => {
	const errorMap = new Map<string, number>();
	const projects = getProjectInfoList();
	const zephelinConfigs = useAppSelector(
		state => state.profilingReducer.zephelin
	);
	const peripheralAssignments = useAppSelector(
		state => state.peripheralsReducer.assignments
	);

	projects?.forEach(project => {
		const zephelin = zephelinConfigs[project.ProjectId];

		if (!zephelin?.Enabled) {
			errorMap.set(project.ProjectId, 0);

			return;
		}

		let errorCount = 0;

		if (
			zephelin.ProfilingMemoryUsageEnabled &&
			isIntervalOutOfRange(
				zephelin.ProfilingMemoryUsageInterval,
				getMinProfilingMemoryInterval(),
				getMaxProfilingMemoryInterval()
			)
		) {
			errorCount++;
		}

		if (
			zephelin.ProfilingCpuLoadEnabled &&
			isIntervalOutOfRange(
				zephelin.ProfilingCpuLoadInterval,
				getMinCpuLoadInterval(),
				getMaxCpuLoadInterval()
			)
		) {
			errorCount++;
		}

		if (zephelin.Interface?.Type === 'UART') {
			const baudRate = Number(
				peripheralAssignments[zephelin.Interface.Port]?.config.BAUD
			);

			if (isNaN(baudRate)) {
				errorCount++;
			}
		}

		errorMap.set(project.ProjectId, errorCount);
	});

	return errorMap;
};

function isIntervalOutOfRange(
	interval: number | undefined,
	min: number,
	max: number
): boolean {
	return interval === undefined || interval < min || interval > max;
}
