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
import {memo, useState, useEffect, useMemo} from 'react';
import {usePeripheralAllocations} from '../../../state/slices/peripherals/peripherals.selector';
import {
	useNewPeripheralAssignment,
	useNewSignalAssignment
} from '../../../state/slices/app-context/appContext.selector';
import {categorizeAllocationsByName} from '../../../utils/soc-peripherals';
import {useAppDispatch} from '../../../state/store';
import {
	removePeripheralAssignment,
	setActivePeripheral
} from '../../../state/slices/peripherals/peripherals.reducer';
import {useSignalGroupAssignmentHandler} from '../../../hooks/use-signal-group-assignment-handler';
import {useAllocationHandler} from '../../../hooks/use-allocation-handler';
import {usePeripheralHighlight} from '../../../hooks/use-peripheral-highlight';

import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';

import AssignableItem from '../assignable-item/assignable-item';
import GroupedPeripheralSignals from './grouped-peripheral-signals';
import styles from './PeripheralBlock.module.scss';
import {setNewPeripheralAssignment} from '../../../state/slices/app-context/appContext.reducer';

function PeripheralBlock({
	name,
	description,
	assignable,
	signals,
	security
}: FormattedPeripheral<FormattedPeripheralSignal>) {
	const dispatch = useAppDispatch();
	const allocations = usePeripheralAllocations();
	const categorizedAllocations = useMemo(
		() => categorizeAllocationsByName(allocations),
		[allocations]
	);
	const allocatedCore = categorizedAllocations.get(name)?.projectId;
	const {peripheral: newlyAssignedPeripheral} =
		useNewPeripheralAssignment() ?? {};
	const {signal: newlyAssignedSignal} =
		useNewSignalAssignment() ?? {};

	// NOTE Parent needs to control the grouped signals state for highlight feature.
	const [isGroupOpen, setIsGroupOpen] = useState(false);

	const {highlighted, triggerHighlight} = usePeripheralHighlight(
		() => {
			setIsGroupOpen(true);
		}
	);

	const handleSignalGroupAssignment =
		useSignalGroupAssignmentHandler(name);

	const handlePeripheralConfigure = () => {
		dispatch(setActivePeripheral(`${name}:${allocatedCore}`));
	};

	const handlePeripheralDelete = async () => {
		dispatch(
			removePeripheralAssignment({
				peripheral: name
			})
		);
		dispatch(setActivePeripheral(undefined));
	};

	const handlePeripheralAllocate = useAllocationHandler(
		{
			peripheral: name,
			signal: ''
		},
		handleSignalGroupAssignment
	);

	useEffect(() => {
		if (!highlighted && name === newlyAssignedPeripheral) {
			triggerHighlight();

			// Clear the newPeripheralAssignment in appContext
			dispatch(
				setNewPeripheralAssignment({
					peripheral: undefined,
					projectId: undefined
				})
			);
		}
	}, [
		highlighted,
		name,
		newlyAssignedPeripheral,
		triggerHighlight,
		dispatch
	]);

	return assignable ? (
		<div
			id={`peripheral-${name}`}
			data-test={`peripheral-block-${name}`}
			className={styles.peripheralGroupListItem}
		>
			<AssignableItem
				name={name}
				allocatedProjectId={allocatedCore}
				isHighlighted={highlighted}
				className={styles.peripheralItem}
				description={description}
				onConfigure={handlePeripheralConfigure}
				onDelete={handlePeripheralDelete}
				onAllocate={handlePeripheralAllocate}
			/>
		</div>
	) : (
		<GroupedPeripheralSignals
			name={name}
			description={description}
			assignable={assignable}
			signals={signals}
			security={security}
			allocatedCore={allocatedCore}
			categorizedAllocations={categorizedAllocations}
			isOpen={isGroupOpen}
			setIsOpen={setIsGroupOpen}
			isHighlighted={highlighted}
			signalName={newlyAssignedSignal}
		/>
	);
}

export default memo(PeripheralBlock);
