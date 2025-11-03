/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import {memo, useMemo, useState, useCallback, useEffect} from 'react';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';
import Accordion from '../../../../../common/components/accordion/Accordion';
import PeripheralBlock from '../peripheral-block/PeripheralBlock';
import {usePeripheralAllocations} from '../../../state/slices/peripherals/peripherals.selector';
import {categorizeAllocationsByName} from '../../../utils/soc-peripherals';
import {useNewPeripheralAssignment} from '../../../state/slices/app-context/appContext.selector';
import styles from './peripheral-group.module.scss';

type PeripheralGroupProps = Readonly<{
	group: string;
	peripherals: Array<FormattedPeripheral<FormattedPeripheralSignal>>;
}>;

function PeripheralGroup({group, peripherals}: PeripheralGroupProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [highlighted, setHighlighted] = useState(false);

	const allocations = usePeripheralAllocations();
	const categorizedAllocations = useMemo(
		() => categorizeAllocationsByName(allocations),
		[allocations]
	);
	const allocatedCount = useMemo(
		() =>
			peripherals.filter(p => categorizedAllocations.has(p.name))
				.length,
		[peripherals, categorizedAllocations]
	);
	const {peripheral: peripheralName} =
		useNewPeripheralAssignment() ?? {};

	const triggerHighlight = useCallback(() => {
		setHighlighted(true);
		setTimeout(() => {
			setHighlighted(false);
		}, 800);
		setIsOpen(true);
	}, []);

	const toggleExpand = useCallback(() => {
		setIsOpen(prev => !prev);
	}, []);

	const peripheralBlocks = useMemo(
		() => (
			<div
				onMouseEnter={() => setHighlighted(true)}
				onMouseLeave={() => setHighlighted(false)}
			>
				{peripherals.map(p => (
					<PeripheralBlock
						key={`grouped-peripheral-${p.name}`}
						{...p}
					/>
				))}
			</div>
		),
		[peripherals]
	);

	useEffect(() => {
		if (peripherals.some(p => p.name === peripheralName)) {
			triggerHighlight();
		}
	}, [peripherals, peripheralName, triggerHighlight]);

	return (
		<div
			className={`${styles.accordionContainer} ${isOpen ? styles.selected : ''}`}
		>
			<Accordion
				title={group}
				isOpen={isOpen}
				highlight={highlighted}
				toggleExpand={toggleExpand}
				subTitle={
					allocatedCount ? (
						<span>{allocatedCount} allocated</span>
					) : null
				}
				body={peripheralBlocks}
			/>
		</div>
	);
}

export default memo(PeripheralGroup);
