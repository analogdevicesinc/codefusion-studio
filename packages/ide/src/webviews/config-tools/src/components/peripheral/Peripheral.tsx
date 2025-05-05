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
import {memo, useCallback, useEffect} from 'react';
import Function from '../../screens/pinmux/function/Function';
import {focusPinSet} from '../../state/slices/pins/pins.reducer';
import type {FormattedPeripheralSignal} from '@common/types/soc';
import ConflictIcon from '../../../../common/icons/Conflict';
import Accordion from '@common/components/accordion/Accordion';
import styles from '@common/components/accordion/Accordion.module.scss';

type PeripheralProps = Readonly<{
	isOpen: boolean;
	hasPinConflict: boolean;
	signals: Array<
		FormattedPeripheralSignal & {currentTarget?: string}
	>;
	title: string;
	isLastPeripheralGroup: boolean;
}>;

function Peripheral({
	isOpen,
	hasPinConflict,
	signals,
	title,
	isLastPeripheralGroup
}: PeripheralProps) {
	const dispatch = useAppDispatch();

	const targetPinsIds = signals
		.map(signal => signal.currentTarget ?? '')
		.filter(pinId => pinId !== '' && pinId !== undefined);

	const toggleExpandMenu = useCallback(
		(name: string) => {
			dispatch(setActivePeripheral(name));
		},
		[dispatch]
	);

	const sortedSignals = signals.sort((a, b) =>
		a.name.localeCompare(b.name, 'en', {
			numeric: true,
			sensitivity: 'base'
		})
	);

	useEffect(() => {
		if (isOpen && targetPinsIds.length > 0) {
			dispatch(focusPinSet(targetPinsIds));
		}
	}, [dispatch, isOpen, targetPinsIds]);

	return (
		<Accordion
			title={title}
			icon={
				hasPinConflict ? (
					<div
						data-test={`accordion:conflict:${title}`}
						id={`${title}-conflict`}
						className={styles.conflictIcon}
					>
						<ConflictIcon />
					</div>
				) : null
			}
			body={
				isOpen ? (
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
				) : null
			}
			isOpen={isOpen}
			variant='no-gap'
			toggleExpand={toggleExpandMenu}
		/>
	);
}

export default memo(Peripheral);
