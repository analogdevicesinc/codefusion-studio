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
import type {
	AppliedSignal,
	FormattedPeripheral,
	FormattedPeripheralSignal,
	PinState
} from '@common/types/soc';
import {isPinReserved} from '../../../utils/is-pin-reserved';
import type {AssignmentFilter} from '../../../state/slices/app-context/appContext.reducer';
import {getConfigurablePins} from '../../../utils/soc-pins';
import {pinInConflict} from '../../../utils/pin-error';

const updatePins = (
	pins: Record<
		'assigned' | 'available' | 'conflict' | 'reserved',
		PinState[]
	>,
	appliedSignals: AppliedSignal[],
	pin: PinState
) => {
	const appliedSignalsCount = appliedSignals.length;

	if (appliedSignalsCount === 0) {
		pins.available.push(pin);
	} else if (pinInConflict(appliedSignals)) {
		pins.conflict.push(pin);
	} else {
		pins.assigned.push(pin);
	}
};

export const computePinState = (pinsArray: PinState[]) =>
	pinsArray.reduce<
		Record<
			'assigned' | 'available' | 'conflict' | 'reserved',
			PinState[]
		>
	>(
		(pins, pin) => {
			if (!pin.pinId) return pins;

			const isReserved = isPinReserved(pin.pinId);

			if (isReserved) {
				pins.reserved.push(pin);
			} else {
				updatePins(pins, pin.appliedSignals, pin);
			}

			return pins;
		},
		{
			assigned: [],
			available: [],
			conflict: [],
			reserved: []
		}
	);

export const filterSignals = (
	peripheral: FormattedPeripheral<
		FormattedPeripheralSignal & {
			currentTarget?: string;
		}
	>,
	activeFilterType: AssignmentFilter,
	assignedPins: PinState[]
) => {
	const configurablePinIds = new Set(
		getConfigurablePins().map(pin => pin.Name)
	);
	const assignedPinsDict = assignedPins.reduce<
		Record<string, PinState>
	>(
		(acc, pin) => ({
			...acc,
			[pin.pinId]: pin
		}),
		{}
	);

	return Object.values(peripheral.signals).reduce<
		Record<
			string,
			FormattedPeripheralSignal & {
				currentTarget?: string;
			}
		>
	>((acc, signal) => {
		const configurableSignalPins = signal.pins.filter(pin =>
			configurablePinIds.has(pin.Name)
		);

		if (activeFilterType === 'available') {
			const isAvailable = configurableSignalPins.some(
				pin =>
					(assignedPinsDict[pin.Name]?.appliedSignals ?? [])
						.length === 0
			);

			if (isAvailable) {
				acc[signal.name] = signal;
			}

			return acc;
		}

		const currentTargetPin = configurableSignalPins.find(
			pin => pin.Name === signal.currentTarget
		);
		const currentAppliedSignals =
			assignedPinsDict[currentTargetPin?.Name ?? '']
				?.appliedSignals ?? [];

		if (
			activeFilterType === 'assigned' &&
			currentAppliedSignals.length === 1 &&
			currentAppliedSignals[0].Peripheral === peripheral.name
		) {
			acc[signal.name] = signal;
		}

		if (
			activeFilterType === 'conflict' &&
			currentAppliedSignals.length > 1 &&
			currentAppliedSignals.some(
				appliedSignal => appliedSignal.Peripheral === peripheral.name
			)
		) {
			acc[signal.name] = signal;
		}

		return acc;
	}, {});
};
