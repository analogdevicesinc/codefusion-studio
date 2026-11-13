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
import {
	focusPinSet,
	unfocusPinSet,
	setPinDetailsTargetPin
} from '../../../state/slices/pins/pins.reducer';
import {useAppDispatch} from '../../../state/store';
import SideDetailsView from '../side-details-view/SideDetailsView';
import {
	useAssignedPins,
	usePinDetailsTargetPin
} from '../../../state/slices/pins/pins.selector';
import {useSearchString} from '../../../state/slices/app-context/appContext.selector';
import {memo, useEffect, useMemo, useRef} from 'react';
import {getSocPinDetails} from '../../../utils/soc-pins';
import {getPeripheralList} from '../../../utils/soc-peripherals';
import {usePinsGroupByPeripheralSignalPair} from '../../../hooks/use-pins-groupBy-peripherial-signal';
import {setCurrentTarget} from '../../../state/slices/peripherals/peripherals.reducer';

function PinDetails() {
	const dispatch = useAppDispatch();
	const targetPinId = usePinDetailsTargetPin();
	const pinDetailsTargetPin = usePinDetailsTargetPin();
	const targetPinDetails = getSocPinDetails(
		pinDetailsTargetPin ?? ''
	);
	const assignedPins = useAssignedPins();
	const searchString = useSearchString('pinconfig');
	const peripherals = getPeripheralList();
	const signalTargets = useMemo(
		() =>
			(targetPinDetails.Signals ?? []).flatMap(signal => {
				if (!signal.Peripheral || !pinDetailsTargetPin) return [];

				const assignedPin = assignedPins.find(pin =>
					pin.appliedSignals.some(
						appliedSignal =>
							appliedSignal.Peripheral === signal.Peripheral &&
							appliedSignal.Name === signal.Name
					)
				);

				return [
					{
						peripheralGroup: signal.Peripheral,
						signalName: signal.Name,
						assignedPin: assignedPin?.Name,
						dropdownVal: assignedPin?.Name ?? pinDetailsTargetPin
					}
				];
			}),
		[assignedPins, pinDetailsTargetPin, targetPinDetails.Signals]
	);
	const previousSignalTargetsRef = useRef<
		Record<string, string | undefined>
	>({});
	const previousViewedPinRef = useRef<string>();

	const targetPins = useMemo(
		() =>
			pinDetailsTargetPin && targetPinDetails
				? [targetPinDetails]
				: [],
		[pinDetailsTargetPin, targetPinDetails]
	);

	const peripheralPinsDict = usePinsGroupByPeripheralSignalPair(
		targetPins,
		peripherals
	);

	const handleBackClick = () => {
		dispatch(setPinDetailsTargetPin(undefined));
	};

	useEffect(() => {
		if (targetPinId) {
			dispatch(focusPinSet([targetPinId]));
		}

		return () => {
			if (targetPinId) {
				dispatch(unfocusPinSet([targetPinId]));
			}
		};
	}, [dispatch, targetPinId]);

	useEffect(() => {
		if (searchString) {
			dispatch(setPinDetailsTargetPin(undefined));
		}
	}, [searchString, dispatch]);

	useEffect(() => {
		// Initialize all signals when entering a pin, then only synchronize a
		// signal whose assigned pin has changed. This preserves manual choices
		// for other unassigned signals in the details view.
		const isEnteringPin =
			previousViewedPinRef.current !== pinDetailsTargetPin;
		const previousSignalTargets = previousSignalTargetsRef.current;
		const nextSignalTargets: Record<string, string | undefined> = {};

		for (const signalTarget of signalTargets) {
			const signalKey = `${signalTarget.peripheralGroup}__${signalTarget.signalName}`;
			nextSignalTargets[signalKey] = signalTarget.assignedPin;

			if (
				isEnteringPin ||
				previousSignalTargets[signalKey] !== signalTarget.assignedPin
			) {
				dispatch(setCurrentTarget(signalTarget));
			}
		}

		previousSignalTargetsRef.current = nextSignalTargets;
		previousViewedPinRef.current = pinDetailsTargetPin;
	}, [dispatch, pinDetailsTargetPin, signalTargets]);

	return (
		<SideDetailsView
			targetPins={[targetPins]}
			peripheralPins={peripheralPinsDict}
			handleBackClick={handleBackClick}
		/>
	);
}

export default memo(PinDetails);
