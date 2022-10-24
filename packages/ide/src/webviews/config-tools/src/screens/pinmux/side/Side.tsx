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
import Peripheral from '../../../components/peripheral/Peripheral';
import {usePeripherals} from '../../../state/slices/peripherals/peripherals.selector';
import {useEffect, useMemo} from 'react';
import {usePinDetailsTargetPin} from '../../../state/slices/pins/pins.selector';
import PinDetails from '../pin-details/PinDetails';
import {useSearchString} from '../../../state/slices/app-context/appContext.selector';
import PinSearch from '../../pin-search/PinSearch';
import {useAppDispatch} from '../../../state/store';
import {setPinDetailsTargetPin} from '../../../state/slices/pins/pins.reducer';

export default function PinmuxSideContainer() {
	const pinDetailsTargetPin = usePinDetailsTargetPin();
	const dispatch = useAppDispatch();

	const peripherals = Object.values(usePeripherals());

	const searchString = useSearchString('pinconfig');

	// @TODO: Disabling this until we enable back the filter controls.
	// const filter = useFilter();
	// const nonReservedPins = Object.values(usePackagePins())
	// 	.filter(pin => pin.details.Signals?.length !== 1)
	// 	.map(pin => ({
	// 		name: pin.details.Name,
	// 		signals: pin.appliedSignals.map(
	// 			appliedSignal => appliedSignal.Name
	// 		),
	// 		peripherals: pin.appliedSignals.map(
	// 			appliedSignal => appliedSignal.Peripheral
	// 		)
	// 	}));
	// const assignedPins = useAssignedPins();
	// const filteredPeripherals = filter
	// 	? peripherals
	// 			.map(peripheral => {
	// 				const filteredSignals: Record<string, Signal> =
	// 					filterSignals(
	// 						peripheral,
	// 						filter,
	// 						nonReservedPins,
	// 						assignedPins
	// 					);

	// 				// Return peripheral with filtered signals
	// 				return {
	// 					...peripheral,
	// 					signals: {...peripheral.signals, dict: filteredSignals}
	// 				};
	// 			})
	// 			.filter(
	// 				peripheral =>
	// 					Object.values(peripheral.signals.dict).length > 0
	// 			) // Filter peripherals with no signals
	// 	: peripherals;

	const sortedPeripherals = peripherals.sort((a, b) =>
		a.name.localeCompare(b.name, 'en', {
			numeric: true,
			sensitivity: 'base'
		})
	);

	useEffect(() => {
		if (pinDetailsTargetPin && searchString) {
			dispatch(setPinDetailsTargetPin(undefined));
		}
	}, [searchString, pinDetailsTargetPin, dispatch]);

	const PeripheralNavigation = useMemo(
		() => (
			<>
				{sortedPeripherals.map((peripheral, idx) => (
					<Peripheral
						key={peripheral.name}
						title={peripheral.name}
						signals={Object.values(peripheral.signals.dict)}
						isLastPeripheralGroup={
							Number(sortedPeripherals.length) > 25 &&
							idx === sortedPeripherals.length - 1
						}
					/>
				))}
			</>
		),
		[sortedPeripherals]
	);

	if (pinDetailsTargetPin) {
		return <PinDetails />;
	}

	if (searchString) {
		return <PinSearch />;
	}

	// eslint-disable-next-line react/jsx-no-useless-fragment
	return <>{PeripheralNavigation}</>;
}
