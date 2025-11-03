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
import type {
	AppliedSignal,
	FormattedPeripheral,
	FormattedPeripheralSignal,
	PinState
} from '@common/types/soc';
import {isPinReserved} from '../../../utils/is-pin-reserved';
import type {Filter} from '../../../state/slices/app-context/appContext.reducer';
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
	activeFilterType: Filter,
	assignedPins: PinState[]
) =>
	Object.values(peripheral.signals).reduce<
		Record<
			string,
			FormattedPeripheralSignal & {
				currentTarget?: string;
			}
		>
	>((acc, signal) => {
		const configurablePins = getConfigurablePins();

		const assignedPinsDict = assignedPins.reduce<
			Record<string, PinState>
		>(
			(acc, pin) => ({
				...acc,
				[pin.pinId]: pin
			}),
			{}
		);

		if (
			configurablePins.some(pin => {
				const isCurrentTargetPin = pin.Name === signal.currentTarget;

				if (!isCurrentTargetPin) return false;

				const currentAppliedSignals =
					assignedPinsDict[pin.Name]?.appliedSignals ?? [];

				if (activeFilterType === 'assigned') {
					return (
						currentAppliedSignals.length === 1 &&
						currentAppliedSignals[0].Peripheral === peripheral.name
					);
				}

				if (activeFilterType === 'conflict') {
					return (
						currentAppliedSignals.length > 1 &&
						currentAppliedSignals.some(
							appliedSignal =>
								appliedSignal.Peripheral === peripheral.name
						)
					);
				}

				if (activeFilterType === 'available') {
					return (
						assignedPins.length === 0 ||
						currentAppliedSignals.length === 0
					);
				}

				return false;
			})
		) {
			acc[signal.name] = signal;
		}

		return acc;
	}, {});
