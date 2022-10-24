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
import {useAppDispatch} from '../../state/store';
import {setActivePeripheral} from '../../state/slices/peripherals/peripherals.reducer';
import {useActivePeripheral} from '../../state/slices/peripherals/peripherals.selector';
import {memo, useEffect} from 'react';
import Function from '../../screens/pinmux/function/Function';
import type {Signal} from '../../utils/json-formatter';
import {
	focusPinSet,
	unfocusPinSet
} from '../../state/slices/pins/pins.reducer';
import {useFocusedPins} from '../../state/slices/pins/pins.selector';

import Accordion from '@common/components/accordion/Accordion';

type PeripheralProps = {
	readonly title: string;
	readonly signals: Signal[];
	readonly isLastPeripheralGroup: boolean;
};

function Peripheral({
	title,
	signals,
	isLastPeripheralGroup
}: PeripheralProps) {
	const dispatch = useAppDispatch();
	const currentPeripheral = useActivePeripheral();
	const alreadyFocusedPins = useFocusedPins();

	const targetPins = signals
		.map(signal => signal.currentTarget ?? '')
		.filter(pinId => pinId !== '' && pinId !== undefined);

	const toggleExpandMenu = (name: string) => {
		dispatch(setActivePeripheral(name));
	};

	const isOpen = title === currentPeripheral;

	const shouldRenderPeripheral = signals.some(
		signal => signal.pins.length > 0
	);

	const sortedSignals = signals.sort((a, b) =>
		a.name.localeCompare(b.name, 'en', {
			numeric: true,
			sensitivity: 'base'
		})
	);

	useEffect(() => {
		const areTargetPinsFocused = targetPins.every(pin =>
			alreadyFocusedPins.includes(pin)
		);

		if (isOpen && !areTargetPinsFocused) {
			dispatch(unfocusPinSet(alreadyFocusedPins));
			dispatch(focusPinSet(targetPins));
		}

		return () => {
			if (isOpen && areTargetPinsFocused) {
				dispatch(unfocusPinSet(targetPins));
			}
		};
	}, [isOpen, targetPins, alreadyFocusedPins, dispatch]);

	if (!shouldRenderPeripheral) return null;

	return (
		<Accordion
			title={title}
			body={
				<>
					{sortedSignals.map(signal => {
						if (signal.pins.length === 0) return null;

						return (
							<Function
								key={signal.name}
								peripheralGroup={title}
								name={signal.name}
								pins={signal.pins}
								isLastIndex={isLastPeripheralGroup}
							/>
						);
					})}
				</>
			}
			isOpen={isOpen}
			toggleExpandMenu={toggleExpandMenu}
		/>
	);
}

export default memo(Peripheral);
