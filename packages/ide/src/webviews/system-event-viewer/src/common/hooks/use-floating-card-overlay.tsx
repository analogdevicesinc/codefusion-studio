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
	getChartSnapshot,
	setTransparentDragImage
} from '../utils/timeline-diagram';

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
	chartImageSrc: undefined
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
		document.body.classList.toggle(
			'timeline-drag-outside',
			isOutside
		);
	}, []);

	const cleanupListeners = useCallback(
		(
			handleWindowDragOver: (ev: DragEvent) => void,
			handleWindowDrop: (ev: DragEvent) => void,
			handleWindowDragEnd: (ev: DragEvent) => void,
			handleWindowBlur: () => void
		) => {
			window.removeEventListener('dragover', handleWindowDragOver);
			window.removeEventListener('drop', handleWindowDrop);
			window.removeEventListener('dragend', handleWindowDragEnd);
			window.removeEventListener('blur', handleWindowBlur);
		},
		[]
	);

	// Track pointer during drag
	const beginDragOverlay = useCallback(
		(evSource: SevEventSource, e: React.DragEvent) => {
			if (!diagramContainerRef.current) return;

			let pendingDragOverRafId: number | undefined;
			activeCancelRef.current?.();
			activeCancelRef.current = undefined;
			activeDragCleanupRef.current?.();
			activeDragCleanupRef.current = undefined;
			setTransparentDragImage(e);

			const {canvasSrc, rowHeight} = getChartSnapshot(
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
				chartImageSrc: canvasSrc
			});

			document.body.classList.add('timeline-drag-active');
			setOutsideCursorClass(
				!isPointerInsideDiagram(e.clientX, e.clientY)
			);

			let didFinalize = false;
			let didHandleDrop = false;
			let handleWindowDragOver: (ev: DragEvent) => void = () =>
				undefined;
			let handleWindowDrop: (ev: DragEvent) => void = () => undefined;
			let handleWindowDragEnd: (ev: DragEvent) => void = () =>
				undefined;
			let handleWindowBlur: () => void = () => undefined;

			const cleanupActiveListeners = () => {
				cleanupListeners(
					handleWindowDragOver,
					handleWindowDrop,
					handleWindowDragEnd,
					handleWindowBlur
				);

				if (activeDragCleanupRef.current === cleanupActiveListeners) {
					activeDragCleanupRef.current = undefined;
				}

				activeCancelRef.current = undefined;
			};

			const cancelPendingDragOverRaf = () => {
				if (pendingDragOverRafId === undefined) return;

				cancelAnimationFrame(pendingDragOverRafId);
				pendingDragOverRafId = undefined;
			};

			const finalizeDrag = (isInsideDiagram: boolean) => {
				if (didFinalize) return;

				didFinalize = true;
				onDragFinalize({isInsideDiagram});
			};

			const endDrag = () => {
				cancelPendingDragOverRaf();
				setCardOverlay(prev => ({...prev, visible: false}));

				document.body.classList.remove(
					'timeline-drag-active',
					'timeline-drag-outside'
				);

				cleanupActiveListeners();
			};

			const cancelDragSession = () => {
				finalizeDrag(false);
				endDrag();
			};

			activeCancelRef.current = cancelDragSession;

			// This is a high-frequency event, keep as cheap as possible
			handleWindowDragOver = (ev: DragEvent) => {
				ev.preventDefault();

				const isInsideDiagram = isPointerInsideDiagram(
					ev.clientX,
					ev.clientY
				);

				setOutsideCursorClass(!isInsideDiagram);

				if (ev.dataTransfer) {
					ev.dataTransfer.dropEffect = isInsideDiagram
						? 'move'
						: 'none';
				}

				pendingDragOverRafId = requestAnimationFrame(() => {
					pendingDragOverRafId = undefined;

					setCardOverlay(prev => {
						if (!prev.visible || prev.y === ev.clientY) {
							return prev;
						}

						return {...prev, y: ev.clientY};
					});
				});
			};

			handleWindowDrop = (ev: DragEvent) => {
				ev.preventDefault();
				didHandleDrop = true;

				const isInsideDiagram = isPointerInsideDiagram(
					ev.clientX,
					ev.clientY
				);

				finalizeDrag(isInsideDiagram);
				endDrag();
			};

			handleWindowDragEnd = () => {
				if (!didHandleDrop) {
					finalizeDrag(false);
				}

				endDrag();
			};

			handleWindowBlur = () => {
				cancelDragSession();
			};

			window.addEventListener('dragover', handleWindowDragOver, {
				passive: false
			});
			window.addEventListener('drop', handleWindowDrop, {
				passive: false
			});
			window.addEventListener('dragend', handleWindowDragEnd, {
				passive: false
			});
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
				'timeline-drag-active',
				'timeline-drag-outside'
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
