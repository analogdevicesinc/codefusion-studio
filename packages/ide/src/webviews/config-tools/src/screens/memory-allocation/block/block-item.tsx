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

import {type MemoryBlock} from '../../../../../common/types/soc';
import {
	usePartitions,
	useSidebarState
} from '../../../state/slices/partitions/partitions.selector';
import {
	formatTotalAndAvailableMemory,
	getEndAddress,
	getPartitionMemoryInBlock,
	getTotalBlockMemory
} from '../../../utils/memory';
import styles from './block-item.module.scss';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';

type BlockItemProps = {
	readonly memoryBlock: MemoryBlock;
	readonly size: number;
	readonly newPartitionStartAddress: string;
};

export default function BlockItem({
	memoryBlock,
	size,
	newPartitionStartAddress
}: BlockItemProps): JSX.Element {
	const numericalStartAddress = parseInt(
		newPartitionStartAddress,
		16
	);
	const newPartitionEndAddress = getEndAddress(
		numericalStartAddress,
		size
	);

	const {sidebarPartition} = useSidebarState();

	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.memory?.['user-partition'];
	const isPartitionStartingInBlock =
		numericalStartAddress >= parseInt(memoryBlock.AddressStart, 16) &&
		numericalStartAddress <= parseInt(memoryBlock.AddressEnd, 16);
	const isPartitionEndingInBlock =
		newPartitionEndAddress >=
			parseInt(memoryBlock.AddressStart, 16) &&
		newPartitionEndAddress <= parseInt(memoryBlock.AddressEnd, 16);

	const partitions = usePartitions();

	const calculateOccupiedMemory = (): number => {
		let occupiedMemory = 0;

		for (const partition of partitions) {
			if (
				partition.blockNames.includes(memoryBlock.Name) &&
				!sidebarPartition.type
			) {
				const partitionStartAddr = parseInt(
					partition.startAddress,
					16
				);
				const endAddress = partitionStartAddr + partition.size - 1;

				occupiedMemory += getPartitionMemoryInBlock(
					endAddress,
					partitionStartAddr,
					memoryBlock
				);
			}
		}

		return occupiedMemory;
	};

	return (
		<div className={styles.container} data-test='block-item-section'>
			<div className={styles.section}>
				<div className={styles.heading}>{memoryBlock.Name}</div>
				<div className={styles.memoryAllocation}>
					{formatTotalAndAvailableMemory(
						getTotalBlockMemory(memoryBlock),
						calculateOccupiedMemory() +
							getPartitionMemoryInBlock(
								newPartitionEndAddress,
								numericalStartAddress,
								memoryBlock
							)
					)}
				</div>
			</div>
			<div className={styles.section}>
				<div className={styles.address}>
					{i10n?.['start-address'].label}
				</div>
				<div className={styles.size}>
					{isPartitionStartingInBlock
						? `0x${numericalStartAddress.toString(16).toUpperCase()}`
						: `0x${memoryBlock.AddressStart.slice(2).toUpperCase()}`}
				</div>
			</div>
			<div className={styles.section}>
				<div className={styles.address}>
					{i10n?.['end-address'].label}
				</div>
				<div className={styles.size}>
					{isPartitionEndingInBlock
						? `0x${newPartitionEndAddress.toString(16).toUpperCase()}`
						: `0x${memoryBlock.AddressEnd.slice(2).toUpperCase()}`}
				</div>
			</div>
		</div>
	);
}
