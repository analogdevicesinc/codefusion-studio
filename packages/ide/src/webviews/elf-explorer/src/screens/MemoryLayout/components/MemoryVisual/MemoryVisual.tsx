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
import {useEffect, useState} from 'react';

import MainStack from '../MainStackVisual/MainStack';
import OverlappingStacks from '../OverlappingStacksVisual/OverlappingStacks';
import MemoryVisualFooter from '../MemoryVisualFooter/MemoryVisualFooter';
import NoData from '../../../../components/NoData/NoData';

import {
	calculateSegments,
	removeItemsWithoutSize
} from '../../../../utils/visual-utils';
import type {
	TSegment,
	TSection
} from '../../../../common/types/memory-layout';
import type {TSymbol} from '../../../../common/types/symbols';
import styles from './MemoryVisual.module.scss';

type TMemoryVisualProps = {
	readonly testId?: string;
	readonly segments: Array<TSegment | TSection>;
	readonly hoveredItem: TSegment | TSection | TSymbol | undefined;
	readonly hoverSource: 'MemoryTable' | 'MemoryVisual' | undefined;
	readonly onClick: (segment: TSegment | TSection) => void;
	readonly onHover: (
		data: TSymbol,
		source: 'MemoryTable' | 'MemoryVisual'
	) => void;
	readonly onMouseLeave: () => void;
};

export default function MemoryVisual({
	testId,
	segments,
	hoveredItem,
	hoverSource,
	onClick,
	onHover,
	onMouseLeave
}: TMemoryVisualProps) {
	const [computedSegments, setComputedSegments] = useState<
		TSegment[][] | TSection[][]
	>();

	useEffect(() => {
		let clonedSegments: TSegment[] = JSON.parse(
			JSON.stringify(segments)
		);
		clonedSegments = removeItemsWithoutSize(clonedSegments);

		setComputedSegments(
			clonedSegments.length ? calculateSegments(clonedSegments) : []
		);
	}, [segments]);

	const handleOnClick = (segment: TSegment | TSection) => {
		onClick(segment);
	};

	const handleMouseEnter = (
		segment: TSegment | TSection,
		section: 'MemoryVisual'
	) => {
		onHover(segment, section);
	};

	const isLengthAndSegmWithSize = (
		segments: Array<TSegment | TSection>
	): boolean => {
		const segmWithSizeZero = segments.filter(
			(segm): segm is TSegment => (segm as TSegment).size === 0
		);

		if (!segments.length) return false;

		if (
			segments.length &&
			segments.length === 1 &&
			segmWithSizeZero.length
		) {
			return false;
		}

		return true;
	};

	const getList = (stack: TSegment[] | TSection[], index: number) => (
		<ul
			key={`list-${index}`}
			className={
				index === 0
					? styles['main-stack']
					: styles['overlapping-stacks']
			}
		>
			{index === 0 && (
				<MainStack
					segments={stack}
					hoveredItem={hoveredItem}
					hoverSource={hoverSource}
					emitValue={handleOnClick}
					emitMouseEnter={handleMouseEnter}
					emitMouseLeave={onMouseLeave}
				/>
			)}
			{index !== 0 && (
				<OverlappingStacks
					segments={stack}
					hoveredItem={hoveredItem}
					hoverSource={hoverSource}
					emitValue={handleOnClick}
					emitMouseEnter={handleMouseEnter}
					emitMouseLeave={onMouseLeave}
				/>
			)}
		</ul>
	);

	const displaySegments = () => (
		<section
			className={styles.container}
			data-test={`memory-layout:visual-container:${testId}`}
		>
			<div className={styles['visual-container']}>
				{/* first in list are always the main stack segments */}
				{computedSegments?.map((stackOfSegments, index) =>
					getList(stackOfSegments, index)
				)}
			</div>
			<MemoryVisualFooter />
		</section>
	);

	return (
		// eslint-disable-next-line react/jsx-no-useless-fragment
		<>
			{isLengthAndSegmWithSize(segments) ? (
				displaySegments()
			) : (
				<NoData content='No visual representation available.' />
			)}
		</>
	);
}
