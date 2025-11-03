/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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
import {useState, useCallback, useEffect, memo} from 'react';
import Accordion from '@common/components/accordion/Accordion';
import styles from './PeripheralBlock.module.scss';
import PeripheralSignal from '../peripheral-signal/PeripheralSignal';
import PeripheralSignalGroup from '../peripheral-signal-group/PeripheralSignalGroup';
import PeripheralAllocTooltip from './peripheral-alloc-tooltip/peripheral-alloc-tooltip';
import ConfigIcon16px from '../../../../../common/icons/Config16px';
import {useAppDispatch} from '../../../state/store';
import {setActivePeripheral} from '../../../state/slices/peripherals/peripherals.reducer';
import {findProjectIdBySignalName} from '../../../utils/peripheral';
import {useTooltipDebouncedHover} from '../../../hooks/use-tooltip-debounced-hover';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';

interface Props
	extends FormattedPeripheral<FormattedPeripheralSignal> {
	allocatedCore?: string;
	categorizedAllocations: ReturnType<
		typeof import('../../../utils/soc-peripherals').categorizeAllocationsByName
	>;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	highlighted: boolean;
	signalName?: string;
}

function GroupedPeripheralSignals({
	name,
	description,
	signals,
	cores,
	security,
	allocatedCore,
	categorizedAllocations,
	isOpen,
	setIsOpen,
	highlighted,
	signalName,
	assignable
}: Props) {
	const dispatch = useAppDispatch();
	const {isHovered, displayTooltip, hideTooltip} =
		useTooltipDebouncedHover(800);
	const [editHovered, setEditHovered] = useState(false);
	const [lastHovered, setLastHovered] = useState(false);
	const [allocatedTarget] = useState<string | undefined>(undefined);

	const getTooltipPosition = useCallback(() => {
		const parent = document.getElementById(`peripheral-${name}`);
		const tooltip = document.getElementById('tooltipText');
		const rect = parent?.getBoundingClientRect();

		if (parent && tooltip && rect) {
			tooltip.style.top = `${rect.top + 30}px`;
		}
	}, [name]);

	useEffect(() => {
		if (editHovered) {
			getTooltipPosition();
		}
	}, [editHovered, getTooltipPosition]);

	const bodyContent = assignable ? (
		<div className={allocatedTarget ? styles.focused : ''}>
			<PeripheralSignalGroup
				name={name}
				peripheral={name}
				projects={cores ?? []}
				isSignalAssigned={false}
				signals={signals}
				isSelected={Boolean(allocatedTarget)}
				allocatedCoreId={allocatedCore}
			/>
		</div>
	) : (
		Object.values(signals).map(signal => {
			const isSelected = allocatedTarget === signal.name;
			const allocatedCoreId = findProjectIdBySignalName(
				signal.name,
				categorizedAllocations
			);

			return (
				<div
					key={`peripheral-signal-${signal.name}`}
					className={`${isSelected ? styles.focused : ''} ${signal.name === signalName && highlighted ? styles.highlight : ''}`}
				>
					<PeripheralSignal
						{...signal}
						isSignalAssigned
						peripheral={name}
						signal={signal.name}
						signals={signals}
						isSecure={security}
						projects={cores ?? []}
						isSelected={isSelected}
						allocatedCoreId={allocatedCoreId}
					/>
				</div>
			);
		})
	);

	return (
		<div
			data-test={`peripheral-block-${name}`}
			className={`${styles.accordionContainer} ${isOpen ? styles.selected : ''} ${lastHovered ? styles.lasthovered : ''}`}
			id={`peripheral-${name}`}
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
				highlight={highlighted}
				icon={
					categorizedAllocations.get(name) ? (
						<div
							data-test={`accordion:allocated:${name}`}
							id={`${name}-allocated`}
							className={styles.config}
							onMouseEnter={() => setEditHovered(true)}
							onMouseLeave={() => setEditHovered(false)}
						>
							<ConfigIcon16px
								onClick={e => {
									e.stopPropagation();
									const projectId =
										categorizedAllocations.get(name)?.projectId;
									if (projectId) {
										dispatch(
											setActivePeripheral(`${name}:${projectId}`)
										);
									} else {
										dispatch(setActivePeripheral(name));
									}
								}}
							/>
							{editHovered && (
								<div className={styles.tooltip} id='tooltipText'>
									Configure
								</div>
							)}
						</div>
					) : null
				}
				isOpen={isOpen}
				title={name}
				subTitle={
					<span>
						{categorizedAllocations.get(name)?.signals
							? `${Object.keys(categorizedAllocations.get(name)?.signals ?? {}).length} allocated`
							: null}
					</span>
				}
				body={
					<div
						className={styles.peripheralSignalsContainer}
						onMouseEnter={() => setLastHovered(true)}
						onMouseLeave={() => setLastHovered(false)}
					>
						{bodyContent}
					</div>
				}
				toggleExpand={() => setIsOpen(!isOpen)}
			/>
			{isHovered && !isOpen && (
				<PeripheralAllocTooltip
					title={name}
					description={description}
				/>
			)}
		</div>
	);
}

export default memo(GroupedPeripheralSignals);
