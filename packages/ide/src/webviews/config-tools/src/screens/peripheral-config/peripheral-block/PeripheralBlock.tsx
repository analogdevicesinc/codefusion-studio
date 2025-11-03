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
import {memo, useState, useEffect, useCallback, useMemo} from 'react';
import {usePeripheralAllocations} from '../../../state/slices/peripherals/peripherals.selector';
import {
	useNewPeripheralAssignment,
	useNewSignalAssignment
} from '../../../state/slices/app-context/appContext.selector';
import {categorizeAllocationsByName} from '../../../utils/soc-peripherals';

import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';

import AssignablePeripheral from './assignable-peripheral';
import GroupedPeripheralSignals from './grouped-peripheral-signals';
import PeripheralAllocTooltip from './peripheral-alloc-tooltip/peripheral-alloc-tooltip';
import {useTooltipDebouncedHover} from '../../../hooks/use-tooltip-debounced-hover';
import styles from './PeripheralBlock.module.scss';

function PeripheralBlock({
	name,
	description,
	assignable,
	signals,
	cores,
	security
}: FormattedPeripheral<FormattedPeripheralSignal>) {
	const allocations = usePeripheralAllocations();
	const categorizedAllocations = useMemo(
		() => categorizeAllocationsByName(allocations),
		[allocations]
	);
	const allocatedCore = categorizedAllocations.get(name)?.projectId;
	const {peripheral: peripheralName} =
		useNewPeripheralAssignment() ?? {};
	const {signal: signalName} = useNewSignalAssignment() ?? {};

	// NOTE Parent needs to control the grouped signals state for highlight feature.
	const [isGroupOpen, setIsGroupOpen] = useState(false);
	const [highlighted, setHighlighted] = useState(false);
	const {isHovered, displayTooltip, hideTooltip} =
		useTooltipDebouncedHover(800);

	const triggerHighlight = useCallback(() => {
		setHighlighted(true);
		setTimeout(() => {
			setHighlighted(false);
		}, 800);
		setIsGroupOpen(true);
	}, []);

	useEffect(() => {
		if (name === peripheralName) {
			triggerHighlight();
		}
	}, [name, peripheralName, triggerHighlight]);

	return assignable ? (
		<div
			id={`peripheral-${name}`}
			data-test={`peripheral-block-${name}`}
			className={styles.peripheralGroupListItem}
			onMouseEnter={() => {
				displayTooltip();
			}}
			onMouseLeave={() => {
				hideTooltip();
			}}
		>
			<AssignablePeripheral
				name={name}
				description={description}
				assignable={assignable}
				signals={signals}
				cores={cores}
				security={security}
				allocatedCore={allocatedCore}
				highlighted={highlighted}
				isAllocateHovered={(isHovered: boolean) => {
					if (isHovered) {
						hideTooltip();
					} else displayTooltip();
				}}
			/>
			{isHovered && description && (
				<PeripheralAllocTooltip
					title={name}
					description={description}
				/>
			)}
		</div>
	) : (
		<GroupedPeripheralSignals
			name={name}
			description={description}
			assignable={assignable}
			signals={signals}
			cores={cores}
			security={security}
			allocatedCore={allocatedCore}
			categorizedAllocations={categorizedAllocations}
			isOpen={isGroupOpen}
			setIsOpen={setIsGroupOpen}
			highlighted={highlighted}
			signalName={signalName}
		/>
	);
}

export default memo(PeripheralBlock);
