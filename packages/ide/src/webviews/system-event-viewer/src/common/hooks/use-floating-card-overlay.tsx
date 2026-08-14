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

import {useCallback, useEffect, useRef, useState} from 'react';

import {
	getListWidth,
	getChartSnapshot
} from '../utils/timeline-diagram';
import {
	TIMELINE_DRAG_ACTIVE,
	TIMELINE_DRAG_OUTSIDE
} from '../constants/timeline';

import type {SevEventSource} from '../types/events';

type CardOverlay = Readonly<{
	visible: boolean;
	y: number;
	containerLeft: number;
	containerWidth: number;
	listWidth: number;
	rowHeight: number;
	name: string;
	chartImageSrc?: string;
	chartImageWidth: number;
}>;

type DragFinalizePayload = Readonly<{
	isInsideDiagram: boolean;
}>;

const initial: CardOverlay = {
	visible: false,
	y: 0,
	containerLeft: 0,
	containerWidth: 0,
	listWidth: 0,
	rowHeight: 0,
	name: '',
	chartImageSrc: undefined,
	chartImageWidth: 0
};

export function useFloatingCardOverlay(
	diagramContainerRef: React.RefObject<HTMLDivElement>,
	onDragFinalize: (payload: DragFinalizePayload) => void
) {
	const [cardOverlay, setCardOverlay] =
		useState<CardOverlay>(initial);
	const activeDragCleanupRef = useRef<(() => void) | undefined>();
	const activeCancelRef = useRef<(() => void) | undefined>();

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
		(
			handleWindowPointerMove: (ev: PointerEvent) => void,
			handleWindowPointerUp: (ev: PointerEvent) => void,
			handleWindowPointerCancel: () => void,
			handleWindowBlur: () => void
		) => {
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
		},
		[]
	);

	// Track pointer during drag
	const beginDragOverlay = useCallback(
		(evSource: SevEventSource, e: PointerEvent) => {
			if (!diagramContainerRef.current) return;

			let pendingRafId: number | undefined;
			let latestClientY = e.clientY;

			activeCancelRef.current?.();
			activeCancelRef.current = undefined;
			activeDragCleanupRef.current?.();
			activeDragCleanupRef.current = undefined;

			const {canvasSrc, rowHeight, canvasWidth} = getChartSnapshot(
				String(evSource.id)
			);
			const safeRowHeight = Math.max(rowHeight, 1);
			const contentRect =
				diagramContainerRef.current.getBoundingClientRect();
			const containerLeft = contentRect?.left ?? 0;
			const containerWidth = contentRect?.width ?? 0;
			const listWidth = getListWidth(diagramContainerRef.current);

			setCardOverlay({
				visible: true,
				y: e.clientY,
				containerLeft,
				containerWidth,
				listWidth,
				rowHeight: safeRowHeight,
				name: evSource.name,
				chartImageSrc: canvasSrc,
				chartImageWidth: canvasWidth
			});

			document.body.classList.add(TIMELINE_DRAG_ACTIVE);
			setOutsideCursorClass(
				!isPointerInsideDiagram(e.clientX, e.clientY)
			);

			let didFinalize = false;
			let handleWindowPointerMove: (ev: PointerEvent) => void = () =>
				undefined;
			let handleWindowPointerUp: (ev: PointerEvent) => void = () =>
				undefined;
			let handleWindowPointerCancel: () => void = () => undefined;
			let handleWindowBlur: () => void = () => undefined;

			const cleanupActiveListeners = () => {
				cleanupListeners(
					handleWindowPointerMove,
					handleWindowPointerUp,
					handleWindowPointerCancel,
					handleWindowBlur
				);

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

			const finalizeDrag = (isInsideDiagram: boolean) => {
				if (didFinalize) return;

				didFinalize = true;
				onDragFinalize({isInsideDiagram});
			};

			const endDrag = () => {
				cancelPendingRaf();
				setCardOverlay(prev => ({...prev, visible: false}));

				document.body.classList.remove(
					TIMELINE_DRAG_ACTIVE,
					TIMELINE_DRAG_OUTSIDE
				);

				cleanupActiveListeners();
			};

			const cancelDragSession = () => {
				finalizeDrag(false);
				endDrag();
			};

			activeCancelRef.current = cancelDragSession;

			// This is a high-frequency event, keep as cheap as possible
			handleWindowPointerMove = (ev: PointerEvent) => {
				const isInsideDiagram = isPointerInsideDiagram(
					ev.clientX,
					ev.clientY
				);
				setOutsideCursorClass(!isInsideDiagram);

				latestClientY = ev.clientY;

				if (pendingRafId !== undefined) return;

				pendingRafId = requestAnimationFrame(() => {
					pendingRafId = undefined;

					setCardOverlay(prev => {
						if (!prev.visible || prev.y === latestClientY) {
							return prev;
						}

						return {...prev, y: latestClientY};
					});
				});
			};

			handleWindowPointerUp = (ev: PointerEvent) => {
				const isInsideDiagram = isPointerInsideDiagram(
					ev.clientX,
					ev.clientY
				);

				finalizeDrag(isInsideDiagram);
				endDrag();
			};

			handleWindowPointerCancel = () => {
				cancelDragSession();
			};

			handleWindowBlur = () => {
				cancelDragSession();
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

			activeDragCleanupRef.current = cleanupActiveListeners;
		},
		[
			cleanupListeners,
			diagramContainerRef,
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

			document.body.classList.remove(
				TIMELINE_DRAG_ACTIVE,
				TIMELINE_DRAG_OUTSIDE
			);
		},
		[]
	);

	return {
		cardOverlay,
		beginDragOverlay,
		cancelActiveDragSession() {
			activeCancelRef.current?.();
		}
	};
}
