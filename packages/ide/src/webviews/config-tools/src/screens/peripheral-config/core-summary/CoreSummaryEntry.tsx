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

import {memo, useMemo} from 'react';
import styles from './CoreSummaryEntry.module.scss';
import {type ProjectInfo} from '../../../utils/config';
import {useProjectPeripheralAllocations} from '../../../state/slices/peripherals/peripherals.selector';
import {filterOutNonConfigurableAllocations} from '../../../utils/soc-peripherals';
import PeripheralCard from '../peripheral-card/peripheral-card';
import {Badge, CoreIcon} from 'cfs-react-library';
import {
	EXTERNALLY_MANAGED,
	NON_SECURE,
	PRIMARY,
	SECURE
} from '../../../../../common/constants/core-properties';
import {useAssignedPins} from '../../../state/slices/pins/pins.selector';
import {hasPeripheralPinConflicts} from '../../../utils/peripheral-errors';
import ConflictIcon from '../../../../../common/icons/Conflict';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import useIsPrimaryMultipleProjects from '../../../hooks/use-is-primary-multiple-projects';
import useProjectHasPeripheralError from '../../../hooks/use-project-has-peripheral-error';
import PeripheralAllocationCard from './PeripheralAllocationCard';

type CoreSummaryCardProps = Readonly<{
	project: ProjectInfo;
}>;

function naturalCompare(a: string, b: string) {
	return a.localeCompare(b, 'en', {
		numeric: true,
		sensitivity: 'base'
	});
}

function CoreSummaryCard({project}: CoreSummaryCardProps) {
	const allocations = useProjectPeripheralAllocations(
		project.ProjectId
	);
	const shouldShowPrimaryBadge = useIsPrimaryMultipleProjects(
		project?.IsPrimary ?? false
	);

	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.peripherals;

	const pins = useAssignedPins();

	const filteredAllocations = useMemo(
		() =>
			filterOutNonConfigurableAllocations(
				project.ProjectId,
				allocations
			),
		[allocations, project.ProjectId]
	);

	const sortedAllocations = Object.values(filteredAllocations ?? {})
		.map(allocation => ({
			...allocation,
			signals: Object.fromEntries(
				Object.values(allocation.signals ?? {})
					.sort((a, b) => naturalCompare(a.name, b.name))
					.map(signal => [signal.name, signal])
			)
		}))
		.sort((a, b) => naturalCompare(a.name, b.name));
	const hasAllocations = sortedAllocations.length > 0;

	const projectHasPeripheralError = useProjectHasPeripheralError(
		project.ProjectId
	);

	const hasPeripheralPinConflictError = hasPeripheralPinConflicts(
		pins,
		allocations
	);

	const title = useMemo(
		() => (
			<div className={styles.peripheralCardHeader}>
				<CoreIcon />
				<h2 data-test={`core:${project.ProjectId}:label`}>
					{project.Name}
				</h2>
				<div className={styles.badgeContainer}>
					{shouldShowPrimaryBadge ? (
						<Badge
							dataTest={`core:${project.ProjectId}:primary-tag`}
							appearance='secondary'
							className={styles.badge}
						>
							{PRIMARY}
						</Badge>
					) : null}
					{project.ExternallyManaged ? (
						<Badge appearance='secondary' className={styles.badge}>
							{EXTERNALLY_MANAGED}
						</Badge>
					) : null}
					{project.Secure ? (
						<Badge appearance='secondary' className={styles.badge}>
							{SECURE}
						</Badge>
					) : null}
					{project.Secure === false ? (
						<Badge appearance='secondary' className={styles.badge}>
							{NON_SECURE}
						</Badge>
					) : null}
				</div>
			</div>
		),
		[project, shouldShowPrimaryBadge]
	);

	const end = useMemo(
		() => (
			<div className={styles.peripheralCardEnd}>
				{hasAllocations ? (
					<>
						<span>{`${sortedAllocations.length} ${
							sortedAllocations.length === 1
								? i10n?.num_peripherals?.one?.label?.title
								: i10n?.num_peripherals?.other?.label?.title
						}`}</span>
						{(projectHasPeripheralError ||
							hasPeripheralPinConflictError) && (
							<ConflictIcon
								dataTest={project.ProjectId + '-error-icon'}
							/>
						)}
					</>
				) : (
					<span className={styles.noPeripherals}>No peripherals</span>
				)}
			</div>
		),
		[
			hasAllocations,
			hasPeripheralPinConflictError,
			i10n?.num_peripherals?.one?.label?.title,
			i10n?.num_peripherals?.other?.label?.title,
			project.ProjectId,
			projectHasPeripheralError,
			sortedAllocations.length
		]
	);

	const content = useMemo(
		() =>
			hasAllocations && (
				<div className={styles.peripheralCardContent}>
					{sortedAllocations.map(peripheral => (
						<PeripheralAllocationCard
							key={peripheral.name}
							projectId={project.ProjectId}
							peripheral={peripheral}
						/>
					))}
				</div>
			),
		[hasAllocations, project.ProjectId, sortedAllocations]
	);

	return (
		<PeripheralCard
			id={project.ProjectId}
			title={title}
			end={end}
			hasAllocatedPeripherals={hasAllocations}
			content={content}
			data-test={`core:${project.ProjectId}`}
		/>
	);
}

export default memo(CoreSummaryCard);
