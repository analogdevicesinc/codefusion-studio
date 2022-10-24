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
import {setPinDetailsTargetPin} from '../../../../state/slices/pins/pins.reducer';
import {usePin} from '../../../../state/slices/pins/pins.selector';
import {useAppDispatch} from '../../../../state/store';
import {getPinStatus} from '../../utils/package-display';
import McuPin from '../pin/Pin';
import PinTooltip from '../../../../components/tooltip/Tooltip';
import debounce from 'lodash.debounce';
import {useMemo, useState} from 'react';
import styles from './pinControl.module.scss';

function PinControl({id}: {readonly id: string}) {
	const {details, appliedSignals, isFocused} = usePin(id);
	const {Label, Signals, Description} = details || {};
	const isReserved = Signals?.length === 1;
	const dispatch = useAppDispatch();
	const [isHovered, setIsHovered] = useState(false);

	const availableSignals =
		Signals?.filter(
			signal =>
				!appliedSignals.find(
					appliedSignal => appliedSignal.Name === signal.Name
				)
		) ?? [];

	const onClick = () => {
		dispatch(setPinDetailsTargetPin(id));
	};

	const debouncedDispatch = useMemo(
		() =>
			debounce(() => {
				setIsHovered(true);
			}, 500),
		[]
	);

	const handleHover = (action: 'enter' | 'leave') => {
		if (action === 'enter') {
			debouncedDispatch();
		} else {
			debouncedDispatch.cancel();
			setIsHovered(false);
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
			{isHovered && (
				<PinTooltip
					pinId={id}
					pinLabel={Label}
					appliedSignals={appliedSignals}
					availableSignals={availableSignals}
					isReserved={isReserved}
					description={Description}
				/>
			)}
			<McuPin
				isFocused={isFocused}
				status={
					isReserved ? 'assigned' : getPinStatus(appliedSignals)
				}
				label={Label}
				onClick={onClick}
			/>
		</div>
	);
}

export default PinControl;
