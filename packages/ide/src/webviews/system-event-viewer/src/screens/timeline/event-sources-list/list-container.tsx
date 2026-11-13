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

import {memo, useCallback, useMemo, useRef} from 'react';
import FloatingCardOverlay from './floating-card-overlay';
import EventSourcesList from './event-sources-list';

import {useFloatingCardOverlay} from '../../../common/hooks/use-floating-card-overlay';
import {DROP_ZONE} from '../../../common/constants/timeline';
import {useAppDispatch} from '../../../state/store';
import {setEventSourcesListWidth} from '../../../state/slices/timeline/timeline.reducer';
import {useEventSourcesListWidth} from '../../../state/slices/timeline/timeline.selector';

import type {
	DragOverlayRow,
	DropOutcome,
	RowStateUpdate
} from '../../../common/types/timeline';
import type {
	EventSourceMoveIntent,
	TimelineRow
} from '../../../common/types/events';

type ListContainerProps = Readonly<{
	rows: TimelineRow[];
	diagramContainerRef: React.RefObject<HTMLDivElement>;
	dropIndicatorRef: React.RefObject<HTMLDivElement>;
	onMoveNode: (nodeId: string, intent: EventSourceMoveIntent) => void;
	onRenameGroup: (groupId: string, groupName: string) => void;
	onRowStateChange: (update: RowStateUpdate) => void;
	onDragStart: (rowIndex: number) => void;
	onToggleGroup: (groupId: string) => void;
}>;

/**
 * Bridge between the event sources list and the floating-card overlay hook.
 * it includes the strip for root-append drop targets.
 */
function ListContainer({
	rows,
	diagramContainerRef,
	dropIndicatorRef,
	onMoveNode,
	onRenameGroup,
	onRowStateChange,
	onDragStart,
	onToggleGroup
}: ListContainerProps) {
	const dispatch = useAppDispatch();
	const listWidth = useEventSourcesListWidth();
	const draggedNodeIdRef = useRef<string | undefined>();

	const handleWidthChange = useCallback(
		(width: number) => {
			dispatch(setEventSourcesListWidth(width));
		},
		[dispatch]
	);

	const lastRootNodeId = useMemo(() => {
		for (let index = rows.length - 1; index >= 0; index--) {
			if (rows[index].depth === 0) return rows[index].id;
		}

		return undefined;
	}, [rows]);

	const handleDragFinalize = useCallback(
		(outcome: DropOutcome) => {
			const draggedNodeId = draggedNodeIdRef.current;
			draggedNodeIdRef.current = undefined;

			if (
				draggedNodeId === undefined ||
				outcome.zone === DROP_ZONE.OUTSIDE
			) {
				return;
			}

			onMoveNode(draggedNodeId, {
				type: 'drag',
				targetNodeId: outcome.targetNodeId,
				position: outcome.zone
			});
		},
		[onMoveNode]
	);

	const {startDrag, cardOverlay, isDraggingRef} =
		useFloatingCardOverlay(
			diagramContainerRef,
			dropIndicatorRef,
			rows,
			listWidth,
			handleDragFinalize
		);

	const handleStartDrag = useCallback(
		(row: DragOverlayRow, event: PointerEvent, rowIndex: number) => {
			draggedNodeIdRef.current = row.id;

			onDragStart(rowIndex);
			startDrag(row, event);
		},
		[startDrag, onDragStart]
	);

	const strip = (
		<div data-root-drop-target={lastRootNodeId} aria-hidden='true' />
	);

	return (
		<>
			<EventSourcesList
				diagramContainerRef={diagramContainerRef}
				rows={rows}
				listWidth={listWidth}
				isDraggingRef={isDraggingRef}
				onWidthChange={handleWidthChange}
				onMoveNode={onMoveNode}
				onRenameGroup={onRenameGroup}
				onRowStateChange={onRowStateChange}
				onToggleGroup={onToggleGroup}
				onStartDrag={handleStartDrag}
			/>

			{/* Root-append drop target strip */}
			{lastRootNodeId !== undefined && strip}

			{/* Floating drag overlay (portal) */}
			{cardOverlay.visible && (
				<FloatingCardOverlay cardOverlay={cardOverlay} />
			)}
		</>
	);
}

export default memo(ListContainer);
