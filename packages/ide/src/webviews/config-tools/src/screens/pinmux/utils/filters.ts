/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import type {AppliedSignal, Pin, PinState} from '@common/types/soc';
import type {
	FormattedPeripheral,
	Signal
} from '../../../utils/json-formatter';
import type {Filter} from '../../../state/slices/app-context/appContext.reducer';

const updatePins = (
	pins: Record<'assigned' | 'available' | 'conflicts', Pin[]>,
	appliedSignals: AppliedSignal[],
	pin: Pin
) => {
	const appliedSignalsCount = appliedSignals.length;

	if (appliedSignalsCount === 0) {
		pins.available.push(pin);
	} else if (appliedSignalsCount === 1) {
		pins.assigned.push(pin);
	} else {
		pins.conflicts.push(pin);
	}
};

export const computePinState = (
	pinsArray: Array<
		| {
				details: Pin;
				appliedSignals: AppliedSignal[];
		  }
		| undefined
	>
) =>
	pinsArray.reduce(
		(pins, pin) => {
			if (!pin) return pins;

			const isReserved = pin.details.Signals?.length === 1;

			if (isReserved) {
				pins.assigned.push(pin.details);
			} else {
				updatePins(pins, pin.appliedSignals, pin.details);
			}

			return pins;
		},
		{
			assigned: [] as Pin[],
			available: [] as Pin[],
			conflicts: [] as Pin[]
		}
	);

export const filterSignals = (
	peripheral: FormattedPeripheral,
	filter: Filter,
	nonReservedPins: Array<{
		name: string;
		signals: string[];
		peripherals: Array<string | undefined>;
	}>,
	assignedPins: PinState[]
) =>
	Object.values(peripheral.signals.dict).reduce<
		Record<string, Signal>
	>((acc, signal) => {
		if (
			nonReservedPins.some(pin => {
				const isSamePin = pin.name === signal.currentTarget;
				const assignedPinNumberOfSignals =
					assignedPins.find(
						assignedPin => assignedPin.details.Name === pin.name
					)?.appliedSignals.length ?? 0;

				const isAvailable =
					filter === 'available' &&
					(assignedPins.length === 0 ||
						(isSamePin && assignedPinNumberOfSignals === 0));
				const isAssigned =
					filter === 'assigned' &&
					isSamePin &&
					assignedPinNumberOfSignals === 1;
				const isConflict =
					filter === 'conflict' &&
					isSamePin &&
					assignedPins &&
					assignedPinNumberOfSignals > 1;

				return isAvailable || isAssigned || isConflict;
			})
		) {
			acc[signal.name] = signal;
		}

		return acc;
	}, {});
