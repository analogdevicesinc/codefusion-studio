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

import {memo} from 'react';
import {Badge, Card} from 'cfs-react-library';
import {
	EXTERNALLY_MANAGED,
	NON_SECURE,
	PRIMARY,
	SECURE
} from '@common/constants/core-properties';
import styles from './CoreSummaryEntry.module.scss';
import {type ProjectInfo} from '../../../utils/config';
import ProjectAllocations from './ProjectAllocations';
import {useProjectPeripheralAllocations} from '../../../state/slices/peripherals/peripherals.selector';

type CoreSummaryEntryProps = Readonly<{
	project: ProjectInfo;
}>;

function CoreSummaryEntry({project}: CoreSummaryEntryProps) {
	const allocations = useProjectPeripheralAllocations(
		project.ProjectId
	);
	const sortedAllocations = Object.values(allocations ?? {}).sort(
		(a, b) =>
			a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en', {
				sensitivity: 'base'
			})
	);
	const hasAllocations = sortedAllocations.length > 0;

	return (
		<div
			key={project.ProjectId}
			data-test={`core:${project.ProjectId}`}
			className={styles.coreEntry}
		>
			<div className={styles.coreHeader}>
				<h2 data-test={`core:${project.ProjectId}:label`}>
					{project.Name}
				</h2>
				<div className={styles.badgeContainer}>
					{project.IsPrimary ? (
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
			{hasAllocations ? (
				<ProjectAllocations
					allocations={sortedAllocations}
					project={project}
				/>
			) : (
				<Card
					disableHoverEffects
					id={`no-allocations-${project.ProjectId}`}
				>
					<div
						data-test={`core:${project.ProjectId}:no-allocations`}
						className={styles.cardContent}
					>
						<p className={styles.noPeripheralsLabel}>
							No peripherals allocated.
						</p>
					</div>
				</Card>
			)}
		</div>
	);
}

export default memo(CoreSummaryEntry);
