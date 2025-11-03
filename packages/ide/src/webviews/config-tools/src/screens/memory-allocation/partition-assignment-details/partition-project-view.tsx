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
import {type ProjectInfo} from '../../../utils/config';
import PartitionProjectViewCard from '../partition-assignment-details-card/partition-project-view-card';
import styles from './partition-assignment-details.module.scss';

type PartitionProjectViewProps = Readonly<{
	filteredCores: () => ProjectInfo[];
	partitions: Partition[];
	types: string[];
	openCards: string[];
	onCardOpen: (projectId: string, open: boolean) => void;
}>;

export default function PartitionProjectView({
	filteredCores,
	partitions,
	types,
	openCards,
	onCardOpen
}: PartitionProjectViewProps) {
	const ProjectView = filteredCores().map(project => (
		<PartitionProjectViewCard
			key={project.CoreId}
			partitions={partitions}
			project={project}
			memoryTypes={types}
			isOpen={openCards.includes(project.ProjectId)}
			setOpen={open => {
				onCardOpen(project.ProjectId, open);
			}}
		/>
	));

	return (
		<div
			className={styles.partitionViewByCards}
			data-test='partition-project-view'
		>
			{ProjectView}
		</div>
	);
}
