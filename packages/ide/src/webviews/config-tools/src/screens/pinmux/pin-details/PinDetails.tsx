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
import {
	focusPinSet,
	setPinDetailsTargetPin
} from '../../../state/slices/pins/pins.reducer';
import {useAppDispatch} from '../../../state/store';
import SideDetailsView from '../side-details-view/SideDetailsView';
import {
	useFocusedPins,
	usePinDetailsTargetPin
} from '../../../state/slices/pins/pins.selector';
import {useSearchString} from '../../../state/slices/app-context/appContext.selector';
import {memo, useEffect, useMemo} from 'react';
import {getSocPinDetails} from '../../../utils/soc-pins';
import {getPeripheralList} from '../../../utils/soc-peripherals';
import {usePinsGroupByPeripheralSignalPair} from '../../../hooks/use-pins-groupBy-peripherial-signal';

function PinDetails() {
	const dispatch = useAppDispatch();
	const targetPinId = usePinDetailsTargetPin();
	const focusedPins = useFocusedPins();
	const pinDetailsTargetPin = usePinDetailsTargetPin();
	const targetPinDetails = getSocPinDetails(
		pinDetailsTargetPin ?? ''
	);
	const searchString = useSearchString('pinconfig');
	const peripherals = getPeripheralList();

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
			if (targetPinId && focusedPins.includes(targetPinId)) {
				dispatch(focusPinSet([targetPinId]));
			}
		};
	}, [dispatch, focusedPins, targetPinId]);

	useEffect(() => {
		if (searchString) {
			dispatch(setPinDetailsTargetPin(undefined));
		}
	}, [searchString, dispatch]);

	return (
		<SideDetailsView
			targetPins={[targetPins]}
			peripheralPins={peripheralPinsDict}
			handleBackClick={handleBackClick}
		/>
	);
}

export default memo(PinDetails);
