/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {
	useState,
	useEffect,
	useMemo,
	useCallback,
	memo,
	useRef,
	useLayoutEffect
} from 'react';
import {ROW_SELECTOR} from '../../../common/constants/events';
import type {
	DragOverlayRow,
	RowStateUpdate
} from '../../../common/types/timeline';
import type {
	EventSourceMoveIntent,
	TimelineRow,
	MenuAction
} from '../../../common/types/events';

import EventSourceGroup from './event-source-group';
import EventSourceItemContainer from './event-source-item-container';
import {setListWidthProperty} from '../../../common/utils/events';
import {
	TIMELINE_LIST_MIN_WIDTH as MIN_WIDTH,
	TIMELINE_LIST_DEFAULT_WIDTH as DEFAULT_WIDTH,
	TIMELINE_DIAGRAM_MIN_WIDTH as DIAGRAM_MIN_WIDTH,
	EV_SOURCES_LIST_CONTENT_ID as CONTENT_LIST_ID
} from '../../../common/constants/timeline';
import styles from './event-sources-list.module.scss';

type EventSourcesProps = Readonly<{
	diagramContainerRef: React.RefObject<HTMLDivElement>;
	rows: TimelineRow[];
	listWidth?: number;
	isDraggingRef: React.MutableRefObject<boolean>;
	onWidthChange?: (width: number) => void;
	onMoveNode: (nodeId: string, intent: EventSourceMoveIntent) => void;
	onRenameGroup: (groupId: string, groupName: string) => void;
	onRowStateChange: (update: RowStateUpdate) => void;
	onToggleGroup: (groupId: string) => void;
	onStartDrag: (
		row: DragOverlayRow,
		ev: PointerEvent,
		rowIndex: number
	) => void;
}>;

/**
 * Pure presentational list of event sources.
 * This component keeps no internal drag state and re-renders only when the `events` prop
 * or the list width change.
 */
function EventSourcesList({
	diagramContainerRef: containerRef,
	rows,
	isDraggingRef,
	onMoveNode,
	onRenameGroup,
	onRowStateChange,
	onToggleGroup,
	onStartDrag,
	listWidth = DEFAULT_WIDTH,
	onWidthChange
}: EventSourcesProps) {
	const [width, setWidth] = useState(listWidth);
	const isResizing = useRef(false);
	const resizerRef = useRef<HTMLDivElement>(null);

	const handlePointerDown = useCallback(
		(index: number, ev: React.PointerEvent<HTMLSpanElement>) => {
			// Only respond to left click
			if (ev.button !== 0) return;

			const row = rows[index];

			if (!row) return;

			const rowElement =
				ev.currentTarget.closest<HTMLElement>(ROW_SELECTOR);
			const rowHeight =
				rowElement?.getBoundingClientRect().height ?? 0;

			onStartDrag(
				{
					id: row.id,
					name: row.type === 'group' ? row.name : row.sourceName,
					height: rowHeight
				},
				ev.nativeEvent,
				index
			);
		},
		[onStartDrag, rows]
	);

	const handleMenuOptionSelect = useCallback(
		(action: MenuAction, index: number) => {
			const row = rows[index];

			if (row) {
				onMoveNode(row.id, {type: 'menu', action});
			}
		},
		[onMoveNode, rows]
	);

	const renderTree = useMemo(
		() =>
			rows.map((row, index) =>
				row.type === 'group' ? (
					<EventSourceGroup
						key={row.id}
						row={row}
						rowIndex={index}
						isResizingRef={isResizing}
						isDraggingRef={isDraggingRef}
						onRowStateChange={onRowStateChange}
						onPointerDown={handlePointerDown}
						onToggle={() => {
							onToggleGroup(row.id);
						}}
						onRenameGroup={onRenameGroup}
						onMenuOptionSelect={handleMenuOptionSelect}
					/>
				) : (
					<EventSourceItemContainer
						key={row.id}
						row={row}
						rowIndex={index}
						isResizingRef={isResizing}
						isDraggingRef={isDraggingRef}
						onRowStateChange={onRowStateChange}
						onPointerDown={handlePointerDown}
						onMenuOptionSelect={handleMenuOptionSelect}
					/>
				)
			),
		[
			rows,
			isDraggingRef,
			onRowStateChange,
			handlePointerDown,
			handleMenuOptionSelect,
			onRenameGroup,
			onToggleGroup
		]
	);

	const handleMouseMove = useCallback(
		(ev: MouseEvent) => {
			if (!isResizing.current) return;

			const containerWidth =
				containerRef.current?.getBoundingClientRect().width ?? 0;
			const maxAllowedWidth = Math.max(
				MIN_WIDTH,
				containerWidth - DIAGRAM_MIN_WIDTH
			);

			setWidth(prev => {
				const newWidth = Math.min(
					maxAllowedWidth,
					Math.max(MIN_WIDTH, prev + ev.movementX)
				);

				return newWidth;
			});
		},
		[containerRef]
	);

	useLayoutEffect(() => {
		onWidthChange?.(width);
	}, [onWidthChange, width]);

	useEffect(() => {
		const host = containerRef.current?.parentElement;
		if (host) setListWidthProperty(host, width);
	}, [containerRef, width]);

	const handleMouseUp = useCallback(() => {
		isResizing.current = false;
		resizerRef.current?.classList.remove(styles.active as string);
		document.body.classList.remove('ev-sources-list-resizing');

		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
	}, [handleMouseMove]);

	const startResize = useCallback(() => {
		isResizing.current = true;
		resizerRef.current?.classList.add(styles.active as string);
		document.body.classList.add('ev-sources-list-resizing');

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	}, [handleMouseMove, handleMouseUp]);

	useEffect(
		() => () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);

			resizerRef.current?.classList.remove(styles.active as string);
			document.body.classList.remove('ev-sources-list-resizing');
		},
		[handleMouseMove, handleMouseUp]
	);

	// The purpose of this effect is to recompute the list width
	// whenever the window resizes to ensure that the diagram minimum width is respected
	useEffect(() => {
		const elem = containerRef.current;
		if (!elem) return;

		let frameId: number;

		const recompute = (containerWidth: number) => {
			const maxAllowedWidth = Math.max(
				MIN_WIDTH,
				containerWidth - DIAGRAM_MIN_WIDTH
			);

			setWidth(prev => {
				const newWidth = Math.min(prev, maxAllowedWidth);

				return newWidth;
			});
		};

		const observer = new ResizeObserver(entries => {
			const {contentRect} = entries[0];
			if (frameId) cancelAnimationFrame(frameId);

			frameId = requestAnimationFrame(() => {
				recompute(contentRect.width);
			});
		});
		observer.observe(elem);

		const handleWindowResize = () => {
			if (frameId) cancelAnimationFrame(frameId);

			frameId = requestAnimationFrame(() => {
				recompute(elem.getBoundingClientRect().width);
			});
		};

		window.addEventListener('resize', handleWindowResize);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', handleWindowResize);

			if (frameId) cancelAnimationFrame(frameId);
		};
	}, [containerRef]);

	return (
		<div
			className={styles.listContainer}
			style={{width}}
			data-test='event-sources:container'
		>
			<section className={styles.listContent}>
				<div className={styles.emptyBlock} />

				<ul
					className={styles.list}
					id={CONTENT_LIST_ID}
					data-test='event-sources:list'
				>
					{renderTree}
				</ul>
			</section>

			<div
				ref={resizerRef}
				className={styles.resizer}
				data-test='event-sources:resizer'
				onMouseDown={startResize}
			/>
		</div>
	);
}

export default memo(EventSourcesList);
