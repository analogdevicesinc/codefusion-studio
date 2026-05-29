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
import {useActivePeripheral} from '../../../state/slices/peripherals/peripherals.selector';
import styles from './CoreSummaryEntry.module.scss';
import {memo} from 'react';
import ConflictIcon from '../../../../../common/icons/Conflict';
import {Button, DeleteIcon, Tooltip} from 'cfs-react-library';
import useProjectPeripheralErrorCount from '../../../hooks/use-project-peripheral-error-count';

type PeripheralEntryProps = Readonly<{
	projectId: string;
	peripheralName: string;
	preassigned: boolean;
}>;

function PeripheralEntry({
	projectId,
	peripheralName,
	preassigned
}: PeripheralEntryProps) {
	const dispatch = useAppDispatch();

	const isActive =
		useActivePeripheral(true) === `${peripheralName}:${projectId}`;

	const peripheralErrorCount = useProjectPeripheralErrorCount(
		projectId,
		peripheralName
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
					{peripheralErrorCount > 0 ? (
						<div className={styles.conflictIconWrapper}>
							<ConflictIcon data-test='peripheral-assignment:conflict' />
						</div>
					) : (
						<div className={styles.iconPlaceholder} />
					)}
					<Tooltip title='Configure' type='short' position='bottom'>
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
						<Tooltip title='Remove' type='short' position='bottom'>
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
