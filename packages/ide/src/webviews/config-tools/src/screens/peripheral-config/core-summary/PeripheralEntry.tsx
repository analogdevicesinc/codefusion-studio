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

import ConfigIcon16px from '@common/icons/Config16px';
import Lock from '@common/icons/Lock';
import {
	removePeripheralAssignment,
	setActivePeripheral
} from '../../../state/slices/peripherals/peripherals.reducer';
import {useAppDispatch} from '../../../state/store';
import {
	useActivePeripheral,
	usePeripheralAllocations
} from '../../../state/slices/peripherals/peripherals.selector';
import styles from './CoreSummaryEntry.module.scss';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {memo} from 'react';
import ConflictIcon from '../../../../../common/icons/Conflict';
import {getPeripheralError} from '../../../utils/peripheral-errors';
import type {ControlCfg} from '../../../../../common/types/soc';
import Tooltip from '../../../../../common/components/tooltip/Tooltip';
import {Button, DeleteIcon} from 'cfs-react-library';

type PeripheralEntryProps = Readonly<{
	projectId: string;
	peripheralName: string;
	preassigned: boolean;
	controls: Record<string, ControlCfg[]>;
}>;

function PeripheralEntry({
	projectId,
	peripheralName,
	preassigned,
	controls
}: PeripheralEntryProps) {
	const dispatch = useAppDispatch();

	const isActive =
		useActivePeripheral(true) === `${peripheralName}:${projectId}`;

	const pins = useAssignedPins();

	const allocation =
		usePeripheralAllocations()?.[projectId]?.[peripheralName];

	const hasPeripheralUnnasignedPinError = getPeripheralError(
		pins,
		{
			[peripheralName]: allocation
		},
		controls
	);

	return (
		<section
			id={peripheralName}
			className={`${styles.sectionHeader} ${isActive ? styles.highlight : ''}`}
		>
			<div className={styles.nameSection}>
				<div className={styles.cardNamePlaceholder} />
				<h4
					data-test='peripheral-assignment:name'
					className={styles.nameHeader}
				>
					{peripheralName}
				</h4>
			</div>
			<div className={styles.actionButtons}>
				<div className={styles.iconWrapper}>
					{hasPeripheralUnnasignedPinError ? (
						<div className={styles.conflictIconWrapper}>
							<ConflictIcon data-test='peripheral-assignment:conflict' />
						</div>
					) : (
						<div className={styles.iconPlaceholder} />
					)}
					<Tooltip title='Configure' type='long'>
						<Button
							className={`${styles.configIcon} ${isActive ? styles.isActive : ''}`}
							appearance='icon'
							onClick={() => {
								dispatch(
									setActivePeripheral(
										`${peripheralName}:${projectId}`
									)
								);
							}}
						>
							<ConfigIcon16px data-test='peripheral-assignment:config' />
						</Button>
					</Tooltip>
					{preassigned ? (
						<Lock
							data-test={`core:${projectId}:allocation:lock-icon`}
							className={styles.lockIcon}
						/>
					) : (
						<Tooltip title='Remove' type='long'>
							<Button
								className={styles.deleteIcon}
								appearance='icon'
								onClick={() => {
									dispatch(
										removePeripheralAssignment({
											peripheral: peripheralName
										})
									);
									dispatch(setActivePeripheral(undefined));
								}}
							>
								<DeleteIcon
									data-test={`core:${projectId}-${peripheralName}:allocation:delete-icon`}
								/>
							</Button>
						</Tooltip>
					)}
				</div>
			</div>
		</section>
	);
}

export default memo(PeripheralEntry);
