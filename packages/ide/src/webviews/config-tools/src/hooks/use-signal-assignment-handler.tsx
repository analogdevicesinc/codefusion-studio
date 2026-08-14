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
import {useCallback} from 'react';
import {
	setNewPeripheralAssignment,
	setNewSignalAssignment
} from '../state/slices/app-context/appContext.reducer';
import {
	setSignalAssignment,
	setActiveSignal
} from '../state/slices/peripherals/peripherals.reducer';
import {
	setAppliedSignal,
	updateSignalConfig
} from '../state/slices/pins/pins.reducer';
import {usePinsByPeripheral} from '../state/slices/pins/pins.selector';
import {useAppDispatch} from '../state/store';
import {computeInitialPinConfig} from '../utils/pin-reset-controls';
import {
	getIsPeripheralSignalRequired,
	getPeripheralSignals
} from '../utils/soc-peripherals';

export function useSignalAssignmentHandler(
	peripheral: string,
	signalName: string
) {
	const dispatch = useAppDispatch();
	const peripheralPins = usePinsByPeripheral(peripheral);

	const handleSignalAssignment = useCallback(
		async (projectId: string) => {
			// Check first if the signal is already allocated to a pin. If so, we need to
			// compute the initial pin config for the signal to make it available in the cfsconfig
			const allocatedPin = peripheralPins.find(
				pin =>
					pin.appliedSignals.length &&
					pin.appliedSignals.some(
						(signal: any) =>
							signal.Peripheral === peripheral &&
							signal.Name === signalName &&
							(!signal.PinCfg ||
								Object.keys(signal.PinCfg as Record<string, unknown>)
									.length === 0)
					)
			);

			if (allocatedPin) {
				const payload = {
					Pin: allocatedPin.pinId,
					Peripheral: peripheral,
					Signal: signalName
				};

				const initialPinConfig = await computeInitialPinConfig({
					...payload,
					ProjectId: projectId
				});

				dispatch(
					updateSignalConfig({
						...payload,
						PinCfg: initialPinConfig
					})
				);
			}

			// If not already pinned, pre-compute auto-assign config when there's only one pin choice and the signal is required.
			// Done before any dispatches so setAppliedSignal can fire last, capturing complete state.
			let autoAssignPin:
				| {pinId: string; pinCfg: Record<string, string>}
				| undefined;

			if (!allocatedPin) {
				const availablePins =
					getPeripheralSignals(peripheral)[signalName]?.pins ?? [];

				if (
					availablePins.length === 1 &&
					getIsPeripheralSignalRequired(peripheral, signalName)
				) {
					const pinId = availablePins[0].Name;
					const alreadyAssignedToPin = peripheralPins.some(
						pin =>
							pin.pinId === pinId &&
							pin.appliedSignals.some(
								(s: any) =>
									s.Peripheral === peripheral && s.Name === signalName
							)
					);

					if (!alreadyAssignedToPin) {
						const pinCfg = await computeInitialPinConfig({
							Pin: pinId,
							Peripheral: peripheral,
							Signal: signalName,
							ProjectId: projectId
						});
						autoAssignPin = {pinId, pinCfg};
					}
				}
			}

			// Handles allocation to project and persistence of the computed default if available.
			// When auto-assigning a pin, suppress persistence here so setAppliedSignal (below) fires
			// last and captures both pin and project state in one consistent persistence call.
			dispatch(
				setSignalAssignment({
					peripheral,
					signalName,
					projectId,
					...(autoAssignPin ? {discardPersistence: true} : {})
				})
			);

			// Handles new allocation to highlight them in the center collapsible card
			dispatch(
				setNewPeripheralAssignment({
					peripheral,
					projectId
				})
			);
			dispatch(
				setNewSignalAssignment({
					signal: signalName,
					projectId
				})
			);

			// Open the config sidebar after signal assignment
			dispatch(
				setActiveSignal({
					peripheral,
					signal: signalName
				})
			);

			// Auto-assign dispatched last: its persistence captures both pins and projects
			// with the complete final Redux state, avoiding race conditions.
			if (autoAssignPin) {
				dispatch(
					setAppliedSignal({
						Pin: autoAssignPin.pinId,
						Peripheral: peripheral,
						Name: signalName,
						PinCfg: autoAssignPin.pinCfg
					})
				);
			}
		},
		[dispatch, peripheral, signalName, peripheralPins]
	);

	return handleSignalAssignment;
}
