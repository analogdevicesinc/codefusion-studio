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

import {memo, useCallback, useEffect, useMemo, useRef} from 'react';
import throttle from 'lodash.throttle';
import type {
	DragState,
	DataZoom,
	DragType
} from '../../../common/types/timeline';

import styles from './timeline-diagram.module.scss';

type TimelineSliderProps = Readonly<{
	min: number;
	max: number;
	start: number;
	end: number;
	onDataZoomChange: (dataZoom: DataZoom) => void;
}>;

function TimelineSlider({
	min,
	max,
	start,
	end,
	onDataZoomChange
}: TimelineSliderProps) {
	const sliderRef = useRef<HTMLDivElement>(null);
	const dragStateRef = useRef<DragState>({
		type: undefined,
		initialClientX: 0,
		initialStart: 0,
		initialEnd: 0,
		windowSize: 0,
		sliderRectWidth: 1,
		active: false
	});

	const emitDataZoom = useMemo(
		() =>
			throttle(
				(dataZoom: DataZoom) => {
					onDataZoomChange(dataZoom);
				},
				20,
				{leading: true, trailing: true}
			),
		[onDataZoomChange]
	);

	const handleMouseMove = useCallback(
		(ev: MouseEvent) => {
			const dragState = dragStateRef.current;
			if (!dragState.active || dragState.type === undefined) return;

			const deltaPx = ev.clientX - dragState.initialClientX;
			const deltaValue =
				(deltaPx / dragState.sliderRectWidth) * (max - min);

			let newStart = dragState.initialStart;
			let newEnd = dragState.initialEnd;

			if (dragState.type === 'left') {
				newStart = Math.min(
					dragState.initialEnd - 1,
					Math.max(min, dragState.initialStart + deltaValue)
				);
			} else if (dragState.type === 'right') {
				newEnd = Math.max(
					dragState.initialStart + 1,
					Math.min(max, dragState.initialEnd + deltaValue)
				);
			} else if (dragState.type === 'range') {
				let candidateStart = dragState.initialStart + deltaValue;
				let candidateEnd = candidateStart + dragState.windowSize;

				if (candidateStart < min) {
					candidateStart = min;
					candidateEnd = candidateStart + dragState.windowSize;
				}

				if (candidateEnd > max) {
					candidateEnd = max;
					candidateStart = candidateEnd - dragState.windowSize;
				}

				newStart = candidateStart;
				newEnd = candidateEnd;
			}

			emitDataZoom({start: newStart, end: newEnd});
		},
		[max, min, emitDataZoom]
	);

	const cleanupDrag = useCallback(() => {
		if (!dragStateRef.current.active) return;

		dragStateRef.current.active = false;
		dragStateRef.current.type = undefined;

		document.body.classList.remove('timeline-handle-ew-resize');
		document.body.classList.remove('timeline-range-grabbing');

		emitDataZoom.flush();
		emitDataZoom.cancel();

		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', cleanupDrag);
		document.removeEventListener('pointerleave', cleanupDrag);
	}, [handleMouseMove, emitDataZoom]);

	const handleMouseDown = useCallback(
		(
			e: React.MouseEvent<HTMLDivElement>,
			type: Exclude<DragType, undefined>
		) => {
			if (!sliderRef.current) return;

			cleanupDrag();
			e.preventDefault();
			e.stopPropagation();

			const rect = sliderRef.current.getBoundingClientRect();
			dragStateRef.current = {
				type,
				initialClientX: e.clientX,
				initialStart: start,
				initialEnd: end,
				windowSize: end - start,
				sliderRectWidth: rect.width || 1,
				active: true
			};

			if (type === 'left' || type === 'right')
				document.body.classList.add('timeline-handle-ew-resize');
			if ((start !== 0 || end !== 100) && type === 'range')
				document.body.classList.add('timeline-range-grabbing');

			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', cleanupDrag);
			document.addEventListener('pointerleave', cleanupDrag);
		},
		[start, end, handleMouseMove, cleanupDrag]
	);

	const setOffset = useMemo(
		() => () => {
			if (start === 0) return Number(start - 0.2);

			return start;
		},
		[start]
	);

	const setWidth = useMemo(
		() => () => {
			if (start === 0 && end === 100)
				return Number(end + 0.2) - start;

			return end - start;
		},
		[start, end]
	);

	// Cancel on unmount to avoid dangling timeouts
	useEffect(
		() => () => {
			emitDataZoom.cancel();
		},
		[emitDataZoom]
	);

	return (
		<div
			ref={sliderRef}
			className={styles.timelineSliderContainer}
			data-test='timeline-diagram:footer:slider'
		>
			<div
				className={styles.range}
				data-test='timeline-diagram:footer:slider:range'
				style={{
					left: setOffset() + '%',
					width: setWidth() + '%'
				}}
			>
				<div
					className={styles.handle}
					onMouseDown={e => {
						handleMouseDown(e, 'left');
					}}
				/>
				<div className={styles.inner}>
					<div
						className={`${styles.middle} ${start === 0 && end === 100 ? '' : styles.cursorGrab}`}
						onMouseDown={e => {
							handleMouseDown(e, 'range');
						}}
					/>
				</div>
				<div
					className={styles.handle}
					onMouseDown={e => {
						handleMouseDown(e, 'right');
					}}
				/>
			</div>
		</div>
	);
}

export default memo(TimelineSlider);
