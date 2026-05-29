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
import {useState, useCallback, memo} from 'react';
import Accordion from '@common/components/accordion/Accordion';
import styles from './PeripheralBlock.module.scss';
import ConfigIcon16px from '../../../../../common/icons/Config16px';
import AssignableItem from '../assignable-item/assignable-item';
import SignalBlock from './signal-block';
import {useAppDispatch} from '../../../state/store';
import {
	setActivePeripheral,
	removePeripheralAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {useSignalGroupAssignmentHandler} from '../../../hooks/use-signal-group-assignment-handler';
import {useAllocationHandler} from '../../../hooks/use-allocation-handler';
import {findProjectIdBySignalName} from '../../../utils/peripheral';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '../../../../../common/types/soc';
import type {PeripheralConfig} from '../../../types/peripherals';
import {Tooltip} from 'cfs-react-library';
import {PERIPHERAL_LIST_CONTAINER_ID} from '../constants';

type Props = Readonly<{
	allocatedCore?: string;
	categorizedAllocations: Map<string, PeripheralConfig>;
	isOpen: boolean;
	setIsOpen: (v: boolean) => void;
	isHighlighted: boolean;
	signalName?: string;
}> &
	FormattedPeripheral<FormattedPeripheralSignal>;

function GroupedPeripheralSignals({
	name,
	description,
	signals,
	allocatedCore,
	categorizedAllocations,
	isOpen,
	setIsOpen,
	isHighlighted,
	signalName,
	assignable
}: Props) {
	const dispatch = useAppDispatch();
	// eslint-disable-next-line react/hook-use-state
	const [allocatedTarget] = useState<string | undefined>(undefined);

	const handleSignalGroupAssignment =
		useSignalGroupAssignmentHandler(name);

	// Peripheral-level handlers (for assignable peripheral in accordion)
	const handlePeripheralConfigure = useCallback(() => {
		dispatch(setActivePeripheral(`${name}:${allocatedCore}`));
	}, [dispatch, name, allocatedCore]);

	const handlePeripheralDelete = useCallback(async () => {
		dispatch(
			removePeripheralAssignment({
				peripheral: name
			})
		);
		dispatch(setActivePeripheral(undefined));
	}, [dispatch, name]);

	const handlePeripheralAllocate = useAllocationHandler(
		{
			peripheral: name,
			signal: ''
		},
		handleSignalGroupAssignment
	);

	const bodyContent = assignable ? (
		<div className={allocatedTarget ? styles.focused : ''}>
			<AssignableItem
				name={name}
				isSelected={Boolean(allocatedTarget)}
				allocatedProjectId={allocatedCore}
				className={styles.peripheralItem}
				description={description}
				isAssignmentEnabled={!allocatedTarget}
				onConfigure={handlePeripheralConfigure}
				onDelete={handlePeripheralDelete}
				onAllocate={handlePeripheralAllocate}
			/>
		</div>
	) : (
		Object.values(signals).map(signal => {
			const isSelected = allocatedTarget === signal.name;
			const allocatedProject = findProjectIdBySignalName(
				signal.name,
				categorizedAllocations
			);

			return (
				<div
					key={`peripheral-signal-${signal.name}`}
					className={`${isSelected ? styles.focused : ''} ${signal.name === signalName && isHighlighted ? styles.highlight : ''}`}
				>
					<SignalBlock
						signal={signal}
						peripheralName={name}
						isSelected={isSelected}
						allocatedProjectId={allocatedProject}
						isHighlighted={
							signal.name === signalName && isHighlighted
						}
					/>
				</div>
			);
		})
	);

	return (
		<div
			data-test={`peripheral-block-${name}`}
			className={`${styles.accordionContainer} ${isOpen ? styles.selected : ''}`}
			id={`peripheral-${name}`}
		>
			<Accordion
				highlight={isHighlighted}
				icon={
					categorizedAllocations.get(name) ? (
						<div
							data-test={`accordion:allocated:${name}`}
							id={`${name}-allocated`}
							className={styles.config}
						>
							<Tooltip
								title='Configure'
								position='bottom'
								type='short'
								containerId={PERIPHERAL_LIST_CONTAINER_ID}
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
							</Tooltip>
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
					<div className={styles.peripheralSignalsContainer}>
						{bodyContent}
					</div>
				}
				toggleExpand={() => {
					setIsOpen(!isOpen);
				}}
			/>
		</div>
	);
}

export default memo(GroupedPeripheralSignals);
