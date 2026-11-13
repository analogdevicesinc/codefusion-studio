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
import {memo, useMemo, useEffect} from 'react';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal,
	UnifiedPeripherals
} from '../../../../../common/types/soc';
import Peripheral from '../../../components/peripheral/Peripheral';
import {useActivePinconfigAssignmentFilter} from '../../../state/slices/app-context/appContext.selector';
import {
	useActivePeripheral,
	useCurrentSignalsTargets
} from '../../../state/slices/peripherals/peripherals.selector';
import {
	unfocusPinSet,
	focusPinSet
} from '../../../state/slices/pins/pins.reducer';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {useAppDispatch} from '../../../state/store';
import {getFixedFunctionPins} from '../../../utils/soc-pins';
import {filterSignals} from '../utils/filters';
import {getPeripheralList} from '../../../utils/soc-peripherals';
import {pinInConflict} from '../../../utils/pin-error';

const emptySignals = [] as Array<
	FormattedPeripheralSignal & {
		currentTarget?: string;
	}
>;

export const stripPeripheralFromSignalName = (
	signal?: string,
	activePeripheral?: string
): string | undefined => {
	if (!signal || !activePeripheral) return signal;

	if (
		signal.toLowerCase().startsWith(activePeripheral.toLowerCase())
	) {
		return signal.slice(activePeripheral.length).trimStart();
	}

	return signal;
};

function PeripheralNavigation() {
	const dispatch = useAppDispatch();
	const assignedPins = useAssignedPins();
	const activePeripheral = useActivePeripheral();
	const activeFilterType = useActivePinconfigAssignmentFilter();
	const peripheralSignalsTargets = useCurrentSignalsTargets();

	const socPeripheralList: Array<
		FormattedPeripheral<FormattedPeripheralSignal>
	> = getPeripheralList();

	const fixedFunctionPins = getFixedFunctionPins();

	// @TODO: We should avoid creating additional data structures that merge several objects into one by working directly with "peripheralSignal"
	const unifiedPeripherals =
		socPeripheralList.reduce<UnifiedPeripherals>(
			(acc, peripheral) => {
				Object.values(peripheral.signals).forEach(signal => {
					if (!acc[peripheral.name]) {
						acc[peripheral.name] = {
							name: peripheral.name,
							description: peripheral.description || '',
							signals: {},
							security: peripheral.security,
							assignable: false
						};
					}

					const reservedPins = fixedFunctionPins.filter(pin =>
						pin.Signals?.some(
							pinSignal =>
								pinSignal.Peripheral === peripheral.name &&
								pinSignal.Name === signal.name
						)
					);

					acc[peripheral.name].signals[signal.name] = {
						...signal,
						pins: [...signal.pins, ...reservedPins],
						currentTarget:
							peripheralSignalsTargets[peripheral.name]
								.signalsTargets[signal.name] ?? reservedPins[0]?.Name
					};
				});

				return acc;
			},
			{}
		);

	const filteredPeripherals = useMemo(() => {
		const peripheralArray = Object.values(unifiedPeripherals);

		if (!activeFilterType) return peripheralArray;

		if (activeFilterType === 'reserved') {
			return peripheralArray
				.map(peripheral => ({
					...peripheral,
					signals: Object.fromEntries(
						Object.entries(peripheral.signals).filter(([, signal]) =>
							signal.pins.some(pin =>
								fixedFunctionPins.some(
									// eslint-disable-next-line max-nested-callbacks
									fixedPin => fixedPin.Name === pin.Name
								)
							)
						)
					)
				}))
				.filter(
					peripheral => Object.keys(peripheral.signals).length > 0
				);
		}

		const filteredList = [];

		for (const peripheral of peripheralArray) {
			const filteredSignals = filterSignals(
				peripheral,
				activeFilterType,
				assignedPins
			);

			if (Object.values(filteredSignals).length > 0) {
				filteredList.push({
					...peripheral,
					signals: filteredSignals
				});
			}
		}

		return filteredList;
	}, [
		activeFilterType,
		assignedPins,
		fixedFunctionPins,
		unifiedPeripherals
	]);

	const sortedPeripherals = useMemo(
		() =>
			[...filteredPeripherals]
				.map(peripheral => {
					const signals = Object.values(peripheral.signals);

					return {
						...peripheral,
						hasSignalsWithPins: signals.some(
							signal => signal.pins.length > 0
						)
					};
				})
				.sort((a, b) =>
					a.name.localeCompare(b.name, 'en', {
						numeric: true,
						sensitivity: 'base'
					})
				),
		[filteredPeripherals]
	);

	// Handles focus/unfocus of pins based on the filtered set of peripherals/signals
	// when all peripherals are collapsed
	useEffect(() => {
		if (activePeripheral !== undefined) return;

		if (!activeFilterType) {
			dispatch(unfocusPinSet());

			return;
		}

		if (activeFilterType === 'reserved') {
			if (fixedFunctionPins.length > 0) {
				dispatch(focusPinSet(fixedFunctionPins.map(pin => pin.Name)));

				return;
			}
		}

		const filteredPinsIds: string[] = [];

		for (const peripheral of sortedPeripherals) {
			const signals = Object.values(peripheral.signals);

			for (const signal of signals) {
				const targetPinId =
					peripheralSignalsTargets[peripheral.name].signalsTargets[
						signal.name
					] ?? signal.currentTarget;

				if (targetPinId) {
					filteredPinsIds.push(targetPinId);
				}
			}
		}

		if (filteredPinsIds.length > 0) {
			dispatch(focusPinSet(filteredPinsIds));
		}
	}, [
		activeFilterType,
		activePeripheral,
		dispatch,
		sortedPeripherals,
		peripheralSignalsTargets,
		fixedFunctionPins
	]);

	return (
		<section style={{height: '100%', overflowY: 'auto'}}>
			{sortedPeripherals.map((peripheral, idx) => {
				const isOpen = activePeripheral === peripheral.name;

				const iterableSignals = Object.values(peripheral.signals);

				// Only hide peripherals that have no signals of any sort.
				const shouldRenderPeripheral = iterableSignals.length > 0;

				if (!shouldRenderPeripheral) return null;

				const shouldRenderConflictIcon = assignedPins.some(
					targetPin =>
						targetPin.appliedSignals.some(
							appliedSignal =>
								appliedSignal.Peripheral === peripheral.name
						) &&
						(pinInConflict(targetPin.appliedSignals) ||
							targetPin.appliedSignals.some(
								item => Object.keys(item?.Errors ?? {}).length
							))
				);

				const signals = isOpen
					? Object.values(peripheral.signals)
					: emptySignals;

				return (
					<Peripheral
						key={peripheral.name}
						title={peripheral.name}
						description={peripheral.description}
						isOpen={isOpen}
						hasPinConflict={shouldRenderConflictIcon}
						signals={signals}
						isLastPeripheralGroup={
							Number(sortedPeripherals.length) > 25 &&
							idx === sortedPeripherals.length - 1
						}
					/>
				);
			})}
		</section>
	);
}

export default memo(PeripheralNavigation);
