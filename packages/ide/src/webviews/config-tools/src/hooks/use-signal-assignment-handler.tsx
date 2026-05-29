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
import {useCallback} from 'react';
import {
	setNewPeripheralAssignment,
	setNewSignalAssignment
} from '../state/slices/app-context/appContext.reducer';
import {
	setSignalAssignment,
	setActiveSignal
} from '../state/slices/peripherals/peripherals.reducer';
import {updateSignalConfig} from '../state/slices/pins/pins.reducer';
import {usePinsByPeripheral} from '../state/slices/pins/pins.selector';
import {useAppDispatch} from '../state/store';
import {computeInitialPinConfig} from '../utils/pin-reset-controls';

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

			// Handles allocation to project and persistence of the computed default if available.
			dispatch(
				setSignalAssignment({peripheral, signalName, projectId})
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
		},
		[dispatch, peripheral, signalName, peripheralPins]
	);

	return handleSignalAssignment;
}
