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
import {useState} from 'react';
import type {MemoryBlock} from '@common/types/soc';
import Accordion from '@common/components/accordion/Accordion';
import {
	formatTotalAndAvailableMemory,
	getTotalBlockMemory,
	getPartitionsInBlock,
	convertBytesToKbOrMb,
	getOccupiedMemory,
	getRemainingMemoryInBlock,
	formatHexPrefix,
	getBlockMinAlignment
} from '../../../utils/memory';
import styles from './memory-accordion.module.scss';
import {MemoryGraph} from '../memory-graph/memory-graph';
import {usePartitions} from '../../../state/slices/partitions/partitions.selector';
import {BlockPartitionDetails} from '../block-partition/block-partition-details';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';

type MemoryAccordionProps = {
	readonly memoryBlock: MemoryBlock;
};

export default function MemoryAccordion({
	memoryBlock
}: MemoryAccordionProps) {
	const i10n: TLocaleContext | undefined = useLocaleContext()?.memory;
	const [isExpanded, setIsExpanded] = useState(false);
	const totalMemory = getTotalBlockMemory(memoryBlock);
	const partitionsInBlock = getPartitionsInBlock(
		usePartitions(),
		memoryBlock
	);

	const getRemainingMemory = (): number => {
		if (partitionsInBlock) {
			return getRemainingMemoryInBlock(
				totalMemory,
				partitionsInBlock,
				memoryBlock
			);
		}

		return totalMemory;
	};

	const blockDetails = () => (
		<div className={styles.infoSection}>
			<div className={styles.heading}>
				{i10n?.['user-partition']?.['core-info'].title}
			</div>
			<div className={styles.attribute}>
				<span className={styles.label}>
					{i10n?.['user-partition']?.['start-address'].label}
				</span>
				<span className={styles.value}>
					{formatHexPrefix(memoryBlock.AddressStart)}
				</span>
			</div>
			<div className={styles.attribute}>
				<span className={styles.label}>
					{i10n?.['user-partition']?.['end-address'].label}
				</span>
				<span className={styles.value}>
					{formatHexPrefix(memoryBlock.AddressEnd)}
				</span>
			</div>
			<div className={styles.attribute}>
				<span className={styles.label}>
					{i10n?.blocks?.['min-alignment']}
				</span>
				<span className={styles.value} data-test='min-alignment'>
					{getBlockMinAlignment(memoryBlock)}
				</span>
			</div>
			<div className={`${styles.heading} ${styles.partitionSpacing}`}>
				{i10n?.partition.num_partitions?.other.label.title}
			</div>
			<MemoryGraph memoryBlock={memoryBlock} />
			{partitionsInBlock?.map(partition => (
				<div
					key={partition.displayName}
					data-test={`partition-accordion-${partition.displayName}`}
				>
					<BlockPartitionDetails
						title={partition.displayName}
						size={convertBytesToKbOrMb(
							partition.size ? partition.size : 0,
							true
						)}
						occupiedMemory={convertBytesToKbOrMb(
							getOccupiedMemory(partition, memoryBlock),
							true
						)}
					/>
				</div>
			))}
		</div>
	);

	return (
		<div className={styles.wrapper}>
			<Accordion
				title={memoryBlock.Name}
				body={blockDetails()}
				caption={
					<div className={styles.caption}>
						{formatTotalAndAvailableMemory(
							totalMemory,
							getRemainingMemory(),
							false
						)}
					</div>
				}
				isOpen={isExpanded}
				toggleExpand={() => {
					setIsExpanded(!isExpanded);
				}}
			/>
		</div>
	);
}
