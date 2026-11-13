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
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState
} from 'react';

import {
	getChartSnapshot,
	clearDropFeedback,
	refreshDropFeedback,
	resolveDropTarget,
	clearAllRowDragged,
	removeDragCSSClass,
	computeAutoScrollVelocity,
	shouldStopAutoScrollAtBoundary,
	getNextAutoScrollTop
} from '../utils/timeline-diagram';
import {
	DRAG_OFFSET_X,
	DROP_ZONE,
	TIMELINE_DRAG_ACTIVE,
	TIMELINE_DRAG_OUTSIDE
} from '../constants/timeline';

import type {DragOverlayRow, DropOutcome} from '../types/timeline';
import type {TimelineRow} from '../types/events';

type CardOverlay = Readonly<{
	visible: boolean;
	x: number;
	y: number;
	containerTop: number;
	containerLeft: number;
	containerHeight: number;
	containerWidth: number;
	listWidth: number;
	rowHeight: number;
	name: string;
	chartImageSrc?: string;
	chartImageWidth: number;
}>;

const initial: CardOverlay = {
	visible: false,
	x: 0,
	y: 0,
	containerTop: 0,
	containerLeft: 0,
	containerHeight: 0,
	containerWidth: 0,
	listWidth: 0,
	rowHeight: 0,
	name: '',
	chartImageSrc: undefined,
	chartImageWidth: 0
};

type UseFloatingCardOverlayReturn = Readonly<{
	cardOverlay: CardOverlay;
	startDrag: (row: DragOverlayRow, e: PointerEvent) => void;
	isDraggingRef: React.MutableRefObject<boolean>;
}>;

/** Manages drag feedback and commits the destination resolved from visible rows. */
export function useFloatingCardOverlay(
	diagramContainerRef: React.RefObject<HTMLDivElement>,
	dropIndicatorRef: React.RefObject<HTMLDivElement>,
	rows: readonly TimelineRow[],
	listWidth: number,
	onDragFinalize: (outcome: DropOutcome) => void
): UseFloatingCardOverlayReturn {
	const [cardOverlay, setCardOverlay] =
		useState<CardOverlay>(initial);
	const activeDragCleanupRef = useRef<(() => void) | undefined>();
	const activeCancelRef = useRef<(() => void) | undefined>();
	const isDraggingRef = useRef(false);
	const latestCoordsRef = useRef({x: 0, y: 0});
	const latestRowsRef = useRef(rows);

	useLayoutEffect(() => {
		latestRowsRef.current = rows;
	}, [rows]);

	const isPointerInsideDiagram = useCallback(
		(clientX: number, clientY: number) => {
			const rect =
				diagramContainerRef.current?.getBoundingClientRect();

			if (!rect) return false;

			return (
				clientX >= rect.left &&
				clientX <= rect.right &&
				clientY >= rect.top &&
				clientY <= rect.bottom
			);
		},
		[diagramContainerRef]
	);

	const setOutsideCursorClass = useCallback((isOutside: boolean) => {
		document.body.classList.toggle(TIMELINE_DRAG_OUTSIDE, isOutside);
	}, []);

	const cleanupListeners = useCallback(
		({
			handleWindowPointerMove,
			handleWindowPointerUp,
			handleWindowPointerCancel,
			handleWindowBlur,
			handleDiagramScroll
		}: {
			handleWindowPointerMove: (ev: PointerEvent) => void;
			handleWindowPointerUp: (ev: PointerEvent) => void;
			handleWindowPointerCancel: () => void;
			handleWindowBlur: () => void;
			handleDiagramScroll: () => void;
		}) => {
			window.removeEventListener(
				'pointermove',
				handleWindowPointerMove
			);
			window.removeEventListener('pointerup', handleWindowPointerUp);
			window.removeEventListener(
				'pointercancel',
				handleWindowPointerCancel
			);
			window.removeEventListener('blur', handleWindowBlur);
			diagramContainerRef.current?.removeEventListener(
				'scroll',
				handleDiagramScroll
			);
		},
		[diagramContainerRef]
	);

	// Track pointer during drag
	const startDrag = useCallback(
		(row: DragOverlayRow, e: PointerEvent) => {
			const diagramContainer = diagramContainerRef.current;
			const scrollContent =
				dropIndicatorRef.current?.parentElement ?? undefined;

			if (!diagramContainer) return;

			clearDropFeedback(diagramContainerRef, dropIndicatorRef);

			let pendingRafId: number | undefined;
			let autoScrollVelocity = 0;
			let autoScrollRafId: number | undefined;
			latestCoordsRef.current = {x: e.clientX, y: e.clientY};

			activeCancelRef.current?.();
			activeCancelRef.current = undefined;
			activeDragCleanupRef.current?.();
			activeDragCleanupRef.current = undefined;

			const {canvasSrc, canvasWidth} = getChartSnapshot(row.id);
			const safeRowHeight = Math.max(row.height, 1);
			const contentRect = diagramContainer.getBoundingClientRect();

			setCardOverlay({
				visible: true,
				x: e.clientX - contentRect.left - DRAG_OFFSET_X,
				y: e.clientY - contentRect.top,
				containerTop: contentRect?.top ?? 0,
				containerLeft: contentRect?.left ?? 0,
				containerWidth: contentRect?.width ?? 0,
				containerHeight: contentRect?.height ?? 0,
				rowHeight: safeRowHeight,
				listWidth,
				name: row.name,
				chartImageSrc: canvasSrc,
				chartImageWidth: canvasWidth
			});

			document.body.classList.add(TIMELINE_DRAG_ACTIVE);
			isDraggingRef.current = true;
			setOutsideCursorClass(
				!isPointerInsideDiagram(e.clientX, e.clientY)
			);

			let ended = false;
			let handleWindowPointerMove: (ev: PointerEvent) => void = () =>
				undefined;
			let handleWindowPointerUp: (ev: PointerEvent) => void = () =>
				undefined;
			let handleWindowPointerCancel: () => void = () => undefined;
			let handleWindowBlur: () => void = () => undefined;
			let handleDiagramScroll: () => void = () => undefined;

			const cleanupActiveListeners = () => {
				cleanupListeners({
					handleWindowPointerMove,
					handleWindowPointerUp,
					handleWindowPointerCancel,
					handleWindowBlur,
					handleDiagramScroll
				});

				if (activeDragCleanupRef.current === cleanupActiveListeners) {
					activeDragCleanupRef.current = undefined;
				}

				activeCancelRef.current = undefined;
			};

			const cancelPendingRaf = () => {
				if (pendingRafId === undefined) return;

				cancelAnimationFrame(pendingRafId);
				pendingRafId = undefined;
			};

			const stopAutoScrollLoop = () => {
				if (autoScrollRafId === undefined) return;

				cancelAnimationFrame(autoScrollRafId);
				autoScrollRafId = undefined;
			};

			const runAutoScroll = () => {
				if (
					shouldStopAutoScrollAtBoundary(
						autoScrollVelocity,
						diagramContainer,
						scrollContent
					)
				) {
					autoScrollRafId = undefined;

					return;
				}

				const previousScrollTop = diagramContainer.scrollTop;
				diagramContainer.scrollTop = getNextAutoScrollTop(
					autoScrollVelocity,
					diagramContainer,
					scrollContent
				);

				// Stop looping when the container has hit the top
				if (diagramContainer.scrollTop === previousScrollTop) {
					autoScrollRafId = undefined;

					return;
				}

				// Or continue looping if the pointer is still in the target zone
				autoScrollRafId = requestAnimationFrame(runAutoScroll);
			};

			const startAutoScrollLoop = () => {
				if (autoScrollRafId !== undefined) return;

				autoScrollRafId = requestAnimationFrame(runAutoScroll);
			};

			const updateAutoScrollFromPointer = (clientY: number) => {
				autoScrollVelocity = computeAutoScrollVelocity(
					clientY,
					diagramContainer.getBoundingClientRect()
				);

				if (autoScrollVelocity === 0) {
					stopAutoScrollLoop();
				} else {
					startAutoScrollLoop();
				}
			};

			const endDrag = (outcome: DropOutcome) => {
				if (ended) return;

				ended = true;

				clearDropFeedback(diagramContainerRef, dropIndicatorRef);
				cancelPendingRaf();
				stopAutoScrollLoop();
				setCardOverlay(prev => ({...prev, visible: false}));

				removeDragCSSClass();

				isDraggingRef.current = false;
				clearAllRowDragged(diagramContainerRef.current ?? undefined);
				cleanupActiveListeners();
				onDragFinalize(outcome);
			};

			activeCancelRef.current = () => {
				endDrag({zone: DROP_ZONE.OUTSIDE});
			};

			const scheduleRefresh = () => {
				if (pendingRafId !== undefined) return;

				pendingRafId = requestAnimationFrame(() => {
					pendingRafId = undefined;

					refreshDropFeedback(
						latestCoordsRef.current,
						diagramContainerRef,
						dropIndicatorRef,
						{rows: latestRowsRef.current, draggedNodeId: row.id}
					);

					setCardOverlay(prev => {
						const rect =
							diagramContainerRef.current?.getBoundingClientRect();

						if (!rect) return prev;

						const nextX =
							latestCoordsRef.current.x - rect.left - DRAG_OFFSET_X;
						const nextY = latestCoordsRef.current.y - rect.top;

						if (
							!prev.visible ||
							(prev.x === nextX &&
								prev.y === nextY &&
								prev.containerTop === rect.top &&
								prev.containerLeft === rect.left &&
								prev.containerWidth === rect.width &&
								prev.containerHeight === rect.height)
						) {
							return prev;
						}

						return {
							...prev,
							x: nextX,
							y: nextY,
							containerTop: rect.top,
							containerLeft: rect.left,
							containerWidth: rect.width,
							containerHeight: rect.height
						};
					});
				});
			};

			// This is a high-frequency event, keep as cheap as possible
			handleWindowPointerMove = (ev: PointerEvent) => {
				const isInsideDiagram = isPointerInsideDiagram(
					ev.clientX,
					ev.clientY
				);
				setOutsideCursorClass(!isInsideDiagram);

				latestCoordsRef.current = {x: ev.clientX, y: ev.clientY};
				updateAutoScrollFromPointer(ev.clientY);
				scheduleRefresh();
			};

			handleWindowPointerUp = (ev: PointerEvent) => {
				const diagramRoot = diagramContainerRef.current;
				const target =
					diagramRoot &&
					isPointerInsideDiagram(ev.clientX, ev.clientY)
						? resolveDropTarget(
								{x: ev.clientX, y: ev.clientY},
								diagramRoot,
								row.id,
								latestRowsRef.current
							)
						: undefined;

				const outcome = target
					? {
							zone: target.zone,
							targetNodeId: target.targetNodeId
						}
					: {zone: DROP_ZONE.OUTSIDE};

				endDrag(outcome);
			};

			handleWindowPointerCancel = () => {
				endDrag({zone: DROP_ZONE.OUTSIDE});
			};

			handleWindowBlur = () => {
				endDrag({zone: DROP_ZONE.OUTSIDE});
			};

			handleDiagramScroll = () => {
				scheduleRefresh();
			};

			window.addEventListener(
				'pointermove',
				handleWindowPointerMove,
				{passive: true}
			);
			window.addEventListener('pointerup', handleWindowPointerUp);
			window.addEventListener(
				'pointercancel',
				handleWindowPointerCancel
			);
			window.addEventListener('blur', handleWindowBlur);
			// Add a scroll listener to the diagram container to update the drop indicator position
			diagramContainer?.addEventListener(
				'scroll',
				handleDiagramScroll,
				{passive: true}
			);

			activeDragCleanupRef.current = cleanupActiveListeners;
		},
		[
			cleanupListeners,
			diagramContainerRef,
			dropIndicatorRef,
			listWidth,
			isPointerInsideDiagram,
			onDragFinalize,
			setOutsideCursorClass
		]
	);

	useEffect(
		() => () => {
			activeCancelRef.current?.();
			activeCancelRef.current = undefined;
			activeDragCleanupRef.current?.();
			activeDragCleanupRef.current = undefined;
			isDraggingRef.current = false;

			clearDropFeedback(diagramContainerRef, dropIndicatorRef);
			removeDragCSSClass();
		},
		[diagramContainerRef, dropIndicatorRef]
	);

	return {
		cardOverlay,
		startDrag,
		isDraggingRef
	};
}
