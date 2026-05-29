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
import {memo, useCallback} from 'react';
import AssignableItem from '../assignable-item/assignable-item';
import {useAppDispatch} from '../../../state/store';
import styles from './signal-block.module.scss';
import {
	setActiveSignal,
	removeSignalAssignment,
	setActivePeripheral
} from '../../../state/slices/peripherals/peripherals.reducer';
import {useSignalAssignmentHandler} from '../../../hooks/use-signal-assignment-handler';
import {useAllocationHandler} from '../../../hooks/use-allocation-handler';
import type {FormattedPeripheralSignal} from '../../../../../common/types/soc';

type Props = Readonly<{
	signal: FormattedPeripheralSignal;
	peripheralName: string;
	isSelected: boolean;
	allocatedProjectId?: string;
	isHighlighted?: boolean;
}>;

function SignalBlock({
	signal,
	peripheralName,
	isSelected,
	allocatedProjectId,
	isHighlighted
}: Props) {
	const dispatch = useAppDispatch();
	const isAssignmentEnabled = !isSelected;

	const handleSignalAssignment = useSignalAssignmentHandler(
		peripheralName,
		signal.name
	);

	const handleSignalAllocate = useAllocationHandler(
		{
			peripheral: peripheralName,
			signal: signal.name
		},
		handleSignalAssignment
	);

	const handleSignalConfigure = useCallback(() => {
		dispatch(
			setActiveSignal({
				signal: signal.name,
				peripheral: peripheralName
			})
		);
	}, [dispatch, signal.name, peripheralName]);

	const handleSignalDelete = useCallback(async () => {
		dispatch(
			removeSignalAssignment({
				peripheral: peripheralName,
				signalName: signal.name
			})
		);
		dispatch(setActivePeripheral(undefined));
	}, [dispatch, peripheralName, signal.name]);

	return (
		<AssignableItem
			name={signal.name}
			isSelected={isSelected}
			isHighlighted={isHighlighted}
			allocatedProjectId={allocatedProjectId}
			className={styles.signalItem}
			isAssignmentEnabled={isAssignmentEnabled}
			onConfigure={handleSignalConfigure}
			onDelete={handleSignalDelete}
			onAllocate={handleSignalAllocate}
		/>
	);
}

export default memo(SignalBlock);
