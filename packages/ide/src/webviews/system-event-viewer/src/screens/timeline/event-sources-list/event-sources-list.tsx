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
	forwardRef,
	useImperativeHandle
} from 'react';
import type {
	EventSourcesListHandle,
	RowStateUpdate
} from '../../../common/types/timeline';
import type {
	SevEventSource,
	MenuAction
} from '../../../common/types/events';

import EmptyBlockItem from './empty-block-item';
import {setListWidthProperty} from '../../../common/utils/events';
import {
	TIMELINE_LIST_MIN_WIDTH as MIN_WIDTH,
	TIMELINE_LIST_DEFAULT_WIDTH as DEFAULT_WIDTH,
	TIMELINE_DIAGRAM_MIN_WIDTH as DIAGRAM_MIN_WIDTH,
	EV_SOURCES_LIST_CONTENT_ID as CONTENT_LIST_ID
} from '../../../common/constants/timeline';
import {MENU_ACTION as ACTION} from '../../../common/constants/events';

import EventSourceItem from './event-source-item';

import styles from './event-sources-list.module.scss';

type EventSourcesProps = Readonly<{
	diagramContainerRef: React.RefObject<HTMLDivElement>;
	events: SevEventSource[];
	onDragEndSignal: () => void;
	onReorder: (orderedList: SevEventSource[]) => void;
	onRowStateChange: (update: RowStateUpdate) => void;
	onBeginDragOverlay: (
		evSource: SevEventSource,
		e: React.DragEvent
	) => void;
}>;

const EventSourcesList = forwardRef<
	EventSourcesListHandle,
	EventSourcesProps
>(
	(
		{
			diagramContainerRef: containerRef,
			events,
			onDragEndSignal,
			onReorder,
			onRowStateChange,
			onBeginDragOverlay
		},
		ref
	) => {
		const [draggedItem, setDraggedItem] = useState<number>();
		const [localEvents, setLocalEvents] = useState(events);
		const [width, setWidth] = useState(DEFAULT_WIDTH);
		const isResizing = useRef(false);
		const resizerRef = useRef<HTMLDivElement>(null);
		// Used to prevent setting draggedItem state if drag is cancelled before the next frame
		// also avoids scenarios where a drag-enter reorder can happen before that first visual drag state update
		const dragStartRafRef = useRef<number | undefined>();
		// Source-of-truth for the dragged item's CURRENT index in the live-reordered list.
		// used for accuracy since draggedItem state may be stale on fast drags and reorders.
		const currentDragIndexRef = useRef<number | undefined>();

		const reorder = useCallback(
			(list: SevEventSource[], from: number, to: number) => {
				if (from === to) return list;

				const copy = [...list];
				const [removed] = copy.splice(from, 1);
				copy.splice(to, 0, removed);

				return copy;
			},
			[]
		);

		const clearDragItems = useCallback(() => {
			if (dragStartRafRef.current !== undefined) {
				cancelAnimationFrame(dragStartRafRef.current);
				dragStartRafRef.current = undefined;
			}

			currentDragIndexRef.current = undefined;
			setDraggedItem(undefined);
		}, []);

		const commitDraggedReorder = useCallback(() => {
			if (draggedItem !== undefined) onReorder(localEvents);

			clearDragItems();
		}, [clearDragItems, draggedItem, localEvents, onReorder]);

		// List container component decides to commit or cancel
		// This list only exposes actions and keeps local state in sync.
		useImperativeHandle(
			ref,
			() => ({
				commitDraggedReorder,
				cancelDraggedReorder: clearDragItems
			}),
			[clearDragItems, commitDraggedReorder]
		);

		const handleDragStart = useCallback(
			(index: number, e: React.DragEvent) => {
				currentDragIndexRef.current = index;
				onBeginDragOverlay(localEvents[index], e);

				dragStartRafRef.current = requestAnimationFrame(() => {
					dragStartRafRef.current = undefined;
					setDraggedItem(currentDragIndexRef.current);
				});
			},
			[onBeginDragOverlay, localEvents]
		);

		const handleDragEnter = useCallback(
			(index: number) => {
				const from = currentDragIndexRef.current;

				if (from === undefined || from === index) return;

				currentDragIndexRef.current = index;

				setLocalEvents(prev => reorder(prev, from, index));
				setDraggedItem(index);
			},
			[reorder]
		);

		const handleDragOver = useCallback((e: React.DragEvent) => {
			e.preventDefault();
		}, []);

		const handleDragEnd = useCallback(() => {
			onDragEndSignal();
		}, [onDragEndSignal]);

		const handleOptionSelect = useCallback(
			(action: MenuAction, index: number) => {
				setLocalEvents(prev => {
					let newIndex = index;

					switch (action) {
						case ACTION.top:
							newIndex = 0;
							break;
						case ACTION.up:
							newIndex = Math.max(0, index - 1);
							break;
						case ACTION.down:
							newIndex = Math.min(prev.length - 1, index + 1);
							break;
						case ACTION.bottom:
							newIndex = prev.length - 1;
							break;
						default:
							return prev;
					}

					if (newIndex === index) return prev;

					const orderedList = reorder(prev, index, newIndex);
					onReorder(orderedList);

					return orderedList;
				});
			},
			[reorder, onReorder]
		);

		const renderList = useMemo(
			() =>
				localEvents.map((evSource, index) => (
					<EventSourceItem
						key={evSource.id}
						index={index}
						totalLength={localEvents.length}
						name={evSource.name}
						isDragged={draggedItem === index}
						isResizingRef={isResizing}
						onRowStateChange={onRowStateChange}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragEnter={handleDragEnter}
						onDragEnd={handleDragEnd}
						onOptionSelect={handleOptionSelect}
					/>
				)),
			[
				localEvents,
				draggedItem,
				onRowStateChange,
				handleDragStart,
				handleDragOver,
				handleDragEnter,
				handleDragEnd,
				handleOptionSelect
			]
		);

		const handleMouseMove = useCallback(
			(ev: MouseEvent) => {
				if (!isResizing.current) return;

				const containerWidth =
					containerRef.current?.getBoundingClientRect().width ?? 0;
				const maxAllowedWidth = containerWidth - DIAGRAM_MIN_WIDTH;

				setWidth(prev => {
					const newWidth = Math.min(
						maxAllowedWidth,
						Math.max(MIN_WIDTH, prev + ev.movementX)
					);

					const host = containerRef.current?.parentElement;
					if (host) setListWidthProperty(host, newWidth);

					return newWidth;
				});
			},
			[containerRef]
		);

		const handleMouseUp = useCallback(() => {
			isResizing.current = false;
			resizerRef.current?.classList.remove(styles.active as string);
			document.body.classList.remove('ev-sources-list-resizing');

			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
		}, [handleMouseMove, resizerRef]);

		const startResize = useCallback(() => {
			isResizing.current = true;
			resizerRef.current?.classList.add(styles.active as string);
			document.body.classList.add('ev-sources-list-resizing');

			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
		}, [handleMouseMove, handleMouseUp]);

		useEffect(() => {
			setLocalEvents(events);
		}, [events]);

		useEffect(
			() => () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('mouseup', handleMouseUp);

				resizerRef.current?.classList.remove(styles.active as string);
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

					if (elem.parentElement) {
						setListWidthProperty(elem.parentElement, newWidth);
					}

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

			const onWindowResize = () => {
				if (frameId) cancelAnimationFrame(frameId);

				frameId = requestAnimationFrame(() => {
					recompute(elem.getBoundingClientRect().width);
				});
			};

			window.addEventListener('resize', onWindowResize);

			return () => {
				observer.disconnect();
				window.removeEventListener('resize', onWindowResize);

				if (frameId) cancelAnimationFrame(frameId);
			};
		}, [containerRef]);

		return (
			<div
				className={styles.listContainer}
				style={{width}}
				data-test='event-sources:container'
			>
				<section style={{width}}>
					<EmptyBlockItem />
					<ul
						className={styles.list}
						id={CONTENT_LIST_ID}
						data-test='event-sources:list'
					>
						{renderList}
					</ul>
				</section>

				<div
					ref={resizerRef}
					className={styles.resizer}
					onMouseDown={startResize}
				/>
			</div>
		);
	}
);

export default memo(EventSourcesList);
