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
import {useEffect} from 'react';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {formatAssignedPins} from '../../../utils/json-formatter';
import SignalPinPair from '../signal-pin-pair/SignalPinPair';
import {useActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../../state/store';
import {
	setActiveConfiguredSignal,
	setActiveScreen
} from '../../../state/slices/app-context/appContext.reducer';
import {navigationItems} from '@common/constants/navigation';

export default function PinConfigSideContainer() {
	const dispatch = useAppDispatch();
	const assignedPins = useAssignedPins();
	const formattedAssignments = formatAssignedPins(assignedPins);

	const {peripheralName, signalName, pinId} =
		Object.entries(formattedAssignments).map(
			([peripheral, pairArray]) => ({
				peripheralName: peripheral,
				signalName: pairArray[0].assignedSignal,
				pinId: pairArray[0].assignedPinId
			})
		)[0] ?? {};

	const {signal: activeSignal, pin: activePin} =
		useActiveConfiguredSignal();

	// Initialize the first element in list if none was assigned beforehand
	useEffect(() => {
		if (!activeSignal && !activePin) {
			dispatch(
				setActiveConfiguredSignal({
					peripheralName,
					signalName,
					pinId
				})
			);
		}
	}, [
		activeSignal,
		activePin,
		peripheralName,
		signalName,
		pinId,
		dispatch
	]);

	useEffect(() => {
		if (Object.keys(formattedAssignments).length === 0) {
			dispatch(setActiveScreen(navigationItems.pinmux));
		}
	}, [formattedAssignments, dispatch]);

	return (
		<>
			{Object.entries(formattedAssignments).map(
				([peripheral, pairArray]) => (
					<SignalPinPair
						key={peripheral}
						peripheral={peripheral}
						pairArray={pairArray}
					/>
				)
			)}
		</>
	);
}
