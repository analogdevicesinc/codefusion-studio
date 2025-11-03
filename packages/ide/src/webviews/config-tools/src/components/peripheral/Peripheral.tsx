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
import {memo, useCallback, useEffect} from 'react';
import {useAppDispatch} from '../../state/store';
import {setActivePeripheral} from '../../state/slices/peripherals/peripherals.reducer';
import Function from '../../screens/pinmux/function/Function';
import PinCfgPeripheralTooltip from '../../screens/pinmux/peripheral-navigation-sidebar/pincfg-peripheral-tooltip/pincfg-peripheral-tooltip';
import {focusPinSet} from '../../state/slices/pins/pins.reducer';
import {useTooltipDebouncedHover} from '../../hooks/use-tooltip-debounced-hover';
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
	description: string;
	isLastPeripheralGroup: boolean;
}>;

function Peripheral({
	isOpen,
	hasPinConflict,
	signals,
	title,
	description,
	isLastPeripheralGroup
}: PeripheralProps) {
	const dispatch = useAppDispatch();
	const {isHovered, displayTooltip, hideTooltip} =
		useTooltipDebouncedHover(800);

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
		<>
			<div
				id={`pincfg-peripheral-${title}`}
				onMouseEnter={() => {
					if (!isOpen) displayTooltip();
				}}
				onMouseLeave={() => {
					hideTooltip();
				}}
				onClick={() => {
					hideTooltip();
				}}
			>
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
							<section
								style={{position: 'relative'}}
								id={`function-container-${title}`}
							>
								{sortedSignals.map(signal => {
									if (signal.pins.length === 0) return null;

									return (
										<Function
											key={signal.name}
											peripheralGroup={title}
											name={signal.name}
											pins={signal.pins}
											isLastIndex={isLastPeripheralGroup}
											signalDesc={signal.description}
										/>
									);
								})}
							</section>
						) : null
					}
					isOpen={isOpen}
					variant='no-gap'
					toggleExpand={toggleExpandMenu}
				/>
			</div>
			{isHovered && !isOpen && (
				<PinCfgPeripheralTooltip
					title={title}
					description={description}
				/>
			)}
		</>
	);
}

export default memo(Peripheral);
