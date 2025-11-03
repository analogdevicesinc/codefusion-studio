/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES or conditions of any kind, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '@common/types/soc';
import SignalEntry from './SignalEntry';
import PeripheralEntry from './PeripheralEntry';
import type {PeripheralConfig} from '../../../types/peripherals';
import styles from './CoreSummaryEntry.module.scss';
import {useEffect, useState} from 'react';
import {
	getPreallocatedPeripherals,
	getSocPeripheralDictionary
} from '../../../utils/soc-peripherals';
import Accordion from '../../../../../common/components/accordion/Accordion';
import {
	getPeripheralError,
	hasPeripheralPinConflicts
} from '../../../utils/peripheral-errors';
import {
	useAssignedPins,
	usePinsByPeripheral
} from '../../../state/slices/pins/pins.selector';
import {
	useActivePeripheral,
	useActiveSignal,
	usePeripheralAllocations
} from '../../../state/slices/peripherals/peripherals.selector';
import ConflictIcon from '../../../../../common/icons/Conflict';
import ConfigIcon16px from '../../../../../common/icons/Config16px';
import {useAppDispatch} from '../../../state/store';
import {
	removePeripheralAssignment,
	setActivePeripheral
} from '../../../state/slices/peripherals/peripherals.reducer';
import Tooltip from '../../../../../common/components/tooltip/Tooltip';
import {Button, DeleteIcon} from 'cfs-react-library';
import {setNewPeripheralAssignment} from '../../../state/slices/app-context/appContext.reducer';
import {
	useNewPeripheralAssignment,
	useNewSignalAssignment
} from '../../../state/slices/app-context/appContext.selector';

type PeripheralAllocationCardProps = Readonly<{
	projectId: string;
	// Unify the type of peripheral when refactoring function config
	peripheral:
		| FormattedPeripheral<FormattedPeripheralSignal>
		| PeripheralConfig;
	projectControls?: Record<string, any[]> | undefined;
}>;

function PeripheralAllocationCard({
	projectId,
	peripheral,
	projectControls
}: PeripheralAllocationCardProps) {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const dispatch = useAppDispatch();
	const signalCount = Object.keys(peripheral.signals).length;

	const isSignalActive = useActiveSignal()?.startsWith(
		peripheral.name
	);

	const isPeripheralActive =
		useActivePeripheral(true) === `${peripheral.name}:${projectId}`;

	const {assignable} = getSocPeripheralDictionary()[peripheral.name];
	const [lastHovered, setLastHovered] = useState(false);

	const {peripheral: peripheralName, projectId: project} =
		useNewPeripheralAssignment() ?? {};

	const {signal: signalName, projectId: signalProject} =
		useNewSignalAssignment() ?? {};

	const isPreassigned =
		getPreallocatedPeripherals()[projectId]?.some(
			preallocatedPeripheral =>
				preallocatedPeripheral.name === peripheral.name
		) ?? false;

	const pins = useAssignedPins();

	const pinsAssignedToPeripheral = usePinsByPeripheral(
		peripheral.name
	);
	const allocation =
		usePeripheralAllocations()?.[projectId]?.[peripheral.name];

	const hasPeripheralUnnasignedPinError = getPeripheralError(
		pins,
		{
			[peripheral.name]: allocation
		},
		projectControls ?? {}
	);

	const hasPeripheralPinConflictError = hasPeripheralPinConflicts(
		pins,
		{
			[peripheral.name]: allocation
		}
	);

	useEffect(() => {
		if (peripheral.name === peripheralName && project === projectId) {
			// Opens accordion when new peripheral is assigned
			setIsOpen(true);

			// To dispatch activePeripheral to open sidebar
			dispatch(setActivePeripheral(`${peripheralName}:${project}`));

			// Clear the newPeripheralAssignment in appContext
			dispatch(
				setNewPeripheralAssignment({
					peripheral: undefined,
					projectId: undefined
				})
			);
		}
	}, [
		dispatch,
		peripheral,
		peripheralName,
		project,
		projectId,
		signalProject
	]);

	return (
		<div
			key={peripheral.name}
			data-test={`core:${projectId}:allocation:${peripheral.name}`}
			id={peripheral.name}
			className={styles.peripheralCard}
		>
			{(signalCount > 0 && pinsAssignedToPeripheral.length > 0) ||
			!assignable ? (
				<div
					className={`${styles.accordionWrapper} ${lastHovered ? styles.lasthovered : ''}`}
				>
					<Accordion
						disableBorderOnHover
						highlight={
							isPeripheralActive ||
							(isSignalActive && signalProject === projectId)
						}
						id={peripheral.name}
						title={peripheral.name}
						icon={
							<div className={styles.accordionHeaderIcon}>
								{hasPeripheralUnnasignedPinError ||
								hasPeripheralPinConflictError ? (
									<div className={styles.conflictIconWrapper}>
										<ConflictIcon />
									</div>
								) : (
									<div className={styles.iconPlaceholder} />
								)}

								<Tooltip title='Configure' type='long'>
									<Button
										className={`${styles.configIcon} ${isPeripheralActive && !isSignalActive ? styles.isActive : ''}`}
										appearance='icon'
										onClick={e => {
											e.stopPropagation();
											dispatch(
												setActivePeripheral(
													`${peripheral.name}:${projectId}`
												)
											);
										}}
									>
										<ConfigIcon16px data-test='peripheral-assignment:config' />
									</Button>
								</Tooltip>

								{assignable ? (
									<Tooltip title='Remove' type='long'>
										<Button
											className={styles.deleteIcon}
											appearance='icon'
											onClick={() => {
												dispatch(
													removePeripheralAssignment({
														peripheral: peripheral.name
													})
												);
												dispatch(setActivePeripheral(undefined));
											}}
										>
											<DeleteIcon />
										</Button>
									</Tooltip>
								) : (
									<div className={styles.iconPlaceholder} />
								)}
							</div>
						}
						isOpen={isOpen}
						body={
							<section
								id={peripheral.name}
								className={styles.signalsSection}
								onMouseEnter={() => {
									setLastHovered(true);
								}}
								onMouseLeave={() => {
									setLastHovered(false);
								}}
							>
								{Object.values(peripheral.signals).map(signal => (
									<SignalEntry
										key={signal.name}
										signal={signal.name}
										peripheral={peripheral.name}
										shouldHighlight={signal.name === signalName}
									/>
								))}
							</section>
						}
						toggleExpand={() => {
							setIsOpen(!isOpen);
						}}
					/>
				</div>
			) : (
				<PeripheralEntry
					projectId={projectId}
					peripheralName={peripheral.name}
					preassigned={isPreassigned}
					controls={projectControls ?? {}}
				/>
			)}
		</div>
	);
}

export default PeripheralAllocationCard;
