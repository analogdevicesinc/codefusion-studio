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
/* eslint-disable react/no-array-index-key */
import {memo, useMemo} from 'react';
import type {Pin} from '@common/types/soc';
import PinControl from '../pin-control/PinControl';
import McuPin from '../pin/Pin';
import {
	useFocusedPins,
	usePinDetailsTargetPin
} from '../../../../state/slices/pins/pins.selector';

import styles from './pinGrid.module.scss';
import {useSearchString} from '../../../../state/slices/app-context/appContext.selector';

const gridSizeThreshold = 12;

function PinGrid({
	pinArray
}: {
	readonly pinArray: Array<Array<Pin | undefined>>;
}) {
	const pinGap = pinArray.length > gridSizeThreshold ? '1%' : '2%';
	const searchString = useSearchString('pinconfig');
	const focusedPins = useFocusedPins();
	const targetPin = usePinDetailsTargetPin();
	const shouldMountBackdrop = Boolean(
		focusedPins.length || (targetPin ?? searchString.length)
	);

	const Grid = useMemo(
		() => (
			<div
				id='pin-rows-container'
				className={styles.pinRowsContainer}
				style={{
					gap: pinGap
				}}
			>
				{pinArray.map((row, rowIdx) => (
					<div
						key={`pin-row-${rowIdx}`}
						id={`pin-row-${rowIdx}`}
						className={styles.pinRow}
						style={{
							gap: pinGap
						}}
					>
						{row.map((pin, pinIdx) => {
							const key = `pin-${rowIdx}-${pinIdx}`;

							if (pin === undefined) {
								return <McuPin key={key} isEmpty />;
							}

							return <PinControl key={key} id={pin.Name} />;
						})}
					</div>
				))}
			</div>
		),
		[pinArray, pinGap]
	);

	return (
		<div id='pin-grid-container' className={styles.pinGridContainer}>
			{Grid}
			{shouldMountBackdrop && (
				<div
					id='focused-pin-backdrop'
					className={styles.focusedPinBackdrop}
				/>
			)}
		</div>
	);
}

export default memo(PinGrid);
