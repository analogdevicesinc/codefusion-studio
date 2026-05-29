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

import {memo, useCallback, useRef} from 'react';
import FloatingCardOverlay from './floating-card-overlay';
import EventSourcesList from './event-sources-list';

import {useFloatingCardOverlay} from '../../../common/hooks/use-floating-card-overlay';

import type {
	RowStateUpdate,
	EventSourcesListHandle
} from '../../../common/types/timeline';
import type {SevEventSource} from '../../../common/types/events';

type ListContainerProps = Readonly<{
	orderedEvSources: SevEventSource[];
	diagramContainerRef: React.RefObject<HTMLDivElement>;
	handleReorder: (orderedList: SevEventSource[]) => void;
	onRowStateChange: (update: RowStateUpdate) => void;
	onDragStart: () => void;
}>;

/**
 * EventSourcesList exposes imperative methods via forwardRef.
 * ListContainer component is the owner that decides commit or cancel.
 */
function ListContainer({
	orderedEvSources,
	diagramContainerRef,
	handleReorder,
	onRowStateChange,
	onDragStart
}: ListContainerProps) {
	const listRef = useRef<EventSourcesListHandle>(null);
	const isDragFinalizedRef = useRef(false);

	const resetFinalizeGuard = useCallback(() => {
		isDragFinalizedRef.current = false;
	}, []);

	const finalizeDrag = useCallback((isInsideDiagram: boolean) => {
		if (isDragFinalizedRef.current) return;
		isDragFinalizedRef.current = true;

		if (isInsideDiagram) {
			listRef.current?.commitDraggedReorder();

			return;
		}

		listRef.current?.cancelDraggedReorder();
	}, []);

	const handleOverlayFinalize = useCallback(
		({isInsideDiagram}: Readonly<{isInsideDiagram: boolean}>) => {
			finalizeDrag(isInsideDiagram);
		},
		[finalizeDrag]
	);

	const {beginDragOverlay, cardOverlay, cancelActiveDragSession} =
		useFloatingCardOverlay(
			diagramContainerRef,
			handleOverlayFinalize
		);

	const handleListNativeDragEnd = useCallback(() => {
		finalizeDrag(false);
		cancelActiveDragSession();
	}, [cancelActiveDragSession, finalizeDrag]);

	return (
		<>
			<EventSourcesList
				ref={listRef}
				diagramContainerRef={diagramContainerRef}
				events={orderedEvSources}
				onDragEndSignal={handleListNativeDragEnd}
				onReorder={handleReorder}
				onRowStateChange={update => {
					if (!cardOverlay.visible) {
						onRowStateChange(update);
					}
				}}
				onBeginDragOverlay={(evSource, e) => {
					resetFinalizeGuard();
					onDragStart();
					beginDragOverlay(evSource, e);
				}}
			/>

			{/* Floating drag overlay (portal) */}
			{cardOverlay.visible && (
				<FloatingCardOverlay cardOverlay={cardOverlay} />
			)}
		</>
	);
}

export default memo(ListContainer);
