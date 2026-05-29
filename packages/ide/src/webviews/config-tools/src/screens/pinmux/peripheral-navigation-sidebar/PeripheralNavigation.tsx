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
	useActiveSignal,
	useCurrentSignalsTargets
} from '../../../state/slices/peripherals/peripherals.selector';
import {
	unfocusPinSet,
	focusPinSet
} from '../../../state/slices/pins/pins.reducer';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {useAppDispatch} from '../../../state/store';
import {getFixedFuntionPins} from '../../../utils/soc-pins';
import {filterSignals} from '../utils/filters';
import {getPeripheralList} from '../../../utils/soc-peripherals';
import {pinInConflict} from '../../../utils/pin-error';
import {
	setActivePeripheral,
	setActiveSignal
} from '../../../state/slices/peripherals/peripherals.reducer';
import PeripheralPinsReserved from './peripheral-pins-reserved/peripheral-pins-reserved';

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
	const activeSignal = stripPeripheralFromSignalName(
		useActiveSignal(),
		activePeripheral
	);
	const activeFilterType = useActivePinconfigAssignmentFilter();
	const peripheralSignalsTargets = useCurrentSignalsTargets();

	const socPeripheralList: Array<
		FormattedPeripheral<FormattedPeripheralSignal>
	> = getPeripheralList();

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

					acc[peripheral.name].signals[signal.name] = {
						...signal,
						currentTarget:
							peripheralSignalsTargets[peripheral.name]
								.signalsTargets[signal.name]
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
			return [];
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
	}, [activeFilterType, assignedPins, unifiedPeripherals]);

	const sortedPeripherals = useMemo(
		() =>
			[...filteredPeripherals]
				.map(p => {
					const signals = Object.values(p.signals);

					return {
						...p,
						hasSignalsWithPins: signals.some(s => s.pins.length > 0)
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
	const peripheralsByName = useMemo(
		() => Object.fromEntries(sortedPeripherals.map(p => [p.name, p])),
		[sortedPeripherals]
	);

	// Handles case when a peripheral is active but has no pins to render,
	// which can happen when all pins are reserved like in case of BLE.
	const activePeripheralAllPinsReserved =
		activePeripheral && peripheralsByName[activePeripheral]
			? !peripheralsByName[activePeripheral].hasSignalsWithPins
			: false;

	// Handles case where a peripheral has configurable pins but the active signal has all its pins reserved.
	// Which can happen in casses like RSTN.
	const activeSignalPinIsReserved =
		peripheralsByName[activePeripheral!]?.signals?.[activeSignal!]
			?.pins?.length === 0;

	// Handles focus/unfocus of pins based on the filtered set of peripherals/signals
	// when all peripherals are collapsed
	useEffect(() => {
		if (activePeripheral !== undefined) return;

		if (!activeFilterType) {
			dispatch(unfocusPinSet());

			return;
		}

		if (activeFilterType === 'reserved') {
			const fixedFunctionPins = getFixedFuntionPins();

			if (fixedFunctionPins.length > 0) {
				dispatch(focusPinSet(fixedFunctionPins.map(pin => pin.Name)));

				return;
			}
		}

		const filteredPinsIds: string[] = [];

		for (const peripheral of sortedPeripherals) {
			const signals = Object.values(peripheral.signals);

			for (const signal of signals) {
				if (
					peripheralSignalsTargets[peripheral.name].signalsTargets[
						signal.name
					]
				) {
					filteredPinsIds.push(
						peripheralSignalsTargets[peripheral.name].signalsTargets[
							signal.name
						] ?? ''
					);
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
		peripheralSignalsTargets
	]);

	if (activePeripheralAllPinsReserved || activeSignalPinIsReserved) {
		return (
			<PeripheralPinsReserved
				peripheralName={activePeripheral ?? ''}
				signalName={activeSignal}
				onBackClick={() => {
					dispatch(setActivePeripheral(undefined));
					dispatch(setActiveSignal(undefined));
				}}
			/>
		);
	}

	return (
		<section style={{height: '100%', overflowY: 'auto'}}>
			{sortedPeripherals.map((peripheral, idx) => {
				const isOpen = activePeripheral === peripheral.name;

				const iterableSignals = Object.values(peripheral.signals);

				const shouldRenderPeripheral = iterableSignals.some(
					signal => signal.pins.length > 0
				);

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
