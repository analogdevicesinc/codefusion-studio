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

import {type Partition} from '../../../state/slices/partitions/partitions.reducer';
import styles from './partition-assignment-details-card.module.scss';
import MemoryCard from '../memory-card/memory-card';
import {useMemo} from 'react';
import PartitionCard from '../partition-card/partition-card';
import {
	convertBytesToKbOrMb,
	getNonVolatileData,
	getSocMemoryTypeList,
	getTotalPartitionMemorySize,
	getVolatileData
} from '../../../utils/memory';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {type ProjectInfo} from '../../../utils/config';

type PartitionAssignmentDetailsCardProps = Readonly<{
	partitions: Partition[];
	project: ProjectInfo;
}>;

export default function PartitionAssignmentDetailsCard({
	partitions,
	project
}: PartitionAssignmentDetailsCardProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory?.partition;
	const socMemorytypes = getSocMemoryTypeList();

	const partitionData = useMemo(
		() =>
			partitions.filter(partition =>
				partition.projects.some(
					p => p.projectId === project.ProjectId
				)
			),
		[project, partitions]
	);

	const volatileMemoryData = useMemo(
		() => getVolatileData(partitionData, socMemorytypes),
		[partitionData, socMemorytypes]
	);

	const nonVolatileMemoryData = useMemo(
		() => getNonVolatileData(partitionData, socMemorytypes),
		[partitionData, socMemorytypes]
	);

	return (
		<div className={styles.partitionsContainer}>
			{volatileMemoryData.length > 0 && (
				<MemoryCard dataTest='volatile-memory-card-container'>
					<div slot='title' className={styles.memoryCardTitleSlot}>
						<h3 className={styles.memoryCardTitle}>
							{i10n?.partition_type?.['volatile-memory']}
						</h3>
						<p className={styles.memoryCardDetails}>
							{convertBytesToKbOrMb(
								getTotalPartitionMemorySize(volatileMemoryData)
							)}
						</p>
					</div>
					<div slot='end'>
						<span className={styles.partitionLabel}>
							{`${volatileMemoryData.length}
							${
								volatileMemoryData.length === 1
									? i10n?.num_partitions?.one?.label?.title
									: i10n?.num_partitions?.other?.label?.title
							}`}
						</span>
					</div>
					<div slot='content'>
						<div
							className={styles.partitionCardsSection}
							data-test='volatile-partition-details-card-list'
						>
							<h5 className={styles.partitionHeading}>Partitions</h5>
							{volatileMemoryData?.map(
								(partition: Partition, index: number) => (
									<PartitionCard
										key={partition.displayName}
										partition={partition}
										project={project}
										dataTest={`volatile-partition ${index}`}
									/>
								)
							)}
						</div>
					</div>
				</MemoryCard>
			)}
			{nonVolatileMemoryData.length > 0 && (
				<MemoryCard dataTest='non-volatile-memory-card-container'>
					<div slot='title' className={styles.memoryCardTitleSlot}>
						<h3 className={styles.memoryCardTitle}>
							{i10n?.partition_type?.['non-volatile-memory']}
						</h3>
						<p className={styles.memoryCardDetails}>
							{convertBytesToKbOrMb(
								getTotalPartitionMemorySize(nonVolatileMemoryData)
							)}
						</p>
					</div>
					<div slot='end'>
						<p className={styles.partitionLabel}>
							{`${nonVolatileMemoryData.length} ${i10n?.num_partitions.other.label.title}`}
						</p>
					</div>
					<div slot='content'>
						<div
							className={styles.partitionCardsSection}
							data-test='non-volatile-partition-details-card-list'
						>
							<h5 className={styles.partitionHeading}>
								{i10n?.num_partitions.other.label.title}
							</h5>
							{nonVolatileMemoryData?.map(
								(partition: Partition, index: number) => (
									<PartitionCard
										key={partition.displayName}
										partition={partition}
										project={project}
										dataTest={`non-volatile-partition ${index}`}
									/>
								)
							)}
						</div>
					</div>
				</MemoryCard>
			)}
		</div>
	);
}
