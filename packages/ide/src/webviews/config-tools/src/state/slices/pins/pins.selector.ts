/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import {useAppSelector} from '../../store';
import {createSelector} from '@reduxjs/toolkit';
import type {RootState} from '../../store';
import {getSocPinDictionary} from '../../../utils/soc-pins';
import {useAssignedPeripherals} from '../peripherals/peripherals.selector';

export function usePin(id: string) {
	return useAppSelector(state => state.pinsReducer.pins[id]);
}

export function usePackagePins() {
	return useAppSelector(state => state.pinsReducer.pins);
}

export function usePinDetailsTargetPin() {
	return useAppSelector(
		state => state.pinsReducer.pinDetailsTargetPin
	);
}

const selectFocusedPins = createSelector(
	(state: RootState) => state.pinsReducer.pins,
	pins => {
		const socPinsDictionary = getSocPinDictionary();

		return Object.entries(pins)
			.filter(([, pin]) => pin.isFocused)
			.map(([pinKey]) => socPinsDictionary[pinKey]?.Name)
			.filter(Boolean);
	}
);

export function useFocusedPins() {
	return useAppSelector(selectFocusedPins);
}

export function usePinAppliedSignals(id: string | undefined) {
	return useAppSelector(state =>
		id ? state.pinsReducer.pins[id]?.appliedSignals : undefined
	);
}

// Memoize useAssignedPins to avoid unnecessary re-renders
const selectPins = (state: RootState) => state.pinsReducer.pins;

export const selectAssignedPins = createSelector(
	[selectPins],
	pins => {
		const socPinsDictionary = getSocPinDictionary();

		return Object.entries(pins)
			.filter(([, pin]) => pin.appliedSignals.length > 0)
			.map(([pinKey, pin]) => ({
				...pin,
				Name: socPinsDictionary[pinKey]?.Name,
				Signals: socPinsDictionary[pinKey]?.Signals
			}))
			.filter(pin => pin.Name);
	}
);

export function useAssignedPins() {
	return useAppSelector(selectAssignedPins);
}

export function useAppliedSignalCfg(
	pinId: string | undefined,
	peripheralName: string | undefined,
	signalName: string | undefined
) {
	return useAppSelector(state => {
		if (pinId && signalName) {
			return state.pinsReducer.pins[pinId]?.appliedSignals.find(
				appliedSignal =>
					appliedSignal.Name === signalName &&
					appliedSignal.Peripheral === peripheralName
			);
		}

		return undefined;
	});
}

export function usePinConfigError(
	pinId: string,
	peripheralName: string,
	signalName: string,
	control: string
) {
	return useAppSelector(state => {
		if (pinId && signalName) {
			return state.pinsReducer.pins[pinId]?.appliedSignals.find(
				appliedSignal =>
					appliedSignal.Name === signalName &&
					appliedSignal.Peripheral === peripheralName
			)?.Errors?.[control];
		}
	});
}

export function useHoveredPin() {
	return useAppSelector(state => state.pinsReducer.hoveredPin);
}

/**
 * Custom hook to get the assigned pin based on the provided peripheral and signal.
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.peripheral - The name of the peripheral.
 * @param {string} params.signal - The name of the signal.
 * @returns {Object|undefined} The assigned pin object if found, otherwise undefined.
 */
export function useAssignedPin({
	peripheral,
	signal
}: {
	peripheral: string;
	signal: string;
}) {
	const assignedPins = useAppSelector(selectAssignedPins);

	if (!assignedPins.length) {
		return undefined;
	}

	return assignedPins.find(assignedPin =>
		assignedPin.appliedSignals.some(
			assignedSignal =>
				assignedSignal.Peripheral === peripheral &&
				assignedSignal.Name === signal
		)
	);
}

/**
 * Custom hook to get the assigned pins for a given project.
 *
 * @param {string} projectId - The project ID.
 * @returns {Array} The assigned pins.
 */
export function useProjectAssignedPins(projectId: string) {
	const peripheralsForProject = useAssignedPeripherals(projectId);

	return useAssignedPins().filter(pin =>
		peripheralsForProject.some(peripheral =>
			pin.appliedSignals.some(
				signal => signal.Peripheral === peripheral.name
			)
		)
	);
}

export function useSignalCoreId(
	signalName: string,
	peripheralName: string,
	pinId: string
): string | undefined {
	const assignedPins = useAppSelector(selectAssignedPins);

	if (!assignedPins.length) {
		return undefined;
	}

	const pin = assignedPins.find(
		assignedPin => assignedPin.pinId === pinId
	);

	if (pin) {
		const signal = pin.appliedSignals.find(
			signal =>
				signal.Name === signalName &&
				signal.Peripheral === peripheralName
		);

		if (signal) {
			return signal.Name ?? undefined; // FIX
		}
	}

	return undefined;
}

/**
 * Selector to get pins assigned to a specific peripheral.
 *
 * @param {string} peripheralId - The ID of the peripheral.
 * @returns {Array} The pins assigned to the specified peripheral.
 */
export const selectPinsByPeripheral = createSelector(
	[
		selectAssignedPins,
		(_state: RootState, peripheralId: string) => peripheralId
	],
	(assignedPins, peripheralId) => {
		if (!assignedPins.length || !peripheralId) {
			return [];
		}

		return assignedPins.filter(pin =>
			pin.appliedSignals.some(
				signal => signal.Peripheral === peripheralId
			)
		);
	}
);

/**
 * Custom hook to get all pins assigned to a specific peripheral.
 *
 * @param {string} peripheralId - The ID of the peripheral.
 * @returns {Array} The pins assigned to the specified peripheral.
 */
export function usePinsByPeripheral(peripheralId: string) {
	return useAppSelector(state =>
		selectPinsByPeripheral(state, peripheralId)
	);
}
