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
import {CONTROL_SCOPES} from '../constants/scopes';
import {setNewPeripheralAssignment} from '../state/slices/app-context/appContext.reducer';
import {
	setPeripheralAssignment,
	setSignalGroupAssignment,
	setActivePeripheral
} from '../state/slices/peripherals/peripherals.reducer';
import {
	setAppliedSignal,
	setMultiSignalConfig
} from '../state/slices/pins/pins.reducer';
import {usePinsByPeripheral} from '../state/slices/pins/pins.selector';
import {type AppDispatch, useAppDispatch} from '../state/store';
import {getControlsForProjectIds} from '../utils/api';
import {getIsExternallyManagedProject} from '../utils/config';
import {computeInitialPinConfig} from '../utils/pin-reset-controls';
import {evaluateCondition} from '../utils/rpn-expression-resolver';
import {
	computePeripheralResetValues,
	getPeripheralSignals
} from '../utils/soc-peripherals';

/* Apply multiple signal assignments in a batch.
 * Persistence applies the entire pin state at once, so only the final
 * assignment triggers persistence to avoid race conditions.
 */
const applyMultiSignals = (
	dispatch: AppDispatch,
	{
		peripheral,
		pinAssignments
	}: {
		peripheral: string;
		pinAssignments: Array<{
			signalName: string;
			pinId: string;
			pinCfg: Record<string, string>;
		}>;
	}
) => {
	pinAssignments.forEach(({signalName, pinId, pinCfg}, index) => {
		dispatch(
			setAppliedSignal({
				Pin: pinId,
				Peripheral: peripheral,
				Name: signalName,
				PinCfg: pinCfg,
				...(index < pinAssignments.length - 1
					? {discardPersistence: true}
					: {})
			})
		);
	});
};

export function useSignalGroupAssignmentHandler(peripheral: string) {
	const dispatch = useAppDispatch();
	const peripheralPins = usePinsByPeripheral(peripheral);

	const handleSignalGroupAssignment = useCallback(
		async (projectId: string) => {
			const isExternallyManaged =
				getIsExternallyManagedProject(projectId);

			const controls = await (isExternallyManaged
				? Promise.resolve(undefined)
				: getControlsForProjectIds(
						[projectId],
						CONTROL_SCOPES.PERIPHERAL
					));

			const computedDefaults: Record<string, string> = controls?.[
				peripheral
			]?.length
				? computePeripheralResetValues(
						peripheral,
						controls?.[peripheral] ?? []
					)
				: {};

			// Compute the initial control set that will be rendered in the UI
			// to filter out the configuration values that wont be accessible through the UI on the initial render of the form.
			const initialControlSet: string[] = [];
			const initialConfig: Record<string, string> = {};

			for (const control of controls?.[peripheral] ?? []) {
				if (
					(typeof control.Condition === 'string' &&
						evaluateCondition(computedDefaults, control.Condition)) ||
					control.Condition === undefined
				) {
					initialControlSet.push(String(control.Id));
				}
			}

			for (const key of Object.keys(computedDefaults)) {
				if (initialControlSet.includes(key)) {
					initialConfig[key] = computedDefaults[key];
				}
			}

			const peripheralSignals = Object.keys(
				getPeripheralSignals(peripheral)
			);

			// For cases where a signal within the peripheral group was allocated to a pin
			// before allocating the peripheral to a project, the defaults are computed
			// and dispatched to the cfsconfig
			const signalsWithMissingDefaults = peripheralPins.filter(pin =>
				pin.appliedSignals.some(
					(signal: any) =>
						signal.Peripheral === peripheral &&
						peripheralSignals.includes(String(signal.Name)) &&
						(!signal.PinCfg ||
							Object.keys(signal.PinCfg as Record<string, unknown>)
								.length === 0)
				)
			);

			let computedMissingDefaults: Array<{
				Pin: string;
				Peripheral: string;
				Name: string;
				PinCfg: Record<string, any>;
			}> = [];

			if (signalsWithMissingDefaults.length && !isExternallyManaged) {
				computedMissingDefaults = await Promise.all(
					signalsWithMissingDefaults.map(async (pin: any) => {
						const targetSignal =
							pin.appliedSignals.find(
								(signal: any) => signal.Peripheral === peripheral
							)?.Name ?? '';

						const initialPinConfig = await computeInitialPinConfig({
							Pin: pin.Name,
							Peripheral: peripheral,
							Signal: targetSignal,
							ProjectId: projectId
						});

						return {
							Pin: pin.Name,
							Peripheral: peripheral,
							Name: targetSignal,
							PinCfg: initialPinConfig
						};
					})
				);

				if (computedMissingDefaults.length > 0) {
					dispatch(
						setMultiSignalConfig({
							signals: computedMissingDefaults
						})
					);
				}
			}

			if (peripheralSignals.length === 0) {
				dispatch(
					setPeripheralAssignment({
						peripheral,
						projectId,
						config: initialConfig
					})
				);
				dispatch(
					setNewPeripheralAssignment({
						peripheral,
						projectId
					})
				);
			} else if (peripheralSignals.length > 0) {
				dispatch(
					setSignalGroupAssignment({
						peripheral,
						projectId,
						config: initialConfig
					})
				);
				dispatch(
					setNewPeripheralAssignment({
						peripheral,
						projectId
					})
				);
			}

			// Assign signals to pins
			const signalsData = getPeripheralSignals(peripheral);

			const signalsToPinAssign = peripheralSignals.flatMap(
				signalName => {
					const availablePins = signalsData[signalName]?.pins ?? [];
					if (
						availablePins.length !== 1 ||
						signalsData[signalName]?.required !== '1'
					)
						return [];

					const pinId = availablePins[0].Name;
					const alreadyAssignedToPin = peripheralPins.some(
						pin =>
							pin.pinId === pinId &&
							pin.appliedSignals.some(
								(s: any) =>
									s.Peripheral === peripheral && s.Name === signalName
							)
					);
					if (alreadyAssignedToPin) return [];

					return [{signalName, pinId}];
				}
			);

			const pinAssignments = await Promise.all(
				signalsToPinAssign.map(async ({signalName, pinId}) => {
					const pinCfg = await computeInitialPinConfig({
						Pin: pinId,
						Peripheral: peripheral,
						Signal: signalName,
						ProjectId: projectId
					});

					return {signalName, pinId, pinCfg};
				})
			);
			applyMultiSignals(dispatch, {peripheral, pinAssignments});

			// Open the config sidebar after assignment
			dispatch(setActivePeripheral(`${peripheral}:${projectId}`));
		},
		[dispatch, peripheral, peripheralPins]
	);

	return handleSignalGroupAssignment;
}
