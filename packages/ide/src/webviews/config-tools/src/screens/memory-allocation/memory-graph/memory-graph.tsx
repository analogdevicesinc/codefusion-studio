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

import React, {useRef, useState} from 'react';
import {type MemoryBlock} from '../../../../../common/types/soc';
import {type Partition} from '../../../state/slices/partitions/partitions.reducer';
import {
	calculateBlockWidth,
	calculateMultiBlockPartitionWidth,
	calculatePartitionOffset,
	calulatePartitionWidth,
	getPartitionsInBlock
} from '../../../utils/memory';
import styles from './memory-graph.module.scss';
import {MemoryGraphTooltip} from './memory-graph-tooltip/memory-graph-tooltip';
import {useFilteredPartitions} from '../../../state/slices/app-context/appContext.selector';

type MemoryGraphProps = {
	readonly memoryBlock?: MemoryBlock;
	readonly memoryBlocks?: MemoryBlock[];
	readonly dataTest?: string;
};

export function MemoryGraph({
	memoryBlock,
	memoryBlocks,
	dataTest
}: MemoryGraphProps): JSX.Element {
	const partitions = useFilteredPartitions();
	const graphMousePosition = useRef(0);
	const [isHovering, setIsHovering] = useState(true);
	const [hoveredPartition, setHoveredPartition] = useState<
		Partition | undefined
	>();

	const onPartitionHover = (
		event: React.MouseEvent<HTMLElement>,
		partition: Partition
	): void => {
		const {parentElement} = event.currentTarget;

		if (parentElement) {
			const bounds = parentElement.getBoundingClientRect();
			graphMousePosition.current = event.clientX - bounds.left - 16;
			setHoveredPartition(partition);
			setIsHovering(true);
		}
	};

	const handleMouseLeave = (): void => {
		setHoveredPartition(undefined);
		setIsHovering(false);
	};

	const getPartitionPlacement = (
		partition: Partition,
		memoryBlock: MemoryBlock
	) => {
		const width = calulatePartitionWidth(partition, memoryBlock);
		const offset = calculatePartitionOffset(
			partition,
			parseInt(memoryBlock.AddressStart, 16),
			parseInt(memoryBlock.AddressEnd, 16)
		);
		const radius = getSingleBlockBorderRadius(offset, width);

		return getPartitionStyling(offset, width, radius);
	};

	const getSingleBlockBorderRadius = (
		offset: number,
		width: number
	) => {
		let radius = '0';

		if (offset === 0) {
			radius = '2px 0 0 2px';
		}

		if (Math.round(offset + width) === 100) {
			radius = '0 2px 2px 0';
		}

		if (offset === 0 && Math.round(offset + width) === 100) {
			radius = '2px';
		}

		return radius;
	};

	const getPartitionsByType = (
		memoryBlocks: MemoryBlock[]
	): Partition[] =>
		partitions.filter(
			partition => partition.type === memoryBlocks[0].Type
		);

	const getMutliBlockPartitionPlacement = (
		partition: Partition,
		memoryBlocks: MemoryBlock[]
	) => {
		const blocksStartingAddress = parseInt(
			memoryBlocks[0].AddressStart,
			16
		);
		const blocksEndingAddress = parseInt(
			memoryBlocks[memoryBlocks.length - 1].AddressEnd,
			16
		);

		let width = calculateMultiBlockPartitionWidth(
			partition,
			memoryBlocks[0].AddressStart,
			memoryBlocks[memoryBlocks.length - 1].AddressEnd
		);

		const offset = calculatePartitionOffset(
			partition,
			blocksStartingAddress,
			blocksEndingAddress
		);

		if (width === 100 && offset > 0) {
			width -= offset;
		}

		return getPartitionStyling(offset, width);
	};

	const getPartitionStyling = (offset: number, width: number, radius?: string) => ({
		left: `${offset}%`,
		width: `${width.toString()}%`,
		...(radius && {'border-radius': radius})
	});

	const isPartitionReachingEnd = (
		partition: Partition,
		memoryBlocks: MemoryBlock[]
	) => {
		const {left, width} = getMutliBlockPartitionPlacement(
			partition,
			memoryBlocks
		);

		if (parseFloat(left) + parseFloat(width) >= 100) {
			return true;
		}

		return false;
	};

	const isPartitionAtStart = (
		partition: Partition,
		memoryBlocks: MemoryBlock[]
	) => {
		const {left} = getMutliBlockPartitionPlacement(
			partition,
			memoryBlocks
		);

		return parseInt(left, 10) === 0;
	};

	const getPartitionClasses = (
		partition: Partition,
		index: number,
		memoryBlocks: MemoryBlock[]
	) => `${
		partition.projects.length === 1
			? styles.partition
			: styles.hashedPartition
	} ${partition === hoveredPartition && partition.projects.length === 1 ? styles.hoveredPartition : ''}
		${partition === hoveredPartition && partition.projects.length > 1 ? styles.hashedHoveredPartition : ''} ${index === 0 ? styles.firstPartition : ''}
		${index === getPartitionsByType(memoryBlocks).length - 1 ? styles.lastPartition : ''}`;

	return (
		<div className={styles.container} data-test={dataTest}>
			<div className={styles.section}>
				{memoryBlock !== undefined &&
					getPartitionsInBlock(partitions, memoryBlock)?.map(
						partition => (
							<div
								key={partition.displayName}
								className={`${
									partition.projects.length === 1
										? styles.partition
										: styles.hashedPartition
								}`}
								style={getPartitionPlacement(partition, memoryBlock)}
							/>
						)
					)}
				{memoryBlocks?.map(block => (
					<div
						key={block.Name}
						className={styles.block}
						style={{
							width: `${calculateBlockWidth(block, memoryBlocks)}%`
						}}
					/>
				))}
				{memoryBlocks !== undefined &&
					getPartitionsByType(memoryBlocks).map((partition, i) => (
						<React.Fragment key={partition.displayName}>
							<div
								className={`${getPartitionClasses(partition, i, memoryBlocks)}
								${isPartitionReachingEnd(partition, memoryBlocks) ? styles.endingPartition : ''}
								${isPartitionAtStart(partition, memoryBlocks) ? styles.startingPartition : ''}`}
								style={getMutliBlockPartitionPlacement(
									partition,
									memoryBlocks
								)}
								data-test={`${dataTest}-multiblock-${partition.displayName}`}
								onMouseEnter={event => {
									onPartitionHover(event, partition);
								}}
								onMouseLeave={handleMouseLeave}
							/>
							{isHovering && partition === hoveredPartition && (
								<MemoryGraphTooltip
									position={graphMousePosition.current}
									partition={hoveredPartition}
								/>
							)}
						</React.Fragment>
					))}
			</div>
		</div>
	);
}
