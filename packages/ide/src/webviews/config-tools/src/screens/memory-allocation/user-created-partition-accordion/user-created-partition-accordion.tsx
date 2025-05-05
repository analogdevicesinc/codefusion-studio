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

import {useState} from 'react';
import Accordion from '@common/components/accordion/Accordion';
import type {Partition} from '../../../state/slices/partitions/partitions.reducer';
import styles from './user-created-partitions-accordion.module.scss';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import {
	convertBytesToKbOrMb,
	convertDecimalToHex,
	getBlocksInPartition,
	getEndAddress,
	getOccupiedMemory,
	getTotalBlockMemory
} from '../../../utils/memory';
import {type MemoryBlock} from '../../../../../common/types/soc';
import {BlockPartitionDetails} from '../block-partition/block-partition-details';
import {useFilteredMemoryBlocks} from '../../../state/slices/app-context/appContext.selector';
import {getProjectInfoList} from '../../../utils/config';

type UserCreatedPartitionAccordionProps = {
	readonly partition: Partition;
};

export default function UserCreatedPartitionAccordion({
	partition
}: UserCreatedPartitionAccordionProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory?.['user-partition'];

	const projects = getProjectInfoList();

	const cores = projects
		?.filter(project =>
			partition?.projects?.find(
				core => project.ProjectId === core.projectId
			)
		)
		.map(
			core =>
				`${core?.Description}${core?.Secure ? '(S)' : core?.Secure === false ? '(NS)' : ''}`
		);

	const memoryBlocks: MemoryBlock[] = getBlocksInPartition(
		useFilteredMemoryBlocks(),
		partition.blockNames
	);

	const startAddress = parseInt(partition.startAddress, 16);

	const endAddress = getEndAddress(startAddress, partition.size);

	const partitionInfo = () => (
		<>
			<div
				className={styles.infoSection}
				data-test='user-created-partion-info'
			>
				<div className={styles.heading}>
					{i10n?.['core-info']?.title}
				</div>
				<div className={styles.attribute}>
					<span className={styles.label}>
						{i10n?.['assigned-cores']?.label}
					</span>
					<span className={styles.value}>{cores?.join(', ')}</span>
				</div>
				<div className={styles.attribute}>
					<span className={styles.label}>
						{i10n?.['start-address']?.label}
					</span>
					<span className={styles.value}>
						{convertDecimalToHex(startAddress)}
					</span>
				</div>
				<div className={styles.attribute}>
					<span className={styles.label}>
						{i10n?.['end-address']?.label}
					</span>
					<span className={styles.value}>
						{convertDecimalToHex(endAddress)}
					</span>
				</div>
			</div>
			<div className={styles.memorySection}>
				<div className={styles.heading}>
					{i10n?.block?.header?.title}
				</div>
				<div
					className={styles.cardSection}
					data-test='memory-partition-blocks'
				>
					{memoryBlocks?.map((block: MemoryBlock) => (
						<div key={block.Name}>
							<BlockPartitionDetails
								title={block.Name}
								size={convertBytesToKbOrMb(
									getTotalBlockMemory(block),
									true
								)}
								occupiedMemory={convertBytesToKbOrMb(
									getOccupiedMemory(partition, block),
									true
								)}
							/>
						</div>
					))}
				</div>
			</div>
		</>
	);

	return (
		<div className={styles.wrapper}>
			<Accordion
				title={partition.displayName}
				body={partitionInfo()}
				isOpen={isExpanded}
				toggleExpand={() => {
					setIsExpanded(!isExpanded);
				}}
			/>
		</div>
	);
}
