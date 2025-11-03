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
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import MemoryCard from '../memory-card/memory-card';
import {
	formatTotalAndAvailableMemory,
	getCoreMemoryBlocks,
	getTotalBlockMemoryByType,
	getTotalPartitionMemorySize
} from '../../../utils/memory';
import styles from './partition-assignment-details-card.module.scss';
import PartitionDetailsTypeViewCard from '../partition-card/partition-details-type-view-card';
import {type MemoryBlock} from '../../../../../common/types/soc';
import {useMemo} from 'react';

type PartitionTypeViewCardProps = Readonly<{
	partitions: Partition[];
	type: string;
	isOpen: boolean;
	setOpen: (open: boolean) => void;
}>;

export default function PartitionTypeViewCard({
	partitions,
	type,
	isOpen,
	setOpen
}: PartitionTypeViewCardProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory?.partition;
	const memoryBlocks: MemoryBlock[] = getCoreMemoryBlocks();

	const blocksForType = useMemo(
		() => memoryBlocks.filter(block => block.Type === type),
		[memoryBlocks, type]
	);

	const totalMemoryBlockSize =
		getTotalBlockMemoryByType(blocksForType);
	const AvailableMemoryInBlock =
		getTotalBlockMemoryByType(blocksForType) -
		getTotalPartitionMemorySize(partitions);

	return (
		<div className={styles.partitionsContainer}>
			<MemoryCard
				dataTest='type-view-memory-card-container'
				isOpen={isOpen}
				setOpen={setOpen}
			>
				<div slot='title' className={styles.memoryCardTitleSlot}>
					<div className={styles.memoryCardTitle}>
						<h3>{type}</h3>
					</div>

					<p className={styles.memoryCardDetails}>
						{`${formatTotalAndAvailableMemory(totalMemoryBlockSize, AvailableMemoryInBlock, false)} Available`}
					</p>
				</div>
				<div slot='end'>
					<span className={styles.partitionLabel}>
						{`${partitions.length}
							${
								partitions.length === 1
									? i10n?.num_partitions?.one?.label?.title
									: i10n?.num_partitions?.other?.label?.title
							}`}
					</span>
				</div>
				<div slot='content'>
					<div
						className={styles.partitionCardsSection}
						data-test='partition-details-type-view-cards'
					>
						{partitions?.map(
							(partition: Partition, index: number) => (
								<PartitionDetailsTypeViewCard
									key={partition.displayName}
									partition={partition}
									dataTest={`partition ${index}`}
								/>
							)
						)}
					</div>
				</div>
			</MemoryCard>
		</div>
	);
}
