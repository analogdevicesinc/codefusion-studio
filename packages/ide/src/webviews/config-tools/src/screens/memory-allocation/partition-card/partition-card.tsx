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

import {Badge, Button} from 'cfs-react-library';
import {
	type PartitionCore,
	type Partition,
	removePartition,
	setSideBarState
} from '../../../state/slices/partitions/partitions.reducer';
import MemoryCard from '../memory-card/memory-card';
import Config from '../../../../../common/icons/Config';
import DeleteIcon from '../../../../../common/icons/Delete';
import styles from './partition-card.module.scss';
import type {TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	convertBytesToKbOrMb,
	convertDecimalToHex,
	getEndAddress
} from '../../../utils/memory';
import {useAppDispatch} from '../../../state/store';
import {type ProjectInfo} from '../../../utils/config';

type PartitionCardProp = Readonly<{
	partition: Partition;
	project: ProjectInfo;
	dataTest?: string;
}>;

export default function PartitionCard({
	partition,
	project,
	dataTest
}: PartitionCardProp) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory?.access;

	const dispatch = useAppDispatch();

	const currentProject = partition.projects.find(
		(partitionCore: PartitionCore) =>
			project.ProjectId === partitionCore.projectId
	);

	const partitionStartAddress = parseInt(partition.startAddress, 16);

	const endAddress = getEndAddress(
		partitionStartAddress,
		partition.size
	);

	function deletePartition(startAddress: string) {
		dispatch(removePartition({startAddress}));
	}

	function editPartition(partition: Partition) {
		dispatch(
			setSideBarState({
				isSidebarMinimised: false,
				sidebarPartition: partition
			})
		);
	}

	const content = currentProject ? (
		<div className={styles.partitionsCards} data-test={dataTest}>
			<MemoryCard isExpandable={false}>
				<div slot='title'>
					<div className={styles.memoryCardTitleSection}>
						<div className={styles.memoryCardTitleInfo}>
							<div className={styles.memoryCardTitle}>
								<h3>{partition.displayName}</h3>
								<p>
									{partition.size
										? convertBytesToKbOrMb(partition.size)
										: '0 KB'}
								</p>
							</div>
							<Badge appearance='secondary'>{partition.type}</Badge>
						</div>

						<p className={styles.memoryCardDetails}>
							{`${convertDecimalToHex(partitionStartAddress)} - ${convertDecimalToHex(endAddress)}`}
						</p>
					</div>
				</div>
				<div slot='end'>
					<div className={styles.partitionEnd}>
						<div className={styles.partitionAccessBadge}>
							<Badge
								appearance='secondary'
								className={styles.partitionCardInfoBadge}
							>
								{i10n?.[currentProject.access]?.title ?? ''}
							</Badge>
						</div>
						<div className={styles.actionButton}>
							<Button
								dataTest='edit-partition-btn'
								onClick={() => {
									editPartition(partition);
								}}
							>
								<Config />
							</Button>
							<DeleteIcon
								data-test='delete-partition-btn'
								onClick={() => {
									deletePartition(partition.startAddress);
								}}
							/>
						</div>
					</div>
				</div>
			</MemoryCard>
		</div>
	) : null;

	return content;
}
