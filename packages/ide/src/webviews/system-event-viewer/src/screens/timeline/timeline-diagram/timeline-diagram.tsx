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

import {
	memo,
	useCallback,
	useRef,
	startTransition,
	useState,
	useEffect
} from 'react';
import type {EChartsType} from 'echarts/core';

import {store, useAppDispatch} from '../../../state/store';
import {
	setDataZoom as setTimelineDataZoom,
	setMeasurePhase
} from '../../../state/slices/timeline/timeline.reducer';

import TimelineFooter from './timeline-footer';
import XTicksChartRow from './xticks-chart-row';
import TimestampsChartRow from './timestamps-chart-row';
import ListContainer from '../event-sources-list/list-container';
import MeasurementContainer from './measurement-container';

import {
	setChartToWindow,
	deleteChartFromWindow,
	dispatchDataZoomAction,
	onRowStateChange,
	resetRowInteraction
} from '../../../common/utils/timeline-diagram';
import {syncHeaderChartBase} from '../../../common/utils/x-axis-ticks';
import {
	DATA_TEST_E,
	DATA_TEST_S,
	DIAGRAM_CONTAINER_ID,
	MEASURE_PHASE
} from '../../../common/constants/timeline';

import type {
	DataZoom,
	Range,
	RowStateUpdate,
	RowInteraction
} from '../../../common/types/timeline';
import type {SevEventSource} from '../../../common/types/events';

import styles from './timeline-diagram.module.scss';

/**
 * This component is responsible for rendering the entire timeline diagram,
 * including the header, footer, event sources list, and the chart rows for each event source.
 * @param param0
 * @returns
 */
function TimelineDiagram({
	eventSources,
	timestampRange
}: Readonly<{
	eventSources: SevEventSource[];
	timestampRange: Range;
}>) {
	const dispatch = useAppDispatch();
	const [orderedEvSources, setOrderedEvSources] = useState<
		SevEventSource[]
	>([]);
	const chartsRef = useRef(new Map<string, EChartsType>()); // List of chart instances representing each event source row
	const headerChartRef = useRef<EChartsType>(); // Header chart instance
	const syncingRef = useRef(false); // To prevent circular updates when syncing dataZoom across charts
	const footerRef = useRef({
		setDataZoom: (_: DataZoom) => null
	});
	const diagramContainerRef = useRef<HTMLDivElement>(null); // The purpose is to set test attributes on the container for testing
	const rowInteractionRef = useRef<RowInteraction>({});

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

	const onResetRowInteraction = useCallback(() => {
		resetRowInteraction(rowInteractionRef, diagramContainerRef);
	}, []);

	const handleReorder = useCallback(
		(orderedList: SevEventSource[]) => {
			dispatch(setMeasurePhase(MEASURE_PHASE.IDLE));
			setOrderedEvSources(orderedList);
		},
		[dispatch]
	);

	const updateHeaderChart = useCallback(
		(newDataZoom: DataZoom) => {
			if (headerChartRef.current) {
				dispatchDataZoomAction(headerChartRef.current, newDataZoom);

				// Keep axis labels/ticks in sync with the new zoom window without React re-render
				syncHeaderChartBase(
					headerChartRef.current,
					timestampRange,
					newDataZoom
				);
			}
		},
		[timestampRange]
	);

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

			const persistedDataZoom =
				store.getState().timelineReducer?.dataZoom;

			dispatchDataZoomAction(instance, persistedDataZoom);
		},
		[]
	);

	const unregisterChart = useCallback((id: string) => {
		chartsRef.current.delete(id);
		deleteChartFromWindow(id);
	}, []);

	const registerHeaderChart = useCallback(
		(instance: EChartsType) => {
			headerChartRef.current = instance;
			setChartToWindow('header', instance);

			const persistedDataZoom =
				store.getState().timelineReducer?.dataZoom;

			updateHeaderChart(persistedDataZoom);
		},
		[updateHeaderChart]
	);

	const unregisterHeaderChart = useCallback(() => {
		headerChartRef.current = undefined;
		deleteChartFromWindow('header');
	}, []);

	const getChartInstance = useCallback(
		(sourceId: string) => chartsRef.current.get(sourceId),
		[]
	);

	const getHeaderChartInstance = useCallback(
		() => headerChartRef.current,
		[]
	);

	const applyDataZoom = useCallback(
		(newDz: DataZoom, chartId?: string) => {
			if (syncingRef.current) return;

			const persistedDataZoom =
				store.getState().timelineReducer?.dataZoom;

			if (
				newDz.start !== persistedDataZoom.start ||
				newDz.end !== persistedDataZoom.end
			) {
				// StartTransition and requestAnimationFrame are used to batch the updates to avoid blocking the main thread
				startTransition(() => {
					requestAnimationFrame(() => {
						syncingRef.current = true;

						updateHeaderChart(newDz);
						updateTimestampsCharts(newDz, chartId ?? '');
						dispatch(setTimelineDataZoom(newDz));

						footerRef.current.setDataZoom(newDz);
						setContainerTestDataZoomAttrs(newDz);

						syncingRef.current = false;
					});
				});
			}
		},
		[
			updateHeaderChart,
			updateTimestampsCharts,
			setContainerTestDataZoomAttrs,
			dispatch
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

	// The purpose of this effect is to update the ordered event sources
	// whenever the extension pushes new event sources data
	useEffect(() => {
		dispatch(setMeasurePhase(MEASURE_PHASE.IDLE));

		setOrderedEvSources(prev => {
			if (!prev?.length) return eventSources;

			const sourcesMap = new Map(
				eventSources.map(item => [String(item.id), item])
			);
			const currentIds = new Set(prev.map(item => String(item.id)));

			const currentItems = prev
				.map(item => sourcesMap.get(String(item.id)))
				.filter(Boolean) as SevEventSource[];
			const newItems = eventSources.filter(
				item => !currentIds.has(String(item.id))
			);

			return [...currentItems, ...newItems];
		});
	}, [dispatch, eventSources]);

	return (
		<div className={styles.diagramRoot}>
			<div
				ref={diagramContainerRef}
				id={DIAGRAM_CONTAINER_ID}
				className={styles.timelineDiagramContainer}
				data-test='timeline-diagram'
			>
				<div className={styles.scrollContent}>
					<ListContainer
						orderedEvSources={orderedEvSources}
						diagramContainerRef={diagramContainerRef}
						handleReorder={handleReorder}
						onRowStateChange={handleRowStateChange}
						onDragStart={onResetRowInteraction}
					/>

					<MeasurementContainer
						eventSources={orderedEvSources}
						timestampRange={timestampRange}
						getChartInstance={getChartInstance}
						getHeaderChartInstance={getHeaderChartInstance}
					>
						<XTicksChartRow
							timestampRange={timestampRange}
							registerHeaderChart={registerHeaderChart}
							unregisterHeaderChart={unregisterHeaderChart}
						/>

						<div className={styles.timestampsChartsContainer}>
							{orderedEvSources.map((evSource, index) => (
								<TimestampsChartRow
									key={evSource.id}
									id={String(evSource.id)}
									rowIndex={index}
									eventSource={evSource}
									timestampRange={timestampRange}
									containerRef={diagramContainerRef}
									registerChart={registerChart}
									unregisterChart={unregisterChart}
									onRowStateChange={handleRowStateChange}
									onDataZoomChange={(dz: DataZoom) => {
										handleChartDataZoom(dz, String(evSource.id));
									}}
								/>
							))}
						</div>
					</MeasurementContainer>
				</div>
			</div>

			<TimelineFooter
				ref={footerRef}
				timestampRange={timestampRange}
				onDataZoomChange={(dz: DataZoom) => {
					handleFooterDataZoom(dz);
				}}
			/>
		</div>
	);
}

export default memo(TimelineDiagram);
