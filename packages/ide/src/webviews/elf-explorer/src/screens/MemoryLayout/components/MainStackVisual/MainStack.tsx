/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {useMemo, useRef, useState, type ReactNode} from 'react';

import CfsTooltip from '@common/components/cfs-tooltip/CfsTooltip';
import {SegmentCategory} from '../../../../common/types/memory-layout';
import {
	getStylesForSegment,
	getNextSegment,
	MIN_SIZE_PERCENTAGE
} from '../../../../utils/visual-utils';
import {
	convertBytesToKbOrMb,
	convertDecimalToHex,
	convertHexToDecimal
} from '../../../../utils/number';

import type {
	TSection,
	TSegment
} from '../../../../common/types/memory-layout';
import type {TSymbol} from '../../../../common/types/symbols';
import styles from './MainStack.module.scss';

type TMainStackProps = {
	readonly segments: Array<TSegment | TSection>;
	readonly hoveredItem: TSegment | TSection | TSymbol | undefined;
	readonly hoverSource: 'MemoryTable' | 'MemoryVisual' | undefined;
	readonly emitValue: (segment: TSegment | TSection) => void;
	readonly emitMouseEnter: (
		segment: TSegment | TSection,
		section: 'MemoryVisual'
	) => void;
	readonly emitMouseLeave: () => void;
};

type HoveredPartInfo = {
	readonly id: number;
	readonly name: string;
	readonly size: number;
	readonly start: string;
	readonly end: string;
};

export default function MainStack({
	segments,
	hoveredItem,
	hoverSource,
	emitValue,
	emitMouseEnter,
	emitMouseLeave
}: TMainStackProps) {
	const [hoveredPartInfo, setHoveredPartInfo] = useState<
		HoveredPartInfo | undefined
	>();
	const containerRef = useRef<HTMLLIElement>(null);

	const handleClick = (segment: TSegment | TSection) => {
		const segm = segment as TSegment;
		if (segm?.category === SegmentCategory.UNUSED) return;

		emitValue(segment);
	};

	const handleMouseEnter = (
		segment: TSegment | TSection,
		section: 'MemoryVisual'
	) => {
		const segm = segment as TSegment;
		let endAddress: number | string = '';

		if (segm.category === SegmentCategory.UNUSED) {
			const nextSegm = getNextSegment(
				segments as TSegment[],
				segm.id
			);

			endAddress = nextSegm
				? convertHexToDecimal(nextSegm?.address)
				: '';
		} else {
			endAddress =
				convertHexToDecimal(segment.address) + segment.size;
		}

		setHoveredPartInfo({
			id: segm.id,
			name:
				segm.category === SegmentCategory.UNUSED
					? 'Unused space'
					: segm.label,
			size: segm.size,
			start: segm.address,
			end: convertDecimalToHex(endAddress as number)
		});

		emitMouseEnter(segment, section);
	};

	const isSegmToBeHighlighted = (segment: TSegment) =>
		segment.id === hoveredItem?.id && hoverSource === 'MemoryTable';

	const applyStylingBasedOnCategory = (segment: TSegment) => {
		if (segment.category === SegmentCategory.UNUSED)
			return styles.unused;

		return segment.showAsReadOnly
			? styles.read
			: styles['read-write-exec'];
	};

	const getCssClasses = (segment: TSegment): string => `
		${styles.segment}
		${applyStylingBasedOnCategory(segment)}
		${isSegmToBeHighlighted(segment) ? styles.highlight : ''}
	`;

	const displayAddress = (segment: TSegment) =>
		segment.category !== SegmentCategory.UNUSED && (
			<div
				className={`${styles.address} ${isSegmToBeHighlighted(segment) ? styles.highlight : ''}`}
			>
				{segment?.address}
			</div>
		);

	const displayDetails = (
		segment: TSegment | TSection
	): ReactNode => {
		const segm = segment as TSegment;
		if (segm.category === SegmentCategory.UNUSED) return '';

		if (
			segment.sizePercentage &&
			segment.sizePercentage >= MIN_SIZE_PERCENTAGE
		) {
			return (
				<div className={styles.description}>
					<h2
						className={`
						${styles.name}
						${isSegmToBeHighlighted(segment as TSegment) ? styles.active : ''}
					`}
					>
						{segment?.label}
					</h2>
					<div
						className={`
						${styles.size}
						${isSegmToBeHighlighted(segment as TSegment) ? styles.active : ''}
					`}
					>
						{convertBytesToKbOrMb(segment.size)}
					</div>
				</div>
			);
		}

		return '';
	};

	const setTooltip = useMemo(() => {
		if (!hoveredPartInfo) return null;

		const hoveredNode = document.getElementById(
			hoveredPartInfo.id.toString()
		);
		const segment = segments.find(
			(segm: TSegment | TSection) => segm.id === hoveredPartInfo.id
		) as TSegment;

		const {top: containerTop = 0, bottom: containerBottom = 0} =
			containerRef.current?.getBoundingClientRect() ?? {};

		const {
			top: nodeTop = 0,
			bottom: nodeBottom = 0,
			height: nodeHeight = 0
		} = hoveredNode?.getBoundingClientRect() ?? {};

		const viewportHeight = window.innerHeight;

		const gap = 4;
		let bottom;
		let top;
		const left = 150;

		if (viewportHeight < nodeBottom + gap + 150) {
			bottom = nodeBottom - containerBottom - nodeHeight - gap;
		} else {
			top = nodeTop - containerTop + nodeHeight + gap;
		}

		return (
			<CfsTooltip
				id={hoveredPartInfo.id.toString()}
				header={hoveredPartInfo.name}
				top={top}
				left={left}
				bottom={bottom}
			>
				<div className={styles['tooltip-container']}>
					<div className={styles['tooltip-row']}>
						<div className={styles.start}>START ADDRESS</div>
						<div className={styles.end}>{hoveredPartInfo.start}</div>
					</div>
					<div className={styles['tooltip-row']}>
						<div className={styles.start}>END ADDRESS</div>
						<div className={styles.end}>{hoveredPartInfo.end}</div>
					</div>
					{segment?.category !== SegmentCategory.UNUSED && (
						<div className={styles['tooltip-row']}>
							<div className={styles.start}>SIZE</div>
							<div
								className={styles.end}
							>{`${hoveredPartInfo.size} bytes`}</div>
						</div>
					)}
				</div>
			</CfsTooltip>
		);
	}, [hoveredPartInfo, segments]);

	return (
		<>
			{segments.map((segment: TSegment | TSection) => (
				<li
					ref={containerRef}
					key={segment.id}
					data-test={`main-stack:item:${segment.label}-${segment.id}`}
					id={segment.id.toString()}
					className={getCssClasses(segment as TSegment)}
					style={getStylesForSegment(segment as TSegment)}
					onClick={() => {
						handleClick(segment);
					}}
					onMouseEnter={() => {
						handleMouseEnter(segment, 'MemoryVisual');
					}}
					onMouseLeave={() => {
						emitMouseLeave();
						setHoveredPartInfo(undefined);
					}}
				>
					<div className={styles.container}>
						{displayDetails(segment)}
						{displayAddress(segment as TSegment)}
					</div>
				</li>
			))}
			{hoveredPartInfo && <div>{setTooltip}</div>}
		</>
	);
}
