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
import {useMemo, useRef, useState} from 'react';

import CfsTooltip from '@common/components/cfs-tooltip/CfsTooltip';
import {
	getStylesForSegment,
	isSegmReadOnly
} from '../../../../utils/visual-utils';
import {
	convertDecimalToHex,
	convertHexToDecimal
} from '../../../../utils/number';

import {
	type TSection,
	type TSegment
} from '../../../../common/types/memory-layout';
import type {TSymbol} from '../../../../common/types/symbols';
import styles from './OverlappingStacks.module.scss';

type TOverlappingStacksProps = {
	readonly segments: TSegment[] | TSection[];
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

export default function OverlappingStacks({
	segments,
	hoveredItem,
	hoverSource,
	emitValue,
	emitMouseEnter,
	emitMouseLeave
}: TOverlappingStacksProps) {
	const [hoveredPartInfo, setHoveredPartInfo] = useState<
		HoveredPartInfo | undefined
	>();
	const containerRef = useRef<HTMLLIElement>(null);

	const handleClick = (segment: TSegment | TSection) => {
		emitValue(segment);
	};

	const handleMouseEnter = (
		segment: TSegment | TSection,
		section: 'MemoryVisual'
	) => {
		const segm = segment as TSegment;
		let endAddress: number | string = '';

		endAddress = convertHexToDecimal(segment.address) + segment.size;

		setHoveredPartInfo({
			id: segm.id,
			name: segm.label,
			size: segm.size,
			start: segm.address,
			end: convertDecimalToHex(endAddress)
		});

		emitMouseEnter(segment, section);
	};

	const setTooltip = useMemo(() => {
		if (!hoveredPartInfo) return null;

		const hoveredNode = document.getElementById(
			hoveredPartInfo.id.toString()
		);

		const {top: containerTop = 0, left: containerLeft = 0} =
			containerRef.current?.getBoundingClientRect() ?? {};

		const {left: nodeLeft = 0, top: nodeTop = 0} =
			hoveredNode?.getBoundingClientRect() ?? {};

		const top: number | undefined = nodeTop - containerTop - 100;
		const left = nodeLeft - containerLeft - 530;

		return (
			<CfsTooltip
				id={hoveredPartInfo.id.toString()}
				header={hoveredPartInfo.name}
				top={top}
				left={left}
				bottom={undefined}
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
					<div className={styles['tooltip-row']}>
						<div className={styles.start}>SIZE</div>
						<div
							className={styles.end}
						>{`${hoveredPartInfo.size} bytes`}</div>
					</div>
				</div>
			</CfsTooltip>
		);
	}, [hoveredPartInfo]);

	const isSegmToBeHighlighted = (segment: TSegment) =>
		segment.id === hoveredItem?.id && hoverSource === 'MemoryTable';

	const getCssClasses = (segment: TSegment) => `
		${styles.segment}
		${isSegmReadOnly(segment) ? styles.read : styles['read-write-exec']}
		${isSegmToBeHighlighted(segment) ? styles.active : ''}
	`;

	return (
		<>
			{segments.map(segment => (
				<li
					key={segment.id}
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
						<div
							className={`${styles.address} ${isSegmToBeHighlighted(segment as TSegment) ? styles.active : ''} `}
						>
							{segment.address}
						</div>
					</div>
				</li>
			))}
			{hoveredPartInfo && <div>{setTooltip}</div>}
		</>
	);
}
