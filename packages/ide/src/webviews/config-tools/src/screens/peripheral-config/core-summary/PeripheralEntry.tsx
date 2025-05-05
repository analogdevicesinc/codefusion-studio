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
import {setActivePeripheral} from '../../../state/slices/peripherals/peripherals.reducer';
import {useAppDispatch} from '../../../state/store';
import {
	useActivePeripheral,
	usePeripheralAllocations,
	usePeripheralSignalAssignments
} from '../../../state/slices/peripherals/peripherals.selector';
import {Badge} from 'cfs-react-library';
import styles from './CoreSummaryEntry.module.scss';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {memo} from 'react';
import ConflictIcon from '../../../../../common/icons/Conflict';
import {getPeripheralError} from '../../../utils/peripheral-errors';
import type {ControlCfg} from '../../../../../common/types/soc';

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

	const pinAssignments = useAssignedPins().flatMap(pin =>
		pin.appliedSignals
			.filter(signal => signal.Peripheral === peripheralName)
			.map(signal => ({
				Name: signal.Name,
				Peripheral: signal.Peripheral
			}))
	);
	const peripheralAssignedSignals = usePeripheralSignalAssignments(
		peripheralName,
		projectId
	);

	const totalPeripheralSignalsCount =
		peripheralAssignedSignals.length;

	const peripheralSignalsWithPinAssignmentsCount =
		peripheralAssignedSignals.filter(signal =>
			pinAssignments.some(pa => pa.Name === signal.name)
		).length;

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
		<section className={styles.sectionHeader}>
			<div className={styles.nameSection}>
				<h4
					data-test='peripheral-assignment:name'
					className={styles.nameHeader}
				>
					{peripheralName}
				</h4>
				{totalPeripheralSignalsCount > 0 && (
					<Badge
						appearance='secondary'
						dataTest='peripheral-assignment:counter'
						className={styles.badge}
					>{`${peripheralSignalsWithPinAssignmentsCount}/${totalPeripheralSignalsCount}`}</Badge>
				)}
			</div>
			<div className={styles.iconWrapper}>
				{hasPeripheralUnnasignedPinError ? (
					<ConflictIcon data-test='peripheral-assignment:conflict' />
				) : null}
				<ConfigIcon16px
					data-test='peripheral-assignment:config'
					data-active={isActive}
					className={styles.configIcon}
					onClick={() => {
						dispatch(
							setActivePeripheral(`${peripheralName}:${projectId}`)
						);
					}}
				/>
				{preassigned ? (
					<Lock
						data-test={`core:${projectId}:allocation:lock-icon`}
					/>
				) : (
					<span className={styles.iconPlaceholder} />
				)}
			</div>
		</section>
	);
}

export default memo(PeripheralEntry);
