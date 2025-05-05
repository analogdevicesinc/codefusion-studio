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

import {MemoryGraph} from '../memory-graph/memory-graph';
import styles from './partition-assignment-details.module.scss';
import {Badge} from 'cfs-react-library';
import PartitionAssignmentDetailsCard from '../partition-assignment-details-card/partition-assignment-details-card';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {
	useFilteredBlockTypes,
	useFilteredCores,
	useFilteredMemoryBlocks,
	useFilteredPartitions
} from '../../../state/slices/app-context/appContext.selector';
import {type ProjectInfo} from '../../../utils/config';

export default function PartitionAssignmentDetails() {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory.partition;
	const partitions = useFilteredPartitions();
	const filteredBlocks = useFilteredMemoryBlocks();

	const isProjectAssignedPartitions = (
		project: ProjectInfo
	): boolean =>
		partitions.some(partition =>
			partition.projects.some(
				memoryProject => memoryProject.projectId === project.ProjectId
			)
		);

	return (
		<div className={styles.sectionContainer}>
			<div className={styles.memoryDetails}>
				{useFilteredBlockTypes().map(type => (
					<div key={type} className={styles.graphSection}>
						<div className={styles.memoryLabel}>
							<h5>{type.toUpperCase()}</h5>
						</div>
						<MemoryGraph
							dataTest={`memory-graph-${type}`}
							memoryBlocks={filteredBlocks.filter(
								block => block.Type === type
							)}
						/>
					</div>
				))}
			</div>
			<div className={styles.coreSection}>
				{useFilteredCores().map((project: ProjectInfo) => (
					<div key={project.CoreId} className={styles.coreEntry}>
						<div className={styles.coreHeader}>
							<h2 data-test='core-name'>{project.Name}</h2>
							<div className={styles.badgeContainer}>
								{project.IsPrimary ? (
									<Badge appearance='secondary'>
										{i10n?.badge.primary}
									</Badge>
								) : null}
								{project.Secure && (
									<Badge appearance='secondary'>
										{i10n?.badge.secure}
									</Badge>
								)}
								{project.Secure === false && (
									<Badge appearance='secondary'>
										{i10n?.badge.non_secure}
									</Badge>
								)}
								{project.ExternallyManaged && (
									<Badge appearance='secondary'>
										{i10n?.badge.external_managed}
									</Badge>
								)}
							</div>
						</div>
						{isProjectAssignedPartitions(project) ? (
							<PartitionAssignmentDetailsCard
								partitions={partitions}
								project={project}
							/>
						) : (
							<div className={styles.noPartitions}>
								{i10n?.num_partitions.zero}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
