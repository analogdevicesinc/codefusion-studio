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

import {memo, useCallback, useRef, startTransition} from 'react';
import type {EChartsType} from 'echarts/core';
import {useStore} from 'react-redux';

import {type RootState, useAppDispatch} from '../../../state/store';
import {
	setDataZoom as setTimelineDataZoom,
	toggleGroupExpanded
} from '../../../state/slices/timeline/timeline.reducer';
import {setEventSourceTree} from '../../../state/slices/event-sources/event-sources.reducer';
import {
	selectEventSourceTree,
	useVisibleAnchorRowIds,
	useVisibleTimelineRows
} from '../../../state/slices/event-sources/event-sources.selector';

import TimelineFooter from './timeline-footer';
import TimelineRow from './components/diagram/timeline-row';
import ListContainer from '../event-sources-list/list-container';
import TimelineDiagramHeader from './components/diagram/timeline-diagram-header';
import MeasurementContainer from './components/measurement-tool/measurement-container';
import {useTimelineChartsResize} from '../../../common/hooks/use-timeline-charts-resize';
import {
	getVisibleDescendantRowIndexes,
	moveEventSourceTreeNode
} from '../../../common/utils/events-group';
import {renameEventSourceGroup} from '../../../common/utils/tree';

import {
	setChartToWindow,
	deleteChartFromWindow,
	dispatchDataZoomAction,
	onRowStateChange,
	resetRowInteraction,
	applyRowsDragged
} from '../../../common/utils/timeline-diagram';
import {
	DATA_TEST_E,
	DATA_TEST_S,
	DIAGRAM_CONTAINER_ID
} from '../../../common/constants/timeline';

import type {
	DataZoom,
	HeaderChartHandle,
	Range,
	RowStateUpdate,
	RowInteraction
} from '../../../common/types/timeline';
import type {
	EventSourceMoveIntent,
	SevEventSource
} from '../../../common/types/events';
import {updateEventSourceTree} from '../../../common/utils/service';
import {clampTimelineDataZoom} from '../../../common/utils/time-axis-utils';

import styles from './timeline-diagram.module.scss';

/**
 * This component is responsible for rendering the entire timeline diagram, including the header, footer, event sources list, and the chart rows for each event source.
 * It's the orchestrator that manages the state and interactions between the different parts of the timeline diagram.
 *
 * Do not rely on React re-renders to update the chart; use ECharts methods for this;
 * Do not keep internal react state in this component; Keep the props minimal;
 * Do not subscribe to the store to avoid re-renders; use "activeStore.getState()" to get the latest state
 */
function TimelineDiagram({
	eventSources,
	timestampRange
}: Readonly<{
	eventSources: SevEventSource[];
	timestampRange: Range;
}>) {
	const dispatch = useAppDispatch();
	const activeStore = useStore<RootState>();
	const visibleRows = useVisibleTimelineRows();
	const visibleAnchorRowIds = useVisibleAnchorRowIds();
	const chartsRef = useRef(new Map<string, EChartsType>()); // List of chart instances representing each event source row
	const headerChartRef = useRef<HeaderChartHandle>(); // Header chart instance
	const syncingRef = useRef(false); // To prevent circular updates when syncing dataZoom across charts
	const footerRef = useRef({
		setDataZoom: (_: DataZoom) => null
	});
	const diagramContainerRef = useRef<HTMLDivElement>(null); // The purpose is to set test attributes on the container for testing
	const chartAreaRef = useRef<HTMLElement>(null);
	const rowInteractionRef = useRef<RowInteraction>({});
	const dropIndicatorRef = useRef<HTMLDivElement>(null);

	useTimelineChartsResize({
		chartAreaRef,
		timestampChartsRef: chartsRef
	});

	const handleRowStateChange = useCallback(
		({rowIndex, isHovered, isActive}: RowStateUpdate) => {
			onRowStateChange(
				{rowIndex, isHovered, isActive},
				rowInteractionRef,
				diagramContainerRef
			);
		},
		[]
	);

	const handleOnDragStart = useCallback(
		(rowIndex: number) => {
			resetRowInteraction(rowInteractionRef, diagramContainerRef);
			applyRowsDragged(
				[
					rowIndex,
					...getVisibleDescendantRowIndexes(visibleRows, rowIndex)
				],
				rowInteractionRef,
				diagramContainerRef
			);
		},
		[visibleRows]
	);

	const handleMoveNode = useCallback(
		(nodeId: string, intent: EventSourceMoveIntent) => {
			const tree = selectEventSourceTree(activeStore.getState());
			const updatedTree = moveEventSourceTreeNode(
				tree,
				nodeId,
				intent
			);

			if (updatedTree === tree) return;

			dispatch(setEventSourceTree(updatedTree));
			resetRowInteraction(rowInteractionRef, diagramContainerRef);
			updateEventSourceTree(updatedTree);
		},
		[activeStore, dispatch]
	);

	const handleRenameGroup = useCallback(
		(groupId: string, groupName: string) => {
			const tree = selectEventSourceTree(activeStore.getState());
			const updatedTree = renameEventSourceGroup(
				tree,
				groupId,
				groupName
			);

			if (updatedTree === tree) return;

			dispatch(setEventSourceTree(updatedTree));
			updateEventSourceTree(updatedTree);
		},
		[activeStore, dispatch]
	);

	const handleToggleGroup = useCallback(
		(groupId: string) => {
			dispatch(toggleGroupExpanded(groupId));
		},
		[dispatch]
	);

	/**
	 * Since the `useTimeAxis` subscribes to `dataZoom` changes, the timeline header components will be kept in sync;
	 */
	const updateHeaderChart = useCallback((newDataZoom: DataZoom) => {
		if (headerChartRef.current) {
			dispatchDataZoomAction(
				headerChartRef.current.chart,
				newDataZoom
			);
		}
	}, []);

	const updateTimestampsCharts = useCallback(
		(newDataZoom: DataZoom, currentChartId: string) => {
			chartsRef.current.forEach((inst, id) => {
				if (id === currentChartId) return;

				dispatchDataZoomAction(inst, newDataZoom);
			});
		},
		[]
	);

	const setContainerTestDataZoomAttrs = useCallback(
		(dataZoom: DataZoom) => {
			const el = diagramContainerRef.current;

			if (!el) return;

			el.setAttribute(DATA_TEST_S, String(dataZoom.start));
			el.setAttribute(DATA_TEST_E, String(dataZoom.end));
		},
		[]
	);

	const registerChart = useCallback(
		(id: string, instance: EChartsType) => {
			chartsRef.current.set(id, instance);
			setChartToWindow(id, instance);

			dispatchDataZoomAction(
				instance,
				activeStore.getState().timelineReducer.dataZoom
			);
		},
		[activeStore]
	);

	const unregisterChart = useCallback((id: string) => {
		chartsRef.current.delete(id);
		deleteChartFromWindow(id);
	}, []);

	const registerHeaderChart = useCallback(
		(handle: HeaderChartHandle) => {
			// The header applies the current zoom before registering its handle.
			headerChartRef.current = handle;
			setChartToWindow('header', handle.chart);
		},
		[]
	);

	const unregisterHeaderChart = useCallback(() => {
		headerChartRef.current = undefined;
		deleteChartFromWindow('header');
	}, []);

	const getChartInstance = useCallback(
		(sourceId: string) => {
			const visibleRowId =
				visibleAnchorRowIds.get(sourceId) ?? sourceId;

			return chartsRef.current.get(visibleRowId);
		},
		[visibleAnchorRowIds]
	);

	const getHeaderChartInstance = useCallback(
		() => headerChartRef.current,
		[]
	);

	const applyDataZoom = useCallback(
		(newDz: DataZoom, chartId?: string) => {
			if (syncingRef.current) return;

			const dataZoom = clampTimelineDataZoom(newDz, timestampRange);
			const wasClamped =
				dataZoom.start !== newDz.start || dataZoom.end !== newDz.end;
			const persistedDataZoom =
				activeStore.getState().timelineReducer.dataZoom;

			if (
				dataZoom.start !== persistedDataZoom.start ||
				dataZoom.end !== persistedDataZoom.end ||
				wasClamped
			) {
				dispatch(setTimelineDataZoom(dataZoom));
				footerRef.current.setDataZoom(dataZoom);
				setContainerTestDataZoomAttrs(dataZoom);

				// StartTransition and requestAnimationFrame are used to batch the updates to avoid blocking the main thread
				startTransition(() => {
					requestAnimationFrame(() => {
						syncingRef.current = true;

						updateHeaderChart(dataZoom);
						updateTimestampsCharts(
							dataZoom,
							wasClamped ? '' : (chartId ?? '')
						);
						syncingRef.current = false;
					});
				});
			}
		},
		[
			timestampRange,
			updateHeaderChart,
			updateTimestampsCharts,
			setContainerTestDataZoomAttrs,
			dispatch,
			activeStore
		]
	);

	const handleChartDataZoom = useCallback(
		(dataZoom: DataZoom, originId: string) => {
			applyDataZoom(dataZoom, originId);
		},
		[applyDataZoom]
	);

	const handleFooterDataZoom = useCallback(
		(dataZoom: DataZoom) => {
			applyDataZoom(dataZoom);
		},
		[applyDataZoom]
	);

	return (
		<div className={styles.diagramRoot}>
			<div
				ref={diagramContainerRef}
				id={DIAGRAM_CONTAINER_ID}
				className={styles.timelineDiagramContainer}
				data-test='timeline-diagram'
			>
				<div
					className={styles.scrollContent}
					data-test='timeline:scroll-content'
				>
					<div
						ref={dropIndicatorRef}
						hidden
						className={styles.dropIndicator}
						data-test='timeline:drop-indicator'
					/>

					<ListContainer
						rows={visibleRows}
						diagramContainerRef={diagramContainerRef}
						dropIndicatorRef={dropIndicatorRef}
						onMoveNode={handleMoveNode}
						onRenameGroup={handleRenameGroup}
						onRowStateChange={handleRowStateChange}
						onDragStart={handleOnDragStart}
						onToggleGroup={handleToggleGroup}
					/>

					<MeasurementContainer
						eventSources={eventSources}
						timestampRange={timestampRange}
						measurementContainerRef={chartAreaRef}
						getChartInstance={getChartInstance}
						getHeaderChartInstance={getHeaderChartInstance}
					>
						{measurementViewport => (
							<>
								<TimelineDiagramHeader
									measurementViewport={measurementViewport}
									timestampRange={timestampRange}
									registerHeaderChart={registerHeaderChart}
									unregisterHeaderChart={unregisterHeaderChart}
								/>

								{visibleRows.map((row, index) => (
									<TimelineRow
										key={row.id}
										row={row}
										rowIndex={index}
										timestampRange={timestampRange}
										containerRef={diagramContainerRef}
										registerChart={registerChart}
										unregisterChart={unregisterChart}
										onRowStateChange={handleRowStateChange}
										onDataZoomChange={handleChartDataZoom}
									/>
								))}
							</>
						)}
					</MeasurementContainer>
				</div>
			</div>

			<TimelineFooter
				ref={footerRef}
				timestampRange={timestampRange}
				onDataZoomChange={(dataZoom: DataZoom) => {
					handleFooterDataZoom(dataZoom);
				}}
			/>
		</div>
	);
}

export default memo(TimelineDiagram);
