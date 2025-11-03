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
import PartitionDetailsProjectViewCardProp from '../partition-card/partition-details-project-view-card';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {type ProjectInfo} from '../../../utils/config';
import {Badge} from 'cfs-react-library';
import {
	formatBytesToKbOrMb,
	getTotalPartitionForMemoryType
} from '../../../utils/memory';
import useIsPrimaryMultipleProjects from '../../../hooks/use-is-primary-multiple-projects';
import {
	EXTERNALLY_MANAGED,
	PRIMARY,
	SECURE
} from '@common/constants/core-properties';

type PartitionProjectViewCardCardProps = Readonly<{
	partitions: Partition[];
	project: ProjectInfo;
	memoryTypes: string[];
	isOpen: boolean;
	setOpen: (open: boolean) => void;
}>;

export default function PartitionProjectViewCard({
	partitions,
	project,
	memoryTypes,
	isOpen,
	setOpen
}: PartitionProjectViewCardCardProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory?.partition;
	const shouldShowPrimary = useIsPrimaryMultipleProjects(
		project?.IsPrimary ?? false
	);

	const partitionData = useMemo(
		() =>
			partitions.filter(partition =>
				partition.projects.some(
					p => p.projectId === project.ProjectId
				)
			),
		[project, partitions]
	);

	return (
		<div className={styles.partitionsContainer}>
			<MemoryCard
				dataTest='project-view-memory-card-container'
				isOpen={isOpen}
				setOpen={setOpen}
			>
				<div slot='title' className={styles.memoryCardTitleSlot}>
					<div className={styles.memoryCardTitle}>
						<h3>{project.Name}</h3>
						{shouldShowPrimary ? (
							<Badge appearance='secondary'>{PRIMARY}</Badge>
						) : null}
						{project.Secure && (
							<Badge appearance='secondary'>{SECURE}</Badge>
						)}
						{project.ExternallyManaged && (
							<Badge appearance='secondary'>
								{EXTERNALLY_MANAGED}
							</Badge>
						)}
					</div>
					<div className={styles.projectViewTitle}>
						{memoryTypes?.map(type => (
							<p key={type}>
								{partitionData.length
									? `${formatBytesToKbOrMb(
											getTotalPartitionForMemoryType(
												partitionData,
												type
											)
										)} ${type}`
									: null}
							</p>
						))}
					</div>
					{partitionData.length === 0 && (
						<span className={styles.noPartition}>
							No memory partitions allocated yet.
						</span>
					)}
				</div>
				{partitionData.length > 0 ? (
					<div slot='end'>
						<span className={styles.partitionLabel}>
							{`${partitionData.length}
							${
								partitionData.length === 1
									? i10n?.num_partitions?.one?.label?.title
									: i10n?.num_partitions?.other?.label?.title
							}`}
						</span>
					</div>
				) : null}
				{partitionData.length > 0 && (
					<div slot='content'>
						<div
							className={styles.partitionCardsSection}
							data-test='partition-details-project-view-cards'
						>
							{partitionData.map(
								(partition: Partition, index: number) => (
									<PartitionDetailsProjectViewCardProp
										key={partition.displayName}
										partition={partition}
										project={project}
										dataTest={`partition ${index}`}
									/>
								)
							)}
						</div>
					</div>
				)}
			</MemoryCard>
		</div>
	);
}
