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

import React, {useMemo, useRef, useState} from 'react';
import {type MemoryBlock} from '../../../../../common/types/soc';
import {
	setSideBarState,
	type Partition
} from '../../../state/slices/partitions/partitions.reducer';
import {
	calculateBlockWidth,
	calculateMultiBlockPartitionWidth,
	calculatePartitionOffset,
	calulatePartitionWidth,
	getPartitionsInBlock
} from '../../../utils/memory';
import {useFilteredPartitions} from '../../../state/slices/app-context/appContext.selector';
import styles from './memory-graph.module.scss';
import {MemoryGraphTooltip} from './memory-graph-tooltip/memory-graph-tooltip';
import {MemoryGraphAddButton} from './memory-graph-add-button/memory-graph-add-button';
import {useSidebarState} from '../../../state/slices/partitions/partitions.selector';
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
	const partitions = useFilteredPartitions();
	const {isSidebarMinimised, sidebarPartition} = useSidebarState();
	const graphMousePosition = useRef(0);
	const [isHovering, setIsHovering] = useState(true);
	const [hoveredPartition, setHoveredPartition] =
		useState<Partition>();

	const onPartitionHover = (
		event: React.MouseEvent<HTMLElement>,
		partition: Partition
	): void => {
		const bounds =
			event.currentTarget.parentElement?.getBoundingClientRect();

		if (bounds) {
			graphMousePosition.current = event.clientX - bounds.left - 16;
			setHoveredPartition(partition);
			setIsHovering(true);
		}
	};

	const handleMouseLeave = (): void => {
		setHoveredPartition(undefined);
		setIsHovering(false);
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
		index: number,
		total: number
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
			index === 0 && styles.firstPartition,
			index === total - 1 && styles.lastPartition,
			isPartitionReachingEnd(partition, memoryBlocks!) &&
				styles.endingPartition,
			isPartitionAtStart(partition, memoryBlocks!) &&
				styles.startingPartition,
			partition === sidebarPartition && styles.selectedPartition
		]
			.filter(Boolean)
			.join(' ');

	const hasPartitions = useMemo((): boolean => {
		if (memoryBlocks?.length) {
			return partitions.some(p => p.type === memoryBlocks[0].Type);
		}

		if (memoryBlock) {
			return partitions.some(
				p => p.baseBlock.Name === memoryBlock.Name
			);
		}

		return false;
	}, [partitions, memoryBlocks, memoryBlock]);

	const renderSingleBlockPartitions = () =>
		memoryBlock &&
		getPartitionsInBlock(partitions, memoryBlock)?.map(partition => (
			<div
				key={partition.displayName}
				className={
					partition.projects.length === 1
						? styles.partition
						: styles.hashedPartition
				}
				style={getSingleBlockPartitionStyle(partition, memoryBlock)}
			/>
		));

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
				</div>
			);
		});

	const renderMultiBlockPartitions = () =>
		memoryBlocks &&
		getPartitionsByType(memoryBlocks, partitions).map(
			(partition, i, allPartitions) => (
				<React.Fragment key={partition.displayName}>
					<div
						className={getPartitionClasses(
							partition,
							i,
							allPartitions.length
						)}
						style={getMultiBlockPartitionStyle(
							partition,
							memoryBlocks
						)}
						data-test={`${dataTest}-multiblock-${partition.displayName}`}
						onMouseEnter={e => {
							onPartitionHover(e, partition);
						}}
						onMouseLeave={handleMouseLeave}
						onClick={handlePartitionClick}
					/>
					{isHovering && partition === hoveredPartition && (
						<MemoryGraphTooltip
							position={graphMousePosition.current}
							partition={hoveredPartition}
						/>
					)}
				</React.Fragment>
			)
		);

	return (
		<div
			className={`${styles.container} ${hasPartitions ? styles.highlighted : ''}`}
			data-test={dataTest}
		>
			<div className={styles.section}>
				{renderSingleBlockPartitions()}
				{renderMemoryBlocksWithGaps()}
				{renderMultiBlockPartitions()}
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
	const size = end - start;

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
		const width = ((gapEnd - gapStart) / size) * 100;
		gaps.push({address: gapStart, offset, endAddress: gapEnd, width});
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

const getPartitionsByType = (
	memoryBlocks: MemoryBlock[],
	partitions: Partition[]
): Partition[] =>
	partitions.filter(p => p.type === memoryBlocks[0].Type);

const getMultiBlockPartitionStyle = (
	partition: Partition,
	memoryBlocks: MemoryBlock[]
): React.CSSProperties => {
	const start = parseInt(memoryBlocks[0].AddressStart, 16);
	const end = parseInt(
		memoryBlocks[memoryBlocks.length - 1].AddressEnd,
		16
	);
	let width = calculateMultiBlockPartitionWidth(
		partition,
		memoryBlocks[0].AddressStart,
		memoryBlocks[memoryBlocks.length - 1].AddressEnd
	);
	const offset = calculatePartitionOffset(partition, start, end);

	if (width === 100 && offset > 0) width -= offset;

	return {left: `${offset}%`, width: `${width}%`};
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

const isPartitionReachingEnd = (
	partition: Partition,
	memoryBlocks: MemoryBlock[]
): boolean => {
	const {left, width} = getMultiBlockPartitionStyle(
		partition,
		memoryBlocks
	);

	return (
		parseFloat(left as string) + parseFloat(width as string) >= 100
	);
};

const isPartitionAtStart = (
	partition: Partition,
	memoryBlocks: MemoryBlock[]
): boolean => {
	const {left} = getMultiBlockPartitionStyle(partition, memoryBlocks);

	return parseFloat(left as string) === 0;
};
