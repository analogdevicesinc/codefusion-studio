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
import type {PeripheralConfig} from '../../../types/peripherals';
import {type RootState, useAppSelector} from '../../store';
import {getProjectInfoList} from '../../../utils/config';
import {createSelector} from '@reduxjs/toolkit';

/**
 * Custom hook to get the active peripheral.
 * @param includeCoreInfo If true, the core info will be included in the active peripheral in the format <peripheral>:<core>.
 * @returns {string} The active peripheral.
 */
export function useActivePeripheral(includeCoreInfo = false) {
	const activePeripheral = useAppSelector(
		state => state.peripheralsReducer.activePeripheral
	);

	if (!includeCoreInfo) {
		return activePeripheral?.split(':')[0];
	}

	return activePeripheral;
}

export function useActiveSignal() {
	return useAppSelector(
		state => state.peripheralsReducer.activeSignal
	);
}

export function useCurrentSignalsTargets() {
	return useAppSelector(
		state => state.peripheralsReducer.peripheralSignalsTargets
	);
}

export function useCurrentSignalTarget(
	peripheralGroup: string | undefined,
	signalName: string | undefined
) {
	return useAppSelector(
		state =>
			state.peripheralsReducer.peripheralSignalsTargets[
				peripheralGroup ?? ''
			]?.signalsTargets[signalName ?? '']
	);
}

/**
 * Custom hook to get the peripheral allocations for each core.
 *
 * This hook combines user assignments and preallocated peripherals
 * to generate a record of core assignments.
 *
 * @returns {Record<string, Record<string, PeripheralConfig>>} A record of peripheral assignemnts per core.
 */
const selectPeripheralAssignments = (state: RootState) =>
	state.peripheralsReducer.assignments;

export const selectPeripheralAllocations = createSelector(
	[selectPeripheralAssignments],
	assignments => {
		const projects = getProjectInfoList() ?? [];
		const projectAssignments = projects.reduce<
			Record<string, Record<string, PeripheralConfig>>
		>((acc, project) => {
			acc[project.ProjectId] = {};

			return acc;
		}, {});

		Object.values(assignments).forEach(peripheral => {
			const {projectId} = peripheral;

			if (projectId) {
				if (!projectAssignments[projectId]) {
					projectAssignments[projectId] = {};
				}

				projectAssignments[projectId][peripheral.name] = peripheral;
			} else {
				Object.values(peripheral.signals).forEach(signal => {
					const signalProjectId = signal.projectId ?? '';

					if (!projectAssignments[signalProjectId]) {
						projectAssignments[signalProjectId] = {};
					}

					if (!projectAssignments[signalProjectId][peripheral.name]) {
						projectAssignments[signalProjectId][peripheral.name] = {
							...peripheral,
							signals: {}
						};
					}

					projectAssignments[signalProjectId][
						peripheral.name
					].signals[signal.name] = signal;
				});
			}
		});

		return projectAssignments;
	}
);

export function usePeripheralAllocations() {
	return useAppSelector(selectPeripheralAllocations);
}

// Create selector for peripheral signal assignments
const selectPeripheralSignals = (
	state: RootState,
	peripheralName: string
) =>
	state.peripheralsReducer.assignments[peripheralName]?.signals ?? {};

const createSelectPeripheralSignalAssignments = () =>
	createSelector(
		[
			selectPeripheralSignals,
			(
				_state: RootState,
				_peripheralName: string,
				projectId?: string
			) => projectId
		],
		(signals, projectId) => {
			const signalList = Object.values(signals);

			if (projectId) {
				return signalList.filter(
					signal => signal.projectId === projectId
				);
			}

			return signalList;
		}
	);

/**
 * Custom hook to get the peripheral assignments for a given peripheral.
 * @param peripheralName The peripheral name.
 * @param projectId The core ID. If provided, only the assignments for the given core will be returned.
 * @returns {PeripheralConfig} The peripheral assignments.
 */
export function usePeripheralSignalAssignments(
	peripheralName: string,
	projectId?: string
) {
	// Create a new selector instance for each component to avoid selector conflicts
	const selectPeripheralSignalAssignments = useMemo(
		() => createSelectPeripheralSignalAssignments(),
		[]
	);

	return useAppSelector(state =>
		selectPeripheralSignalAssignments(
			state,
			peripheralName,
			projectId
		)
	);
}

/**
 * Custom hook to get the peripheral config for a given peripheral.
 * @param peripheralId The peripheral ID.
 * @returns {PeripheralConfig} The peripheral config.
 * */
export const usePeripheralConfig = (peripheralId: string) =>
	useAppSelector(
		state =>
			state.peripheralsReducer.assignments[peripheralId]?.config
	);

/**
 * Custom hook to get the projectId for a given peripheral.
 * @param peripheralId The peripheral ID.
 * @returns {string} The peripheral config.
 * */
export const usePeripheralProjectId = (peripheralId: string) =>
	useAppSelector(
		state =>
			state.peripheralsReducer.assignments[peripheralId]?.projectId
	);

/**
 * Selector to get the project ID for a given peripheral signal.
 * Since each signal only has one project ID, this returns a single string.
 */
const selectSignalProjectId = createSelector(
	[
		(state: RootState) => state.peripheralsReducer.assignments,
		(_: RootState, peripheralName: string) => peripheralName,
		(_: RootState, _peripheralName: string, signalName: string) =>
			signalName
	],
	(assignments, peripheralName, signalName) => {
		const peripheral = assignments[peripheralName];

		if (!peripheral) {
			return '';
		}

		// If the peripheral has a project ID (signal group), return it
		if (peripheral.projectId) {
			return peripheral.projectId;
		}

		// Otherwise, find the signal and return its project ID
		const signal = peripheral.signals[signalName];

		return signal?.projectId ?? '';
	}
);

/**
 * Custom hook to get the project ID for a given peripheral or signal.
 * @param peripheralName The peripheral name.
 * @param signalName The signal name.
 * @returns {string} The allocated project ID or an empty string.
 */
export const useSignalProjectId = (
	peripheralName: string,
	signalName: string
): string =>
	useAppSelector(state =>
		selectSignalProjectId(state, peripheralName, signalName)
	);

/**
 * Custom hook to get the peripheral assignments for a given project.
 * @param projectId The project Id.
 * @returns {PeripheralConfig[]} The peripheral assignments.
 */
export const useAssignedPeripherals = (projectId: string) => {
	const peripheralAllocations = usePeripheralAllocations();

	return Object.values(peripheralAllocations[projectId] ?? {});
};

/**
 * Custom hook to get the peripheral description.
 * @param peripheralId The peripheral ID.
 * @returns {string} The peripheral description.
 */
export const usePeripheralDescription = (peripheralId: string) =>
	useAppSelector(
		state =>
			state.peripheralsReducer.assignments[peripheralId]
				?.description ?? ''
	);

/**
 * Custom hook to get the signal description.
 * @param peripheral The peripheral name.
 * @param signalName The signal name.
 * @returns {string} The signal description.
 */
export const useSignalDescription = (
	peripheral: string,
	signalName: string
) =>
	useAppSelector(
		state =>
			state.peripheralsReducer.assignments[peripheral]?.signals[
				signalName
			]?.description ?? ''
	);

/**
 * Selects peripheral allocations for a specific project.
 * @param projectId The project Id.
 * @returns {Record<string, PeripheralConfig>} The peripheral allocations for the project.
 */

const selectProjectPeripheralAllocations = createSelector(
	[
		(state: RootState) => state.peripheralsReducer.assignments,
		(_state: RootState, projectId: string) => projectId
	],
	(assignments, projectId) => {
		const allocations: Record<string, PeripheralConfig> = {};
		Object.values(assignments).forEach(peripheral => {
			if (peripheral.projectId === projectId) {
				allocations[peripheral.name] = peripheral;
			} else {
				Object.values(peripheral.signals).forEach(signal => {
					if (signal.projectId === projectId) {
						if (!allocations[peripheral.name]) {
							allocations[peripheral.name] = {
								...peripheral,
								signals: {}
							};
						}

						allocations[peripheral.name].signals[signal.name] =
							signal;
					}
				});
			}
		});

		return allocations;
	}
);

export function useProjectPeripheralAllocations(projectId: string) {
	return useAppSelector(state =>
		selectProjectPeripheralAllocations(state, projectId)
	);
}
