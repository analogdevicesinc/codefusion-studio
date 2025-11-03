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

import {
	Badge,
	Button,
	CfsSuspense,
	DataGridCell,
	DataGridRow
} from 'cfs-react-library';
import ChevronRight from '../../../../../common/icons/ChevronRight';
import styles from './workspace-projects-row.module.scss';
import {type ProjectInfo} from '../../../utils/config';
import {
	useAssignedPeripherals,
	usePeripheralAllocations
} from '../../../state/slices/peripherals/peripherals.selector';
import {useProjectAssignedPins} from '../../../state/slices/pins/pins.selector';
import {useAssignedPartitions} from '../../../state/slices/partitions/partitions.selector';
import {useAppDispatch} from '../../../state/store';
import {
	setActiveScreen,
	setCoresFilter,
	setPeripheralScreenOpenProjectCards
} from '../../../state/slices/app-context/appContext.reducer';
import {type NavigationItem} from '../../../../../common/types/navigation';
import Tooltip from '../../../../../common/components/tooltip/Tooltip';
import {usePinErrors} from '../../../hooks/use-pin-errors';
import ConflictIcon from '../../../../../common/icons/Conflict';
import ErrorIcon from './error-icon';
import {usePeripheralControls} from '../../../hooks/use-peripheral-controls';
import useIsPrimaryMultipleProjects from '../../../hooks/use-is-primary-multiple-projects';

import {
	PRIMARY_ABBR as P,
	SECURE_ABBR as S,
	NON_SECURE_ABBR as NS,
	EX_MANAGED_ABBR as EM
} from '@common/constants/core-properties';
import {updateProjectCardOpenState} from '../../../utils/peripheral';
import {useCallback} from 'react';

type WorkspaceProjectsRowProps = {
	readonly project: ProjectInfo;
};

function WorkspaceProjectsRow({project}: WorkspaceProjectsRowProps) {
	const dispatch = useAppDispatch();
	const assignedPeripherals = useAssignedPeripherals(
		project.ProjectId
	);
	const assignedPins = useProjectAssignedPins(project.ProjectId);
	const assignedPartitions = useAssignedPartitions(project.ProjectId);
	const hasCorePinErrors =
		(usePinErrors().get(project.ProjectId) ?? 0) >= 1;
	const allocations = usePeripheralAllocations();
	const shouldShowPrimaryBadge = useIsPrimaryMultipleProjects(
		project?.IsPrimary ?? false
	);
	const controlsPromise = usePeripheralControls(project.ProjectId);

	const navigateToScreen = (id: NavigationItem) => {
		dispatch(setActiveScreen(id));
	};

	const handlePeripheralClicked = useCallback(() => {
		// NOTE Expand only selected project.
		const updatedProjects = updateProjectCardOpenState(
			[],
			project.ProjectId,
			true
		);
		dispatch(setPeripheralScreenOpenProjectCards(updatedProjects));

		navigateToScreen('peripherals');
	}, [dispatch]);

	return (
		<DataGridRow
			className={styles.workspaceTableRow}
			dataTest={`row-${project.ProjectId}`}
		>
			<DataGridCell gridColumn='1' className={styles.coreCol}>
				{project.Name}
				{shouldShowPrimaryBadge && (
					<Tooltip type='long' title='Primary'>
						<Badge appearance='secondary'>{P}</Badge>
					</Tooltip>
				)}
				{project.Secure && (
					<Tooltip type='long' title='Secure'>
						<Badge appearance='secondary'>{S}</Badge>
					</Tooltip>
				)}
				{project.Secure === false && (
					<Tooltip type='long' title='Non Secure'>
						<Badge appearance='secondary'>{NS}</Badge>
					</Tooltip>
				)}
				{project.ExternallyManaged && (
					<Tooltip type='long' title='Externally Managed'>
						<Badge appearance='secondary'>{EM}</Badge>
					</Tooltip>
				)}
			</DataGridCell>
			<DataGridCell gridColumn='2' className={styles.workspaceCol}>
				{project.ExternallyManaged ? '--' : project.PluginId}
			</DataGridCell>
			<DataGridCell gridColumn='3'>
				<div className={styles.col}>
					<Button
						appearance='icon'
						dataTest='assigned-peripherals-button'
						onClick={handlePeripheralClicked}
					>
						<div className={`${styles.btn} ${styles.suspenseLoader}`}>
							{assignedPeripherals.length}
							<CfsSuspense>
								<ErrorIcon
									peripherals={allocations[project.ProjectId] ?? {}}
									controlsPromise={controlsPromise}
								/>
							</CfsSuspense>
							<ChevronRight />
						</div>
					</Button>
				</div>
			</DataGridCell>
			<DataGridCell gridColumn='4'>
				<div className={styles.col}>
					<Button
						appearance='icon'
						onClick={() => {
							navigateToScreen('pinmux');
						}}
					>
						<div className={styles.btn}>
							{assignedPins.length}
							{hasCorePinErrors && (
								<ConflictIcon
									className={styles.icon}
									data-test={`pin-error-${project.ProjectId}`}
								/>
							)}
							<ChevronRight />
						</div>
					</Button>
				</div>
			</DataGridCell>
			<DataGridCell gridColumn='5'>
				<div className={styles.col}>
					<Button
						appearance='icon'
						dataTest='assigned-memory-button'
						onClick={() => {
							dispatch(setCoresFilter([project.Name]));
							navigateToScreen('memory');
						}}
					>
						<div className={styles.btn}>
							{assignedPartitions.length}
							<ChevronRight />
						</div>
					</Button>
				</div>
			</DataGridCell>
		</DataGridRow>
	);
}

export default WorkspaceProjectsRow;
