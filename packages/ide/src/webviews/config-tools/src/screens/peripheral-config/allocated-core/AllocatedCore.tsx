/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

import {Badge, Card} from 'cfs-react-library';
import DeleteIcon from '../../../../../common/icons/Delete';
import styles from './AllocatedCore.module.scss';
import Lock from '@common/icons/Lock';
import {
	useActivePeripheral,
	useActiveSignal,
	useCurrentSignalTarget
} from '../../../state/slices/peripherals/peripherals.selector';
import {
	removePeripheralAssignment,
	removeSignalAssignment,
	setActivePeripheral,
	setActiveSignal
} from '../../../state/slices/peripherals/peripherals.reducer';
import {useAppDispatch} from '../../../state/store';
import {getProjectInfoList} from '../../../utils/config';
import useIsPrimaryMultipleProjects from '../../../hooks/use-is-primary-multiple-projects';
import {
	PRIMARY_ABBR as P,
	SECURE_ABBR as S,
	NON_SECURE_ABBR as NS
} from '@common/constants/core-properties';
import {removeAppliedSignal} from '../../../state/slices/pins/pins.reducer';

function AllocatedCore({
	projectId,
	isDeletable = true
}: Readonly<{projectId: string; isDeletable?: boolean}>) {
	const dispatch = useAppDispatch();
	const project = getProjectInfoList()?.find(
		p => p.ProjectId === projectId
	);
	const activeSignal = useActiveSignal();
	const activePeripheral = useActivePeripheral();
	const shouldShowPrimaryBadge = useIsPrimaryMultipleProjects(
		project?.IsPrimary ?? false
	);

	const [peripheral, signalName] = activeSignal?.split(' ') ?? [];

	const currentSignalTarget = activeSignal
		? useCurrentSignalTarget(peripheral, signalName)
		: null;

	const clearAppliedSignal = () => {
		const targetPinId = currentSignalTarget ?? '';

		const payload = {
			Pin: targetPinId,
			Peripheral: peripheral,
			Name: signalName
		};

		dispatch(removeAppliedSignal(payload));
	};

	const handleDelete = async () => {
		if (activeSignal) {
			// Delete individual signal allocation

			dispatch(
				removeSignalAssignment({
					peripheral,
					signalName
				})
			);
			//to remove applied signal
			clearAppliedSignal();
			dispatch(setActiveSignal(undefined));
		} else if (activePeripheral) {
			// Delete entire peripheral allocation
			dispatch(
				removePeripheralAssignment({
					peripheral: activePeripheral
				})
			);
			dispatch(setActivePeripheral(undefined));
		}
	};

	return (
		<Card
			key={projectId}
			disableHoverEffects
			id={`allocation-${projectId}`}
		>
			<div
				data-test={`allocated-core-card:${projectId}`}
				className={styles.cardContent}
			>
				<div className={styles.labelContainer}>
					<p>{project?.Name}</p>
					{shouldShowPrimaryBadge ? (
						<Badge
							appearance='secondary'
							dataTest={`allocated-core-card:${projectId}:primary-badge`}
							className={styles.badge}
						>
							{P}
						</Badge>
					) : null}
					{project?.Secure ? (
						<Badge
							appearance='secondary'
							dataTest={`allocated-core-card:${projectId}:primary-badge`}
							className={styles.badge}
						>
							{S}
						</Badge>
					) : null}
					{project?.Secure === false ? (
						<Badge
							appearance='secondary'
							dataTest={`allocated-core-card:${projectId}:primary-badge`}
							className={styles.badge}
						>
							{NS}
						</Badge>
					) : null}
				</div>
				{isDeletable ? (
					<div className={styles.deleteIconWrapper}>
						<DeleteIcon
							data-test={`allocated-core-card:${projectId}:delete-icon`}
							onClick={handleDelete}
						/>
					</div>
				) : (
					<Lock
						data-test={`allocated-core-card:${projectId}:lock-icon`}
					/>
				)}
			</div>
		</Card>
	);
}

export default AllocatedCore;
