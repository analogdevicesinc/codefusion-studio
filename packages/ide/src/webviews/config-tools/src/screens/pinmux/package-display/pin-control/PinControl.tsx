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
	setHoveredPin,
	setPinDetailsTargetPin
} from '../../../../state/slices/pins/pins.reducer';
import {usePin} from '../../../../state/slices/pins/pins.selector';
import {useAppDispatch} from '../../../../state/store';
import {getPinStatus} from '../../utils/package-display';
import McuPin from '../pin/Pin';
import debounce from 'lodash.debounce';
import {useMemo} from 'react';
import styles from './pinControl.module.scss';
import {getSocPinDetails} from '../../../../utils/soc-pins';
import {isPinReserved} from '../../../../utils/is-pin-reserved';

function PinControl({id}: {readonly id: string}) {
	const {appliedSignals, isFocused} = usePin(id);
	const {Label} = getSocPinDetails(id) ?? {};
	const isReserved = isPinReserved(id);
	const dispatch = useAppDispatch();

	const onClick = () => {
		dispatch(setPinDetailsTargetPin(id));
	};

	const debouncedDispatch = useMemo(
		() =>
			debounce(() => {
				dispatch(setHoveredPin(id));
			}, 500),
		[dispatch, id]
	);

	const handleHover = (action: 'enter' | 'leave') => {
		if (action === 'enter') {
			debouncedDispatch();
		} else {
			debouncedDispatch.cancel();
			dispatch(setHoveredPin(undefined));
		}
	};

	return (
		<div
			className={styles['control-container']}
			onMouseEnter={() => {
				handleHover('enter');
			}}
			onMouseLeave={() => {
				handleHover('leave');
			}}
		>
			<McuPin
				id={id}
				label={Label}
				isFocused={isFocused}
				status={
					isReserved ? 'assigned' : getPinStatus(appliedSignals)
				}
				onClick={onClick}
			/>
		</div>
	);
}

export default PinControl;
