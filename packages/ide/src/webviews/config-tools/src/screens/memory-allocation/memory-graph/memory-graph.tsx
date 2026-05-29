/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import React, {useMemo, useRef, useState} from 'react';
import {type MemoryBlock} from '../../../../../common/types/soc';
import {
	setSideBarState,
	type Partition
} from '../../../state/slices/partitions/partitions.reducer';
import {
	calculateBlockWidth,
	calculatePartitionOffset,
	calulatePartitionWidth,
	getPartitionsInBlock
} from '../../../utils/memory';
import {useFilteredPartitions} from '../../../state/slices/app-context/appContext.selector';
import styles from './memory-graph.module.scss';
import {MemoryGraphTooltip} from './memory-graph-tooltip/memory-graph-tooltip';
import {MemoryGraphAddButton} from './memory-graph-add-button/memory-graph-add-button';
import {
	usePartitions,
	useSidebarState
} from '../../../state/slices/partitions/partitions.selector';
import {useAppDispatch} from '../../../state/store';

type MemoryGraphProps = Readonly<{
	memoryBlock?: MemoryBlock;
	memoryBlocks?: MemoryBlock[];
	dataTest?: string;
}>;

export function MemoryGraph({
	memoryBlock,
	memoryBlocks,
	dataTest
}: MemoryGraphProps): JSX.Element {
	const dispatch = useAppDispatch();
	const partitions = usePartitions();
	const filteredPartitions = useFilteredPartitions();
	const {isSidebarMinimised, sidebarPartition} = useSidebarState();
	const graphMousePosition = useRef(0);
	const [hoveredPartitionKey, setHoveredPartitionKey] =
		useState<string>();
	const [hoveredPartition, setHoveredPartition] =
		useState<Partition>();

	/* NOTE we don't want to show a border when creating a new partition */
	const selectedPartition = sidebarPartition
		? partitions.find(
				partition =>
					partition.displayName === sidebarPartition.displayName &&
					partition.type === sidebarPartition.type &&
					partition.startAddress === sidebarPartition.startAddress
			)
		: undefined;

	const selectedPartitionStyle =
		memoryBlocks && selectedPartition
			? getSelectedPartitionStyle(selectedPartition, memoryBlocks)
			: undefined;

	const onPartitionHover = (
		event: React.MouseEvent<HTMLElement>,
		partition: Partition,
		partitionKey: string
	): void => {
		const bounds =
			event.currentTarget.parentElement?.getBoundingClientRect();

		if (bounds) {
			graphMousePosition.current = event.clientX - bounds.left - 16;
			setHoveredPartition(partition);
			setHoveredPartitionKey(partitionKey);
		}
	};

	const handleMouseLeave = (): void => {
		setHoveredPartition(undefined);
		setHoveredPartitionKey(undefined);
	};

	const handlePartitionClick = (): void => {
		if (!isSidebarMinimised || !hoveredPartition) return;

		dispatch(
			setSideBarState({
				isSidebarMinimised: false,
				sidebarPartition: hoveredPartition
			})
		);
	};

	const getPartitionClasses = (
		partition: Partition,
		block: MemoryBlock
	): string =>
		[
			partition.projects.length === 1
				? styles.partition
				: styles.hashedPartition,
			partition === hoveredPartition &&
				isSidebarMinimised &&
				partition.projects.length === 1 &&
				styles.hoveredPartition,
			partition === hoveredPartition &&
				isSidebarMinimised &&
				partition.projects.length > 1 &&
				styles.hashedHoveredPartition,
			partitionStartsInBlock(partition, block) &&
				styles.startingPartition,
			partitionEndsInBlock(partition, block) && styles.endingPartition
		]
			.filter(Boolean)
			.join(' ');

	const hasPartitions = useMemo((): boolean => {
		if (memoryBlocks?.length) {
			return memoryBlocks.some(block =>
				filteredPartitions.some(partition =>
					doesPartitionOverlapBlock(partition, block)
				)
			);
		}

		if (memoryBlock) {
			return filteredPartitions.some(
				partition => partition.baseBlock.Name === memoryBlock.Name
			);
		}

		return false;
	}, [filteredPartitions, memoryBlocks, memoryBlock]);

	const renderSingleBlockPartitions = () =>
		memoryBlock &&
		getPartitionsInBlock(filteredPartitions, memoryBlock)?.map(
			partition => (
				<div
					key={partition.displayName}
					className={
						partition.projects.length === 1
							? styles.partition
							: styles.hashedPartition
					}
					style={getSingleBlockPartitionStyle(partition, memoryBlock)}
				/>
			)
		);

	const renderMultiBlockPartitions = (block: MemoryBlock) =>
		getPartitionsOverlappingBlock(block, filteredPartitions).map(
			partition => {
				const style = getMultiBlockPartitionStyle(partition, block);

				if (!style) return null;

				const partitionKey = `${block.Name}-${partition.displayName}`;

				return (
					<React.Fragment key={partitionKey}>
						<div
							className={getPartitionClasses(partition, block)}
							style={style}
							data-test={`${dataTest}-multiblock-${block.Name}-${partition.displayName}`}
							onMouseEnter={e => {
								onPartitionHover(e, partition, partitionKey);
							}}
							onMouseLeave={handleMouseLeave}
							onClick={handlePartitionClick}
						/>
						{hoveredPartition &&
							partition === hoveredPartition &&
							partitionKey === hoveredPartitionKey && (
								<MemoryGraphTooltip
									position={graphMousePosition.current}
									partition={hoveredPartition}
								/>
							)}
					</React.Fragment>
				);
			}
		);

	const renderMemoryBlocksWithGaps = () =>
		memoryBlocks?.map(block => {
			const freeGaps = getFreeSpaceOffsetsInBlock(block, partitions);
			const width = calculateBlockWidth(block, memoryBlocks);

			return (
				<div
					key={block.Name}
					className={`${styles.block} ${hasPartitions ? styles.highlighted : ''}`}
					style={{width: `${width}%`}}
				>
					{freeGaps.map(({address, offset, endAddress, width}) => (
						<MemoryGraphAddButton
							key={`${block.Name}-${address}`}
							offset={offset}
							address={address}
							endAddress={endAddress}
							memoryBlock={block}
							width={width}
						/>
					))}
					{renderMultiBlockPartitions(block)}
				</div>
			);
		});

	return (
		<div
			className={`${styles.container} ${hasPartitions ? styles.highlighted : ''}`}
			data-test={dataTest}
		>
			<div className={styles.section}>
				{renderSingleBlockPartitions()}
				{renderMemoryBlocksWithGaps()}
				{selectedPartitionStyle && (
					<div
						className={styles.selectedPartition}
						style={selectedPartitionStyle}
					/>
				)}
			</div>
		</div>
	);
}

const getFreeSpaceOffsetsInBlock = (
	block: MemoryBlock,
	partitions: Partition[]
): Array<{
	address: number;
	offset: number;
	endAddress: number;
	width: number;
}> => {
	const start = parseInt(block.AddressStart, 16);
	const end = parseInt(block.AddressEnd, 16);
	const size = end - start + 1;

	const covered = partitions
		.map(p => {
			const pStart = parseInt(p.startAddress, 16);
			const pEnd = pStart + p.size;

			if (pEnd > start && pStart < end) {
				return {
					start: Math.max(pStart, start),
					end: Math.min(pEnd, end)
				};
			}

			return null;
		})
		.filter(Boolean) as Array<{start: number; end: number}>;

	covered.sort((a, b) => a.start - b.start);

	const merged: typeof covered = [];

	for (const seg of covered) {
		if (!merged.length || seg.start > merged[merged.length - 1].end) {
			merged.push({...seg});
		} else {
			merged[merged.length - 1].end = Math.max(
				merged[merged.length - 1].end,
				seg.end
			);
		}
	}

	const gaps: Array<{
		address: number;
		offset: number;
		endAddress: number;
		width: number;
	}> = [];
	let cursor = start;

	const pushGap = (gapStart: number, gapEnd: number) => {
		const offset = ((gapStart - start) / size) * 100;
		const width = ((gapEnd - gapStart + 1) / size) * 100;

		gaps.push({
			address: gapStart,
			offset,
			endAddress: gapEnd,
			width
		});
	};

	for (const seg of merged) {
		if (cursor < seg.start) {
			pushGap(cursor, seg.start - 1);
		}

		cursor = Math.max(cursor, seg.end);
	}

	if (cursor < end) {
		pushGap(cursor, end);
	}

	return gaps;
};

const getPartitionsOverlappingBlock = (
	block: MemoryBlock,
	partitions: Partition[]
): Partition[] =>
	partitions.filter(partition =>
		doesPartitionOverlapBlock(partition, block)
	);

const getMultiBlockPartitionStyle = (
	partition: Partition,
	block: MemoryBlock
): React.CSSProperties | undefined => {
	const partitionStart = parseInt(partition.startAddress, 16);
	const partitionEnd = partitionStart + partition.size - 1;
	const blockStart = parseInt(block.AddressStart, 16);
	const blockEnd = parseInt(block.AddressEnd, 16);
	const blockSize = blockEnd - blockStart + 1;

	const overlapStart = Math.max(partitionStart, blockStart);
	const overlapEnd = Math.min(partitionEnd, blockEnd);

	if (overlapStart > overlapEnd) return undefined;

	const width = ((overlapEnd - overlapStart + 1) / blockSize) * 100;
	const offset = ((overlapStart - blockStart) / blockSize) * 100;

	return {left: `${offset}%`, width: `${width}%`};
};

/* NOTE we need to draw the border as one single segment when a partition spans multiple blocks.
 * Currently we draw the spanned parttion as multiple segments.
 */
const getSelectedPartitionStyle = (
	partition: Partition,
	memoryBlocks: MemoryBlock[]
): React.CSSProperties | undefined => {
	const visibleSegments = memoryBlocks
		.map((block, index) => {
			const style = getMultiBlockPartitionStyle(partition, block);

			if (!style) return undefined;

			const blockOffset = memoryBlocks
				.slice(0, index)
				.reduce(
					(total, currentBlock) =>
						total + calculateBlockWidth(currentBlock, memoryBlocks),
					0
				);

			const blockWidth = calculateBlockWidth(block, memoryBlocks);
			const segmentLeft =
				blockOffset +
				(parseFloat(style.left as string) / 100) * blockWidth;
			const segmentWidth =
				(parseFloat(style.width as string) / 100) * blockWidth;

			return {
				left: segmentLeft,
				right: segmentLeft + segmentWidth
			};
		})
		.filter(Boolean) as Array<{left: number; right: number}>;

	if (!visibleSegments.length) return undefined;

	const left = Math.min(
		...visibleSegments.map(segment => segment.left)
	);
	const right = Math.max(
		...visibleSegments.map(segment => segment.right)
	);
	const width = right - left;

	if (width <= 0) return undefined;

	return {
		left: `${left}%`,
		width: `${width}%`
	};
};

const getSingleBlockPartitionStyle = (
	partition: Partition,
	block: MemoryBlock
): React.CSSProperties => {
	const width = calulatePartitionWidth(partition, block);
	const offset = calculatePartitionOffset(
		partition,
		parseInt(block.AddressStart, 16),
		parseInt(block.AddressEnd, 16)
	);
	const radius = getBorderRadius(offset, width);

	return {
		left: `${offset}%`,
		width: `${width}%`,
		...(radius && {borderRadius: radius})
	};
};

const getBorderRadius = (offset: number, width: number): string => {
	const roundedEnd = Math.round(offset + width);

	if (offset === 0 && roundedEnd === 100) return '2px';
	if (offset === 0) return '2px 0 0 2px';
	if (roundedEnd === 100) return '0 2px 2px 0';

	return '';
};

const partitionStartsInBlock = (
	partition: Partition,
	block: MemoryBlock
): boolean => {
	const partitionStart = parseInt(partition.startAddress, 16);
	const blockStart = parseInt(block.AddressStart, 16);
	const blockEnd = parseInt(block.AddressEnd, 16);

	return partitionStart >= blockStart && partitionStart <= blockEnd;
};

const partitionEndsInBlock = (
	partition: Partition,
	block: MemoryBlock
): boolean => {
	const partitionStart = parseInt(partition.startAddress, 16);
	const partitionEnd = partitionStart + partition.size - 1;
	const blockStart = parseInt(block.AddressStart, 16);
	const blockEnd = parseInt(block.AddressEnd, 16);

	return partitionEnd >= blockStart && partitionEnd <= blockEnd;
};

const doesPartitionOverlapBlock = (
	partition: Partition,
	block: MemoryBlock
): boolean => {
	const partitionStart = parseInt(partition.startAddress, 16);
	const partitionEnd = partitionStart + partition.size - 1;
	const blockStart = parseInt(block.AddressStart, 16);
	const blockEnd = parseInt(block.AddressEnd, 16);

	return partitionEnd >= blockStart && partitionStart <= blockEnd;
};
