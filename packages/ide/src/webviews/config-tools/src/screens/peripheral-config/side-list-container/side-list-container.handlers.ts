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

import {type AssignedPin} from '../../../../../common/types/soc';
import {
	setNewPeripheralAssignment,
	setNewSignalAssignment
} from '../../../state/slices/app-context/appContext.reducer';

export async function handleSignalGroupSelected({
	projectId,
	allocatedTarget,
	dispatch,
	getIsExternallyManagedProyect,
	getControlsForProjectIds,
	CONTROL_SCOPES,
	computePeripheralResetValues,
	evaluateCondition,
	computeInitialPinConfig,
	setMultiSignalConfig,
	setPeripheralAssignment,
	setSignalGroupAssignment,
	handleCoreSelectionDone,
	peripheralPins,
	signals,
	title
}: {
	projectId: string;
	allocatedTarget: string;
	dispatch: any;
	getIsExternallyManagedProyect: any;
	getControlsForProjectIds: any;
	CONTROL_SCOPES: any;
	computePeripheralResetValues: any;
	evaluateCondition: any;
	computeInitialPinConfig: any;
	setMultiSignalConfig: any;
	setPeripheralAssignment: any;
	setSignalGroupAssignment: any;
	handleCoreSelectionDone: (...args: unknown[]) => unknown;
	peripheralPins: AssignedPin[];
	signals: Record<string, unknown>;
	title: string;
}) {
	if (!allocatedTarget) return;

	const isExternallyManaged =
		getIsExternallyManagedProyect(projectId);

	const controls = await (isExternallyManaged
		? Promise.resolve(undefined)
		: getControlsForProjectIds(
				[projectId],
				CONTROL_SCOPES.PERIPHERAL
			));

	const computedDefaults: Record<string, string> = controls?.[
		allocatedTarget
	]?.length
		? computePeripheralResetValues(
				allocatedTarget,
				controls?.[allocatedTarget] ?? []
			)
		: {};

	// Compute the initial control set that will be rendered in the UI
	// to filter out the configuration values that wont be accessible through the UI on the initial render of the form.
	const initialControlSet: string[] = [];
	const initialConfig: Record<string, string> = {};

	for (const control of controls?.[allocatedTarget] ?? []) {
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

	const peripheralSignals = Object.keys(signals);

	// For cases where a signal within the peripheral group was allocated to a pin
	// before allocating the peripheral to a project, the defaults are computed
	// and dispatched to the cfsconfig
	const signalsWithMissingDefaults = peripheralPins.filter(pin =>
		pin.appliedSignals.some(
			(signal: any) =>
				signal.Peripheral === allocatedTarget &&
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
						(signal: any) => signal.Peripheral === allocatedTarget
					)?.Name ?? '';

				const initialPinConfig = await computeInitialPinConfig({
					Pin: pin.Name,
					Peripheral: title,
					Signal: targetSignal,
					ProjectId: projectId
				});

				return {
					Pin: pin.Name,
					Peripheral: title,
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
				peripheral: title,
				projectId,
				config: initialConfig
			})
		);
		dispatch(
			setNewPeripheralAssignment({peripheral: title, projectId})
		);
	} else if (peripheralSignals.length > 0) {
		dispatch(
			setSignalGroupAssignment({
				peripheral: title,
				projectId,
				config: initialConfig
			})
		);
		dispatch(
			setNewPeripheralAssignment({peripheral: title, projectId})
		);
	}

	handleCoreSelectionDone();
}

export async function handleSignalAssignment({
	args,
	peripheralPins,
	computeInitialPinConfig,
	dispatch,
	updateSignalConfig,
	setSignalAssignment,
	handleCoreSelectionDone
}: {
	args: {peripheral: string; signalName: string; projectId: string};
	peripheralPins: AssignedPin[];
	computeInitialPinConfig: any;
	dispatch: any;
	updateSignalConfig: any;
	setSignalAssignment: any;
	handleCoreSelectionDone: () => void;
}) {
	// Check first if the signal is already allocated to a pin. If so, we need to
	// compute the initial pin config for the signal to make it available in the cfsconfig
	const allocatedPin = peripheralPins.find(
		pin =>
			pin.appliedSignals.length &&
			pin.appliedSignals.some(
				(signal: any) =>
					signal.Peripheral === args.peripheral &&
					signal.Name === args.signalName &&
					(!signal.PinCfg ||
						Object.keys(signal.PinCfg as Record<string, unknown>)
							.length === 0)
			)
	);

	if (allocatedPin) {
		const payload = {
			Pin: allocatedPin.pinId,
			Peripheral: args.peripheral,
			Signal: args.signalName
		};

		const initialPinConfig = await computeInitialPinConfig({
			...payload,
			ProjectId: args.projectId
		});

		dispatch(
			updateSignalConfig({
				...payload,
				PinCfg: initialPinConfig
			})
		);
	}

	// Handles allocation to project and persistence of the computed default if available.
	dispatch(setSignalAssignment(args));

	// Handles new allocation to highlight them in the center collapsible card
	dispatch(
		setNewPeripheralAssignment({
			peripheral: args.peripheral,
			projectId: args.projectId
		})
	);
	dispatch(
		setNewSignalAssignment({
			signal: args.signalName,
			projectId: args.projectId
		})
	);
	handleCoreSelectionDone();
}
